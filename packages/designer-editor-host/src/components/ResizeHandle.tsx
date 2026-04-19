/**
 * ResizeHandle — 범용 리사이즈 핸들 컴포넌트
 * TSK-12-01
 *
 * Props:
 *   value        — 현재 크기 (aria-valuenow)
 *   min          — 최솟값 (aria-valuemin)
 *   max          — 최댓값 (aria-valuemax)
 *   axis         — 'x' | 'y' (방향; aria-orientation: vertical | horizontal)
 *   onDragStart  — pointerdown 시 호출 (useElementResize.startDrag)
 *   onAdjust     — 키보드 이벤트 시 호출 (delta | 'min' | 'max')
 *   class        — 추가 CSS 클래스 (컨텍스트별 커스터마이즈)
 *   data-testid  — 테스트 ID
 *
 * 접근성:
 *   role="separator"
 *   aria-orientation: axis='x' → "vertical", axis='y' → "horizontal"
 *   aria-valuenow/min/max, tabIndex=0
 *
 * 키보드 (axis='y'):
 *   ArrowDown (+10) / ArrowUp (-10) / Home (min) / End (max)
 * 키보드 (axis='x'):
 *   ArrowRight (+10) / ArrowLeft (-10) / Home (min) / End (max)
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
  // aria-orientation: x축 분리선 = "vertical", y축 분리선 = "horizontal"
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
