/**
 * Table.create.test.ts
 * TDD: TableComponent.create() 반환값 및 shouldUseDemoData 단위 테스트
 *
 * QA 체크리스트 기반:
 * - TableComponent.create() columns 길이 3, accessor id/name/date
 * - 두 번 호출 시 배열 참조 다름 (복사본 독립성)
 * - create({ columns: [] }) 시 빈 배열 반환
 * - shouldUseDemoData(DEFAULT_COLUMNS) → true
 * - shouldUseDemoData([{ id:'foo', accessor:'foo' }]) → false
 * - shouldUseDemoData([]) → false
 * - 그룹 헤더 포함 멀티헤더 트리에서 shouldUseDemoData 가 리프만 추출하여 판정
 */
import { describe, it, expect } from 'vitest';
import { TableComponent } from '../Table';
import { DEFAULT_COLUMNS, DEMO_ROWS, shouldUseDemoData } from '../demoData';
import type { ColumnDef } from '../types';

describe('DEFAULT_COLUMNS 상수', () => {
  it('길이가 3이다', () => {
    expect(DEFAULT_COLUMNS).toHaveLength(3);
  });

  it('accessor가 각각 id, name, date이다', () => {
    expect(DEFAULT_COLUMNS[0]!.accessor).toBe('id');
    expect(DEFAULT_COLUMNS[1]!.accessor).toBe('name');
    expect(DEFAULT_COLUMNS[2]!.accessor).toBe('date');
  });

  it('header가 각각 ID, Name, Date이다', () => {
    expect(DEFAULT_COLUMNS[0]!.header).toBe('ID');
    expect(DEFAULT_COLUMNS[1]!.header).toBe('Name');
    expect(DEFAULT_COLUMNS[2]!.header).toBe('Date');
  });
});

describe('DEMO_ROWS 상수', () => {
  it('길이가 3이다', () => {
    expect(DEMO_ROWS).toHaveLength(3);
  });

  it('첫 번째 행에 John Doe가 포함된다', () => {
    expect(DEMO_ROWS[0]!.name).toBe('John Doe');
  });

  it('두 번째 행에 Erika Muller가 포함된다', () => {
    expect(DEMO_ROWS[1]!.name).toBe('Erika Muller');
  });

  it('세 번째 행에 Dominic Leaf가 포함된다', () => {
    expect(DEMO_ROWS[2]!.name).toBe('Dominic Leaf');
  });
});

describe('TableComponent.create()', () => {
  it('columns 길이가 3이다', () => {
    const result = TableComponent.create();
    expect((result.columns as ColumnDef[]).length).toBe(3);
  });

  it('accessor가 각각 id, name, date이다', () => {
    const result = TableComponent.create();
    const cols = result.columns as ColumnDef[];
    expect(cols[0]!.accessor).toBe('id');
    expect(cols[1]!.accessor).toBe('name');
    expect(cols[2]!.accessor).toBe('date');
  });

  it('두 번 호출 시 배열 참조가 서로 다르다 (복사본 독립성)', () => {
    const result1 = TableComponent.create();
    const result2 = TableComponent.create();
    expect(result1.columns).not.toBe(result2.columns);
  });

  it('create({ columns: [] }) 호출 시 columns가 빈 배열이다', () => {
    const result = TableComponent.create({ columns: [] });
    expect(result.columns).toEqual([]);
  });

  it('type이 table이다', () => {
    const result = TableComponent.create();
    expect(result.type).toBe('table');
  });

  it('features가 빈 객체이다', () => {
    const result = TableComponent.create();
    expect(result.features).toEqual({});
  });
});

describe('shouldUseDemoData()', () => {
  it('DEFAULT_COLUMNS 전달 시 true를 반환한다', () => {
    expect(shouldUseDemoData(DEFAULT_COLUMNS)).toBe(true);
  });

  it('DEMO_ROWS 키와 불일치하는 컬럼 전달 시 false를 반환한다', () => {
    const cols: ColumnDef[] = [{ id: 'foo', header: 'Foo', accessor: 'foo' }];
    expect(shouldUseDemoData(cols)).toBe(false);
  });

  it('빈 배열 전달 시 false를 반환한다 (리프 0개)', () => {
    expect(shouldUseDemoData([])).toBe(false);
  });

  it('id/name 두 컬럼만 있는 경우 둘 다 DEMO_ROWS 키에 포함되므로 true를 반환한다', () => {
    // DEMO_ROWS 키: {id, name, date}. id/name 둘 다 포함됨 → true
    const cols: ColumnDef[] = [
      { id: 'id', header: 'ID', accessor: 'id' },
      { id: 'name', header: 'Name', accessor: 'name' },
    ];
    expect(shouldUseDemoData(cols)).toBe(true);
  });

  it('그룹 헤더 포함 멀티헤더 트리에서 리프만 추출하여 판정한다 (모두 일치 → true)', () => {
    // 그룹 헤더 포함 구조: 리프가 id/name/date
    const cols: ColumnDef[] = [
      {
        id: 'group1',
        header: 'Group 1',
        columns: [
          { id: 'id', header: 'ID', accessor: 'id' },
          { id: 'name', header: 'Name', accessor: 'name' },
        ],
      },
      {
        id: 'group2',
        header: 'Group 2',
        columns: [
          { id: 'date', header: 'Date', accessor: 'date' },
        ],
      },
    ];
    expect(shouldUseDemoData(cols)).toBe(true);
  });

  it('그룹 헤더 포함 멀티헤더 트리에서 리프 불일치 시 false를 반환한다', () => {
    const cols: ColumnDef[] = [
      {
        id: 'group1',
        header: 'Group 1',
        columns: [
          { id: 'id', header: 'ID', accessor: 'id' },
          { id: 'foo', header: 'Foo', accessor: 'foo' }, // 불일치
        ],
      },
    ];
    expect(shouldUseDemoData(cols)).toBe(false);
  });

  it('accessor가 없는 경우 id로 fallback하여 판정한다', () => {
    // accessor가 없으면 id를 키로 사용
    const cols: ColumnDef[] = [
      { id: 'id', header: 'ID' },
      { id: 'name', header: 'Name' },
      { id: 'date', header: 'Date' },
    ];
    expect(shouldUseDemoData(cols)).toBe(true);
  });
});
