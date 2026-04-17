/**
 * filterFns: TanStack filterFns 확장 — 3종 pure predicate
 * TSK-05-02 설계 결정 2: TanStack 내장 대신 자체 wrapper로 단위 테스트 직접 호출 가능
 *
 * - text: case-insensitive includes, null/undefined → false
 * - select: strict equal, '' or undefined filter → pass-through
 * - range: [min, max] inclusive, null 경계 → 무제한
 */

/**
 * text filter predicate
 * @param value 셀 값
 * @param filter 필터 문자열
 */
export function textFilterFn(value: unknown, filter: string): boolean {
  if (filter === '' || filter === undefined || filter === null) return true;
  if (value === null || value === undefined) return false;
  return String(value).toLowerCase().includes(String(filter).toLowerCase());
}

/**
 * select filter predicate
 * @param value 셀 값
 * @param filter 선택된 값 ('' or undefined → pass-through)
 */
export function selectFilterFn(value: unknown, filter: string | undefined): boolean {
  if (filter === '' || filter === undefined || filter === null) return true;
  return value === filter;
}

/**
 * range filter predicate
 * @param value 숫자 셀 값
 * @param filter [min, max] — null이면 해당 경계 무제한
 */
export function rangeFilterFn(value: unknown, filter: [number | null, number | null]): boolean {
  const [min, max] = filter;
  // 양쪽 null → pass-through
  if (min === null && max === null) return true;

  const num = Number(value);
  if (isNaN(num)) return false;

  if (min !== null && num < min) return false;
  if (max !== null && num > max) return false;
  return true;
}

/**
 * TanStack filterFns 확장용 wrapper
 * column.filterFn에 문자열로 등록하거나 함수로 직접 주입 가능
 */
export const customFilterFns = {
  text: {
    // TanStack filterFn signature: (row, columnId, filterValue)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fn: (row: any, columnId: string, filterValue: string) =>
      textFilterFn(row.getValue(columnId), filterValue),
    autoRemove: (val: string) => !val,
  },
  select: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fn: (row: any, columnId: string, filterValue: string) =>
      selectFilterFn(row.getValue(columnId), filterValue),
    autoRemove: (val: string) => !val,
  },
  range: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fn: (row: any, columnId: string, filterValue: [number | null, number | null]) =>
      rangeFilterFn(row.getValue(columnId), filterValue),
    autoRemove: (val: [number | null, number | null]) => !val || (val[0] === null && val[1] === null),
  },
} as const;
