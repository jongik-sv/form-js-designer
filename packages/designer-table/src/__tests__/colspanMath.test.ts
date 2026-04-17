/**
 * colspanMath 단위 테스트
 * QA 체크리스트: 3단 예시 → 기대 rowSpan/colSpan 행렬 일치, 비대칭 트리
 */
import { describe, it, expect } from 'vitest';
import { getExpectedMatrix } from '../colspanMath';
import type { ColumnDef } from '../types';

describe('getExpectedMatrix', () => {
  // (정상) 1단 flat 트리 → thead tr 1개, rowSpan=1, colSpan=1
  it('1단 리프만 있는 트리 → 행렬: rowSpan=1, colSpan=1', () => {
    const cols: ColumnDef[] = [
      { id: 'name', header: 'name', accessor: 'name' },
      { id: 'age', header: 'age', accessor: 'age' },
    ];

    const matrix = getExpectedMatrix(cols);

    // 깊이 1 → 1 row
    expect(matrix).toHaveLength(1);
    // 각 셀의 colSpan=1, rowSpan=1
    expect(matrix[0]).toHaveLength(2);
    expect(matrix[0]?.[0]).toEqual({ id: 'name', colSpan: 1, rowSpan: 1 });
    expect(matrix[0]?.[1]).toEqual({ id: 'age', colSpan: 1, rowSpan: 1 });
  });

  // (정상) 2단 그룹 → 기대 colSpan 행렬
  it('2단 그룹(개인정보→이름/이메일) → 기대 colSpan/rowSpan 행렬', () => {
    const cols: ColumnDef[] = [
      {
        id: 'personal',
        header: 'personal',
        columns: [
          { id: 'name', header: 'name', accessor: 'name' },
          { id: 'email', header: 'email', accessor: 'email' },
        ],
      },
    ];

    const matrix = getExpectedMatrix(cols);

    // 깊이 2 → 2 rows
    expect(matrix).toHaveLength(2);
    // Row 0: personal → colSpan=2 (leaf 수), rowSpan=1
    expect(matrix[0]?.[0]).toEqual({ id: 'personal', colSpan: 2, rowSpan: 1 });
    // Row 1: name → colSpan=1, rowSpan=1; email → colSpan=1, rowSpan=1
    expect(matrix[1]?.[0]).toEqual({ id: 'name', colSpan: 1, rowSpan: 1 });
    expect(matrix[1]?.[1]).toEqual({ id: 'email', colSpan: 1, rowSpan: 1 });
  });

  // (정상) 3단 그룹 → 기대 colSpan/rowSpan 행렬 (spike Demo.tsx 동일 구조)
  it('3단 그룹(개인정보→기본/연락처→이름/나이/이메일/전화) → 기대 행렬', () => {
    // spike Demo.tsx 구조: personal → basic(name,age) + contact(email,phone)
    const cols: ColumnDef[] = [
      {
        id: 'personal',
        header: 'personal',
        columns: [
          {
            id: 'basic',
            header: 'basic',
            columns: [
              { id: 'name', header: 'name', accessor: 'name' },
              { id: 'age', header: 'age', accessor: 'age' },
            ],
          },
          {
            id: 'contact',
            header: 'contact',
            columns: [
              { id: 'email', header: 'email', accessor: 'email' },
              { id: 'phone', header: 'phone', accessor: 'phone' },
            ],
          },
        ],
      },
    ];

    const matrix = getExpectedMatrix(cols);

    // 깊이 3 → 3 rows
    expect(matrix).toHaveLength(3);
    // Row 0: personal → colSpan=4 (전체 leaf 수)
    expect(matrix[0]?.[0]).toMatchObject({ id: 'personal', colSpan: 4, rowSpan: 1 });
    // Row 1: basic → colSpan=2, contact → colSpan=2
    expect(matrix[1]?.[0]).toMatchObject({ id: 'basic', colSpan: 2, rowSpan: 1 });
    expect(matrix[1]?.[1]).toMatchObject({ id: 'contact', colSpan: 2, rowSpan: 1 });
    // Row 2: leaf들 colSpan=1
    expect(matrix[2]?.[0]).toMatchObject({ id: 'name', colSpan: 1, rowSpan: 1 });
    expect(matrix[2]?.[1]).toMatchObject({ id: 'age', colSpan: 1, rowSpan: 1 });
    expect(matrix[2]?.[2]).toMatchObject({ id: 'email', colSpan: 1, rowSpan: 1 });
    expect(matrix[2]?.[3]).toMatchObject({ id: 'phone', colSpan: 1, rowSpan: 1 });
  });

  // (엣지) 비대칭 트리 → 얕은 leaf가 rowSpan=2
  it('비대칭 트리(한쪽 leaf 2단, 다른쪽 1단) → 얕은 leaf rowSpan=2', () => {
    // personal(2단: name, age) + simple(1단 leaf)
    // depth = 2
    const cols: ColumnDef[] = [
      {
        id: 'personal',
        header: 'personal',
        columns: [
          { id: 'name', header: 'name', accessor: 'name' },
          { id: 'age', header: 'age', accessor: 'age' },
        ],
      },
      {
        id: 'simple',
        header: 'simple',
        accessor: 'simple', // 리프이지만 상위 레벨에 있음 → rowSpan=2
      },
    ];

    const matrix = getExpectedMatrix(cols);

    // 깊이 2 → 2 rows
    expect(matrix).toHaveLength(2);
    // Row 0: personal → colSpan=2, rowSpan=1 / simple → colSpan=1, rowSpan=2
    expect(matrix[0]?.[0]).toMatchObject({ id: 'personal', colSpan: 2, rowSpan: 1 });
    expect(matrix[0]?.[1]).toMatchObject({ id: 'simple', colSpan: 1, rowSpan: 2 });
    // Row 1: name, age (simple은 rowSpan=2로 이미 row 0에서 커버)
    expect(matrix[1]?.[0]).toMatchObject({ id: 'name', colSpan: 1, rowSpan: 1 });
    expect(matrix[1]?.[1]).toMatchObject({ id: 'age', colSpan: 1, rowSpan: 1 });
  });
});
