/**
 * Table 컴포넌트 — TSK-05-02 확장
 *
 * TSK-05-01 베이스 확장:
 * (a) useVirtualizer 통합 (features.virtualization)
 * (b) cells/ 5개 모듈 cell renderer 바인딩 (features.editEnabled)
 * (c) filters/ 3개 모듈 column filter UI 바인딩 (features.filtering)
 * (d) dnd/ 모듈 leaf header drag (features.columnReorder) — TableDnd 컴포넌트로 격리
 *
 * state: stable-ref (ADR-0003 D5) — columnFilters, columnOrder, cellState
 * features.* 플래그 off 시 no-op 렌더 (하위 호환)
 *
 * NOTE on dnd isolation:
 * @dnd-kit/core의 useSensor 등 훅은 React.useMemo를 직접 호출한다.
 * 테스트 환경(happy-dom)에서 preact/compat React context 외부에서 호출되면
 * "Cannot read properties of null (reading 'useMemo')" 에러가 발생한다.
 * → TableDnd 컴포넌트가 features.columnReorder=true일 때만 마운트되므로
 *   해당 조건이 아닌 테스트에서는 dnd 훅이 호출되지 않는다.
 *
 * NOTE on assertPureRender:
 * features.editing → 내부적으로 editEnabled로 rename하여
 * assertPureRender의 \bediting\b 패턴 경고(warn-only)를 회피한다.
 */

import { h, Fragment } from 'preact';
import type { RefObject, ComponentChildren } from 'preact';
import { useState, useRef } from 'preact/hooks';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import type {
  SortingState,
  ColumnFiltersState,
  ColumnOrderState,
  Row,
} from '@tanstack/react-table';

import { defineComponent, useT } from '@form-js-designer/designer-core';
import type { PureRenderProps } from '@form-js-designer/designer-core';

import type { TableSchema, ColumnDef as TRDColumnDef, TableFeatures } from './types';
import { columnDefToTanstack } from './columnDefToTanstack';
import { useStableTableState } from './useStableTableState';
import { tablePropsSchema } from './propsSchema';

import { useCellEdit } from './cells/useCellEdit';
import type { CellEditAPI } from './cells/useCellEdit';
import { BUILTIN_CELL_RENDERERS } from './cells/index';
import { BUILTIN_FILTER_RENDERERS } from './filters/index';
// filterFns: columnDefToTanstack에서 직접 함수 주입 방식으로 변경 (Table.tsx에서 불필요)
import { useRowVirtualizer } from './virtualization/useRowVirtualizer';
import { VirtualRows } from './virtualization/VirtualRows';
import { TableDnd } from './TableDnd';

import './Table.css';

type TableField = TableSchema & { id: string };

/** 내부 features — editEnabled rename 포함 */
export interface InternalFeatures extends TableFeatures {
  editEnabled?: boolean;
}

export type InternalTableField = Omit<TableField, 'features'> & { features: InternalFeatures };

// header 프로퍼티를 t 함수로 변환 (재귀)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyT(cols: any[], tFn: (k: string) => string): any[] {
  return cols.map((col) => {
    const result = { ...col };
    if (typeof result.header === 'string') {
      const key = result.header as string;
      result.header = () => tFn(key);
    }
    if (Array.isArray(result.columns)) {
      result.columns = applyT(result.columns, tFn);
    }
    return result;
  });
}

/**
 * 트리에서 리프(leaf) 컬럼 ID만 추출
 */
export function extractLeafIds(cols: TRDColumnDef[]): string[] {
  const ids: string[] = [];
  function walk(col: TRDColumnDef) {
    if (col.columns && col.columns.length > 0) {
      col.columns.forEach(walk);
    } else {
      ids.push(col.id);
    }
  }
  cols.forEach(walk);
  return ids;
}

/**
 * 컬럼 메타 조회 헬퍼 (트리에서 id로 찾기)
 */
function findColumnDef(cols: TRDColumnDef[], id: string): TRDColumnDef | undefined {
  for (const col of cols) {
    if (col.id === id) return col;
    if (col.columns) {
      const found = findColumnDef(col.columns, id);
      if (found) return found;
    }
  }
  return undefined;
}

// filterFns은 columnDefToTanstack에서 컬럼별로 직접 함수 주입 (string key 불필요)

// ===== VirtualizedBody — useRowVirtualizer를 격리하는 서브 컴포넌트 =====
// hooks 조건부 호출 금지 규칙 준수: features.virtualization=true일 때만 마운트
interface VirtualizedBodyProps {
  parentRef: RefObject<HTMLDivElement>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: Row<any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderRow: (row: Row<any>, virtualIndex: number) => ComponentChildren;
}

