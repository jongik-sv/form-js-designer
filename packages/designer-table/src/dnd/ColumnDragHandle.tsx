/**
 * ColumnDragHandle: useSortable 래퍼
 * leaf header 내부에서만 렌더 (group header drag 비활성)
 * attributes/listeners spread + transform 스타일 적용
 */
import { h } from 'preact';
import type { ComponentChildren } from 'preact';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ColumnDragHandleProps {
  columnId: string;
  children: ComponentChildren;
  isLeaf: boolean;
}

export function ColumnDragHandle({ columnId, children, isLeaf }: ColumnDragHandleProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: columnId, disabled: !isLeaf });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isLeaf ? 'grab' : 'default',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isLeaf ? attributes : {})}
      {...(isLeaf ? listeners : {})}
      data-drag-handle={isLeaf ? 'true' : undefined}
      class="fjs-designer-table__drag-handle"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}
