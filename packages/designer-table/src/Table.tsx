/**
 * Table 컴포넌트 — TSK-05-01
 *
 * defineComponent({ type: 'table', group: 'data', ... })
 * useReactTable → headerGroups 순회로 멀티헤더 3단 DOM 렌더
 * state는 useStableTableState로 감쌈 (ADR-0003 D5)
 * header는 ctx.t(key) 함수형 전달
 */

import { h } from 'preact';
import { useState } from 'preact/hooks';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import type { SortingState } from '@tanstack/react-table';

import { defineComponent, useT } from '@form-js-designer/designer-core';
import type { PureRenderProps } from '@form-js-designer/designer-core';

import type { TableSchema } from './types';
import { columnDefToTanstack } from './columnDefToTanstack';
import { useStableTableState } from './useStableTableState';
import { tablePropsSchema } from './propsSchema';

import './Table.css';

type TableField = TableSchema & { id: string };

// TanStack 헤더 header 함수 생성기 (LocaleKey → ctx.t(key))
function makeHeaderFn(key: string, tFn: (k: string) => string) {
  return () => tFn(key);
}

// header 프로퍼티를 t 함수로 변환 (재귀)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyT(cols: any[], tFn: (k: string) => string): any[] {
  return cols.map((col) => {
    const result = { ...col };
    if (typeof result.header === 'string') {
      const key = result.header as string;
      result.header = makeHeaderFn(key, tFn);
    }
    if (Array.isArray(result.columns)) {
      result.columns = applyT(result.columns, tFn);
    }
    return result;
  });
}

function TableRender({ field, value }: PureRenderProps<TableField>) {
  const t = useT();
  const data = Array.isArray(value) ? value : [];

  const features = field.features ?? {};

  // TRD ColumnDef → TanStack ColumnDef 변환
  const rawColumns = columnDefToTanstack(field.columns ?? []);
  // header(LocaleKey)를 t() 함수로 래핑
  const columns = applyT(rawColumns, t);

  // 제어 state
  const [sortingRaw, setSorting] = useState<SortingState>([]);

  // ADR-0003 D5: stable-ref memoization
  const stableState = useStableTableState({ sorting: sortingRaw });

  const table = useReactTable({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: data as any[],
    columns,
    state: {
      sorting: stableState.sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: features.sorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: features.filtering ? getFilteredRowModel() : undefined,
    enableSorting: features.sorting ?? false,
  });

  const headerGroups = table.getHeaderGroups();

  return (
    <table class="fjs-designer-table">
      <thead class="fjs-designer-table__thead">
        {headerGroups.map((headerGroup, levelIdx) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th
                key={header.id}
                class={[
                  'fjs-designer-table__th',
                  features.sorting && header.column.getCanSort()
                    ? 'fjs-designer-table__th--sortable'
                    : '',
                ].join(' ').trim()}
                colSpan={header.colSpan}
                rowSpan={header.rowSpan > 1 ? header.rowSpan : undefined}
                data-level={levelIdx}
                onClick={
                  features.sorting && header.column.getCanSort()
                    ? header.column.getToggleSortingHandler()
                    : undefined
                }
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody class="fjs-designer-table__tbody">
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id} class="fjs-designer-table__td">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
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