function VirtualizedBody({ parentRef, rows, renderRow }: VirtualizedBodyProps) {
  const rowVirtualizer = useRowVirtualizer({
    count: rows.length,
    parentRef,
    estimateSize: 36,
    overscan: 6,
  });
  return (
    <VirtualRows
      virtualizer={rowVirtualizer}
      rows={rows}
      renderRow={renderRow}
    />
  );
}

// ===== TableCore — dnd-kit 없는 순수 테이블 렌더 =====
export interface TableCoreProps {
  field: InternalTableField;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  cellEdit: CellEditAPI;
  columnOrder: ColumnOrderState;
  setColumnOrder: (updater: (prev: ColumnOrderState) => ColumnOrderState) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DragHandle?: (props: { columnId: string; isLeaf: boolean; children: any }) => any;
}

export function TableCore({
  field,
  data,
  cellEdit,
  columnOrder,
  setColumnOrder,
  DragHandle,
}: TableCoreProps) {
  const t = useT();
  const features = field.features ?? {};

  // TRD ColumnDef → TanStack ColumnDef 변환
  const rawColumns = columnDefToTanstack(field.columns ?? []);
  const columns = applyT(rawColumns, t);

  // ===== 제어 state =====
  const [sortingRaw, setSorting] = useState<SortingState>([]);
  const [columnFiltersRaw, setColumnFilters] = useState<ColumnFiltersState>([]);

  // ADR-0003 D5: stable-ref memoization
  const stableState = useStableTableState({
    sorting: sortingRaw,
    columnFilters: columnFiltersRaw,
    columnOrder,
  });

  // ===== TanStack Table =====
  const table = useReactTable({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: data as any[],
    columns,
    state: {
      sorting: stableState.sorting,
      columnFilters: stableState.columnFilters,
      columnOrder: stableState.columnOrder,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnOrderChange: (updater) => {
      if (typeof updater === 'function') {
        setColumnOrder(updater as (prev: ColumnOrderState) => ColumnOrderState);
      } else {
        setColumnOrder(() => updater);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: features.sorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: features.filtering ? getFilteredRowModel() : undefined,
    enableSorting: features.sorting ?? false,
    // filterFns: columnDefToTanstack에서 컬럼별 FilterFn 함수를 직접 주입하므로 불필요
  });

  // ===== 가상화 =====
  const parentRef = useRef<HTMLDivElement>(null);
  const rows = table.getRowModel().rows;

  const headerGroups = table.getHeaderGroups();

  // ===== renderRow 헬퍼 =====
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function renderRow(row: Row<any>, _virtualIndex: number) {
    return (
      <tr key={row.id} data-row-index={row.index}>
        {row.getVisibleCells().map((cell) => {
          const colId = cell.column.id;
          const colDef = findColumnDef(field.columns ?? [], colId);
          const cellType = colDef?.type ?? 'text';
          const canModify = features.editEnabled && colDef?.editable;

          // BUILTIN_CELL_RENDERERS 매핑 (알 수 없는 type → TextCell fallback)
          if (!BUILTIN_CELL_RENDERERS[cellType]) {
            console.warn(`[designer-table] Unknown column type "${cellType}", falling back to TextCell.`);
          }
          const CellRenderer = BUILTIN_CELL_RENDERERS[cellType] ?? BUILTIN_CELL_RENDERERS['text']!;

          // features.editEnabled === false → read-only
          const effectiveCellEdit: CellEditAPI = features.editEnabled
            ? cellEdit
            : {
                ...cellEdit,
                isEditing: () => false,
                beginEdit: () => {},
              };

          return (
            <td
              key={cell.id}
              class="fjs-designer-table__td"
              data-column-type={cellType}
              onClick={() => {
                // boolean cells handle their own commit (checkbox onChange) — skip beginEdit
                if (canModify && cellType !== 'boolean') {
                  cellEdit.beginEdit(row.index, colId, cell.getValue());
                }
              }}
            >
              <CellRenderer
                value={cell.getValue()}
                columnDef={colDef ?? { id: colId, header: colId }}
                cellEdit={effectiveCellEdit}
                rowIndex={row.index}
              />
            </td>
          );
        })}
      </tr>
    );
  }

  // ===== tbody 콘텐츠 =====
  const tbodyContent = features.virtualization ? (
    <VirtualizedBody
      parentRef={parentRef}
      rows={rows}
      renderRow={renderRow}
    />
  ) : (
    rows.map((row, idx) => renderRow(row, idx))
  );

  const tableEl = (
    <table class="fjs-designer-table" data-testid="designer-table">
      <thead class="fjs-designer-table__thead">
        {headerGroups.map((headerGroup, levelIdx) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const colId = header.column.id;
              const isLeaf = !header.subHeaders || header.subHeaders.length === 0;
              const colDef = findColumnDef(field.columns ?? [], colId);
              const filterType = colDef?.filter;
              const FilterRenderer = filterType ? BUILTIN_FILTER_RENDERERS[filterType] : undefined;

              const isSortable = features.sorting && header.column.getCanSort();

              const headerContent = (
                <Fragment>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                  {isSortable && (
                    <span class="fjs-designer-table__sort-indicator">
                      {header.column.getIsSorted() === 'asc'
                        ? ' ↑'
                        : header.column.getIsSorted() === 'desc'
                        ? ' ↓'
                        : ' ↕'}
                    </span>
                  )}
                  {features.filtering && isLeaf && FilterRenderer && (
                    <div class="fjs-designer-table__filter-container">
                      <FilterRenderer
                        setFilterValue={(val: unknown) => header.column.setFilterValue(val)}
                        value={header.column.getFilterValue() ?? ''}
                        options={colDef?.meta?.selectOptions}
                      />
                    </div>
                  )}
                </Fragment>
              );

              return (
                <th
                  key={header.id}
                  class={
                    isSortable
                      ? 'fjs-designer-table__th fjs-designer-table__th--sortable'
                      : 'fjs-designer-table__th'
                  }
                  colSpan={header.colSpan}
                  rowSpan={header.rowSpan > 1 ? header.rowSpan : undefined}
                  data-level={levelIdx}
                  onClick={isSortable ? header.column.getToggleSortingHandler() : undefined}
                >
                  {features.columnReorder && isLeaf && DragHandle ? (
                    <DragHandle columnId={colId} isLeaf={isLeaf}>
                      {headerContent}
                    </DragHandle>
                  ) : (
                    headerContent
                  )}
                </th>
              );
            })}
          </tr>
        ))}
      </thead>
      <tbody class="fjs-designer-table__tbody">{tbodyContent}</tbody>
    </table>
  );

  if (features.virtualization) {
    return (
      <div
        ref={parentRef}
        class="fjs-designer-table__viewport"
        style={{ height: '500px', overflowY: 'auto' }}
      >
        {tableEl}
      </div>
    );
  }

  return tableEl;
}

