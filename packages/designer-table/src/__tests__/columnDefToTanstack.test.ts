/**
 * columnDefToTanstack 단위 테스트
 * QA 체크리스트 기반: 1단 flat, 2단 그룹, 3단 그룹, id/accessor 미지정 throw, LocaleKey
 */
import { describe, it, expect } from 'vitest';
import { columnDefToTanstack } from '../columnDefToTanstack';
import type { ColumnDef } from '../types';

describe('columnDefToTanstack', () => {
  // (정상) 1단 리프만 있는 flat 변환
  it('1단 리프만 있는 ColumnDef[] → flat TanStack ColumnDef[]로 변환한다', () => {
    const cols: ColumnDef[] = [
      { id: 'name', header: 'table.header.name', accessor: 'name' },
      { id: 'age', header: 'table.header.age', accessor: 'age' },
    ];

    const result = columnDefToTanstack(cols);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 'name', accessorKey: 'name' });
    expect(result[1]).toMatchObject({ id: 'age', accessorKey: 'age' });
    // 리프에는 columns 프로퍼티 없어야 함
    expect((result[0] as unknown as Record<string, unknown>)['columns']).toBeUndefined();
  });

  // (정상) 2단 그룹 변환
  it('2단 그룹(개인정보→이름/이메일) 변환 시 그룹 노드에 columns:[...]가 포함된다', () => {
    const cols: ColumnDef[] = [
      {
        id: 'personal',
        header: 'table.header.personal',
        columns: [
          { id: 'name', header: 'table.header.name', accessor: 'name' },
          { id: 'email', header: 'table.header.email', accessor: 'email' },
        ],
      },
    ];

    const result = columnDefToTanstack(cols);

    expect(result).toHaveLength(1);
    const group = result[0] as unknown as Record<string, unknown>;
    expect(group['id']).toBe('personal');
    expect(Array.isArray(group['columns'])).toBe(true);
    const children = group['columns'] as unknown as Array<Record<string, unknown>>;
    expect(children).toHaveLength(2);
    expect(children[0]).toMatchObject({ id: 'name', accessorKey: 'name' });
    expect(children[1]).toMatchObject({ id: 'email', accessorKey: 'email' });
  });

  // (정상) 3단 그룹 변환
  it('3단 그룹(개인정보→기본→이름/이메일) 변환 시 중간층에 columns 중첩이 올바르게 생성된다', () => {
    const cols: ColumnDef[] = [
      {
        id: 'personal',
        header: 'table.header.personal',
        columns: [
          {
            id: 'basic',
            header: 'table.header.basic',
            columns: [
              { id: 'name', header: 'table.header.name', accessor: 'name' },
              { id: 'email', header: 'table.header.email', accessor: 'email' },
            ],
          },
        ],
      },
    ];

    const result = columnDefToTanstack(cols);

    expect(result).toHaveLength(1);
    const top = result[0] as unknown as Record<string, unknown>;
    expect(top['id']).toBe('personal');
    const midArray = top['columns'] as unknown as Array<Record<string, unknown>>;
    const mid = midArray[0];
    expect(mid).toBeDefined();
    if (!mid) {
      return; // Satisfy TypeScript
    }
    expect(mid['id']).toBe('basic');
    const leaves = mid['columns'] as unknown as Array<Record<string, unknown>>;
    expect(leaves).toHaveLength(2);
    expect(leaves[0]).toMatchObject({ id: 'name', accessorKey: 'name' });
  });

  // (엣지) accessor에 '.' 포함 → accessorFn으로 자동 변환
  it("accessor에 '.' 포함(예: 'address.city') → accessorFn으로 자동 변환된다", () => {
    const cols: ColumnDef[] = [
      { id: 'city', header: 'table.header.city', accessor: 'address.city' },
    ];

    const result = columnDefToTanstack(cols);

    const leaf = result[0] as unknown as Record<string, unknown>;
    // accessorKey 대신 accessorFn이 있어야 함
    expect(leaf['accessorKey']).toBeUndefined();
    expect(typeof leaf['accessorFn']).toBe('function');
    // accessorFn이 올바른 경로에서 값을 가져오는지 확인
    const accessorFn = leaf['accessorFn'] as unknown as (row: unknown) => unknown;
    expect(accessorFn({ address: { city: 'Seoul' } })).toBe('Seoul');
  });

  // (에러) id·accessor 둘 다 미지정 → throw
  it('id·accessor 둘 다 미지정 ColumnDef → columnDefToTanstack이 명시적 에러를 throw한다', () => {
    // id는 required이지만 실제 accessor가 없는 리프 컬럼
    const cols: ColumnDef[] = [
      { id: 'bad', header: 'table.header.bad' }, // accessor 없고 columns도 없는 리프
    ];

    expect(() => columnDefToTanstack(cols)).toThrowError(/accessor/i);
  });

  // (정상) LocaleKey header가 TanStack header 함수로 전달된다
  it('header(LocaleKey)가 TanStack header 프로퍼티로 올바르게 전달된다', () => {
    const cols: ColumnDef[] = [
      { id: 'name', header: 'table.header.name', accessor: 'name' },
    ];

    const result = columnDefToTanstack(cols);

    const leaf = result[0] as unknown as Record<string, unknown>;
    // header는 LocaleKey 문자열이 그대로 전달되거나 함수여야 함
    expect(leaf['header']).toBeDefined();
    // TanStack은 header에 string 또는 함수를 허용함
    const header = leaf['header'];
    expect(typeof header === 'string' || typeof header === 'function').toBe(true);
    if (typeof header === 'string') {
      expect(header).toBe('table.header.name');
    }
  });
});
