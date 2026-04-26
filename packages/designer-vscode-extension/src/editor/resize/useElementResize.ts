/**
 * useElementResize — designer-editor-host에서 포팅 (TSK-12-01).
 * pointer 드래그 + 키보드 보정으로 임의 크기를 추적하는 범용 훅.
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
  startDrag: (e: PointerEvent, overrideStartValue?: number) => void;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function useElementResize(options: UseElementResizeOptions): UseElementResizeReturn {
  const { axis, initial, min, max, onChange, onCommit } = options;

  const [value, setValueState] = useState<number>(clamp(initial, min, max));

  const valueRef = useRef(value);
  valueRef.current = value;

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
      if (delta === 'min') setValueState(min);
      else if (delta === 'max') setValueState(max);
      else setValueState((current) => clamp(current + delta, min, max));
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
      if (typeof overrideStartValue === 'number' && startValue !== valueRef.current) {
        valueRef.current = startValue;
        setValueState(startValue);
      }

      try {
        target.setPointerCapture(pointerId);
      } catch { /* fallback to window listeners */ }

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
        try { target.releasePointerCapture(pointerId); } catch { /* already released */ }
        document.body.style.cursor = prevCursor;
        document.body.style.userSelect = prevUserSelect;
        onCommitRef.current?.(lastValue);
      };

      const onMove = (moveEvent: PointerEvent) => {
        const currentCoord = axis === 'x' ? moveEvent.clientX : moveEvent.clientY;
        const delta = axis === 'x'
          ? startCoord - currentCoord
          : currentCoord - startCoord;
        const newValue = clamp(startValue + delta, min, max);
        lastValue = newValue;
        setValueState(newValue);
        onChangeRef.current?.(newValue);
      };

      const onEnd = () => cleanup();

      window.addEventListener('pointermove', onMove as EventListener);
      window.addEventListener('pointerup', onEnd as EventListener);
      window.addEventListener('pointercancel', onEnd as EventListener);
      target.addEventListener('lostpointercapture', onEnd as EventListener);
    },
    [axis, min, max],
  );

  return { value, setValue, adjust, startDrag };
}
