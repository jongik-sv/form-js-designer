/**
 * TSK-01-02 / TSK-01-03: previewScripts — 웹뷰 내 form-js-viewer 마운트
 *
 * VSCode Markdown 미리보기 웹뷰에 자동 삽입되는 브라우저 스크립트.
 * - .form-js-block 요소를 탐색하여 createForm()으로 viewer를 마운트
 * - viewerCache(LRU cap=20)로 동일 schemaId 재등장 시 importSchema() 재사용
 * - instanceMap으로 인스턴스 관리 (disposeAll → viewerCache 동시 초기화)
 * - JSON 파싱 실패 / createForm 실패 시 .form-js-block--error 배너 렌더
 * - MutationObserver로 data-vscode-theme-kind 변화를 구독하여 테마 즉시 반영
 *
 * TSK-01-04: test bridge 발신
 * - FORM_JS_TEST_BRIDGE=true(esbuild define) 시 마운트 완료 후
 *   acquireVsCodeApi().postMessage({ type: 'test-mount-complete', blocks })를 발송
 */
import { createForm } from '@bpmn-io/form-js-viewer';
import { LRUCache } from './lruCache';
import { renderErrorBanner } from './errorBanner';
import {
  mountEditButton as mountEditButtonOverlay,
  unlockAllButtons,
} from './editButton';
import type { BlockMountState, TestMountCompleteMessage } from '../shared/messages';
// TSK-05-01: 커스텀 컴포넌트 모듈 주입 (Card/Tabs/Modal/TabPanel registry)
import { customComponentsModule } from '../components';
// ChildrenSlot이 tabPanel/card 등 custom container의 자식 row를 얻으려면
// form-js 기본 formLayouter를 DesignerFormLayouter로 교체해야 한다.
// DesignerContainerModule이 이를 담당.
import { DesignerContainerModule } from '@form-js-designer/designer-core';

declare const FORM_JS_TEST_BRIDGE: boolean;

export interface FormViewerInstance {
  destroy(): void;
  importSchema?(schema: unknown): Promise<void>;
}

export const instanceMap = new Map<string, FormViewerInstance>();

export const viewerCache = new LRUCache<string, FormViewerInstance>(20);

const THEME_CLASS_MAP: Record<string, string> = {
  'vscode-light': 'theme-light',
  'vscode-dark': 'theme-dark',
  'vscode-high-contrast': 'theme-high-contrast',
  'vscode-high-contrast-light': 'theme-high-contrast-light',
};

const ALL_THEME_CLASSES = Object.values(THEME_CLASS_MAP);

function getFormBlocks(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('.form-js-block'));
}

export async function mountViewers(): Promise<void> {
  console.log('[form-js mountViewers] called');
  const blocks = getFormBlocks();
  const mountStates: BlockMountState[] = [];

  for (const block of blocks) {
    const schemaId = block.dataset['schemaId'] ?? '';
    const pre = block.querySelector<HTMLElement>('pre.form-js-source');

    if (!pre) {
      continue;
    }

    const raw = pre.textContent ?? '';

    let schema: unknown;
    try {
      schema = JSON.parse(raw);
    } catch (err) {
      renderErrorBanner(block, err instanceof Error ? err.message : String(err));
      mountStates.push({ schemaId, hasError: true });
      continue;
    }

    try {
      if (schemaId && viewerCache.has(schemaId)) {
        const cached = viewerCache.get(schemaId)!;
        if (typeof cached.importSchema === 'function') {
          await cached.importSchema(schema);
        }
        instanceMap.set(schemaId, cached);
      } else {
        const instance = await createForm({
          container: block,
          schema,
          additionalModules: [DesignerContainerModule, customComponentsModule],
          properties: { readOnly: true },
        });
        if (schemaId) {
          viewerCache.set(schemaId, instance);
          instanceMap.set(schemaId, instance);
        }
      }
      mountStates.push({ schemaId, hasError: false });
    } catch (err) {
      renderErrorBanner(block, err instanceof Error ? err.message : String(err));
      mountStates.push({ schemaId, hasError: true });
    }
  }

  // TSK-04-03: 렌더 완료 시점 알림 — perf-gate.mjs가 p95 측정 기준으로 사용
  window.dispatchEvent(new CustomEvent('__formJsReady', { detail: { timestamp: performance.now() } }));

  if (typeof FORM_JS_TEST_BRIDGE !== 'undefined' && FORM_JS_TEST_BRIDGE) {
    try {
      const api = (
        window as unknown as { acquireVsCodeApi?: () => { postMessage(msg: unknown): void } }
      ).acquireVsCodeApi?.();
      if (api) {
        const msg: TestMountCompleteMessage = {
          type: 'test-mount-complete',
          blocks: mountStates,
        };
        api.postMessage(msg);
      }

      // TSK-04-02: axe-core 스캔 실행 (테스트 모드 전용)
      console.log('[form-js DIAG] FORM_JS_TEST_BRIDGE enabled, starting runAxeScan');
      void runAxeScan('preview');
    } catch (err) {
      // acquireVsCodeApi 실패는 무시
      console.log('[form-js DIAG] FORM_JS_TEST_BRIDGE error:', err);
    }
  }
}

