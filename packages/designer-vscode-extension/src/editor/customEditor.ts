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

import { h, render } from 'preact';
import { createFormEditor } from '@bpmn-io/form-js-editor';
import { customComponentsModule } from '../components';
// Tabs/Card 등 커스텀 container의 자식 row를 얻으려면 form-js 기본 formLayouter를
// DesignerFormLayouter로 교체해야 한다. preview.ts와 동일한 모듈 조합 유지.
import { DesignerContainerModule } from '@form-js-designer/designer-core';
// 대상 타입(textarea/html/table/group/card/modal/tabs/tabPanel/iframe/image/text)에
// layout.height inline style을 자동 주입하는 form-js 모듈 (TSK-12-02 포팅).
import { LayoutHeightModule } from '@form-js-designer/designer-runtime/modules';
// form-js 기본 properties panel에 "Custom properties" 그룹을 추가하는 provider
import { PropsPanelModule, PropsPanelService } from './propsPanel/PropsPanelService';
import {
  readStoredPanelMode,
  writeStoredPanelMode,
  type PanelMode,
} from '@form-js-designer/designer-core';
import { PropsPanelModeToggle } from './propsPanel/PropsPanelModeToggle';
// 선택된 대상 컴포넌트 하단에 height resize 핸들을 띄우는 Preact 오버레이.
import { ComponentResizeOverlay } from './resize/ComponentResizeOverlay';
import { OutlineModule } from '@form-js-designer/designer-editor-host/modules/outline';
import { InlineLabelEditModule } from '@form-js-designer/designer-editor-host/modules/inline-label-edit';
import { ShortcutModule } from '@form-js-designer/designer-editor-host/modules/shortcut';
import { LeftRailTabs, type LeftRailTab } from './leftRail/LeftRailTabs';
import { relocatePalette } from './leftRail/relocatePalette';
import { mountPanelResize, reattachRightHandle } from './leftRail/PanelResizeModule';
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
  PropsPanelModule,
  LayoutHeightModule,
  OutlineModule,
  InlineLabelEditModule,
  ShortcutModule,
];

const RESIZE_OVERLAY_ROOT_ID = 'component-resize-overlay-root';
const PROPS_PANEL_MODE_TOGGLE_SLOT_ID = 'props-panel-mode-toggle-slot';

function ensureResizeOverlayRoot(): HTMLElement {
  let root = document.getElementById(RESIZE_OVERLAY_ROOT_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = RESIZE_OVERLAY_ROOT_ID;
    document.body.appendChild(root);
  }
  return root;
}

/**
 * Current Simple/Full mode for the webview. Module-level so re-mounts share
 * the value (sessionStorage backs the persisted reload value, this just keeps
 * the in-memory render in sync between toggle clicks).
 *
 * FU-C: vscode always starts in Simple mode — sessionStorage is intentionally
 * ignored on boot. The toggle UI remains so users can switch to Full within
 * the session. Any Full preference stored in sessionStorage from a prior
 * session is silently discarded on next open.
 */
let currentPanelMode: PanelMode = 'simple';

/**
 * Mount the Simple/Full toggle inside `.fjs-properties-container`. form-js
 * recreates the container element on each editor re-mount, so this function
 * runs after every `mountEditor()` call. It also seeds the panel's
 * `data-mode` attribute (used by Simple-mode CSS rules in
 * `media/form-js-editor-host.css`) and pushes the initial mode into
 * `propsPanel.setMode()` — required because form-js may have already done a
 * synchronous reflow before the constructor's sessionStorage seed lands in
 * a re-mount scenario.
 */
