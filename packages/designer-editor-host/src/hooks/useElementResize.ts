/**
 * useElementResize — 범용 요소 리사이즈 커스텀 훅
 * TSK-12-01
 *
 * 반환값:
 *   value      — 현재 크기 (px)
 *   setValue   — 직접 설정 (min/max 클램프 적용)
 *   adjust     — 키보드용: delta(number) | 'min' | 'max'
 *   startDrag  — pointerdown 핸들러 (ResizeHandle 또는 PanelSplitter에 전달)
 *
 * axis:
 *   'x' — 가로 드래그 (startX - currentX = 크기 증가, e.g. 패널 너비)
 *   'y' — 세로 드래그 (currentY - startY = 크기 증가, e.g. 행 높이)
 */

import { useState, useCallback, useRef } from 'preact/hooks';

export interface UseElementResizeOptions {
  axis: 'x' | 'y';
  initial: number;
  min: number;
  max: number;
  onChange?: (value: number) => void;
  onCommit?: (value: number) => void;
}

export interface UseElementResizeReturn {
  value: number;
  setValue: (v: number) => void;
  adjust: (delta: number | 'min' | 'max') => void;
  /**
   * pointerdown 핸들러.
   * @param overrideStartValue 드래그 baseline 을 현재 state 대신 명시적으로 지정.
   *   state 업데이트는 비동기이므로 호출자가 setValue 직후 startDrag 해도 valueRef 는
   *   이전 값을 유지한다. 측정한 실제 크기를 delta 기준으로 쓰려면 여기에 전달한다.
   */
  startDrag: (e: PointerEvent, overrideStartValue?: number) => void;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function useElementResize(options: UseElementResizeOptions): UseElementResizeReturn {
  const { axis, initial, min, max, onChange, onCommit } = options;

  const [value, setValueState] = useState<number>(clamp(initial, min, max));

  // 최신 value를 ref로 추적 (startDrag 클로저 캡처 문제 방지)
  const valueRef = useRef(value);
  valueRef.current = value;

  // 최신 콜백 ref (stale closure 방지)
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  const setValue = useCallback(
    (v: number) => {
      setValueState(clamp(v, min, max));
    },
    [min, max],
  );

  const adjust = useCallback(
    (delta: number | 'min' | 'max') => {
      if (delta === 'min') {
        setValueState(min);
      } else if (delta === 'max') {
        setValueState(max);
      } else {
        setValueState((current) => clamp(current + delta, min, max));
      }
    },
    [min, max],
  );

  const startDrag = useCallback(
    (e: PointerEvent, overrideStartValue?: number) => {
      const target = e.currentTarget as HTMLElement | null;
      if (!target) return;

      const pointerId = e.pointerId;
      const startCoord = axis === 'x' ? e.clientX : e.clientY;
      const startValue =
        typeof overrideStartValue === 'number'
          ? clamp(overrideStartValue, min, max)
          : valueRef.current;
      // state 와 ref 도 baseline 으로 동기화 (드래그 중 표시 일관성)
      if (typeof overrideStartValue === 'number' && startValue !== valueRef.current) {
        valueRef.current = startValue;
        setValueState(startValue);
      }

      // pointer capture: 드래그 중 요소 외부로 마우스가 나가도 이벤트 수신
      try {
        target.setPointerCapture(pointerId);
      } catch { /* 일부 환경에서 capture 실패 시 window 리스너로 폴백 */ }

      // body cursor/user-select 오버라이드
      const prevCursor = document.body.style.cursor;
      const prevUserSelect = document.body.style.userSelect;
      document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';

      let lastValue = startValue;
      let cleaned = false;

      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        window.removeEventListener('pointermove', onMove as EventListener);
        window.removeEventListener('pointerup', onEnd as EventListener);
        window.removeEventListener('pointercancel', onEnd as EventListener);
        target.removeEventListener('lostpointercapture', onEnd as EventListener);
        try { target.releasePointerCapture(pointerId); } catch { /* 이미 해제된 경우 무시 */ }
        document.body.style.cursor = prevCursor;
        document.body.style.userSelect = prevUserSelect;
        // onCommit: 드래그 종료 시 1회 호출
        onCommitRef.current?.(lastValue);
      };

      const onMove = (moveEvent: PointerEvent) => {
        const currentCoord = axis === 'x' ? moveEvent.clientX : moveEvent.clientY;
        // x축: startX - currentX (왼쪽 드래그 = 너비 증가)
        // y축: currentY - startY (아래 드래그 = 크기 증가)
        const delta = axis === 'x'
          ? startCoord - currentCoord
          : currentCoord - startCoord;

        const newValue = clamp(startValue + delta, min, max);
        lastValue = newValue;
        setValueState(newValue);
        onChangeRef.current?.(newValue);
      };

      const onEnd = () => cleanup();

      // 모든 종료 경로에서 cleanup — pointerup / pointercancel / lostpointercapture
      window.addEventListener('pointermove', onMove as EventListener);
      window.addEventListener('pointerup', onEnd as EventListener);
      window.addEventListener('pointercancel', onEnd as EventListener);
      target.addEventListener('lostpointercapture', onEnd as EventListener);
    },
    [axis, min, max],
  );

  return { value, setValue, adjust, startDrag };
}