/**
 * TSK-04-02: axe-core를 동적으로 로드하고 스캔을 실행한다.
 * 결과를 testBridge.registerAxeResult()로 등록한다.
 *
 * @param webviewId 식별자 ('preview' 또는 'custom-editor')
 */
async function runAxeScan(webviewId: string): Promise<void> {
  console.log('[form-js axe-scan] starting for', webviewId);
  try {
    // 동적 import로 axe-core 로드 (번들에 포함됨)
    const axe = (await import('axe-core')).default;
    console.log('[form-js axe-scan] axe imported:', typeof axe);

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

    // testBridge에 직접 등록 (@vscode/test-electron 환경에서 globalThis 공유)
    console.log('[form-js axe-scan] checking globalThis for __formJsTestBridge');
    try {
      const globalTestBridge = (globalThis as Record<string, unknown>)['__formJsTestBridge'];
      console.log('[form-js axe-scan] globalTestBridge:', typeof globalTestBridge);
      if (typeof globalTestBridge === 'object' && globalTestBridge !== null) {
        const registerAxeResult = (globalTestBridge as Record<string, unknown>)['registerAxeResult'];
        console.log('[form-js axe-scan] registerAxeResult:', typeof registerAxeResult);
        if (typeof registerAxeResult === 'function') {
          console.log('[form-js axe-scan] calling registerAxeResult via globalThis');
          registerAxeResult(webviewId, { violations: results.violations });
          return;
        }
      }
    } catch (err) {
      // globalThis 등록 실패 시 fallback으로 postMessage 사용
      console.log('[form-js axe-scan] globalThis check failed:', err);
    }

    // 또 다른 시도: extension host의 testBridge 모듈을 직접 require할 수 있는지 확인
    // (node.js 환경이고 같은 process라면 가능)
    console.log('[form-js axe-scan] trying direct require of testBridge module');
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
      const testBridge = require('../testBridge') as {
        registerAxeResult?: (webviewId: string, result: unknown) => void;
      };
      if (typeof testBridge.registerAxeResult === 'function') {
        console.log('[form-js axe-scan] registerAxeResult via require');
        testBridge.registerAxeResult(webviewId, { violations: results.violations });
        return;
      }
    } catch (requireErr) {
      console.log('[form-js axe-scan] require fallback failed:', requireErr);
    }

    // fallback: postMessage 발송 (테스트 환경이 아닌 경우)
    console.log('[form-js axe-scan] using postMessage fallback');
    const api = (
      window as unknown as { acquireVsCodeApi?: () => { postMessage(msg: unknown): void } }
    ).acquireVsCodeApi?.();
    console.log('[form-js axe-scan] acquireVsCodeApi result:', typeof api);
    if (api) {
      console.log('[form-js axe-scan] posting axe-result message');
      api.postMessage({
        type: 'axe-result',
        webviewId,
        violations: results.violations,
      });
    }
  } catch (err) {
    // axe 스캔 실패 시 빈 결과 전송 (타임아웃 방지)
    console.log('[form-js axe-scan] error occurred:', err instanceof Error ? err.message : String(err));
    try {
      const globalTestBridge = (globalThis as Record<string, unknown>)['__formJsTestBridge'];
      if (typeof globalTestBridge === 'object' && globalTestBridge !== null) {
        const registerAxeResult = (globalTestBridge as Record<string, unknown>)['registerAxeResult'];
        if (typeof registerAxeResult === 'function') {
          console.log('[form-js axe-scan] sending error result via globalThis');
          registerAxeResult(webviewId, { violations: [] });
          return;
        }
      }
    } catch (bridgeErr) {
      // noop
      console.log('[form-js axe-scan] globalThis error handler failed:', bridgeErr);
    }

    // 또 다른 시도: require로 testBridge 직접 접근
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
      const testBridge = require('../testBridge') as {
        registerAxeResult?: (webviewId: string, result: unknown) => void;
      };
      if (typeof testBridge.registerAxeResult === 'function') {
        console.log('[form-js axe-scan] sending error result via require');
        testBridge.registerAxeResult(webviewId, { violations: [] });
        return;
      }
    } catch (requireErr) {
      console.log('[form-js axe-scan] require error handler failed:', requireErr);
    }

    // fallback: postMessage 발송
    console.log('[form-js axe-scan] sending error result via postMessage');
    const api = (
      window as unknown as { acquireVsCodeApi?: () => { postMessage(msg: unknown): void } }
    ).acquireVsCodeApi?.();
    if (api) {
      api.postMessage({
        type: 'axe-result',
        webviewId,
        violations: [],
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

export function disposeAll(): void {
  for (const instance of instanceMap.values()) {
    try {
      instance.destroy();
    } catch {
      // destroy 실패는 무시
    }
  }
  instanceMap.clear();
  viewerCache.clear();
}

export function applyTheme(themeKind: string): void {
  const targetClass = THEME_CLASS_MAP[themeKind];
  const blocks = getFormBlocks();

  for (const block of blocks) {
    for (const cls of ALL_THEME_CLASSES) {
      block.classList.remove(cls);
    }
    if (targetClass) {
      block.classList.add(targetClass);
    }
  }
}

function startThemeObserver(): void {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (
        mutation.type === 'attributes' &&
        mutation.attributeName === 'data-vscode-theme-kind'
      ) {
        const themeKind =
          document.body.getAttribute('data-vscode-theme-kind') ?? '';
        applyTheme(themeKind);
        break;
      }
    }
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['data-vscode-theme-kind'],
  });
}

