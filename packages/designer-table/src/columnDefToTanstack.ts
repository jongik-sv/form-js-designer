/**
 * columnDefToTanstack: TRD ColumnDef 트리 → TanStack ColumnDef<TRow>[] 재귀 변환
 *
 * - 그룹(자식 있음): { id, header, columns: [...] }
 * - 리프(accessor 있음): { id, accessorKey, header, size? }
 * - accessor에 '.' 포함 시 accessorFn으로 대체 (ADR-0003 설계 결정)
 * - id/accessor 미지정 리프 → 명시적 에러 throw
 * - filter 타입 → filterFn 함수 직접 매핑 (string 키 의존 제거)
 */

import type { ColumnDef as TRDColumnDef } from './types';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import type { ColumnDef as TanStackColumnDef, FilterFn } from '@tanstack/react-table';
import { textFilterFn, selectFilterFn, rangeFilterFn } from './filters/filterFns';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTanStackColumnDef = TanStackColumnDef<any>;

/**
 * 중첩 경로(dot-notation)에서 값을 추출하는 헬퍼
 */
function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * TRD filter 타입 → TanStack FilterFn 함수 매핑
 * string 키 대신 함수를 직접 주입하여 filterFns 등록 없이도 동작하게 함
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FILTER_FN_MAP: Record<string, FilterFn<any>> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  text: Object.assign((row: any, columnId: string, filterValue: string) =>
    textFilterFn(row.getValue(columnId), filterValue),
    { autoRemove: (val: string) => !val }
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  select: Object.assign((row: any, columnId: string, filterValue: string) =>
    selectFilterFn(row.getValue(columnId), filterValue),
    { autoRemove: (val: string) => !val }
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  range: Object.assign((row: any, columnId: string, filterValue: [number | null, number | null]) =>
    rangeFilterFn(row.getValue(columnId), filterValue),
    { autoRemove: (val: [number | null, number | null]) => !val || (val[0] === null && val[1] === null) }
  ),
};

/**
 * TRD ColumnDef 단일 항목을 TanStack ColumnDef로 변환
 */
function convertOne(col: TRDColumnDef): AnyTanStackColumnDef {
  const { id, header, accessor, columns, filter, meta } = col;

  // 그룹 노드: 자식 columns가 있는 경우
  if (columns && columns.length > 0) {
    return { id, header, columns: columns.map(convertOne) } as AnyTanStackColumnDef;
  }

  // 리프 노드: accessor 필수
  if (!accessor) {
    throw new Error(
      `[columnDefToTanstack] Column "${id}" is a leaf (no children) but has no accessor defined. ` +
      `Either provide an "accessor" path or add "columns" for group headers.`
    );
  }

  // filterFn: TRD filter 타입 → FilterFn 함수 직접 매핑
  const filterFn = filter ? FILTER_FN_MAP[filter] : undefined;

  // accessor에 '.' 포함 시 accessorFn으로 대체 (ADR-0003 설계 결정)
  if (accessor.includes('.')) {
    return {
      id,
      header,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      accessorFn: (row: any) => getNestedValue(row, accessor),
      ...(filterFn ? { filterFn } : {}),
      ...(meta ? { meta } : {}),
    } as AnyTanStackColumnDef;
  }

  return {
    id,
    accessorKey: accessor,
    header,
    ...(filterFn ? { filterFn } : {}),
    ...(meta ? { meta } : {}),
  } as AnyTanStackColumnDef;
}

/**
 * TRD ColumnDef[] 트리 → TanStack ColumnDef<TRow>[] 재귀 변환
 *
 * @param cols TRD ColumnDef 트리 (멀티헤더 지원)
 * @returns TanStack 호환 ColumnDef[] (중첩 그룹 구조 유지)
 * @throws {Error} 리프 컬럼에 accessor가 없는 경우
 */
export function columnDefToTanstack(cols: TRDColumnDef[]): AnyTanStackColumnDef[] {
  return cols.map(convertOne);
}
