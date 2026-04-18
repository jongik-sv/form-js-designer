import type { ColumnDef } from './types';

/**
 * form-js 원본과 동일한 3개 기본 컬럼 (ID / Name / Date)
 * create() 에서 얕은 복사([...DEFAULT_COLUMNS])로 반환하므로 이 상수는 불변 기준선이다.
 */
export const DEFAULT_COLUMNS: ColumnDef[] = [
  { id: 'id', header: 'ID', accessor: 'id', type: 'text' },
  { id: 'name', header: 'Name', accessor: 'name', type: 'text' },
  { id: 'date', header: 'Date', accessor: 'date', type: 'text' },
];

/**
 * form-js generateInitialDemoData 반환값과 동일한 3행 데모 데이터
 */
export const DEMO_ROWS: Record<string, unknown>[] = [
  { id: 1, name: 'John Doe', date: '31.01.2023' },
  { id: 2, name: 'Erika Muller', date: '20.02.2023' },
  { id: 3, name: 'Dominic Leaf', date: '11.03.2023' },
];

/** DEMO_ROWS 첫 번째 행의 key 집합 (판정 기준) */
const DEMO_KEY_SET: Set<string> = new Set(Object.keys(DEMO_ROWS[0]!));

/**
 * 트리에서 리프 컬럼(자식이 없는 컬럼)의 accessor ?? id 를 수집한다.
 */
function extractLeafKeys(cols: ColumnDef[]): string[] {
  const keys: string[] = [];
  function walk(col: ColumnDef) {
    if (col.columns && col.columns.length > 0) {
      col.columns.forEach(walk);
    } else {
      keys.push(col.accessor ?? col.id);
    }
  }
  cols.forEach(walk);
  return keys;
}

/**
 * 리프 컬럼의 accessor/id 가 전부 DEMO_ROWS 키 집합에 포함될 때만 true.
 * 리프가 0개이면 false.
 */
export function shouldUseDemoData(columns: ColumnDef[]): boolean {
  const leafKeys = extractLeafKeys(columns);
  if (leafKeys.length === 0) return false;
  return leafKeys.every((key) => DEMO_KEY_SET.has(key));
}
