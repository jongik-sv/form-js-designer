/**
 * useViewportWidth — ADR-0001 §3 D5 Viewport parity 구현 훅
 *
 * ResizeObserver로 캔버스 너비 변동을 감지하여 callback으로 전파한다.
 * 마이크로태스크 디바운스 없이 즉시 전달 (단순 구현).
 *
 * @param ref - 관찰할 HTML 요소에 대한 Ref
 * @param cb  - 너비 변경 시 호출되는 callback
 */

import { useLayoutEffect } from 'preact/hooks';
import type { Ref } from 'preact';

export function useViewportWidth(
  ref: Ref<HTMLDivElement>,
  cb: (width: number) => void,
): void {
  useLayoutEffect(() => {
    const el = (ref as { current?: HTMLDivElement | null }).current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        cb(entry.contentRect.width);
      }
    });

    ro.observe(el);

    return () => {
      ro.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
