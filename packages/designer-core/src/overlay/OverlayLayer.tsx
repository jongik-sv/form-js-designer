/**
 * OverlayLayer — TSK-03-01 정식 모듈
 *
 * spike/wysiwyg/src/overlay/OverlayLayer.tsx에서 이관.
 * ADR-0001 §3 D3 불변식 자동 계약 검증 (dev 빌드 전용) 추가.
 *
 * 변경 사항:
 * - `overlayContainer` prop 추가: assertSharedOrigin의 overlayParent로 사용.
 *   미전달 시 overlayRoot.parentElement 사용 (spike 동작 유지).
 * - dev 빌드(`isProductionEnv()===false`)에서 useLayoutEffect 초기 sync 직후
 *   assertSharedOrigin 자동 호출.
 * - isProductionEnv()는 공유 유틸 `../envUtils`에서 import (Remove Duplication).
 */

import { h } from 'preact';
import { useLayoutEffect, useState } from 'preact/hooks';
import { assertSharedOrigin } from './assertSharedOrigin';
import { isProductionEnv } from '../envUtils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface OverlayLayerProps {
  formRoot: HTMLElement;
  selectedIds: readonly string[];
  /**
   * assertSharedOrigin의 overlayParent로 사용할 컨테이너.
   * 전달하지 않으면 OverlayLayer 루트 div의 parentElement를 사용.
   * (dev 빌드에서만 의미 있음)
   */
  overlayContainer?: HTMLElement;
}

interface Box {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function OverlayLayer({ formRoot, selectedIds, overlayContainer }: OverlayLayerProps) {
  const [boxes, setBoxes] = useState<Box[]>([]);

  useLayoutEffect(() => {
    const sync = () => {
      const rootRect = formRoot.getBoundingClientRect();
      const next: Box[] = [];
      for (const id of selectedIds) {
        const el = formRoot.querySelector<HTMLElement>(`[data-fjs-id="${CSS.escape(id)}"]`);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        next.push({
          id,
          left: r.left - rootRect.left,
          top: r.top - rootRect.top,
          width: r.width,
          height: r.height,
        });
      }
      setBoxes(next);
    };

    sync();

    // dev 빌드에서 assertSharedOrigin 자동 호출 (ADR-0001 §3 D3 + D7 가드)
    // overlayContainer가 명시적으로 전달된 경우에만 assert 수행.
    // (overlayRootRef.current?.parentElement은 host app 통합(TSK-03-03)에서 활용)
    if (!isProductionEnv() && overlayContainer) {
      assertSharedOrigin(formRoot, overlayContainer);
    }

    const ro = new ResizeObserver(sync);
    ro.observe(formRoot);
    formRoot.querySelectorAll('[data-fjs-id]').forEach((el) => ro.observe(el as HTMLElement));
    window.addEventListener('resize', sync);
    const raf = requestAnimationFrame(sync);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', sync);
      cancelAnimationFrame(raf);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formRoot, selectedIds.join('|'), overlayContainer]);

  return (
    <div class="fjs-designer-overlay" data-testid="overlay">
      {boxes.map((b) => (
        <div
          key={b.id}
          class="fjs-designer-overlay-selection"
          style={{
            transform: `translate(${b.left}px, ${b.top}px)`,
            width: `${b.width}px`,
            height: `${b.height}px`,
          }}
        >
          {HANDLES.map((dir) => (
            <div
              key={dir}
              class={`fjs-designer-overlay-handle fjs-designer-overlay-handle--${dir}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
