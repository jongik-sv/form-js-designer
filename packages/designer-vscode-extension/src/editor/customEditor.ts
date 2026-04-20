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
import type { EditOpenedMessage, SaveSchemaMessage } from '../shared/messages';

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
}

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
    additionalModules: [customComponentsModule],
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

/**
 * form-js editor를 #app 컨테이너에 마운트한다.
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

  try {
    editorInstance = await createFormEditor({
      container,
      schema,
      additionalModules: [customComponentsModule],
    }) as FormEditorInstance;
  } catch (err) {
    console.error('[form-js editor] createFormEditor 실패:', err);
    container.textContent = `편집기 초기화 실패: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * extension host로 save-schema 메시지를 송신한다.
 * TSK-02-04: uri, mdStart, mdEnd, docVersion 포함.
 */
export function sendSaveSchema(): void {
  if (!vscodeApi || !editorInstance) return;

  try {
    const rawSchema = typeof editorInstance.getSchema === 'function'
      ? editorInstance.getSchema()
      : typeof editorInstance.saveSchema === 'function'
        ? editorInstance.saveSchema()
        : null;

    const msg: SaveSchemaMessage = {
      type: 'save-schema',
      uri: currentUri,
      mdStart: currentMdStart,
      mdEnd: currentMdEnd,
      schema: rawSchema != null ? JSON.stringify(rawSchema) : '{}',
      docVersion: lastKnownDocVersion,
    };
    vscodeApi.postMessage(msg);
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
      if (result.ok) {
        showSaveToast('저장되었습니다.');
      } else if (result.error !== 'cancelled') {
        showErrorBanner(`저장 실패: ${result.error ?? '알 수 없는 오류'}`);
      }
      return;
    }
  });

  // 저장 버튼 wiring (TSK-02-04)
  const saveBtn = document.querySelector<HTMLElement>('[data-testid="form-js-save-button"]');
  if (saveBtn) {
    saveBtn.addEventListener('click', sendSaveSchema);
  }

  // Cmd+S / Ctrl+S keydown 캡처
  window.addEventListener('keydown', (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 's') {
      event.preventDefault();
      sendSaveSchema();
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
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
