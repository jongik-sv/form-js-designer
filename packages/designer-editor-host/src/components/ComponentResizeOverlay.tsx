/**
 * ComponentResizeOverlay — TSK-12-02
 *
 * 선택된 대상 컴포넌트의 OverlayLayer 하단에 ResizeHandle(axis='y')을 렌더하는 컴포넌트.
 * drag 종료 시 modeling.editFormField(field, 'layout', { ...layout, height }) 호출.
 *
 * 대상 타입: LAYOUT_HEIGHT_TARGET_TYPES (textarea, html, table, group, card, stack, modal, tabs, tabPanel)
 */

import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { ResizeHandle } from './ResizeHandle';
import { useElementResize } from '../hooks/useElementResize';
import { LAYOUT_HEIGHT_TARGET_TYPES } from '@form-js-designer/designer-runtime';

const HEIGHT_MIN = 36;
const HEIGHT_MAX = 2000;

interface AnyField {
  id: string;
  type: string;
  layout?: Record<string, unknown>;
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

function isTargetType(type: string): boolean {
  return (LAYOUT_HEIGHT_TARGET_TYPES as readonly string[]).includes(type);
}

export function ComponentResizeOverlay({ editor }: ComponentResizeOverlayProps): h.JSX.Element | null {
  const [selectedField, setSelectedField] = useState<AnyField | null>(null);

  // 선택된 field의 현재 height 초기값
  const getInitialHeight = useCallback((field: AnyField): number => {
    const layout = field.layout as Record<string, unknown> | undefined;
    const h = layout?.['height'];
    if (typeof h === 'number' && h > 0) return h;
    // DOM에서 실측
    if (typeof document !== 'undefined' && field.id) {
      const el = document.querySelector(`[data-id="${field.id}"]`) as HTMLElement | null;
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.height > 0) return Math.round(rect.height);
      }
    }
    return 75; // fallback
  }, []);

  const [initialHeight, setInitialHeight] = useState<number>(75);

  const {
    value: heightValue,
    setValue: setHeightValue,
    adjust,
    startDrag,
  } = useElementResize({
    axis: 'y',
    initial: initialHeight,
    min: HEIGHT_MIN,
    max: HEIGHT_MAX,
    onCommit: useCallback(
      (newHeight: number) => {
        if (!selectedField) return;
        const modeling = editor.get('modeling', false) as ModelingLike | undefined;
        if (!modeling) return;
        const layout = (selectedField.layout ?? {}) as Record<string, unknown>;
        modeling.editFormField(selectedField, 'layout', { ...layout, height: newHeight });
      },
      [selectedField, editor],
    ),
  });

  useEffect(() => {
    const eventBus = editor.get('eventBus', false) as EventBusLike | undefined;
    if (!eventBus) return;

    const formFieldRegistry = editor.get('formFieldRegistry', false) as {
      get: (id: string) => unknown;
    } | undefined;

    const onSelectionChanged = (e: unknown) => {
      const event = e as { selection?: { id?: string } | null } | undefined;
      const selectedId = event?.selection?.id;

      if (selectedId && formFieldRegistry) {
        const field = formFieldRegistry.get(selectedId) as AnyField | null;
        if (field && isTargetType(field.type)) {
          setSelectedField(field);
          const h = getInitialHeight(field);
          setInitialHeight(h);
          setHeightValue(h);
          return;
        }
      }
      setSelectedField(null);
    };

    eventBus.on('selection.changed', onSelectionChanged);
    return () => {
      eventBus.off('selection.changed', onSelectionChanged);
    };
  }, [editor, getInitialHeight, setHeightValue]);

  if (!selectedField) return null;

  return (
    <div
      class="fjs-designer-component-resize"
      data-field-id={selectedField.id}
      // position absolute within the editor-container context
      // The handle will be positioned by CSS based on the field's actual DOM position
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
