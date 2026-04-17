import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  ColumnDef,
  ColumnOrderState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  Header,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { generateRows, Row } from './data';
import { startFpsMeasurement } from './measure-fps';

const ROW_HEIGHT = 36;
const CONTAINER_HEIGHT = 400;

function DraggableHeader({ header }: { header: Header<Row, unknown> }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: header.column.id,
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    width: header.getSize(),
  };
  const canSort = header.column.getCanSort();
  return (
    <div ref={setNodeRef} class="th-cell" style={style}>
      <span
        class="drag-handle"
        {...attributes}
        {...listeners}
        title="컬럼 이동"
        aria-label="drag"
      >
        ⋮⋮
      </span>
      <span
        class={canSort ? 'sort-label' : ''}
        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
      >
        {flexRender(header.column.columnDef.header, header.getContext())}
        {{ asc: ' ▲', desc: ' ▼' }[header.column.getIsSorted() as string] ?? null}
      </span>
    </div>
  );
}

export function Demo() {
  const rows = useMemo(() => generateRows(10000), []);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'score', desc: true }]);
  const [nameFilter, setNameFilter] = useState('');
  const columnFilters = useMemo(
    () => (nameFilter ? [{ id: 'name', value: nameFilter }] : []),
    [nameFilter],
  );

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: 'personal',
        header: '개인정보',
        columns: [
          {
            id: 'basic',
            header: '기본',
            columns: [
              {
                accessorKey: 'id',
                header: 'ID',
                size: 80,
              },
              {
                accessorKey: 'name',
                header: '이름',
                size: 140,
                filterFn: (row, _id, value) =>
                  String(row.getValue('name')).toLowerCase().includes(String(value).toLowerCase()),
              },
            ],
          },
          {
            id: 'contact',
            header: '연락처',
            columns: [
              {
                accessorKey: 'email',
                header: '이메일',
                size: 220,
              },
              {
                accessorKey: 'active',
                header: '활성',
                size: 80,
                cell: (info) => (info.getValue() ? '✓' : '—'),
              },
            ],
          },
        ],
      },
      {
        id: 'metrics',
        header: '지표',
        columns: [
          {
            id: 'numbers',
            header: '수치',
            columns: [
              {
                accessorKey: 'score',
                header: '점수',
                size: 100,
                cell: (info) => (info.getValue() as number).toFixed(2),
              },
              {
                accessorKey: 'createdAt',
                header: '생성일',
                size: 160,
                cell: (info) => (info.getValue() as Date).toISOString().slice(0, 10),
              },
            ],
          },
        ],
      },
    ],
    [],
  );

  const leafIds = useMemo(
    () => ['id', 'name', 'email', 'active', 'score', 'createdAt'],
    [],
  );
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(leafIds);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnOrder, columnFilters },
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    onColumnFiltersChange: () => {},
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 6,
  });

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setColumnOrder((old) => {
      const oldIndex = old.indexOf(active.id as string);
      const newIndex = old.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return old;
      const next = old.slice();
      next.splice(oldIndex, 1);
      next.splice(newIndex, 0, active.id as string);
      return next;
    });
  }

  useEffect(() => {
    const id = setTimeout(() => {
      startFpsMeasurement(parentRef.current);
    }, 300);
    return () => clearTimeout(id);
  }, []);

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0;

  const headerGroups = table.getHeaderGroups();
  const leafHeaderGroup = headerGroups[headerGroups.length - 1];

  return (
    <div class="demo-root">
      <h1>Q2 TanStack Spike — 10,000 rows</h1>
      <div class="toolbar">
        <label>
          이름 필터:{' '}
          <input
            type="text"
            value={nameFilter}
            onInput={(e) => setNameFilter((e.target as HTMLInputElement).value)}
            placeholder="예: 김"
          />
        </label>
        <span class="meta">행 {table.getRowModel().rows.length.toLocaleString()} / {rows.length.toLocaleString()}</span>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div class="table-wrap" data-testid="table-wrap">
          <div class="thead">
            {headerGroups.map((group, gi) => (
              <div class="tr th-row" key={group.id}>
                {group.headers.map((header) => {
                  const colSpan = header.colSpan;
                  const width = header.getSize();
                  if (gi === headerGroups.length - 1) {
                    return (
                      <div class="th leaf" style={{ width }} key={header.id}>
                        <SortableContext
                          items={leafHeaderGroup.headers.map((h) => h.column.id)}
                          strategy={horizontalListSortingStrategy}
                        >
                          <DraggableHeader header={header} />
                        </SortableContext>
                      </div>
                    );
                  }
                  return (
                    <div
                      class="th group"
                      style={{ width }}
                      data-colspan={colSpan}
                      key={header.id}
                    >
                      {header.isPlaceholder ? '' : flexRender(header.column.columnDef.header, header.getContext())}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div class="scroll" ref={parentRef} style={{ height: CONTAINER_HEIGHT }}>
            <div style={{ height: totalSize, position: 'relative' }}>
              {paddingTop > 0 && <div style={{ height: paddingTop }} />}
              {virtualRows.map((vRow) => {
                const row = table.getRowModel().rows[vRow.index];
                return (
                  <div
                    class="tr"
                    key={row.id}
                    data-index={vRow.index}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      transform: `translateY(${vRow.start}px)`,
                      height: ROW_HEIGHT,
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <div class="td" style={{ width: cell.column.getSize() }} key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    ))}
                  </div>
                );
              })}
              {paddingBottom > 0 && <div style={{ height: paddingBottom }} />}
            </div>
          </div>
        </div>
      </DndContext>
    </div>
  );
}
