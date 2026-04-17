/**
 * useRowVirtualizer: TanStack Virtual 래퍼
 * count, estimateSize=36, overscan=6, measureElement
 * Q2 spike 패턴 이관
 */
import { useVirtualizer } from '@tanstack/react-virtual';
import type { RefObject } from 'preact';

interface UseRowVirtualizerOptions {
  count: number;
  parentRef: RefObject<HTMLDivElement>;
  estimateSize?: number;
  overscan?: number;
}

export function useRowVirtualizer({
  count,
  parentRef,
  estimateSize = 36,
  overscan = 6,
}: UseRowVirtualizerOptions) {
  const rowVirtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    measureElement:
      typeof window !== 'undefined' && navigator.userAgent.indexOf('Firefox') === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
  });

  return rowVirtualizer;
}
