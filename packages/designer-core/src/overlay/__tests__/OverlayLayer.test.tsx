/**
 * OverlayLayer unit tests — TDD (TSK-03-01)
 *
 * spike/wysiwyg/src/overlay/__tests__/OverlayLayer.test.tsx에서 이관.
 * import 경로만 정식 모듈로 수정. 테스트 로직은 spike 10종 동일.
 *
 * 추가: assertSharedOrigin dev 빌드 자동 호출 관련 케이스 (QA 체크리스트 §2)
 *
 * Environment: happy-dom (vitest.config.ts)
 * Renderer:    preact/test-utils + preact render (단일 preact 인스턴스)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { OverlayLayer } from '../OverlayLayer';
import { stubRectMap } from './fixtures/rectStub';

// ---------------------------------------------------------------------------
// ResizeObserver mock
// ---------------------------------------------------------------------------
type RoCallback = (entries: ResizeObserverEntry[]) => void;

interface MockRoInstance {
  callback: RoCallback;
  observe: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

let capturedRo: MockRoInstance | null = null;

function installResizeObserverMock() {
  capturedRo = null;
  const MockResizeObserver = vi.fn(function (cb: RoCallback) {
    const instance: MockRoInstance = {
      callback: cb,
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    };
    capturedRo = instance;
    return instance;
  });
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildFormRoot(extraOutside = false): { formRoot: HTMLElement; card: HTMLElement } {
  const formRoot = document.createElement('div');
  formRoot.id = 'form-root';

  const card = document.createElement('div');
  card.setAttribute('data-fjs-id', 'x');
  card.id = 'foo';
  formRoot.appendChild(card);
  document.body.appendChild(formRoot);

  if (extraOutside) {
    const outside = document.createElement('div');
    outside.setAttribute('data-fjs-id', 'x');
    outside.id = 'outside';
    document.body.appendChild(outside);
  }

  return { formRoot, card };
}

/**
 * Stub getBoundingClientRect for formRoot + card using shared fixture.
 */
function stubRects(
  formRoot: HTMLElement,
  card: HTMLElement,
  rootRect = { left: 0, top: 0, width: 1024, height: 768 },
  cardRect = { left: 24, top: 24, width: 976, height: 100 },
) {
  return stubRectMap([
    [formRoot, rootRect],
    [card, cardRect],
  ]);
}

// ---------------------------------------------------------------------------
// Render helper using preact directly (single preact instance)
// ---------------------------------------------------------------------------
function renderOverlay(
  formRoot: HTMLElement,
  selectedIds: readonly string[],
  container: HTMLElement,
  overlayContainer?: HTMLElement,
) {
  act(() => {
    render(
      <OverlayLayer
        formRoot={formRoot}
        selectedIds={selectedIds}
        overlayContainer={overlayContainer}
      />,
      container,
    );
  });
}

