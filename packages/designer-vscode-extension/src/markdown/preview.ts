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

// esbuild define으로 주입되는 test bridge 플래그.
// production 빌드에서는 false로 tree-shaking된다.
declare const FORM_JS_TEST_BRIDGE: boolean;

/** viewer 인스턴스를 보관하는 모듈 스코프 싱글턴 */
export interface FormViewerInstance {
  destroy(): void;
  importSchema?(schema: unknown): Promise<void>;
}

export const instanceMap = new Map<string, FormViewerInstance>();

/**
 * data-schema-id → viewer 인스턴스 LRU 캐시 (capacity=20).
 * webview 생명주기 내에서만 유효, disposeAll() 호출 시 초기화.
 */
export const viewerCache = new LRUCache<string, FormViewerInstance>(20);

/** 지원하는 VSCode 테마 종류와 대응 CSS 클래스 */
const THEME_CLASS_MAP: Record<string, string> = {
  'vscode-light': 'theme-light',
  'vscode-dark': 'theme-dark',
  'vscode-high-contrast': 'theme-high-contrast',
  'vscode-high-contrast-light': 'theme-high-contrast-light',
};

/** 모든 테마 클래스 목록 */
const ALL_THEME_CLASSES = Object.values(THEME_CLASS_MAP);

/** 현재 문서의 모든 .form-js-block 요소를 배열로 반환한다 */
function getFormBlocks(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('.form-js-block'));
}

/**
 * 모든 .form-js-block 요소에 viewer를 마운트한다.
 *
 * - 각 블록 내 hidden <pre class="form-js-source"> 텍스트를 JSON.parse 후
 *   LRU 캐시 조회 → 히트 시 importSchema(), 미스 시 createForm() + 캐시 저장
 * - 파싱 또는 마운트 실패 시 해당 블록에만 .form-js-block--error 배너를 렌더하고
 *   다음 블록 처리 계속
 * - 인스턴스를 instanceMap에 data-schema-id 키로 등록
 */
export async function mountViewers(): Promise<void> {
  const blocks = getFormBlocks();
  // test bridge용 블록 마운트 상태 수집
  const mountStates: BlockMountState[] = [];

  for (const block of blocks) {
    const schemaId = block.dataset['schemaId'] ?? '';
    const pre = block.querySelector<HTMLElement>('pre.form-js-source');

    if (!pre) {
      // form-js-source pre가 없으면 건너뜀
      continue;
    }

    const raw = pre.textContent ?? '';

    let schema: unknown;
    try {
      schema = JSON.parse(raw);
    } catch (err) {
      // JSON 파싱 실패: .form-js-block--error 배너 표시
      renderErrorBanner(block, err instanceof Error ? err.message : String(err));
      mountStates.push({ schemaId, hasError: true });
      continue;
    }

    try {
      // LRU 캐시 조회
      if (schemaId && viewerCache.has(schemaId)) {
        const cached = viewerCache.get(schemaId)!;
        if (typeof cached.importSchema === 'function') {
          await cached.importSchema(schema);
        }
        // instanceMap도 갱신 (최신 상태 유지)
        instanceMap.set(schemaId, cached);
      } else {
        // 캐시 미스: 새 viewer 인스턴스 생성
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
      // createForm / importSchema 실패: .form-js-block--error 배너 표시
      renderErrorBanner(block, err instanceof Error ? err.message : String(err));
      mountStates.push({ schemaId, hasError: true });
    }
  }

  // test bridge: 마운트 완료 postMessage 발송 (FORM_JS_TEST_BRIDGE=true 시에만)
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
      // acquireVsCodeApi 실패는 무시 (비 webview 환경)
    }
  }
}

/**
 * instanceMap과 viewerCache의 모든 인스턴스를 dispose하고 비운다.
 * 미리보기 재로드 시 중복 마운트를 방지하기 위해 mountViewers() 전에 호출한다.
 * 패널 재열림 시 캐시가 초기화된다 (webview 생명주기 계약).
 */
export function disposeAll(): void {
  for (const instance of instanceMap.values()) {
    try {
      instance.destroy();
    } catch {
      // destroy 실패는 무시 (이미 해제된 인스턴스 등)
    }
  }
  instanceMap.clear();
  viewerCache.clear();
}

/**
 * 모든 .form-js-block 요소에 현재 VSCode 테마에 맞는 CSS 클래스를 적용한다.
 *
 * @param themeKind body[data-vscode-theme-kind] 속성값
 *   e.g. 'vscode-light' | 'vscode-dark' | 'vscode-high-contrast' | 'vscode-high-contrast-light'
 */
export function applyTheme(themeKind: string): void {
  const targetClass = THEME_CLASS_MAP[themeKind];
  const blocks = getFormBlocks();

  for (const block of blocks) {
    // 기존 테마 클래스 모두 제거
    for (const cls of ALL_THEME_CLASSES) {
      block.classList.remove(cls);
    }
    // 새 테마 클래스 추가 (알 수 없는 테마면 추가하지 않음)
    if (targetClass) {
      block.classList.add(targetClass);
    }
  }
}

/**
 * body[data-vscode-theme-kind] 변화를 구독하는 MutationObserver.
 * 테마 전환 시 applyTheme()를 즉시 호출한다.
 */
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

/**
 * 웹뷰 초기화 진입점.
 * DOMContentLoaded 또는 이미 로드된 경우 즉시 실행.
 */
function init(): void {
  disposeAll();
  const themeKind = document.body.getAttribute('data-vscode-theme-kind') ?? '';
  applyTheme(themeKind);
  mountViewers().catch((err) => {
    console.error('[form-js preview] mountViewers 실패:', err);
  });
  startThemeObserver();
}

// 브라우저 환경에서만 자동 실행 (테스트 환경에서는 직접 호출)
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
