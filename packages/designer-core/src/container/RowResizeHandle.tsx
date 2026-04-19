/**
 * RowResizeHandle — ChildrenSlot Row 끝에 삽입되는 행 높이 핸들 컴포넌트.
 * TSK-12-03
 *
 * - modeling 서비스 미존재 시(viewer 환경) null 반환 — 편집기에서만 표시.
 * - drag 종료(onCommit) 시 첫 컴포넌트의 layout.rowHeight만 갱신.
 *   layout.height(개별 컴포넌트 높이)는 절대 변경하지 않는다.
 * - axis='y', min=36, max=2000, 키보드: ArrowDown/Up(+/-10), Home/End.
 */

import { h } from 'preact';
import { useContext, useState, useCallback, useRef } from 'preact/hooks';
import { FormContext } from '@bpmn-io/form-js-viewer';
import type { RowLike } from './rowTypes';

void h;

export type { RowLike };

const ROW_HEIGHT_MIN = 36;
const ROW_HEIGHT_MAX = 2000;

interface ModelingLike {
  editFormField(field: unknown, key: string, value: unknown): void;
}

interface FormFieldRegistryLike {
  get(id: string): unknown;
}

interface AnyField {
  id: string;
  type: string;
  layout?: { rowHeight?: number; height?: number; [key: string]: unknown };
  [key: string]: unknown;
}

export interface RowResizeHandleProps {
  row: RowLike;
  parentField: { id: string };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function RowResizeHandle({ row, parentField: _parentField }: RowResizeHandleProps): h.JSX.Element | null {
  const { getService } = useContext(FormContext) as {
    getService: <T>(type: string, strict?: boolean) => T | undefined;
  };

  const modeling = getService<ModelingLike>('modeling', false);
  const formFieldRegistry = getService<FormFieldRegistryLike>('formFieldRegistry');

  // modeling이 없으면 viewer 환경 → 핸들 미렌더
  if (!modeling) return null;

  const firstId = row.components?.[0];
  const firstField = firstId
    ? (formFieldRegistry?.get(firstId) as AnyField | undefined)
    : undefined;

  const initialHeight = firstField?.layout?.rowHeight ?? ROW_HEIGHT_MIN;
  const [value, setValueState] = useState<number>(clamp(initialHeight, ROW_HEIGHT_MIN, ROW_HEIGHT_MAX));

  const valueRef = useRef(value);
  valueRef.current = value;

  const modelingRef = useRef(modeling);
  modelingRef.current = modeling;

  const firstFieldRef = useRef(firstField);
  firstFieldRef.current = firstField;

  const commit = useCallback((newHeight: number) => {
    const field = firstFieldRef.current;
    if (!field || !modelingRef.current) return;
    // layout.rowHeight만 갱신 — layout.height 등 다른 키는 스프레드로 보존
    const currentLayout = (field.layout ?? {}) as Record<string, unknown>;
    modelingRef.current.editFormField(field, 'layout', {
      ...currentLayout,
      rowHeight: newHeight,
    });
  }, []);

  const adjust = useCallback((delta: number | 'min' | 'max') => {
    setValueState((current) => {
      let next: number;
      if (delta === 'min') {
        next = ROW_HEIGHT_MIN;
      } else if (delta === 'max') {
        next = ROW_HEIGHT_MAX;
      } else {
        next = clamp(current + delta, ROW_HEIGHT_MIN, ROW_HEIGHT_MAX);
      }
      return next;
    });
  }, []);

  const startDrag = useCallback((e: PointerEvent) => {
    const target = e.currentTarget as HTMLElement | null;
    if (!target) return;

    const pointerId = e.pointerId;
    const startY = e.clientY;
    const startValue = valueRef.current;

    try {
      target.setPointerCapture(pointerId);
    } catch { /* capture 실패 시 window 리스너로 폴백 */ }

    const prevCursor = document.body.style.cursor;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'row-resize';
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
      commit(lastValue);
    };

    const onMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientY - startY;
      const newValue = clamp(startValue + delta, ROW_HEIGHT_MIN, ROW_HEIGHT_MAX);
      lastValue = newValue;
      setValueState(newValue);
    };

    const onEnd = () => cleanup();

    window.addEventListener('pointermove', onMove as EventListener);
    window.addEventListener('pointerup', onEnd as EventListener);
    window.addEventListener('pointercancel', onEnd as EventListener);
    target.addEventListener('lostpointercapture', onEnd as EventListener);
  }, [commit]);

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        adjust(10);
        commit(clamp(valueRef.current + 10, ROW_HEIGHT_MIN, ROW_HEIGHT_MAX));
        break;
      case 'ArrowUp':
        e.preventDefault();
        adjust(-10);
        commit(clamp(valueRef.current - 10, ROW_HEIGHT_MIN, ROW_HEIGHT_MAX));
        break;
      case 'Home':
        e.preventDefault();
        adjust('min');
        commit(ROW_HEIGHT_MIN);
        break;
      case 'End':
        e.preventDefault();
        adjust('max');
        commit(ROW_HEIGHT_MAX);
        break;
      default:
        break;
    }
  };

  return (
    <div
      class="fjs-designer-row-resize"
      data-row-id={row.id}
    >
      <div
        class="fjs-designer-row-resize__handle"
        data-testid="row-resize-handle"
        role="separator"
        aria-orientation="horizontal"
        aria-valuenow={value}
        aria-valuemin={ROW_HEIGHT_MIN}
        aria-valuemax={ROW_HEIGHT_MAX}
        tabIndex={0}
        onPointerDown={startDrag as unknown as (e: PointerEvent) => void}
        onKeyDown={handleKeyDown as unknown as (e: KeyboardEvent) => void}
      />
    </div>
  );
}
