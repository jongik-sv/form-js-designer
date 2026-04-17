/**
 * Table 통합 테스트
 * QA 체크리스트: thead 3개 tr 렌더, LocaleProvider 번역, 무한재렌더 방지(≤5 render)
 */
import { describe, it, expect } from 'vitest';
import { render, screen, cleanup } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach } from 'vitest';
import { LocaleProvider } from '@form-js-designer/designer-core';
import { Table } from '../Table';
import type { TableSchema } from '../types';

// 각 테스트 후 DOM cleanup
afterEach(() => {
  cleanup();
});

// 3단 멀티헤더 스키마 (spike Demo.tsx 구조)
const threeDepthSchema: TableSchema = {
  type: 'table',
  data: '=items',
  features: { sorting: true },
  columns: [
    {
      id: 'personal',
      header: 'table.header.personal',
      columns: [
        {
          id: 'basic',
          header: 'table.header.basic',
          columns: [
            { id: 'name', header: 'table.header.name', accessor: 'name' },
            { id: 'age', header: 'table.header.age', accessor: 'age' },
          ],
        },
        {
          id: 'contact',
          header: 'table.header.contact',
          columns: [
            { id: 'email', header: 'table.header.email', accessor: 'email' },
            { id: 'phone', header: 'table.header.phone', accessor: 'phone' },
          ],
        },
      ],
    },
  ],
};

const sampleData = [
  { name: 'Alice', age: 30, email: 'alice@example.com', phone: '010-1234-5678' },
  { name: 'Bob', age: 25, email: 'bob@example.com', phone: '010-9876-5432' },
];

describe('Table', () => {
  // (정상) thead에 3개의 tr이 존재하고 최상단 th의 colSpan이 leaf 수와 일치
  it('3단 멀티헤더 렌더 시 thead에 3개의 tr이 존재한다', () => {
    const { container } = render(
      <Table
        field={{ ...threeDepthSchema, id: 'test-table' }}
        value={sampleData}
        domId="test-table"
      />
    );

    const thead = container.querySelector('thead');
    expect(thead).not.toBeNull();
    const rows = thead!.querySelectorAll('tr');
    expect(rows).toHaveLength(3);
  });

  it('최상단 th의 colSpan이 전체 leaf 수(4)와 일치한다', () => {
    const { container } = render(
      <Table
        field={{ ...threeDepthSchema, id: 'test-table2' }}
        value={sampleData}
        domId="test-table2"
      />
    );

    const thead = container.querySelector('thead');
    const firstRowThs = thead!.querySelectorAll('tr:first-child th');
    expect(firstRowThs).toHaveLength(1);
    expect(firstRowThs[0]!.getAttribute('colspan')).toBe('4');
  });

  // (정상) LocaleProvider 주입 시 header 텍스트가 t(key) 번역 결과와 일치
  it('LocaleProvider 주입 시 header 텍스트가 t(key) 번역 결과와 일치한다', () => {
    const mockT = (key: string) => {
      const map: Record<string, string> = {
        'table.header.personal': '개인정보',
        'table.header.basic': '기본',
        'table.header.contact': '연락처',
        'table.header.name': '이름',
        'table.header.age': '나이',
        'table.header.email': '이메일',
        'table.header.phone': '전화번호',
      };
      return map[key] ?? key;
    };

    render(
      <LocaleProvider lang="ko" t={mockT}>
        <Table
          field={{ ...threeDepthSchema, id: 'test-table3' }}
          value={sampleData}
          domId="test-table3"
        />
      </LocaleProvider>
    );

    // 번역된 텍스트가 DOM에 있어야 함
    expect(screen.getByText('개인정보')).toBeDefined();
    expect(screen.getByText('이름')).toBeDefined();
    expect(screen.getByText('이메일')).toBeDefined();
  });

  // (에러) 무한재렌더 방지 - 5회 이하 렌더
  it('state에 새 배열을 매 렌더 전달하는 패턴에서도 5회 이하로 렌더된다', () => {
    let renderCount = 0;

    // 매 렌더마다 새 배열을 만드는 컴포넌트로 시뮬레이션
    function TestWrapper() {
      renderCount++;
      // 무한 루프를 유발할 수 있는 패턴: 렌더마다 새 배열
      const freshData = [{ name: 'Test', age: 1, email: 'test@test.com', phone: '010' }];
      return (
        <Table
          field={{ ...threeDepthSchema, id: 'stable-test', features: { sorting: true, filtering: true } }}
          value={freshData}
          domId="stable-test"
        />
      );
    }

    render(<TestWrapper />);

    // 5회 이하 렌더여야 함 (무한 루프 없음)
    expect(renderCount).toBeLessThanOrEqual(5);
  });

  // (정상) 1단 flat 스키마 → thead tr 1개
  it('1단 flat 스키마 → thead에 tr이 1개 존재한다', () => {
    const flatSchema: TableSchema = {
      type: 'table',
      data: '=items',
      features: {},
      columns: [
        { id: 'name', header: 'name', accessor: 'name' },
        { id: 'age', header: 'age', accessor: 'age' },
      ],
    };

    const { container } = render(
      <Table
        field={{ ...flatSchema, id: 'flat-table' }}
        value={[{ name: 'Alice', age: 30 }]}
        domId="flat-table"
      />
    );

    const thead = container.querySelector('thead');
    expect(thead).not.toBeNull();
    const rows = thead!.querySelectorAll('tr');
    expect(rows).toHaveLength(1);
  });
});