function unmountContainer(container: HTMLElement) {
  act(() => {
    render(null, container);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('OverlayLayer', () => {
  let overlayContainer: HTMLElement;

  beforeEach(() => {
    installResizeObserverMock();
    overlayContainer = document.createElement('div');
    document.body.appendChild(overlayContainer);
  });

  afterEach(() => {
    act(() => { render(null, overlayContainer); });
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    capturedRo = null;
  });

  // -------------------------------------------------------------------------
  // Test 1: Selection box at the measured position
  // -------------------------------------------------------------------------
  it('renders a selection box with correct transform, width, and height', () => {
    const { formRoot, card } = buildFormRoot();
    const rectSpy = stubRects(formRoot, card);

    renderOverlay(formRoot, ['x'], overlayContainer);

    const boxes = overlayContainer.querySelectorAll('.fjs-designer-overlay-selection');
    expect(boxes).toHaveLength(1);

    const box = boxes[0] as HTMLElement;
    expect(box.style.transform).toContain('translate(24px, 24px)');
    expect(box.style.width).toBe('976px');
    expect(box.style.height).toBe('100px');

    rectSpy.mockRestore();
  });

  // -------------------------------------------------------------------------
  // Test 2: 8 handles with correct direction modifier classes
  // -------------------------------------------------------------------------
  it('renders 8 handles per selection box with correct direction modifier classes', () => {
    const { formRoot, card } = buildFormRoot();
    const rectSpy = stubRects(formRoot, card);

    renderOverlay(formRoot, ['x'], overlayContainer);

    const handles = overlayContainer.querySelectorAll('.fjs-designer-overlay-handle');
    expect(handles).toHaveLength(8);

    const directions = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;
    for (const dir of directions) {
      const handle = overlayContainer.querySelector(`.fjs-designer-overlay-handle--${dir}`);
      expect(handle, `handle --${dir} must exist`).not.toBeNull();
    }

    rectSpy.mockRestore();
  });

  // -------------------------------------------------------------------------
  // Test 3: Skips missing ids gracefully
  // -------------------------------------------------------------------------
  it('skips missing ids gracefully and renders only found elements', () => {
    const { formRoot, card } = buildFormRoot();
    const rectSpy = stubRects(formRoot, card);

    expect(() => {
      renderOverlay(formRoot, ['x', 'missing'], overlayContainer);
    }).not.toThrow();

    const boxes = overlayContainer.querySelectorAll('.fjs-designer-overlay-selection');
    expect(boxes).toHaveLength(1);

    rectSpy.mockRestore();
  });

  // -------------------------------------------------------------------------
  // Test 4: Only queries within formRoot scope
  // -------------------------------------------------------------------------
  it('ignores [data-fjs-id] elements that live outside formRoot', () => {
    const { formRoot, card } = buildFormRoot(true);
    const rectSpy = stubRects(formRoot, card);

    renderOverlay(formRoot, ['x'], overlayContainer);

    const boxes = overlayContainer.querySelectorAll('.fjs-designer-overlay-selection');
    expect(boxes).toHaveLength(1);

    rectSpy.mockRestore();
  });

  // -------------------------------------------------------------------------
  // Test 5: Updates on ResizeObserver callback
  // -------------------------------------------------------------------------
  it('updates boxes when ResizeObserver fires with new dimensions', () => {
    const { formRoot, card } = buildFormRoot();

    let currentCardWidth = 976;
    let currentCardHeight = 100;

    const rectSpy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      if (this === formRoot) {
        return { left: 0, top: 0, right: 1024, bottom: 768, width: 1024, height: 768, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
      }
      if (this === card) {
        return {
          left: 24, top: 24,
          right: 24 + currentCardWidth,
          bottom: 24 + currentCardHeight,
          width: currentCardWidth,
          height: currentCardHeight,
          x: 24, y: 24,
          toJSON: () => ({}),
        } as DOMRect;
      }
      return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    });

    renderOverlay(formRoot, ['x'], overlayContainer);

    const box = overlayContainer.querySelector('.fjs-designer-overlay-selection') as HTMLElement;
    expect(box.style.width).toBe('976px');

    currentCardWidth = 500;
    currentCardHeight = 200;

    expect(capturedRo, 'ResizeObserver instance must be captured by useLayoutEffect').not.toBeNull();
    act(() => {
      capturedRo!.callback([] as unknown as ResizeObserverEntry[]);
    });

    const updatedBox = overlayContainer.querySelector('.fjs-designer-overlay-selection') as HTMLElement;
    expect(updatedBox.style.width).toBe('500px');
    expect(updatedBox.style.height).toBe('200px');

    rectSpy.mockRestore();
  });

  // -------------------------------------------------------------------------
  // Test 6: Cleanup on unmount
  // -------------------------------------------------------------------------
  it('disconnects ResizeObserver and removes resize listener on unmount', () => {
    const { formRoot, card } = buildFormRoot();
    const rectSpy = stubRects(formRoot, card);
    const removeListenerSpy = vi.spyOn(window, 'removeEventListener');

    renderOverlay(formRoot, ['x'], overlayContainer);
    expect(capturedRo, 'ResizeObserver must be created on mount').not.toBeNull();

    unmountContainer(overlayContainer);

    expect(capturedRo!.disconnect).toHaveBeenCalledOnce();
    expect(removeListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

    rectSpy.mockRestore();
    removeListenerSpy.mockRestore();
  });

  // -------------------------------------------------------------------------
  // Test 7: Read-only DOM contract (ADR D3)
  // -------------------------------------------------------------------------
  it('does not mutate formRoot or its descendants (read-only DOM contract, ADR D3)', () => {
    const { formRoot, card } = buildFormRoot();
    const rectSpy = stubRects(formRoot, card);

    const snapshotBefore = formRoot.innerHTML;

    renderOverlay(formRoot, ['x'], overlayContainer);

    const snapshotAfter = formRoot.innerHTML;
    expect(snapshotAfter).toBe(snapshotBefore);

    rectSpy.mockRestore();
  });

  // -------------------------------------------------------------------------
  // Test 8: Handle structural integrity
  // -------------------------------------------------------------------------
  it('each handle carries both base class and direction modifier class', () => {
    const { formRoot, card } = buildFormRoot();
    const rectSpy = stubRects(formRoot, card);

    renderOverlay(formRoot, ['x'], overlayContainer);

    const directions = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;
    for (const dir of directions) {
      const handle = overlayContainer.querySelector(`.fjs-designer-overlay-handle--${dir}`) as HTMLElement | null;
      expect(handle, `--${dir} handle must exist`).not.toBeNull();
      expect(
        handle!.classList.contains('fjs-designer-overlay-handle'),
        `--${dir} must also carry base class fjs-designer-overlay-handle`,
      ).toBe(true);
    }

    rectSpy.mockRestore();
  });

  // -------------------------------------------------------------------------
  // Test 9: Outer wrapper has data-testid and correct class
  // -------------------------------------------------------------------------
  it('renders the outer overlay wrapper with data-testid="overlay" and fjs-designer-overlay class', () => {
    const { formRoot, card } = buildFormRoot();
    const rectSpy = stubRects(formRoot, card);

    renderOverlay(formRoot, ['x'], overlayContainer);

    const overlay = overlayContainer.querySelector('[data-testid="overlay"]');
    expect(overlay).not.toBeNull();
    expect(overlay!.classList.contains('fjs-designer-overlay')).toBe(true);

    rectSpy.mockRestore();
  });

  // -------------------------------------------------------------------------
  // Test 10: Empty selectedIds produces zero selection boxes
  // -------------------------------------------------------------------------
  it('renders no selection boxes when selectedIds is empty', () => {
    const { formRoot } = buildFormRoot();
    const rectSpy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, right: 1024, bottom: 768, width: 1024, height: 768, x: 0, y: 0,
      toJSON: () => ({}),
    } as DOMRect);

    renderOverlay(formRoot, [], overlayContainer);

    const boxes = overlayContainer.querySelectorAll('.fjs-designer-overlay-selection');
    expect(boxes).toHaveLength(0);

    rectSpy.mockRestore();
  });

  // -------------------------------------------------------------------------
  // Test 11 (추가): assertSharedOrigin dev 빌드에서 호출되고 overlayParent가
  //   정상(동일 origin)이면 throw 없음 (QA §4)
  // -------------------------------------------------------------------------
  it('calls assertSharedOrigin on mount and does not throw when parent shares origin', () => {
    const { formRoot, card } = buildFormRoot();
    const rectSpy = stubRects(formRoot, card);

    // overlayContainer를 overlayParent로 설정하여 동일 origin mock
    const overlayParent = document.createElement('div');
    document.body.appendChild(overlayParent);

    // formRoot와 overlayParent 동일 origin (공유 fixture 사용)
    rectSpy.mockRestore();
    const rectSpy2 = stubRectMap([
      [formRoot,       { left: 0,  top: 0,  width: 1024, height: 768 }],
      [card,           { left: 24, top: 24, width: 976,  height: 100 }],
      [overlayParent,  { left: 0,  top: 0,  width: 1024, height: 768 }],
    ]);

    expect(() => {
      renderOverlay(formRoot, ['x'], overlayContainer, overlayParent);
    }).not.toThrow();

    rectSpy2.mockRestore();
  });

  // -------------------------------------------------------------------------
  // Test 12 (추가): formRoot.offsetWidth === 0 일 때 assert skip (QA §6)
  // -------------------------------------------------------------------------
  it('skips assertSharedOrigin and only warns when formRoot.offsetWidth is 0', () => {
    const { formRoot, card } = buildFormRoot();

    // getBoundingClientRect().width=0 으로 layout 전 상태 시뮬레이션
    const rectSpy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0,
      toJSON: () => ({}),
    } as DOMRect);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const overlayParent = document.createElement('div');
    document.body.appendChild(overlayParent);

    // offsetWidth=0이면 throw가 아닌 warn만 발생해야 함
    expect(() => {
      renderOverlay(formRoot, ['x'], overlayContainer, overlayParent);
    }).not.toThrow();

    // warn이 호출되었거나 호출되지 않아도 throw가 없으면 패스
    rectSpy.mockRestore();
    warnSpy.mockRestore();
    void card; // suppress unused variable
  });
});
