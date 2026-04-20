/**
 * useElementResize 훅 단위 테스트
 * TSK-12-01
 *
 * 검증 항목:
 * - 초기값 설정 (initial, min, max 범위)
 * - x축 drag delta → onChange/onCommit 호출
 * - y축 drag delta → onChange/onCommit 호출
 * - min/max clamp
 * - pointerup 후 추가 pointermove 무시 (cleanup)
 * - adjust(±delta), adjust('min'), adjust('max') — 키보드
 * - setValue 직접 설정
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/preact';
import { useElementResize } from '../hooks/useElementResize';

// PointerEvent 시뮬레이션 헬퍼
function makePointerEvent(
  type: string,
  coords: { clientX?: number; clientY?: number; pointerId?: number } = {},
): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: coords.clientX ?? 0,
    clientY: coords.clientY ?? 0,
    pointerId: coords.pointerId ?? 1,
  });
}

// startDrag를 호출하기 위한 target mock
function makeDragTarget(): HTMLElement {
  const el = document.createElement('div');
  el.setPointerCapture = vi.fn();
  el.releasePointerCapture = vi.fn();
  return el;
}

describe('useElementResize', () => {
  // ----- 1. 초기값 -----
  describe('initial state', () => {
    it('initial value is used when within range', () => {
      const { result } = renderHook(() =>
        useElementResize({ axis: 'x', initial: 300, min: 100, max: 600 }),
      );
      expect(result.current.value).toBe(300);
    });

    it('exposes value, setValue, adjust, startDrag', () => {
      const { result } = renderHook(() =>
        useElementResize({ axis: 'x', initial: 300, min: 100, max: 600 }),
      );
      expect(typeof result.current.value).toBe('number');
      expect(typeof result.current.setValue).toBe('function');
      expect(typeof result.current.adjust).toBe('function');
      expect(typeof result.current.startDrag).toBe('function');
    });
  });

  // ----- 2. setValue (min/max clamp) -----
  describe('setValue', () => {
    it('sets value directly', () => {
      const { result } = renderHook(() =>
        useElementResize({ axis: 'x', initial: 300, min: 100, max: 600 }),
      );
      act(() => result.current.setValue(400));
      expect(result.current.value).toBe(400);
    });

    it('clamps to min when below minimum', () => {
      const { result } = renderHook(() =>
        useElementResize({ axis: 'x', initial: 300, min: 100, max: 600 }),
      );
      act(() => result.current.setValue(50));
      expect(result.current.value).toBe(100);
    });

    it('clamps to max when above maximum', () => {
      const { result } = renderHook(() =>
        useElementResize({ axis: 'x', initial: 300, min: 100, max: 600 }),
      );
      act(() => result.current.setValue(9999));
      expect(result.current.value).toBe(600);
    });
  });

  // ----- 3. adjust — 키보드 -----
  describe('adjust', () => {
    it('increases value by positive delta', () => {
      const { result } = renderHook(() =>
        useElementResize({ axis: 'y', initial: 200, min: 50, max: 800 }),
      );
      act(() => result.current.adjust(10));
      expect(result.current.value).toBe(210);
    });

    it('decreases value by negative delta', () => {
      const { result } = renderHook(() =>
        useElementResize({ axis: 'y', initial: 200, min: 50, max: 800 }),
      );
      act(() => result.current.adjust(-10));
      expect(result.current.value).toBe(190);
    });

    it('clamps to min on adjust below minimum', () => {
      const { result } = renderHook(() =>
        useElementResize({ axis: 'y', initial: 55, min: 50, max: 800 }),
      );
      act(() => result.current.adjust(-10)); // 55 - 10 = 45 → clamped to 50
      expect(result.current.value).toBe(50);
    });

    it('clamps to max on adjust above maximum', () => {
      const { result } = renderHook(() =>
        useElementResize({ axis: 'y', initial: 795, min: 50, max: 800 }),
      );
      act(() => result.current.adjust(10)); // 795 + 10 = 805 → clamped to 800
      expect(result.current.value).toBe(800);
    });

    it('sets value to min when adjust("min")', () => {
      const { result } = renderHook(() =>
        useElementResize({ axis: 'x', initial: 300, min: 100, max: 600 }),
      );
      act(() => result.current.adjust('min'));
      expect(result.current.value).toBe(100);
    });

    it('sets value to max when adjust("max")', () => {
      const { result } = renderHook(() =>
        useElementResize({ axis: 'x', initial: 300, min: 100, max: 600 }),
      );
      act(() => result.current.adjust('max'));
      expect(result.current.value).toBe(600);
    });
  });

  // ----- 4. x축 드래그 — onChange / onCommit -----
  describe('startDrag (x-axis)', () => {
    beforeEach(() => {
      // body style cleanup
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });

    it('calls onChange on pointermove with correct delta (x-axis: startX - currentX = +width)', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useElementResize({ axis: 'x', initial: 300, min: 100, max: 600, onChange }),
      );

      const target = makeDragTarget();
      const downEvent = makePointerEvent('pointerdown', { clientX: 500, pointerId: 1 });
      Object.defineProperty(downEvent, 'currentTarget', { value: target });

      act(() => result.current.startDrag(downEvent));

      // pointermove: clientX = 450 → delta = 500 - 450 = +50 → value = 300 + 50 = 350
      const moveEvent = makePointerEvent('pointermove', { clientX: 450 });
      act(() => window.dispatchEvent(moveEvent));

      expect(onChange).toHaveBeenCalledWith(350);
    });

    it('clamps onChange value to max on x-axis', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useElementResize({ axis: 'x', initial: 300, min: 100, max: 350, onChange }),
      );

      const target = makeDragTarget();
      const downEvent = makePointerEvent('pointerdown', { clientX: 500, pointerId: 1 });
      Object.defineProperty(downEvent, 'currentTarget', { value: target });

      act(() => result.current.startDrag(downEvent));

      // delta = 500 - 400 = +100 → 300 + 100 = 400 → clamped to 350
      const moveEvent = makePointerEvent('pointermove', { clientX: 400 });
      act(() => window.dispatchEvent(moveEvent));

      expect(onChange).toHaveBeenCalledWith(350);
    });

    it('clamps onChange value to min on x-axis', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useElementResize({ axis: 'x', initial: 150, min: 100, max: 600, onChange }),
      );

      const target = makeDragTarget();
      const downEvent = makePointerEvent('pointerdown', { clientX: 500, pointerId: 1 });
      Object.defineProperty(downEvent, 'currentTarget', { value: target });

      act(() => result.current.startDrag(downEvent));

      // delta = 500 - 600 = -100 → 150 - 100 = 50 → clamped to 100
      const moveEvent = makePointerEvent('pointermove', { clientX: 600 });
      act(() => window.dispatchEvent(moveEvent));

      expect(onChange).toHaveBeenCalledWith(100);
    });

    it('calls onCommit once on pointerup', () => {
      const onCommit = vi.fn();
      const { result } = renderHook(() =>
        useElementResize({ axis: 'x', initial: 300, min: 100, max: 600, onCommit }),
      );

      const target = makeDragTarget();
      const downEvent = makePointerEvent('pointerdown', { clientX: 500, pointerId: 1 });
      Object.defineProperty(downEvent, 'currentTarget', { value: target });

      act(() => result.current.startDrag(downEvent));

      const moveEvent = makePointerEvent('pointermove', { clientX: 450 });
      act(() => window.dispatchEvent(moveEvent));

      const upEvent = makePointerEvent('pointerup');
      act(() => window.dispatchEvent(upEvent));

      expect(onCommit).toHaveBeenCalledTimes(1);
      expect(onCommit).toHaveBeenCalledWith(350);
    });

    it('ignores pointermove after pointerup (cleanup)', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useElementResize({ axis: 'x', initial: 300, min: 100, max: 600, onChange }),
      );

      const target = makeDragTarget();
      const downEvent = makePointerEvent('pointerdown', { clientX: 500, pointerId: 1 });
      Object.defineProperty(downEvent, 'currentTarget', { value: target });

      act(() => result.current.startDrag(downEvent));

      // pointerup → cleanup
      const upEvent = makePointerEvent('pointerup');
      act(() => window.dispatchEvent(upEvent));

      const callCountAfterUp = onChange.mock.calls.length;

      // pointermove after pointerup — should be ignored
      const moveEvent = makePointerEvent('pointermove', { clientX: 450 });
      act(() => window.dispatchEvent(moveEvent));

      expect(onChange.mock.calls.length).toBe(callCountAfterUp);
    });

    it('body cursor changes to col-resize during drag', () => {
      const { result } = renderHook(() =>
        useElementResize({ axis: 'x', initial: 300, min: 100, max: 600 }),
      );

      const target = makeDragTarget();
      const downEvent = makePointerEvent('pointerdown', { clientX: 500, pointerId: 1 });
      Object.defineProperty(downEvent, 'currentTarget', { value: target });

      act(() => result.current.startDrag(downEvent));
      expect(document.body.style.cursor).toBe('col-resize');

      const upEvent = makePointerEvent('pointerup');
      act(() => window.dispatchEvent(upEvent));
      // After cleanup cursor should be restored (was '' before drag)
      expect(document.body.style.cursor).toBe('');
    });
  });

  // ----- 5. y축 드래그 -----
  describe('startDrag (y-axis)', () => {
    beforeEach(() => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });

    it('calls onChange on pointermove with correct delta (y-axis: currentY - startY = +height)', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useElementResize({ axis: 'y', initial: 200, min: 50, max: 800, onChange }),
      );

      const target = makeDragTarget();
      const downEvent = makePointerEvent('pointerdown', { clientY: 300, pointerId: 1 });
      Object.defineProperty(downEvent, 'currentTarget', { value: target });

      act(() => result.current.startDrag(downEvent));

      // delta = 330 - 300 = +30 → value = 200 + 30 = 230
      const moveEvent = makePointerEvent('pointermove', { clientY: 330 });
      act(() => window.dispatchEvent(moveEvent));

      expect(onChange).toHaveBeenCalledWith(230);
    });

    it('calls onCommit once on pointercancel', () => {
      const onCommit = vi.fn();
      const { result } = renderHook(() =>
        useElementResize({ axis: 'y', initial: 200, min: 50, max: 800, onCommit }),
      );

      const target = makeDragTarget();
      const downEvent = makePointerEvent('pointerdown', { clientY: 300, pointerId: 1 });
      Object.defineProperty(downEvent, 'currentTarget', { value: target });

      act(() => result.current.startDrag(downEvent));

      const moveEvent = makePointerEvent('pointermove', { clientY: 330 });
      act(() => window.dispatchEvent(moveEvent));

      const cancelEvent = makePointerEvent('pointercancel');
      act(() => window.dispatchEvent(cancelEvent));

      expect(onCommit).toHaveBeenCalledTimes(1);
    });

    it('body cursor changes to row-resize during y-axis drag', () => {
      const { result } = renderHook(() =>
        useElementResize({ axis: 'y', initial: 200, min: 50, max: 800 }),
      );

      const target = makeDragTarget();
      const downEvent = makePointerEvent('pointerdown', { clientY: 300, pointerId: 1 });
      Object.defineProperty(downEvent, 'currentTarget', { value: target });

      act(() => result.current.startDrag(downEvent));
      expect(document.body.style.cursor).toBe('row-resize');

      const upEvent = makePointerEvent('pointerup');
      act(() => window.dispatchEvent(upEvent));
      expect(document.body.style.cursor).toBe('');
    });
  });

  // ----- 6. value state 업데이트 확인 -----
  describe('value state after drag', () => {
    it('value reflects onChange delta on x-axis', () => {
      const { result } = renderHook(() =>
        useElementResize({ axis: 'x', initial: 300, min: 100, max: 600 }),
      );

      const target = makeDragTarget();
      const downEvent = makePointerEvent('pointerdown', { clientX: 500, pointerId: 1 });
      Object.defineProperty(downEvent, 'currentTarget', { value: target });

      act(() => result.current.startDrag(downEvent));

      const moveEvent = makePointerEvent('pointermove', { clientX: 450 });
      act(() => window.dispatchEvent(moveEvent));

      // delta = 500 - 450 = 50 → value = 300 + 50 = 350
      expect(result.current.value).toBe(350);
    });

    it('value reflects onChange delta on y-axis', () => {
      const { result } = renderHook(() =>
        useElementResize({ axis: 'y', initial: 200, min: 50, max: 800 }),
      );

      const target = makeDragTarget();
      const downEvent = makePointerEvent('pointerdown', { clientY: 100, pointerId: 1 });
      Object.defineProperty(downEvent, 'currentTarget', { value: target });

      act(() => result.current.startDrag(downEvent));

      const moveEvent = makePointerEvent('pointermove', { clientY: 130 });
      act(() => window.dispatchEvent(moveEvent));

      // delta = 130 - 100 = 30 → value = 200 + 30 = 230
      expect(result.current.value).toBe(230);
    });
  });

  describe('startDrag overrideStartValue', () => {
    it('uses override as baseline instead of current value (drag delta added to override)', () => {
      const onCommit = vi.fn();
      const { result } = renderHook(() =>
        useElementResize({ axis: 'y', initial: 75, min: 36, max: 2000, onCommit }),
      );

      const target = makeDragTarget();
      const downEvent = makePointerEvent('pointerdown', { clientY: 300, pointerId: 1 });
      Object.defineProperty(downEvent, 'currentTarget', { value: target });

      // override baseline = 308 (실측된 자연 높이), value 는 아직 75
      act(() => result.current.startDrag(downEvent, 308));

      // 50px 아래로 드래그
      const moveEvent = makePointerEvent('pointermove', { clientY: 350 });
      act(() => window.dispatchEvent(moveEvent));

      // value = 308 + (350-300) = 358 (state 이 아닌 override 기준)
      expect(result.current.value).toBe(358);

      const upEvent = makePointerEvent('pointerup', { clientY: 350 });
      act(() => window.dispatchEvent(upEvent));
      expect(onCommit).toHaveBeenCalledWith(358);
    });

    it('override is clamped to min/max', () => {
      const { result } = renderHook(() =>
        useElementResize({ axis: 'y', initial: 100, min: 50, max: 500 }),
      );

      const target = makeDragTarget();
      const downEvent = makePointerEvent('pointerdown', { clientY: 0, pointerId: 1 });
      Object.defineProperty(downEvent, 'currentTarget', { value: target });

      act(() => result.current.startDrag(downEvent, 9999));
      // override 9999 → clamp 500
      expect(result.current.value).toBe(500);
    });
  });
});
