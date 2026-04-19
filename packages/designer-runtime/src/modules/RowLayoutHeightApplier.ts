/**
 * RowLayoutHeightApplier — 순수 로직 유닛 (TSK-12-03)
 *
 * row DOM에 첫 컴포넌트의 layout.rowHeight를 min-height로 주입한다.
 *
 * 두 가지 실행 경로:
 * 1. formLayouter 존재 → _rows를 순회하여 row id → [data-row-id] 우선, positional fallback
 * 2. formLayouter 없음 → layout.rowHeight가 있는 field → [data-id] → closest .fjs-layout-row
 */

export const ROW_HEIGHT_MIN = 36;
export const ROW_HEIGHT_MAX = 2000;

export interface RowLike {
  id: string;
  components: string[];
}

export interface FormLayouterLike {
  getRows?: (parentId: string) => RowLike[];
  _rows?: Array<{ formFieldId: string; rows: RowLike[] }>;
}

export interface ApplierFieldWithRow {
  id: string;
  type: string;
  layout?: { rowHeight?: number; height?: number; [key: string]: unknown };
}

/**
 * 전체 row를 flat하게 반환하는 헬퍼 (formLayouter._rows 사용)
 */
function allRows(rowGroups: FormLayouterLike['_rows']): RowLike[] {
  if (!rowGroups) return [];
  const result: RowLike[] = [];
  for (const group of rowGroups) {
    for (const row of group.rows ?? []) {
      result.push(row);
    }
  }
  return result;
}

/**
 * fields 배열에서 id로 field를 빠르게 조회하기 위한 Map 생성
 */
function buildFieldMap(fields: ApplierFieldWithRow[]): Map<string, ApplierFieldWithRow> {
  const map = new Map<string, ApplierFieldWithRow>();
  for (const f of fields) {
    map.set(f.id, f);
  }
  return map;
}

/**
 * row DOM 요소에 min-height를 적용한다.
 * rowHeight가 number이면 `Npx`, 아니면 '' (clear).
 */
function applyMinHeight(el: HTMLElement, rowHeight: number | undefined): void {
  if (typeof rowHeight === 'number') {
    el.style.minHeight = `${rowHeight}px`;
  } else {
    el.style.minHeight = '';
  }
}

/**
 * formLayouter 경유 경로:
 * _rows를 순회하여 각 row의 첫 컴포넌트의 rowHeight를 row DOM에 주입.
 * [data-row-id="<rowId>"] 우선, 없으면 positional fallback (.fjs-layout-row nth).
 */
function applyWithLayouter(
  root: ParentNode,
  fieldMap: Map<string, ApplierFieldWithRow>,
  layouter: FormLayouterLike,
): void {
  const rows = allRows(layouter._rows);

  // positional fallback을 위한 전체 .fjs-layout-row 목록
  const allRowEls = Array.from(root.querySelectorAll('.fjs-layout-row')) as HTMLElement[];
  let positionalIdx = 0;

  for (const row of rows) {
    const firstId = row.components?.[0];
    const firstField = firstId ? fieldMap.get(firstId) : undefined;
    const rowHeight = firstField?.layout?.rowHeight;

    // row DOM 찾기: [data-row-id] 우선
    let rowEl = root.querySelector(`[data-row-id="${CSS.escape(row.id)}"]`) as HTMLElement | null;

    if (!rowEl) {
      // positional fallback: 전체 .fjs-layout-row 중 현재 순서
      rowEl = allRowEls[positionalIdx] ?? null;
    }

    positionalIdx++;

    if (rowEl) {
      applyMinHeight(rowEl, rowHeight);
    }
  }
}

/**
 * formLayouter 없는 폴백 경로:
 * layout.rowHeight가 있는 field → [data-id] 조회 → closest .fjs-layout-row에 주입.
 */
function applyWithoutLayouter(root: ParentNode, fields: ApplierFieldWithRow[]): void {
  for (const field of fields) {
    const rowHeight = field.layout?.rowHeight;
    if (typeof rowHeight !== 'number') continue;

    const fieldEl =
      (root.querySelector(`[data-id="${CSS.escape(field.id)}"]`) as HTMLElement | null) ??
      (root.querySelector(`[data-fjs-id="${CSS.escape(field.id)}"]`) as HTMLElement | null);

    if (!fieldEl) continue;

    const rowEl = fieldEl.closest('.fjs-layout-row') as HTMLElement | null;
    if (rowEl) {
      applyMinHeight(rowEl, rowHeight);
    }
  }
}

/**
 * row DOM에 layout.rowHeight를 min-height로 주입한다.
 *
 * @param root       탐색 범위 DOM 노드
 * @param fields     formFieldRegistry.getAll() 결과
 * @param formLayouter  optional — 있으면 row 구조 기반 정확한 매칭
 */
export function applyRowHeight(
  root: ParentNode,
  fields: ApplierFieldWithRow[],
  formLayouter?: FormLayouterLike,
): void {
  if (formLayouter && formLayouter._rows) {
    const fieldMap = buildFieldMap(fields);
    applyWithLayouter(root, fieldMap, formLayouter);
  } else {
    applyWithoutLayouter(root, fields);
  }
}
