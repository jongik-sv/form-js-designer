/**
 * generic.ts — 플랫폼 SDK 없이 임의 DOM 요소에 form-js viewer를 마운트하는
 * Vanilla JS 어댑터 (fallback / PoC 테스트용)
 *
 * 사용법:
 *   import { genericMount } from '@form-js-designer/designer-notion-adapter';
 *   const unmount = await genericMount(containerEl, schemaJsonString);
 */
import { createForm } from '@bpmn-io/form-js-viewer';
import { themeSync } from '../themeSync';

export interface GenericMountOptions {
  /** 테마 전략 — 기본값 'auto' */
  theme?: 'auto' | 'light' | 'dark';
}

/** 에러 배너 DOM 요소를 생성하여 반환한다. */
function createErrorBanner(message: string): HTMLDivElement {
  const banner = document.createElement('div');
  banner.className = 'form-js-error-banner';
  banner.setAttribute('role', 'alert');
  banner.textContent = `form-js 스키마 오류: ${message}`;
  return banner;
}

/** 블록 루트 + viewer 컨테이너 구조를 생성하여 반환한다. */
function createBlockStructure(): { blockRoot: HTMLDivElement; viewerContainer: HTMLDivElement } {
  const blockRoot = document.createElement('div');
  blockRoot.className = 'form-js-block';
  blockRoot.style.height = 'auto';

  const viewerContainer = document.createElement('div');
  viewerContainer.className = 'form-js-viewer-container';
  blockRoot.appendChild(viewerContainer);

  return { blockRoot, viewerContainer };
}

/**
 * 주어진 container 요소에 form-js viewer를 마운트한다.
 *
 * - 유효하지 않은 JSON 스키마이면 에러 배너를 렌더하고 createForm을 호출하지 않는다.
 * - 반환값: unmount 함수 (viewer destroy + themeSync disconnect + DOM 정리)
 */
export async function genericMount(
  container: HTMLElement,
  schema: string,
  _options: GenericMountOptions = {},
): Promise<() => void> {
  // 기존 내용 초기화
  container.innerHTML = '';

  // JSON 파싱 검증
  let parsedSchema: unknown;
  try {
    parsedSchema = JSON.parse(schema);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : '유효하지 않은 JSON입니다.';
    container.appendChild(createErrorBanner(errorMsg));
    return () => { container.innerHTML = ''; };
  }

  const { blockRoot, viewerContainer } = createBlockStructure();
  container.appendChild(blockRoot);

  // 테마 동기화
  const disconnectTheme = themeSync(blockRoot);

  // form-js viewer 생성
  const form = await createForm({
    container: viewerContainer,
    schema: parsedSchema,
  });

  return () => {
    disconnectTheme();
    form.destroy();
    container.innerHTML = '';
  };
}