function mountPropsPanelModeToggle(
  editor: FormEditorInstance | null,
): void {
  if (!editor || typeof editor.get !== 'function') return;
  const propsContainer = document.querySelector('.fjs-properties-container');
  if (!propsContainer) return;

  // Slot div placed as the first child of .fjs-properties-container so the
  // toggle sits above the bio-properties-panel header.
  let slot = document.getElementById(PROPS_PANEL_MODE_TOGGLE_SLOT_ID);
  if (!slot || !propsContainer.contains(slot)) {
    slot = document.createElement('div');
    slot.id = PROPS_PANEL_MODE_TOGGLE_SLOT_ID;
    propsContainer.insertBefore(slot, propsContainer.firstChild);
  }

  const editorGet = editor.get as ((name: string, strict?: boolean) => unknown) | undefined;
  const propsPanelService = editorGet
    ? (editorGet('propsPanel', false) as PropsPanelService | undefined)
    : undefined;

  const applyMode = (mode: PanelMode): void => {
    currentPanelMode = mode;
    writeStoredPanelMode(mode);
    propsContainer.setAttribute('data-mode', mode);
    propsPanelService?.setMode(mode);
    // Force the native panel to rebuild against the new mode. _render() is
    // private but stable in bio-properties-panel; fall back to a selection
    // cycle if it's missing.
    // TODO: replace with public API once bio-properties-panel exposes it (currently private)
    try {
      if (!editorGet) return;
      const pp = editorGet('propertiesPanel', false) as
        | { update?: () => void; _render?: () => void }
        | undefined;
      if (typeof pp?.update === 'function') {
        pp.update();
      } else if (typeof pp?._render === 'function') {
        pp._render();
      } else {
        const selection = editorGet('selection', false) as
          | { get?: () => unknown[]; set?: (s: unknown) => void }
          | undefined;
        const cur = selection?.get?.() ?? [];
        selection?.set?.(null);
        selection?.set?.(cur);
      }
    } catch {
      /* panel may not be initialized yet — next selection will pick up mode */
    }
    // Re-render the toggle so the active button reflects the new mode.
    renderToggle();
  };

  const renderToggle = (): void => {
    render(
      h(PropsPanelModeToggle, {
        mode: currentPanelMode,
        onChange: applyMode,
      }),
      slot!,
    );
  };

  // Seed: ensure the panel reflects the persisted mode on every mount, even
  // if the constructor's sessionStorage seed already ran (re-mount keeps the
  // toggle UI in sync with the service state).
  propsContainer.setAttribute('data-mode', currentPanelMode);
  propsPanelService?.setMode(currentPanelMode);
  renderToggle();
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

/** 좌측 rail 핸들이 한 번 부착되면 true — 재마운트 시 우측 핸들만 reattach. */
let panelResizeMounted = false;

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
  const editorHost = document.getElementById('editor-host');
  if (!editorHost) {
    console.error('[form-js editor] #editor-host 컨테이너를 찾을 수 없습니다.');
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
    // resize overlay도 함께 unmount — 다음 render() 호출에서 새 editor 인스턴스로 교체됨
    const existing = document.getElementById(RESIZE_OVERLAY_ROOT_ID);
    if (existing) {
      try { render(null, existing); } catch { /* unmount 실패 무시 */ }
    }
    // Props-panel toggle slot is destroyed alongside .fjs-properties-container
    // by form-js, but unmount the Preact tree first to avoid orphaned hooks.
    const toggleSlot = document.getElementById(PROPS_PANEL_MODE_TOGGLE_SLOT_ID);
    if (toggleSlot) {
      try { render(null, toggleSlot); } catch { /* unmount 실패 무시 */ }
    }
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
      container: editorHost,
      schema,
      additionalModules: EDITOR_MODULES,
    })) as FormEditorInstance;
  } catch (err) {
    console.error('[form-js editor] createFormEditor 실패:', err);
    editorHost.textContent = `편집기 초기화 실패: ${err instanceof Error ? err.message : String(err)}`;
    return;
  }

  // outline mount — left-rail outline slot
  const outlineSlot = document.querySelector(
    '#left-rail-panel-outline'
  ) as HTMLElement | null;
  if (outlineSlot && typeof editorInstance.get === 'function') {
    try {
      const outlinePanel = editorInstance.get('outlinePanel', false) as
        | { mount?: (el: HTMLElement) => void }
        | undefined;
      outlinePanel?.mount?.(outlineSlot);
    } catch {
      /* outline 서비스 없으면 무시 */
    }
  }

  // 팔레트 reparent — form-js editor 팔레트를 components 슬롯으로 이동
  const paletteSlot = document.querySelector(
    '#left-rail-panel-components'
  ) as HTMLElement | null;
  if (paletteSlot) relocatePalette(editorHost, paletteSlot);

  // left-rail 탭 wiring (Preact mount)
  const tabsRoot = document.getElementById('left-rail-tabs');
  const rail = document.getElementById('left-rail');
  if (tabsRoot && rail) {
    let tab: LeftRailTab = (rail.getAttribute('data-active-panel') as LeftRailTab) ?? 'components';
    const renderTabs = (): void => {
      render(
        h(LeftRailTabs, {
          activeTab: tab,
          onTabChange: (next: LeftRailTab) => {
            tab = next;
            rail.setAttribute('data-active-panel', next);
            renderTabs();
          },
        }),
        tabsRoot,
      );
    };
    renderTabs();
  }

  // 컴포넌트 height resize 핸들 — body 직속 root에 Preact render. position:fixed 라
  // 좌표는 viewport 기준이며 #app 레이아웃과 무관.
  const overlayRoot = ensureResizeOverlayRoot();
  render(h(ComponentResizeOverlay, { editor: editorInstance as unknown as { get: (svc: string, required?: boolean) => unknown } }), overlayRoot);

  // Mount Simple/Full props-panel toggle inside .fjs-properties-container
  // (form-js's native right-side panel). Re-runs on every mountEditor since
  // form-js recreates the container element each time.
  mountPropsPanelModeToggle(editorInstance);

  // 좌측 rail / 우측 properties 패널 가장자리에 split-handle 삽입 (drag로 폭 조절).
  // editor 재마운트 시 properties 컨테이너가 새로 생성되므로 reattach.
  if (panelResizeMounted) {
    reattachRightHandle(vscodeApi);
  } else {
    mountPanelResize(vscodeApi);
    panelResizeMounted = true;
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
    const overlayRoot = document.getElementById(RESIZE_OVERLAY_ROOT_ID);
    if (overlayRoot) {
      try { render(null, overlayRoot); } catch { /* 무시 */ }
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
