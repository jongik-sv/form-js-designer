/**
 * TableDnd — DnD 기능이 통합된 테이블 래퍼
 * dnd-kit 훅(useSensor 등)을 이 파일로 격리하여
 * features.columnReorder=false 시 hook이 호출되지 않도록 한다.
 *
 * 이 컴포넌트는 Table.tsx에서 features.columnReorder=true일 때만 렌더된다.
 */

import { h } from 'preact';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import type { ColumnOrderState } from '@tanstack/react-table';
import type { CellEditAPI } from './cells/useCellEdit';
import { useColumnReorder } from './dnd/useColumnReorder';
import { ColumnDragHandle } from './dnd/ColumnDragHandle';
import { extractLeafIds } from './Table';

// Lazy import of TableCore — avoids circular dependency
// TableCore type re-export
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TableCoreType = (props: any) => any;

interface TableDndProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  field: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  cellEdit: CellEditAPI;
  columnOrder: ColumnOrderState;
  setColumnOrder: (updater: (prev: ColumnOrderState) => ColumnOrderState) => void;
  TableCore: TableCoreType;
}

export function TableDnd({
  field,
  data,
  cellEdit,
  columnOrder,
  setColumnOrder,
  TableCore,
}: TableDndProps) {
  const leafColumnIds = extractLeafIds(field.columns ?? []);

  const { sensors, onDragEnd, leafIds } = useColumnReorder({
    leafColumnIds,
    columnOrder,
    setColumnOrder,
  });

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={leafIds} strategy={horizontalListSortingStrategy}>
        <TableCore
          field={field}
          data={data}
          cellEdit={cellEdit}
          columnOrder={columnOrder}
          setColumnOrder={setColumnOrder}
          DragHandle={ColumnDragHandle}
        />
      </SortableContext>
    </DndContext>
  );
}
