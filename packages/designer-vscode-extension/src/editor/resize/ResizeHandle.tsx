/**
 * ResizeHandle — designer-editor-host에서 포팅 (TSK-12-01).
 * role="separator" + 키보드 화살표/Home/End 보정.
 */

import { h } from 'preact';

export interface ResizeHandleProps {
  value: number;
  min: number;
  max: number;
  axis: 'x' | 'y';
  onDragStart: (e: PointerEvent) => void;
  onAdjust: (delta: number | 'min' | 'max') => void;
  class?: string;
  'data-testid'?: string;
}

export function ResizeHandle({
  value,
  min,
  max,
  axis,
  onDragStart,
  onAdjust,
  class: className,
  'data-testid': testId = 'resize-handle',
}: ResizeHandleProps): h.JSX.Element {
  const ariaOrientation = axis === 'x' ? 'vertical' : 'horizontal';

  const handleKeyDown = (e: KeyboardEvent) => {
    const incKey = axis === 'y' ? 'ArrowDown' : 'ArrowRight';
    const decKey = axis === 'y' ? 'ArrowUp' : 'ArrowLeft';

    switch (e.key) {
      case incKey:
        e.preventDefault();
        onAdjust(10);
        break;
      case decKey:
        e.preventDefault();
        onAdjust(-10);
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

  const classes = ['resize-handle', className].filter(Boolean).join(' ');

  return (
    <div
      class={classes}
      data-testid={testId}
      data-axis={axis}
      role="separator"
      aria-orientation={ariaOrientation}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={onDragStart as unknown as (e: PointerEvent) => void}
      onKeyDown={handleKeyDown as unknown as (e: KeyboardEvent) => void}
    />
  );
}
