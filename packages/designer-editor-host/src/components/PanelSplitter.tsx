/**
 * PanelSplitter — 드래그 리사이즈 splitter UI 컴포넌트
 * panel-resize-toggle feature
 *
 * Props:
 *   width      — 현재 패널 너비 (aria-valuenow)
 *   minWidth   — 최소 너비 (aria-valuemin)
 *   maxWidth   — 최대 너비 (aria-valuemax)
 *   onDragStart — pointerdown 시 호출 (usePanelResize.startDrag)
 *   onAdjust   — 키보드 이벤트 시 호출 (delta | 'min' | 'max')
 *
 * 접근성:
 *   role="separator", aria-orientation="vertical",
 *   aria-valuenow/min/max, tabIndex=0
 *
 * 키보드:
 *   ArrowLeft  → onAdjust(-10)
 *   ArrowRight → onAdjust(+10)
 *   Home       → onAdjust('min')
 *   End        → onAdjust('max')
 */

import { h } from 'preact';

export interface PanelSplitterProps {
  width: number;
  minWidth: number;
  maxWidth: number;
  onDragStart: (e: PointerEvent) => void;
  onAdjust: (delta: number | 'min' | 'max') => void;
}

export function PanelSplitter({
  width,
  minWidth,
  maxWidth,
  onDragStart,
  onAdjust,
}: PanelSplitterProps): h.JSX.Element {
  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        onAdjust(-10);
        break;
      case 'ArrowRight':
        e.preventDefault();
        onAdjust(10);
        break;
      case 'Home':
        e.preventDefault();
        onAdjust('min');
        break;
      case 'End':
        e.preventDefault();
        onAdjust('max');
        break;
      default:
        break;
    }
  };

  return (
    <div
      class="panel-splitter"
      data-testid="panel-splitter"
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={width}
      aria-valuemin={minWidth}
      aria-valuemax={maxWidth}
      tabIndex={0}
      onPointerDown={onDragStart as unknown as (e: PointerEvent) => void}
      onKeyDown={handleKeyDown as unknown as (e: KeyboardEvent) => void}
    />
  );
}
