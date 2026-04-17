/**
 * useStableTableState: ADR-0003 D5 강제 헬퍼
 * preact/compat + useSyncExternalStore 무한재렌더 방지용
 * sorting·columnOrder·columnFilters 등을 useMemo로 안정화
 */

import { useMemo } from 'preact/hooks';
import type {
  SortingState,
  ColumnFiltersState,
  ColumnOrderState,
  VisibilityState,
  PaginationState,
} from '@tanstack/react-table';

export interface TableStateInput {
  sorting?: SortingState;
  columnFilters?: ColumnFiltersState;
  columnOrder?: ColumnOrderState;
  columnVisibility?: VisibilityState;
  pagination?: PaginationState;
}

export interface StableTableState {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  columnOrder: ColumnOrderState;
  columnVisibility: VisibilityState;
  pagination: PaginationState;
}

const EMPTY_SORTING: SortingState = [];
const EMPTY_FILTERS: ColumnFiltersState = [];
const EMPTY_ORDER: ColumnOrderState = [];
const EMPTY_VISIBILITY: VisibilityState = {};
const DEFAULT_PAGINATION: PaginationState = { pageIndex: 0, pageSize: 10 };

/**
 * 값을 JSON キー로 memoize하는 헬퍼 — preact/compat useSyncExternalStore 무한재렌더 방지용.
 * JSON.stringify로 깊은 비교를 수행하되, 안정적인 참조를 반환한다 (ADR-0003 D5).
 *
 * eslint react-hooks/exhaustive-deps: JSON.stringify 키를 의존성으로 쓰는 의도적 패턴이므로 비활성화
 */
// eslint-disable-next-line react-hooks/exhaustive-deps
function useStable<T>(value: T): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => value, [JSON.stringify(value)]);
}

/**
 * ADR-0003 D5: TanStack state 항목을 useMemo로 안정화
 *
 * preact/compat의 useSyncExternalStore가 매 렌더 새 배열/객체를 받으면
 * 무한 재렌더 루프에 빠지는 이슈(spike I1)를 방지한다.
 *
 * 사용법:
 *   const stable = useStableTableState({ sorting: [...], columnFilters: [...] });
 *   const table = useReactTable({ state: stable, ... });
 */
export function useStableTableState(input: TableStateInput): StableTableState {
  const sorting = useStable(input.sorting ?? EMPTY_SORTING);
  const columnFilters = useStable(input.columnFilters ?? EMPTY_FILTERS);
  const columnOrder = useStable(input.columnOrder ?? EMPTY_ORDER);
  const columnVisibility = useStable(input.columnVisibility ?? EMPTY_VISIBILITY);
  const pagination = useStable(input.pagination ?? DEFAULT_PAGINATION);

  return { sorting, columnFilters, columnOrder, columnVisibility, pagination };
}
