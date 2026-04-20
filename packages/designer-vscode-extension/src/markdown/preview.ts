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
import type { BlockMountState, TestMountCompleteMessage } from '../shared/messages';

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
    } catch {
      // acquireVsCodeApi 실패는 무시
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

// ── TSK-02-01: ✏️ 편집 버튼 + edit-opened/edit-closed 핸들링 ────────────

/**
 * `.form-js-block` 우상단에 ✏️ 편집 버튼(anchor)을 삽입한다.
 *
 * 버튼은 `command:formJs.openBlockEditor?<URI-encoded JSON>` 링크로
 * extension host의 `formJs.openBlockEditor` 커맨드를 활성화한다.
 *
 * @param block - `.form-js-block` DOM 요소
 */
export function mountEditButton(block: HTMLElement): void {
  // 이미 버튼이 있으면 중복 삽입 방지
  if (block.querySelector('.form-js-edit-button')) return;

  const schema = block.dataset['schema'] ?? '';
  const mdStart = block.dataset['mdStart'] ?? '0';
  const mdEnd = block.dataset['mdEnd'] ?? '0';
  const docUri = block.dataset['docUri'] ?? '';

  const args = JSON.stringify({
    uri: docUri,
    mdStart: Number(mdStart),
    mdEnd: Number(mdEnd),
    schema,
  });

  const encodedArgs = encodeURIComponent(args);
  const href = `command:formJs.openBlockEditor?${encodedArgs}`;

  const btn = document.createElement('a');
  btn.className = 'form-js-edit-button';
  btn.href = href;
  btn.title = 'form-js 블록 편집';
  btn.setAttribute('aria-label', 'form-js 블록 편집');
  btn.textContent = '✏️';

  block.appendChild(btn);
}

/**
 * extension → preview 방향 메시지(`edit-opened`, `edit-closed`)를 처리한다.
 *
 * - `edit-opened`: 해당 블록의 ✏️ 버튼을 비활성(aria-disabled)
 * - `edit-closed`: 해당 블록의 ✏️ 버튼을 재활성
 */
export function handleEditMessage(
  event: MessageEvent,
  getBlocks: () => HTMLElement[] = getFormBlocks
): void {
  const data = event.data as { type?: string; mdStart?: number; mdEnd?: number };
  if (!data?.type) return;

  if (data.type === 'edit-opened' || data.type === 'edit-closed') {
    const blocks = getBlocks();
    for (const block of blocks) {
      const blockStart = Number(block.dataset['mdStart'] ?? '-1');
      const blockEnd = Number(block.dataset['mdEnd'] ?? '-1');

      if (blockStart === data.mdStart && blockEnd === data.mdEnd) {
        const btn = block.querySelector<HTMLElement>('.form-js-edit-button');
        if (!btn) continue;

        if (data.type === 'edit-opened') {
          btn.setAttribute('aria-disabled', 'true');
          btn.style.pointerEvents = 'none';
          btn.style.opacity = '0.4';
        } else {
          btn.removeAttribute('aria-disabled');
          btn.style.pointerEvents = '';
          btn.style.opacity = '';
        }
      }
    }
  }
}

function init(): void {
  disposeAll();
  const themeKind = document.body.getAttribute('data-vscode-theme-kind') ?? '';
  applyTheme(themeKind);
  mountViewers().catch((err) => {
    console.error('[form-js preview] mountViewers 실패:', err);
  });
  startThemeObserver();

  // TSK-02-01: 각 블록에 ✏️ 버튼 삽입 + edit 메시지 리스너 등록
  for (const block of getFormBlocks()) {
    mountEditButton(block);
  }
  window.addEventListener('message', (event) => handleEditMessage(event));
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
