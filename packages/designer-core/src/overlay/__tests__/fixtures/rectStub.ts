/**
 * rectStub — shared test helpers for getBoundingClientRect mocking
 *
 * Design.md 리스크 §2 완화: spike의 `stubRects` 헬퍼를 공유 fixture로 추출.
 * OverlayLayer.test.tsx + assertSharedOrigin.test.ts 양쪽에서 재사용한다.
 */

import { vi } from 'vitest';

export interface RectDef {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function makeRect(r: RectDef): DOMRect {
  return {
    left: r.left,
    top: r.top,
    right: r.left + r.width,
    bottom: r.top + r.height,
    width: r.width,
    height: r.height,
    x: r.left,
    y: r.top,
    toJSON: () => ({}),
  } as DOMRect;
}

/**
 * Stub getBoundingClientRect for a Map of elements.
 * Returns the spy so callers can restore it with `.mockRestore()`.
 */
export function stubRectMap(
  entries: [Element, RectDef][],
): ReturnType<typeof vi.spyOn> {
  const rectMap = new Map<Element, DOMRect>(
    entries.map(([el, def]) => [el, makeRect(def)]),
  );

  return vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: Element) {
      return rectMap.get(this) ?? makeRect({ left: 0, top: 0, width: 0, height: 0 });
    },
  );
}
