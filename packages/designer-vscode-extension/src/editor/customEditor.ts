/**
 * customEditor.ts — TSK-02-01 / TSK-05-04
 *
 * form-js.block-editor Custom Editor webview 진입점.
 *
 * dist/webview/customEditor.js (browser IIFE)로 번들된다.
 * VSCode Custom Editor webview panel 내에서 실행된다.
 *
 * 책임:
 * - acquireVsCodeApi()로 extension host 통신 채널 확보
 * - `edit-opened` 메시지 수신 → createFormEditor({ container, schema, additionalModules }) 마운트
 * - 저장 버튼 클릭 → `save-schema` 메시지 송신 (TSK-02-04)
 * - window unload 시 editor.destroy() 호출
 * - 커스텀 컴포넌트 모듈(`customComponentsModule`) 주입 (TSK-05-04)
 */

import { createFormEditor } from '@bpmn-io/form-js-editor';
import { customComponentsModule } from '../components';
// Tabs/Card 등 커스텀 container의 자식 row를 얻으려면 form-js 기본 formLayouter를
// DesignerFormLayouter로 교체해야 한다. preview.ts와 동일한 모듈 조합 유지.
import { DesignerContainerModule } from '@form-js-designer/designer-core';
// context-pad에 "행으로 복사 / 세로로 복사" 버튼 주입 (웹 호스트의 OutlineModule 경량 포팅)
import { ContextPadExtrasModule } from './contextPadExtras';
// form-js 기본 properties panel에 "Custom properties" 그룹을 추가하는 provider
import { PropsPanelModule } from './propsPanel/PropsPanelService';
import type { EditOpenedMessage, SaveSchemaMessage } from '../shared/messages';

// TSK-04-02: axe-core 스캔 테스트 모드 플래그 (esbuild define)
declare const FORM_JS_TEST_BRIDGE: boolean;

/** VSCode webview API 타입 */
interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

/** window 확장: acquireVsCodeApi + lifecycle tracking */
interface CustomEditorWindow extends Window {
  acquireVsCodeApi?(): VsCodeApi;
  __formJsCustomEditorLoaded?: boolean;
}

/** form-js editor 인스턴스 타입 */
export interface FormEditorInstance {
  destroy(): void;
  saveSchema?(): unknown;
  getSchema?(): unknown;
  importSchema?(schema: unknown): Promise<unknown>;
  get?(name: string, strict?: boolean): unknown;
}

const EDITOR_MODULES = [
  DesignerContainerModule,
  customComponentsModule,
  ContextPadExtrasModule,
  PropsPanelModule,
];

/**
 * initCustomEditor — 주어진 container에 form-js editor를 마운트한다 (TSK-05-04).
 *
 * VSCode Custom Editor 외부(픽셀 파리티 테스트·Storybook 등)에서 재사용하기 위한
 * 순수 마운트 함수. 메시지 라이프사이클은 `init()`가 관리한다.
 */
export async function initCustomEditor(
  container: HTMLElement,
  schema: unknown,
): Promise<FormEditorInstance> {
  const editor = await createFormEditor({
    container,
    schema,
    additionalModules: EDITOR_MODULES,
  });
  return editor as unknown as FormEditorInstance;
}

let vscodeApi: VsCodeApi | null = null;
let editorInstance: FormEditorInstance | null = null;

/** webview가 알고 있는 현재 문서 메타 정보 (edit-opened / source-updated로 갱신) */
let currentUri = '';
let currentMdStart = 0;
let currentMdEnd = 0;
let lastKnownDocVersion = 0;

/** 마지막으로 전송한 스키마 JSON — 동일 스키마 재전송 억제용 */
let lastSyncedSchemaJson = '';
/** debounce 타이머 */
let syncTimer: ReturnType<typeof setTimeout> | null = null;
/** commandStack.changed 구독 해제 핸들 */
let unsubscribeChange: (() => void) | null = null;

/** form-js 편집 이벤트 → 자동 sync 간격 (ms) */
const SYNC_DEBOUNCE_MS = 250;

interface FormEventBus {
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
}

/**
 * form-js editor를 #app 컨테이너에 마운트한다.
 * PropsPanelModule이 DI 초기화 시 propertiesPanel.registerProvider를 호출하여
 * Custom properties 그룹을 form-js 기본 properties panel에 추가한다.
 */
