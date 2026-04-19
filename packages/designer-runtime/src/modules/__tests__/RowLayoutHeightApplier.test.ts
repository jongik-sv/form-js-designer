/**
 * RowLayoutHeightApplier 단위 테스트 — TSK-12-03
 *
 * jsdom 환경에서 row DOM에 layout.rowHeight를 min-height로 주입하는 순수 로직 검증.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { applyRowHeight, ROW_HEIGHT_MIN, ROW_HEIGHT_MAX } from '../RowLayoutHeightApplier';
import type { FormLayouterLike, RowLike } from '../RowLayoutHeightApplier';

type TestField = {
  id: string;
  type: string;
  layout?: { rowHeight?: number; height?: number; [key: string]: unknown };
};

function makeRowDom(rowId: string, useDataAttr = true): HTMLElement {
  const el = document.createElement('div');
  el.className = 'fjs-layout-row';
  if (useDataAttr) {
    el.setAttribute('data-row-id', rowId);
  }
  return el;
}

function makeLayouter(rows: Array<{ formFieldId: string; rows: RowLike[] }>): FormLayouterLike {
  return { _rows: rows };
}

describe('ROW_HEIGHT_MIN / ROW_HEIGHT_MAX', () => {
  it('상수가 올바른 값이다', () => {
    expect(ROW_HEIGHT_MIN).toBe(36);
    expect(ROW_HEIGHT_MAX).toBe(2000);
  });
});

describe('applyRowHeight', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  // Case 1: formLayouter 경유 — 첫 컴포넌트의 rowHeight → row DOM min-height 주입
  it('1: 첫 컴포넌트 layout.rowHeight → row DOM style.minHeight 주입 (data-row-id 경유)', () => {
    const rowEl = makeRowDom('R1');
    root.appendChild(rowEl);

    const fields: TestField[] = [
      { id: 'f1', type: 'textfield', layout: { rowHeight: 200 } },
      { id: 'f2', type: 'textarea' },
    ];
    const layouter = makeLayouter([
      {
        formFieldId: 'root',
        rows: [{ id: 'R1', components: ['f1', 'f2'] }],
      },
    ]);

    applyRowHeight(root, fields, layouter);

    expect(rowEl.style.minHeight).toBe('200px');
  });

  // Case 2: 첫 컴포넌트가 아닌 곳의 rowHeight는 무시
  it('2: 두 번째 컴포넌트의 layout.rowHeight는 무시됨', () => {
    const rowEl = makeRowDom('R2');
    root.appendChild(rowEl);

    const fields: TestField[] = [
      { id: 'f1', type: 'textfield' },
      { id: 'f2', type: 'textarea', layout: { rowHeight: 300 } },
    ];
    const layouter = makeLayouter([
      {
        formFieldId: 'root',
        rows: [{ id: 'R2', components: ['f1', 'f2'] }],
      },
    ]);

    applyRowHeight(root, fields, layouter);

    expect(rowEl.style.minHeight).toBe('');
  });

  // Case 3: rowHeight 없을 때 min-height clear
  it('3: 이전에 200 주입 후 rowHeight undefined → style.minHeight 초기화', () => {
    const rowEl = makeRowDom('R3');
    rowEl.style.minHeight = '200px'; // 이전 값
    root.appendChild(rowEl);

    const fields: TestField[] = [
      { id: 'f1', type: 'textfield' }, // rowHeight 없음
    ];
    const layouter = makeLayouter([
      {
        formFieldId: 'root',
        rows: [{ id: 'R3', components: ['f1'] }],
      },
    ]);

    applyRowHeight(root, fields, layouter);

    expect(rowEl.style.minHeight).toBe('');
  });

  // Case 4: positional fallback (data-row-id 없음)
  it('4: data-row-id 없는 row DOM에 positional fallback으로 min-height 주입', () => {
    const row1 = makeRowDom('', false); // data-row-id 없음
    const row2 = makeRowDom('', false);
    const row3 = makeRowDom('', false);
    const container = document.createElement('div');
    container.setAttribute('data-id', 'root-container');
    container.appendChild(row1);
    container.appendChild(row2);
    container.appendChild(row3);
    root.appendChild(container);

    const fields: TestField[] = [
      { id: 'f1', type: 'textfield', layout: { rowHeight: 150 } },
      { id: 'f2', type: 'textarea' },
      { id: 'f3', type: 'textfield', layout: { rowHeight: 250 } },
    ];
    // positional: 3개 row, 각 row에 1개 컴포넌트
    const layouter = makeLayouter([
      {
        formFieldId: 'root',
        rows: [
          { id: 'R1', components: ['f1'] },
          { id: 'R2', components: ['f2'] },
          { id: 'R3', components: ['f3'] },
        ],
      },
    ]);

    applyRowHeight(root, fields, layouter);

    // data-row-id 없으니 positional fallback: 전체 .fjs-layout-row 순서에 맞게
    expect(row1.style.minHeight).toBe('150px');
    expect(row2.style.minHeight).toBe('');
    expect(row3.style.minHeight).toBe('250px');
  });

  // Case 5: multi-parent — 2개 parent의 row 영역이 독립 positional 매칭
  it('5: multi-parent — 두 parent 아래 row들이 각각 독립적으로 data-row-id 경유 매칭', () => {
    const rowA = makeRowDom('RA');
    const rowB = makeRowDom('RB');
    root.appendChild(rowA);
    root.appendChild(rowB);

    const fields: TestField[] = [
      { id: 'fA', type: 'textfield', layout: { rowHeight: 100 } },
      { id: 'fB', type: 'textarea', layout: { rowHeight: 400 } },
    ];
    const layouter = makeLayouter([
      { formFieldId: 'parentA', rows: [{ id: 'RA', components: ['fA'] }] },
      { formFieldId: 'parentB', rows: [{ id: 'RB', components: ['fB'] }] },
    ]);

    applyRowHeight(root, fields, layouter);

    expect(rowA.style.minHeight).toBe('100px');
    expect(rowB.style.minHeight).toBe('400px');
  });

  // Case 6: formLayouter 없음 → 폴백 경로 (rowHeight 필드 → closest 행에 주입)
  it('6: formLayouter 없을 때 폴백 — rowHeight가 있는 필드의 closest .fjs-layout-row에 주입', () => {
    const rowEl = document.createElement('div');
    rowEl.className = 'fjs-layout-row';

    const fieldEl = document.createElement('div');
    fieldEl.setAttribute('data-id', 'f1');
    rowEl.appendChild(fieldEl);
    root.appendChild(rowEl);

    const fields: TestField[] = [
      { id: 'f1', type: 'textfield', layout: { rowHeight: 180 } },
    ];

    applyRowHeight(root, fields); // layouter 없이 호출

    expect(rowEl.style.minHeight).toBe('180px');
  });

  // Case 7: rowHeight 미설정 시 min-height 변화 없음 (기존 flex:auto 유지)
  it('7: rowHeight 미설정 → row DOM style.minHeight 빈 문자열 (flex:auto 유지)', () => {
    const rowEl = makeRowDom('R7');
    root.appendChild(rowEl);

    const fields: TestField[] = [
      { id: 'f1', type: 'textfield' }, // rowHeight 없음
    ];
    const layouter = makeLayouter([
      { formFieldId: 'root', rows: [{ id: 'R7', components: ['f1'] }] },
    ]);

    applyRowHeight(root, fields, layouter);

    expect(rowEl.style.minHeight).toBe('');
  });

  // Case 8: 빈 row (컴포넌트 없음) — 에러 없이 처리
  it('8: components가 빈 row는 에러 없이 처리됨', () => {
    const rowEl = makeRowDom('R8');
    root.appendChild(rowEl);

    const fields: TestField[] = [];
    const layouter = makeLayouter([
      { formFieldId: 'root', rows: [{ id: 'R8', components: [] }] },
    ]);

    expect(() => applyRowHeight(root, fields, layouter)).not.toThrow();
    expect(rowEl.style.minHeight).toBe('');
  });
});