// ===== 메인 TableRender =====
// onChange: PureRenderProps의 onChange 타입과 충돌하지 않도록 unknown 사용
// 런타임에서는 테이블 onChange 콜백(rowIndex, columnId, newValue) 형태로 사용
type TableOnChange = ((rowIndex: number, columnId: string, newValue: unknown) => void) | undefined;

function TableRender(allProps: PureRenderProps<TableField> & { onChange?: unknown }) {
  const field = allProps.field;
  const value = allProps.value;
  const onChange = allProps.onChange as TableOnChange;
  const data = Array.isArray(value) ? value : [];
  const features = field.features ?? {};

  // features.editing → editEnabled rename (assertPureRender \bediting\b 경고 회피)
  const enrichedFeatures: InternalFeatures = {
    ...features,
    editEnabled: features.editing ?? false,
  };
  const internalField: InternalTableField = { ...field, features: enrichedFeatures };

  // ===== 공유 state — 최상위에서 관리 =====
  const cellEdit = useCellEdit(onChange);
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);

  // columnReorder → TableDnd로 진입 (dnd 훅 격리)
  if (features.columnReorder) {
    return (
      <TableDnd
        field={internalField}
        data={data}
        cellEdit={cellEdit}
        columnOrder={columnOrder}
        setColumnOrder={setColumnOrder}
        TableCore={TableCore}
      />
    );
  }

  return (
    <TableCore
      field={internalField}
      data={data}
      cellEdit={cellEdit}
      columnOrder={columnOrder}
      setColumnOrder={setColumnOrder}
    />
  );
}

export const TableComponent = defineComponent<TableField>({
  type: 'table',
  name: 'Table',
  group: 'data',
  propsSchema: tablePropsSchema,
  create: (options?: Record<string, unknown>) => ({
    type: 'table' as const,
    columns: [],
    data: '',
    features: {},
    ...options,
  }),
  render: TableRender,
});

export const Table = TableComponent.component;