export async function mountEditor(schema: unknown): Promise<void> {
  const container = document.getElementById('app');
  if (!container) {
    console.error('[form-js editor] #app 컨테이너를 찾을 수 없습니다.');
    return;
  }

  // 기존 인스턴스 정리
  if (editorInstance) {
    try {
      editorInstance.destroy();
    } catch {
      // destroy 실패 무시
    }
    editorInstance = null;
  }
  if (unsubscribeChange) {
    try {
      unsubscribeChange();
    } catch {
      // off 실패 무시
    }
    unsubscribeChange = null;
  }
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }

  try {
    editorInstance = (await createFormEditor({
      container,
      schema,
      additionalModules: EDITOR_MODULES,
    })) as FormEditorInstance;
  } catch (err) {
    console.error('[form-js editor] createFormEditor 실패:', err);
    container.textContent = `편집기 초기화 실패: ${err instanceof Error ? err.message : String(err)}`;
    return;
  }

  // 초기 스키마 JSON 기록 (동일 내용 재전송 방지용 기준점)
  lastSyncedSchemaJson = serializeCurrentSchema();

  // commandStack.changed 구독 — 사용자 편집이 발생할 때만 dirty 동기화
  if (typeof editorInstance.get === 'function') {
    const eventBus = editorInstance.get('eventBus', false) as FormEventBus | undefined;
    if (eventBus) {
      const onChanged = (): void => scheduleSync();
      eventBus.on('commandStack.changed', onChanged);
      unsubscribeChange = () => eventBus.off('commandStack.changed', onChanged);
    }
  }
}

/** 현재 editor의 schema를 JSON 문자열로 직렬화 (없으면 빈 객체) */
function serializeCurrentSchema(): string {
  if (!editorInstance) return '{}';
  try {
    const raw = typeof editorInstance.getSchema === 'function'
      ? editorInstance.getSchema()
      : typeof editorInstance.saveSchema === 'function'
        ? editorInstance.saveSchema()
        : null;
    return raw != null ? JSON.stringify(raw) : '{}';
  } catch {
    return '{}';
  }
}

/** 편집 이벤트를 debounce로 묶어 sync 메시지를 발송 (persist=false, dirty 유지) */
function scheduleSync(): void {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    sendSchemaMessage(false);
  }, SYNC_DEBOUNCE_MS);
}

/**
 * extension host로 save-schema 메시지를 송신한다.
 * persist=true: applyEdit + document.save() (Cmd+S).
 * persist=false: applyEdit만 — 문서는 dirty 상태로 남음 (자동 sync).
 */
export function sendSaveSchema(persist: boolean = true): void {
  sendSchemaMessage(persist);
}

function sendSchemaMessage(persist: boolean): void {
  if (!vscodeApi || !editorInstance) return;

  const schemaJson = serializeCurrentSchema();

  // persist=false(sync)이고 스키마가 이전과 동일하면 생략
  if (!persist && schemaJson === lastSyncedSchemaJson) return;

  const msg: SaveSchemaMessage = {
    type: 'save-schema',
    uri: currentUri,
    mdStart: currentMdStart,
    mdEnd: currentMdEnd,
    schema: schemaJson,
    docVersion: lastKnownDocVersion,
    persist,
  };

  try {
    vscodeApi.postMessage(msg);
    lastSyncedSchemaJson = schemaJson;
  } catch (err) {
    console.error('[form-js editor] save-schema 송신 실패:', err);
  }
}

/**
 * 저장 토스트 메시지를 표시한다.
 */
