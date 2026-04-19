/**
 * RowResizeOverlay — TSK-12-03
 *
 * default 루트 행(ChildrenSlot 미관여)에 대해 editor-host 기준으로
 * row DOM rect를 추적하고 ResizeHandle을 렌더한다.
 *
 * ComponentResizeOverlay 패턴 답습.
 * - selection.changed / elements.changed / commandStack.formField.edit.postExecuted 구독
 * - 선택된 field가 자신의 row에서 첫 번째 컴포넌트이거나, 행 내 임의 컴포넌트이면 핸들 표시
 * - drag 종료 시 firstField의 layout.rowHeight만 갱신 (layout.height 독립)
 */

import { h } from 'preact';
import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { ResizeHandle } from './ResizeHandle';
import { useElementResize } from '../hooks/useElementResize';

const ROW_HEIGHT_MIN = 36;
const ROW_HEIGHT_MAX = 2000;
const HANDLE_HEIGHT = 6;

interface AnyField {
  id: string;
  type: string;
  layout?: { rowHeight?: number; height?: number; [key: string]: unknown };
  [key: string]: unknown;
}

interface RowLike {
  id: string;
  components: string[];
}

interface EventBusLike {
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
}

interface ModelingLike {
  editFormField(field: unknown, key: string, value: unknown): void;
}

interface FormLayouterLike {
  getRows(parentId: string): RowLike[];
  getRowForField?: (field: unknown) => RowLike | null;
}

interface EditorLike {
  get(svc: string, required?: boolean): unknown;
}

export interface RowResizeOverlayProps {
  editor: EditorLike;
}

interface HandlePos {
  top: number;
  left: number;
  width: number;
}

function getRowEl(rowId: string): HTMLElement | null {
  return (
    (document.querySelector(`[data-row-id="${CSS.escape(rowId)}"]`) as HTMLElement | null) ??
    null
  );
}

function measureRowHandlePos(rowId: string): HandlePos | null {
  const el = getRowEl(rowId);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return {
    top: rect.bottom - HANDLE_HEIGHT / 2,
    left: rect.left,
    width: rect.width,
  };
}

