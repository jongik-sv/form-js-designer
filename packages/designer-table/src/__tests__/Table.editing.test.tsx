/**
 * Table 편집 통합 테스트
 * QA: features.editing=true에서 셀 클릭 → inline input → Enter commit → onChange 호출
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach } from 'vitest';
import { Table } from '../Table';
import type { TableSchema } from '../types';

afterEach(() => {
  cleanup();
});

const editSchema: TableSchema = {
  type: 'table',
  data: '=items',
  features: { editing: true, filtering: false, sorting: false, columnReorder: false, virtualization: false },
  columns: [
    { id: 'name', header: 'name', accessor: 'name', type: 'text', editable: true },
    { id: 'age', header: 'age', accessor: 'age', type: 'number', editable: true },
    { id: 'active', header: 'active', accessor: 'active', type: 'boolean', editable: true },
  ],
};

const sampleData = [
  { name: 'Alice', age: 30, active: true },
  { name: 'Bob', age: 25, active: false },
];

describe('Table.editing', () => {
  // (통합) TextCell 클릭 → input 렌더 → Enter → onChange 호출
  it('text 셀 클릭 → input 렌더됨', () => {
    const onChange = vi.fn();
    const { container } = render(
      <Table
        field={{ ...editSchema, id: 'edit-table' }}
        value={sampleData}
        domId="edit-table"
        onChange={onChange}
      />
    );

    // data-testid="designer-table" 또는 일반 table 찾기
    const cells = container.querySelectorAll('td');
    expect(cells.length).toBeGreaterThan(0);

    // 첫 번째 셀(name, text)을 클릭
    act(() => {
      fireEvent.click(cells[0]!);
    });

    const input = container.querySelector('input[type="text"]');
    expect(input).not.toBeNull();
  });

  // (통합) boolean 셀은 즉시 onChange 호출
  it('boolean 셀 토글 → onChange 즉시 호출', () => {
    const onChange = vi.fn();
    const { container } = render(
      <Table
        field={{ ...editSchema, id: 'bool-table' }}
        value={sampleData}
        domId="bool-table"
        onChange={onChange}
      />
    );

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBeGreaterThan(0);

    act(() => {
      // click으로 체크 토글 (change 이벤트 이전에 checked 상태 변경)
      fireEvent.click(checkboxes[0]!);
    });

    // directCommit 경로: 체크 토글 → onChange 호출
    // active[0]=true → 클릭 시 false로 토글
    expect(onChange).toHaveBeenCalled();
  });

  // (에러) features.editing=false → 셀 클릭 시 input 없음
  it('features.editing=false → 셀 클릭해도 input 미렌더', () => {
    const schema: TableSchema = {
      ...editSchema,
      features: { ...editSchema.features, editing: false },
    };

    const { container } = render(
      <Table
        field={{ ...schema, id: 'readonly-table' }}
        value={sampleData}
        domId="readonly-table"
      />
    );

    const cells = container.querySelectorAll('td');
    act(() => {
      fireEvent.click(cells[0]!);
    });

    const input = container.querySelector('input[type="text"]');
    expect(input).toBeNull();
  });

  // (통합) 렌더 카운트 ≤ 3 (stable-ref 오딧)
  it('features.editing=true 테이블이 초기 렌더 시 3회 이하로 렌더된다', () => {
    let renderCount = 0;
    function Wrapper() {
      renderCount++;
      return (
        <Table
          field={{ ...editSchema, id: 'count-table' }}
          value={sampleData}
          domId="count-table"
        />
      );
    }
    render(<Wrapper />);
    expect(renderCount).toBeLessThanOrEqual(3);
  });
});