export function showSaveToast(message: string, kind: 'success' | 'info' = 'success'): void {
  const existing = document.querySelector('[data-testid="form-js-save-toast"]');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.setAttribute('data-testid', 'form-js-save-toast');
  toast.setAttribute('data-kind', kind);
  toast.textContent = message;
  toast.style.cssText = 'position:fixed;bottom:16px;right:16px;padding:8px 16px;border-radius:4px;z-index:9999;';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/**
 * 에러 배너를 표시한다.
 */
export function showErrorBanner(message: string): void {
  const existing = document.querySelector('[data-testid="form-js-error-banner"]');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.setAttribute('data-testid', 'form-js-error-banner');
  banner.textContent = message;
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;padding:8px 16px;z-index:9999;';
  document.body.appendChild(banner);
}

export function init(): void {
  const win = window as CustomEditorWindow;

  // lifecycle tracking
  win.__formJsCustomEditorLoaded = true;

  // acquireVsCodeApi
  if (typeof win.acquireVsCodeApi === 'function') {
    vscodeApi = win.acquireVsCodeApi();
  }

  // edit-opened / save-result / source-updated 메시지 수신
  window.addEventListener('message', (event: MessageEvent) => {
    const msg = event.data as { type?: string };
    if (!msg?.type) return;

    if (msg.type === 'edit-opened') {
      const opened = msg as EditOpenedMessage;
      currentUri = opened.uri ?? currentUri;
      currentMdStart = opened.mdStart ?? 0;
      currentMdEnd = opened.mdEnd ?? 0;
      lastKnownDocVersion = opened.docVersion ?? 0;

      let schema: unknown;
      try {
        schema = typeof opened.schema === 'string' ? JSON.parse(opened.schema) : opened.schema;
      } catch {
        schema = { type: 'default', components: [] };
      }
      void mountEditor(schema);
      return;
    }

    if (msg.type === 'source-updated') {
      const upd = msg as import('../shared/messages').SourceUpdatedMessage;
      lastKnownDocVersion = upd.version;
      showSaveToast('문서가 외부에서 변경되었습니다.', 'info');
      return;
    }

    if (msg.type === 'save-result') {
      const result = msg as import('../shared/messages').SaveResultMessage;
      // applyEdit 성공 시 새 doc.version을 기록하여 다음 sync에서 재사용
      if (result.ok && typeof result.version === 'number') {
        lastKnownDocVersion = result.version;
      }
      if (result.ok) {
        // persist=true(Cmd+S)일 때만 "저장됨" 토스트 표시. 자동 sync는 조용히 진행.
        if (result.persisted) {
          showSaveToast('저장되었습니다.');
        }
      } else if (result.error !== 'cancelled') {
        showErrorBanner(`저장 실패: ${result.error ?? '알 수 없는 오류'}`);
      }
      return;
    }
  });

  // 저장 버튼 wiring (TSK-02-04) — persist=true
  const saveBtn = document.querySelector<HTMLElement>('[data-testid="form-js-save-button"]');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => sendSaveSchema(true));
  }

  // Cmd+S / Ctrl+S keydown 캡처 — persist=true로 디스크에 저장
  window.addEventListener('keydown', (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 's') {
      event.preventDefault();
      sendSaveSchema(true);
    }
  });

  // unload 시 정리
  window.addEventListener('unload', () => {
    if (editorInstance) {
      try {
        editorInstance.destroy();
      } catch {
        // 무시
      }
      editorInstance = null;
    }
  });

  // TSK-04-02: axe-core 스캔 실행 (테스트 모드 전용)
  console.log('[form-js custom-editor] FORM_JS_TEST_BRIDGE:', typeof FORM_JS_TEST_BRIDGE);
  if (typeof FORM_JS_TEST_BRIDGE !== 'undefined' && FORM_JS_TEST_BRIDGE) {
    console.log('[form-js custom-editor] starting axe scan');
    void runAxeScan('custom-editor');
  }
}

/**
 * TSK-04-02: axe-core를 동적으로 로드하고 스캔을 실행한다.
 * 결과를 postMessage({ type: 'axe-result', violations })로 전송한다.
 *
 * @param webviewId 식별자 ('preview' 또는 'custom-editor')
 */
async function runAxeScan(webviewId: string): Promise<void> {
  try {
    // 동적 import로 axe-core 로드 (번들에 포함됨)
    const axe = (await import('axe-core')).default;

    // 스캔 실행 (root = document.documentElement)
    const results = await new Promise<{ violations: unknown[] }>((resolve, reject) => {
      axe.run(document.documentElement, (error: Error | null, result: unknown) => {
        if (error) {
          reject(error);
        } else {
          resolve(result as { violations: unknown[] });
        }
      });
    });

    // 결과 postMessage 발송
    if (vscodeApi) {
      vscodeApi.postMessage({
        type: 'axe-result',
        webviewId,
        violations: results.violations,
      });
    }
  } catch (err) {
    // axe 스캔 실패 시 빈 결과 전송 (타임아웃 방지)
    if (vscodeApi) {
      vscodeApi.postMessage({
        type: 'axe-result',
        webviewId,
        violations: [],
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