export function RowResizeOverlay({ editor }: RowResizeOverlayProps): h.JSX.Element | null {
  const [selectedRow, setSelectedRow] = useState<RowLike | null>(null);
  const [firstField, setFirstField] = useState<AnyField | null>(null);
  const [handlePos, setHandlePos] = useState<HandlePos | null>(null);
  const rafRef = useRef<number | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingRef = useRef(false);

  const selectedRowRef = useRef<RowLike | null>(null);
  selectedRowRef.current = selectedRow;

  const firstFieldRef = useRef<AnyField | null>(null);
  firstFieldRef.current = firstField;

  const updatePos = useCallback((rowId: string) => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setHandlePos(measureRowHandlePos(rowId));
    });
  }, []);

  const {
    value: rowHeightValue,
    setValue: setRowHeightValue,
    adjust,
    startDrag: startDragBase,
  } = useElementResize({
    axis: 'y',
    initial: ROW_HEIGHT_MIN,
    min: ROW_HEIGHT_MIN,
    max: ROW_HEIGHT_MAX,
    onCommit: useCallback(
      (newHeight: number) => {
        isDraggingRef.current = false;
        const field = firstFieldRef.current;
        if (!field) return;
        const modeling = editor.get('modeling', false) as ModelingLike | undefined;
        if (!modeling) return;
        // layout.rowHeight만 갱신 — layout.height 등 다른 키는 스프레드로 보존
        const currentLayout = (field.layout ?? {}) as Record<string, unknown>;
        modeling.editFormField(field, 'layout', {
          ...currentLayout,
          rowHeight: newHeight,
        });
      },
      [editor],
    ),
  });

  const startDrag = useCallback((e: PointerEvent) => {
    isDraggingRef.current = true;
    startDragBase(e);
  }, [startDragBase]);

  useEffect(() => {
    const eventBus = editor.get('eventBus', false) as EventBusLike | undefined;
    if (!eventBus) return;

    const registry = editor.get('formFieldRegistry', false) as
      | { get: (id: string) => unknown }
      | undefined;

    const formLayouter = editor.get('formLayouter', false) as FormLayouterLike | undefined;

    const findRowForField = (field: AnyField): RowLike | null => {
      if (!formLayouter) return null;
      if (typeof formLayouter.getRowForField === 'function') {
        return formLayouter.getRowForField(field);
      }
      // fallback: getRows('root') 순회
      try {
        const rows = formLayouter.getRows('root') ?? [];
        for (const row of rows) {
          if ((row.components ?? []).includes(field.id)) return row;
        }
      } catch { /* ignore */ }
      return null;
    };

    const onSelectionChanged = (e: unknown) => {
      const event = e as {
        selection?: { type?: string; id?: string } | null | Array<{ type?: string; id?: string }>;
      };
      const raw = event?.selection ?? null;
      const sel = Array.isArray(raw) ? (raw[0] ?? null) : raw;
      const selId = sel?.id;

      if (!selId) {
        if (isDraggingRef.current) return;
        if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
        clearTimerRef.current = setTimeout(() => {
          if (!isDraggingRef.current) {
            setSelectedRow(null);
            setFirstField(null);
            setHandlePos(null);
          }
          clearTimerRef.current = null;
        }, 200);
        return;
      }

      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
        clearTimerRef.current = null;
      }

      const fullField = (registry?.get(selId) as AnyField | null) ?? (sel as AnyField);
      const row = findRowForField(fullField);

      if (!row) {
        setSelectedRow(null);
        setFirstField(null);
        setHandlePos(null);
        return;
      }

      // 행의 첫 컴포넌트 획득
      const firstId = row.components?.[0];
      const first = firstId
        ? ((registry?.get(firstId) as AnyField | null) ?? null)
        : null;

      setSelectedRow(row);
      setFirstField(first ?? fullField);

      const initH = (first?.layout?.rowHeight ?? fullField.layout?.rowHeight) ?? ROW_HEIGHT_MIN;
      setRowHeightValue(initH);
      updatePos(row.id);
    };

    const onElementsChanged = () => {
      const row = selectedRowRef.current;
      if (row) updatePos(row.id);
    };

    const onPostExecuted = (e: unknown) => {
      const event = e as { context?: { element?: { id?: string } } };
      const id = event?.context?.element?.id ?? firstFieldRef.current?.id;
      if (!id) return;
      const f = registry?.get(id) as AnyField | null;
      if (!f) return;
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
        clearTimerRef.current = null;
      }
      const row = findRowForField(f);
      if (row) {
        const firstId = row.components?.[0];
        const first = firstId ? (registry?.get(firstId) as AnyField | null) : null;
        setFirstField(first ?? f);
        const initH = first?.layout?.rowHeight ?? ROW_HEIGHT_MIN;
        setRowHeightValue(initH);
        setSelectedRow(row);
        updatePos(row.id);
      }
    };

    eventBus.on('selection.changed', onSelectionChanged);
    eventBus.on('elements.changed', onElementsChanged);
    eventBus.on('commandStack.formField.edit.postExecuted', onPostExecuted);

    return () => {
      eventBus.off('selection.changed', onSelectionChanged);
      eventBus.off('elements.changed', onElementsChanged);
      eventBus.off('commandStack.formField.edit.postExecuted', onPostExecuted);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (clearTimerRef.current !== null) clearTimeout(clearTimerRef.current);
    };
  }, [editor, setRowHeightValue, updatePos]);

  if (!selectedRow) return (
    <div data-testid="row-resize-overlay-mounted" style={{ display: 'none' }} />
  );

  const style: Record<string, string | number> = handlePos
    ? {
        position: 'fixed',
        top: `${handlePos.top}px`,
        left: `${handlePos.left}px`,
        width: `${handlePos.width}px`,
        height: `${HANDLE_HEIGHT}px`,
        zIndex: 200,
        pointerEvents: 'none',
      }
    : { display: 'none' };

  return (
    <div
      class="fjs-designer-row-resize"
      data-row-id={selectedRow.id}
      style={style}
    >
      <ResizeHandle
        value={rowHeightValue}
        min={ROW_HEIGHT_MIN}
        max={ROW_HEIGHT_MAX}
        axis="y"
        onDragStart={startDrag}
        onAdjust={adjust}
        class="fjs-designer-row-resize__handle"
        data-testid="row-resize-handle"
      />
    </div>
  );
}
