/**
 * main.tsx — designer-table E2E 테스트 하네스
 * TSK-05-02: E2E 스펙의 팔레트 드래그-드롭 경로를 시뮬레이션
 *
 * 팔레트 "Table" 버튼 클릭 → 캔버스에 Table 컴포넌트 마운트
 * URL 파라미터: ?rows=10000 → 10k 행 fixture 로드
 */
import { h, render } from 'preact';
import { useState } from 'preact/hooks';
import { Table } from '../src/Table';
import { generateRows } from '../e2e/fixtures/rows-10k';
import type { TableSchema } from '../src/types';

// URL 파라미터에서 행 수 / 멀티헤더 모드 확인
const params = new URLSearchParams(location.search);
const rowCount = parseInt(params.get('rows') ?? '10', 10);
const useMultiHeader = params.get('multiheader') === '1';

// 3단 멀티헤더 schema (TSK-05-01 검증용)
const MULTIHEADER_SCHEMA: TableSchema = {
  type: 'table',
  columns: [
    {
      id: 'info', header: 'User Info', type: 'text', accessor: '',
      columns: [
        {
          id: 'personal', header: 'Personal', type: 'text', accessor: '',
          columns: [
            { id: 'id', header: 'ID', accessor: 'id', type: 'number', editable: true },
            { id: 'name', header: 'Name', accessor: 'name', type: 'text', editable: true },
          ],
        },
        { id: 'active', header: 'Active', accessor: 'active', type: 'boolean', editable: true },
      ],
    },
    {
      id: 'metrics', header: 'Metrics', type: 'text', accessor: '',
      columns: [
        { id: 'score', header: 'Score', accessor: 'score', type: 'number', editable: true, filter: 'range' },
        { id: 'status', header: 'Status', accessor: 'status', type: 'enum', editable: true, filter: 'select',
          meta: { enum: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }], selectOptions: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }] } },
      ],
    },
  ],
  data: 'rows',
  features: { editing: true, filtering: true, sorting: true, columnReorder: true, virtualization: false },
};

// 기본 schema (5종 셀 타입 포함)
const SCHEMA: TableSchema = {
  type: 'table',
  columns: [
    { id: 'id', header: 'ID', accessor: 'id', type: 'number', editable: true, filter: 'range' },
    { id: 'name', header: 'Name', accessor: 'name', type: 'text', editable: true, filter: 'text' },
    { id: 'createdAt', header: 'Date', accessor: 'createdAt', type: 'date', editable: true },
    { id: 'active', header: 'Active', accessor: 'active', type: 'boolean', editable: true },
    {
      id: 'status', header: 'Status', accessor: 'status', type: 'enum', editable: true, filter: 'select',
      meta: {
        enum: [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
        ],
        selectOptions: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }],
      },
    },
    { id: 'score', header: 'Score', accessor: 'score', type: 'number', editable: true, filter: 'range' },
  ],
  data: 'rows',
  features: {
    editing: true,
    filtering: true,
    sorting: true,
    columnReorder: true,
    virtualization: rowCount >= 1000,
  },
};

function App() {
  const [mounted, setMounted] = useState(false);
  const activeSchema = useMultiHeader ? MULTIHEADER_SCHEMA : SCHEMA;
  const [rows, setRows] = useState(generateRows(rowCount, 42));

  function handlePaletteClick() {
    setMounted(true);
    // 캔버스 드롭 영역 스타일 업데이트
    const canvas = document.getElementById('canvas');
    if (canvas) canvas.classList.remove('empty');
  }

  function handleChange(rowIndex: number, columnId: string, newValue: unknown) {
    setRows(prev => {
      const next = [...prev];
      next[rowIndex] = { ...next[rowIndex]!, [columnId]: newValue } as typeof next[0];
      return next;
    });
  }

  return (
    <div id="root">
      <div id="palette">
        <h3>Components</h3>
        <button
          data-palette-entry="table"
          type="button"
          onClick={handlePaletteClick}
        >
          <svg width="20" height="20" viewBox="0 0 54 54" fill="none">
            <path fill="currentColor" fill-rule="evenodd" d="M42.545 12.273A2.455 2.455 0 0 1 45 14.727v24.546a2.455 2.455 0 0 1-2.455 2.454h-31.09A2.455 2.455 0 0 1 9 39.273V14.727a2.455 2.455 0 0 1 2.455-2.454zM27.818 40.09h14.727a.82.82 0 0 0 .819-.818v-4.91H27.818Zm-1.636-5.727v5.727H11.455a.82.82 0 0 1-.819-.818v-4.91zm1.636-1.637h15.546V27H27.818ZM26.182 27v5.727H10.636V27zm1.636-1.636h15.546v-5.728H27.818Zm-1.636-5.728v5.728H10.636v-5.728z" clip-rule="evenodd"/>
          </svg>
          Table
        </button>
      </div>
      <div data-canvas-drop={true} id="canvas" style={{ minHeight: '400px', background: 'white', padding: '16px' }}>
        {mounted ? (
          <Table
            field={{ ...activeSchema, id: 'table-e2e' }}
            value={rows}
            onChange={handleChange as unknown as (update: { value: unknown }) => void}
          />
        ) : (
          <div style={{ color: '#999', textAlign: 'center', paddingTop: '80px' }}>
            팔레트에서 Table을 클릭하여 추가
          </div>
        )}
      </div>
    </div>
  );
}

// DOM 교체 (index.html의 #root를 App으로 교체)
const rootEl = document.getElementById('root');
if (rootEl) {
  render(<App />, rootEl);
}