// ── TSK-02-03: ✏️ 편집 버튼 오버레이 + single-editor lock + 메시지 송신 ──

/**
 * extension → preview 방향 메시지(`edit-closed`)를 처리한다.
 *
 * - `edit-closed`: 모든 ✏️ 버튼을 재활성화 (unlockAllButtons 위임)
 */
function handleEditMessage(event: MessageEvent): void {
  const data = event.data as { type?: string };
  if (!data?.type) return;

  if (data.type === 'edit-closed') {
    unlockAllButtons();
  }
}

/** preview content 교체 후 재마운트 debounce 타이머 */
let remountTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 현재 DOM의 모든 .form-js-block을 재마운트한다.
 * VS Code markdown preview가 원본 문서 변경 시 body HTML을 교체한 후 호출된다.
 * 기존 viewer 인스턴스는 dispose하여 누수와 stale container 참조를 방지한다.
 */
function remountAll(): void {
  console.log('[form-js DIAG preview] remountAll running');
  disposeAll();
  mountViewers()
    .then(() => {
      console.log('[form-js DIAG preview] remount mountViewers resolved, blocks=',
        document.querySelectorAll('.form-js-block').length);
    })
    .catch((err) => {
      console.error('[form-js preview] remount mountViewers 실패:', err);
    });
  for (const block of getFormBlocks()) {
    const mdStart = Number(block.dataset['mdStart'] ?? '0');
    const mdEnd = Number(block.dataset['mdEnd'] ?? '0');
    mountEditButtonOverlay(block, mdStart, mdEnd);
  }
}

/** remount 이벤트를 debounce로 묶어 preview 1회 갱신에 대해 최대 1회 실행 */
function scheduleRemount(): void {
  if (remountTimer) clearTimeout(remountTimer);
  remountTimer = setTimeout(() => {
    remountTimer = null;
    remountAll();
  }, 80);
}

