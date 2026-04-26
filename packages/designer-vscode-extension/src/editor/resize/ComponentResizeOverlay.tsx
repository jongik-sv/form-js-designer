/**
 * ComponentResizeOverlay — designer-editor-host에서 포팅 (TSK-12-02).
 *
 * 선택된 대상 컴포넌트 하단에 ResizeHandle(axis='y')을 position:fixed로 띄운다.
 * drag 종료 시 modeling.editFormField(field, 'layout', { ...layout, height }) 호출.
 *
 * 대상 타입: LAYOUT_HEIGHT_TARGET_TYPES (designer-runtime).
 */

import { h } from 'preact';
import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { ResizeHandle } from './ResizeHandle';
import { useElementResize } from './useElementResize';
import { LAYOUT_HEIGHT_TARGET_TYPES } from '@form-js-designer/designer-runtime/modules';

const HEIGHT_MIN = 36;
const HEIGHT_MAX = 2000;
const HANDLE_HEIGHT = 6;

interface AnyField {
  id: string;
  type: string;
  layout?: { height?: number; [key: string]: unknown };
  [key: string]: unknown;
}

interface EventBusLike {
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
}

interface ModelingLike {
  editFormField(field: unknown, key: string, value: unknown): void;
}

interface EditorLike {
  get(svc: string, required?: boolean): unknown;
}

export interface ComponentResizeOverlayProps {
  editor: EditorLike;
}

interface HandlePos {
  top: number;
  left: number;
  width: number;
}

function isTargetType(type: string): boolean {
  return (LAYOUT_HEIGHT_TARGET_TYPES as readonly string[]).includes(type);
}

function getFieldEl(fieldId: string): HTMLElement | null {
  return (
    (document.querySelector(`[data-id="${CSS.escape(fieldId)}"]`) as HTMLElement | null) ??
    (document.querySelector(`[data-fjs-id="${CSS.escape(fieldId)}"]`) as HTMLElement | null)
  );
}

function measureHandlePos(fieldId: string): HandlePos | null {
  const el = getFieldEl(fieldId);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return {
    top: rect.bottom - HANDLE_HEIGHT / 2,
    left: rect.left,
    width: rect.width,
  };
}

export function ComponentResizeOverlay({ editor }: ComponentResizeOverlayProps): h.JSX.Element | null {
  const [selectedField, setSelectedField] = useState<AnyField | null>(null);
  const [handlePos, setHandlePos] = useState<HandlePos | null>(null);
  const rafRef = useRef<number | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingRef = useRef(false);

  const selectedFieldRef = useRef<AnyField | null>(null);
  selectedFieldRef.current = selectedField;

  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const observedElRef = useRef<HTMLElement | null>(null);

  const updatePos = useCallback((fieldId: string) => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => {
        setHandlePos(measureHandlePos(fieldId));
      });
    });
  }, []);

  const observeTarget = useCallback((fieldId: string | null) => {
    if (resizeObserverRef.current && observedElRef.current) {
      resizeObserverRef.current.unobserve(observedElRef.current);
    }
    observedElRef.current = null;

    if (!fieldId || typeof ResizeObserver === 'undefined') return;
    const el = getFieldEl(fieldId);
    if (!el) return;

    if (!resizeObserverRef.current) {
      resizeObserverRef.current = new ResizeObserver(() => {
        const f = selectedFieldRef.current;
        if (!f) return;
        setHandlePos(measureHandlePos(f.id));
      });
    }
    resizeObserverRef.current.observe(el);
    observedElRef.current = el;
  }, []);

  const {
    value: heightValue,
    setValue: setHeightValue,
    adjust,
    startDrag: startDragBase,
  } = useElementResize({
    axis: 'y',
    initial: 75,
    min: HEIGHT_MIN,
    max: HEIGHT_MAX,
    onCommit: useCallback(
      (newHeight: number) => {
        isDraggingRef.current = false;
        const field = selectedFieldRef.current;
        if (!field) return;
        const modeling = editor.get('modeling', false) as ModelingLike | undefined;
        if (!modeling) return;
        const layout = (field.layout ?? {}) as Record<string, unknown>;
        modeling.editFormField(field, 'layout', { ...layout, height: newHeight });
      },
      [editor],
    ),
  });

  const startDrag = useCallback((e: PointerEvent) => {
    isDraggingRef.current = true;
    const field = selectedFieldRef.current;
    let measured: number | undefined;
    if (field) {
      const el = getFieldEl(field.id);
      if (el) {
        const h = Math.round(el.getBoundingClientRect().height);
        if (h > 0) measured = h;
      }
    }
    startDragBase(e, measured);
  }, [startDragBase]);

  useEffect(() => {
    const eventBus = editor.get('eventBus', false) as EventBusLike | undefined;
    if (!eventBus) return;

    const registry = editor.get('formFieldRegistry', false) as
      | { get: (id: string) => unknown }
      | undefined;

    const onSelectionChanged = (e: unknown) => {
      const event = e as {
        selection?:
          | { type?: string; id?: string; layout?: { height?: number } }
          | Array<{ type?: string; id?: string; layout?: { height?: number } }>
          | null;
      };
      const raw = event?.selection ?? null;
      const sel = Array.isArray(raw) ? (raw[0] ?? null) : raw;
      const selId = sel?.id;

      if (!selId) {
        if (isDraggingRef.current) return;
        if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
        clearTimerRef.current = setTimeout(() => {
          if (!isDraggingRef.current) {
            setSelectedField(null);
            setHandlePos(null);
            observeTarget(null);
          }
          clearTimerRef.current = null;
        }, 200);
        return;
      }

      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
        clearTimerRef.current = null;
      }

      const selType = sel?.type ?? (registry?.get(selId) as AnyField | null)?.type;
      if (!selType || !isTargetType(selType)) {
        setSelectedField(null);
        setHandlePos(null);
        observeTarget(null);
        return;
      }

      const fullField = (registry?.get(selId) as AnyField | null) ?? (sel as AnyField);
      setSelectedField(fullField);

      const initH = fullField.layout?.height ?? 75;
      setHeightValue(initH);
      updatePos(selId);
      observeTarget(selId);
    };

    const onElementsChanged = () => {
      const f = selectedFieldRef.current;
      if (f) updatePos(f.id);
    };

    const onPostExecuted = (e: unknown) => {
      const event = e as { context?: { element?: { id?: string; type?: string } } };
      const id = event?.context?.element?.id ?? selectedFieldRef.current?.id;
      if (!id) return;
      const f = registry?.get(id) as AnyField | null;
      if (!f || !isTargetType(f.type)) return;
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
        clearTimerRef.current = null;
      }
      setSelectedField(f);
      const h = f.layout?.height ?? 75;
      setHeightValue(h);
      updatePos(id);
      observeTarget(id);
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
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      observedElRef.current = null;
    };
  }, [editor, setHeightValue, updatePos, observeTarget]);

  if (!selectedField) return (
    <div data-testid="component-resize-overlay-mounted" style={{ display: 'none' }} />
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
      class="fjs-designer-component-resize"
      data-field-id={selectedField.id}
      style={style}
    >
      <ResizeHandle
        value={heightValue}
        min={HEIGHT_MIN}
        max={HEIGHT_MAX}
        axis="y"
        onDragStart={startDrag}
        onAdjust={adjust}
        class="fjs-designer-component-resize__handle"
        data-testid="component-resize-handle"
      />
    </div>
  );
}
