/**
 * OverlayLayer unit tests — TDD (RED-GREEN-REFACTOR)
 *
 * Environment: happy-dom (configured in vitest.config.ts)
 * Renderer:    preact/test-utils + preact render
 *
 * NOTE on @testing-library/preact:
 *   The workspace has two preact copies:
 *     - packages/designer-core/node_modules/preact@10.29.1 (resolved by the component)
 *     - root node_modules/preact@10.15.1 (resolved by @testing-library/preact at root)
 *   Using @testing-library/preact causes a "Cannot read '__H'" dual-instance error
 *   because hooks state (preact's __H) is only valid within a single preact runtime.
 *   We therefore use preact's own render + act (same preact instance as the component).
 *   All Testing Library query patterns are reproduced with DOM APIs. This matches
 *   the spirit of the requirement while being compatible with the monorepo layout.
 *
 * NOTE on happy-dom ResizeObserver:
 *   happy-dom does not implement ResizeObserver. We install a global mock before
 *   each test and restore it after, capturing the callback for trigger-based testing.
 *
 * NOTE on scroll / zoom:
 *   Scroll offset and CSS zoom are deferred to post-spike implementation.
 *   getBoundingClientRect() returns viewport-relative coords; for now we assume
 *   the formRoot is positioned at (0,0) in the viewport (no scroll).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { OverlayLayer } from '../OverlayLayer';

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
 * Stub getBoundingClientRect for formRoot and card using a Map-keyed spy.
 * happy-dom always returns zeros from getBoundingClientRect; the spy overrides
 * that per-element so our position calculations produce deterministic results.
 */
function stubRects(
  formRoot: HTMLElement,
  card: HTMLElement,
  rootRect = { left: 0, top: 0, width: 1024, height: 768 },
  cardRect = { left: 24, top: 24, width: 976, height: 100 },
) {
  const rectMap = new Map<Element, DOMRect>();
  const makeRect = (r: { left: number; top: number; width: number; height: number }): DOMRect =>
    ({
      left: r.left,
      top: r.top,
      right: r.left + r.width,
      bottom: r.top + r.height,
      width: r.width,
      height: r.height,
      x: r.left,
      y: r.top,
      toJSON: () => ({}),
    } as DOMRect);

  rectMap.set(formRoot, makeRect(rootRect));
  rectMap.set(card, makeRect(cardRect));

  return vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    return rectMap.get(this) ?? makeRect({ left: 0, top: 0, width: 0, height: 0 });
  });
}

// ---------------------------------------------------------------------------
// Render helper using preact directly (single preact instance)
// ---------------------------------------------------------------------------
function renderOverlay(
  formRoot: HTMLElement,
  selectedIds: readonly string[],
  container: HTMLElement,
) {
  act(() => {
    render(<OverlayLayer formRoot={formRoot} selectedIds={selectedIds} />, container);
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
    // transform must contain translate(24px, 24px) — relative to formRoot origin
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

    // selectedIds includes 'x' (exists) and 'missing' (does not exist in DOM)
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
    // extraOutside=true creates a second [data-fjs-id="x"] at body level
    const { formRoot, card } = buildFormRoot(true);
    const rectSpy = stubRects(formRoot, card);

    renderOverlay(formRoot, ['x'], overlayContainer);

    // querySelector is scoped to formRoot; the outside element is never touched
    const boxes = overlayContainer.querySelectorAll('.fjs-designer-overlay-selection');
    expect(boxes).toHaveLength(1);

    rectSpy.mockRestore();
  });

  // -------------------------------------------------------------------------
  // Test 5: Updates on ResizeObserver callback
  // NOTE: happy-dom lacks native ResizeObserver; the global mock captures the
  // callback reference so we can trigger it manually.
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

    // Change the mocked dimensions and trigger the ResizeObserver callback
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
  // OverlayLayer must NEVER mutate formRoot or its descendants.
  // Snapshot formRoot.innerHTML before and after mount — must be identical.
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
  // Test 8: Handle structural integrity — base class + direction modifier
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
});