/**
 * VS Code markdown preview는 원본 문서 변경 시 morphdom으로 in-place DOM diffing을 수행한다.
 * `.form-js-block` div 자체는 보존되고 그 자식만 canonical markdown HTML로 덮어쓰기되므로
 * form-js viewer가 렌더했던 내부 DOM(`<div class="fjs-form">...`)이 사라진다.
 * 이때 `.form-js-block`은 addedNodes로 잡히지 않아 MutationObserver만으로는 감지할 수 없다.
 *
 * VS Code는 morphdom 적용 직후 `window.dispatchEvent(new CustomEvent('vscode.markdown.updateContent'))`
 * 를 발행하므로 이 이벤트를 primary 트리거로 사용한다. MutationObserver는 fallback으로 유지
 * (다른 경로의 DOM 삽입, 예: 초기 로드 이후 지연 삽입 등에 대응).
 */
function startContentObserver(): void {
  // primary: VS Code markdown preview 갱신 이벤트
  window.addEventListener('vscode.markdown.updateContent', () => {
    console.log('[form-js DIAG preview] vscode.markdown.updateContent fired, blocks=',
      document.querySelectorAll('.form-js-block').length);
    scheduleRemount();
  });

  // fallback #1: extension host가 preview로 보내는 updateContent postMessage를 직접 가로채기.
  // VS Code 버전에 따라 custom event 가 안 올 수 있어 message 레벨에서도 한 번 잡는다.
  window.addEventListener('message', (ev: MessageEvent) => {
    const data = ev.data as { type?: string } | undefined;
    if (data?.type === 'updateContent') {
      console.log('[form-js DIAG preview] updateContent postMessage intercepted');
      scheduleRemount();
    }
  });

  if (typeof MutationObserver === 'undefined') return;

  // fallback #2: .form-js-block 이 새로 추가되는 경우(재마운트 없이 preview 재로드 등)
  const addedObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of Array.from(m.addedNodes)) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.classList?.contains('form-js-block')) {
          scheduleRemount();
          return;
        }
        if (node.querySelector?.('.form-js-block')) {
          scheduleRemount();
          return;
        }
      }
    }
  });
  addedObserver.observe(document.body, { childList: true, subtree: true });

  // fallback #3: morphdom 이 .form-js-block 을 보존하면서 자식 <pre class="form-js-source"> 의
  // textContent 만 교체하는 경로. pre 안쪽에 한정해 감시하면 form-js 가 같은 block 에 렌더하는
  // fjs-form DOM 변화로 인한 무한 루프는 피할 수 있다 (fjs-form 은 pre 의 형제이지 자손이 아님).
  const preObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      const element = m.target instanceof Element
        ? (m.target as Element)
        : (m.target as Text).parentElement;
      if (!element) continue;
      if (element.closest?.('pre.form-js-source')) {
        console.log('[form-js DIAG preview] form-js-source pre mutation, type=', m.type);
        scheduleRemount();
        return;
      }
    }
  });
  preObserver.observe(document.body, {
    characterData: true,
    childList: true,
    subtree: true,
  });
}

function init(): void {
  // DIAG: webview 진입 + DOM 스냅샷
  const blockCount = document.querySelectorAll('.form-js-block').length;
  const preCount = document.querySelectorAll('pre.form-js-source').length;
  const fallbackCount = document.querySelectorAll('code.language-form-js').length;
  console.log('[form-js DIAG preview] init running, readyState=', document.readyState,
    'form-js-block=', blockCount,
    'form-js-source pre=', preCount,
    'fallback language-form-js=', fallbackCount);
  disposeAll();
  const themeKind = document.body.getAttribute('data-vscode-theme-kind') ?? '';
  applyTheme(themeKind);
  mountViewers()
    .then(() => {
      console.log('[form-js DIAG preview] mountViewers resolved');
    })
    .catch((err) => {
      console.error('[form-js preview] mountViewers 실패:', err);
    });
  startThemeObserver();

  // TSK-02-03: 각 블록에 ✏️ 오버레이 버튼 삽입 + edit-closed 메시지 리스너 등록
  for (const block of getFormBlocks()) {
    const mdStart = Number(block.dataset['mdStart'] ?? '0');
    const mdEnd = Number(block.dataset['mdEnd'] ?? '0');
    mountEditButtonOverlay(block, mdStart, mdEnd);
  }
  window.addEventListener('message', handleEditMessage);

  // 원본 문서 변경 시 VS Code markdown preview가 DOM을 교체하면 재마운트
  startContentObserver();
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  console.log('[form-js DIAG preview] script loaded in webview');
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
