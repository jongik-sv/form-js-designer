/**
 * 셀 renderer 단위 테스트
 * QA: 5 셀 × {read, edit, commit, cancel} 매트릭스
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach } from 'vitest';
import { TextCell } from '../cells/TextCell';
import { NumberCell } from '../cells/NumberCell';
import { DateCell } from '../cells/DateCell';
import { BooleanCell } from '../cells/BooleanCell';
import { EnumCell } from '../cells/EnumCell';
import type { CellEditAPI } from '../cells/useCellEdit';

afterEach(() => {
  cleanup();
});

function makeCellEditAPI(overrides?: Partial<CellEditAPI>): CellEditAPI {
  return {
    isEditing: vi.fn().mockReturnValue(false),
    beginEdit: vi.fn(),
    commit: vi.fn(),
    directCommit: vi.fn(),
    cancel: vi.fn(),
    editingCell: null,
    ...overrides,
  };
}

function makeEditingAPI(overrides?: Partial<CellEditAPI>): CellEditAPI {
  return {
    isEditing: vi.fn().mockReturnValue(true),
    beginEdit: vi.fn(),
    commit: vi.fn(),
    directCommit: vi.fn(),
    cancel: vi.fn(),
    editingCell: { rowIndex: 0, columnId: 'test', draftValue: '' },
    ...overrides,
  };
}

// ===== TextCell =====
describe('TextCell', () => {
  it('read 모드: span으로 값 렌더', () => {
    const api = makeCellEditAPI();
    render(<TextCell value="hello" columnDef={{ id: 'test', header: 'Test', type: 'text' }} cellEdit={api} />);
    expect(screen.getByText('hello')).toBeDefined();
  });

  it('edit 모드: input[type=text] 렌더', () => {
    const api = makeEditingAPI({ editingCell: { rowIndex: 0, columnId: 'test', draftValue: 'hello' } });
    const { container } = render(<TextCell value="hello" columnDef={{ id: 'test', header: 'Test', type: 'text' }} cellEdit={api} />);
    const input = container.querySelector('input[type="text"]');
    expect(input).not.toBeNull();
  });

  it('edit 모드: Enter 키 → commit 호출', () => {
    const commit = vi.fn();
    const api = makeEditingAPI({ commit, editingCell: { rowIndex: 0, columnId: 'test', draftValue: 'world' } });
    const { container } = render(<TextCell value="hello" columnDef={{ id: 'test', header: 'Test', type: 'text' }} cellEdit={api} />);
    const input = container.querySelector('input[type="text"]')!;
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(commit).toHaveBeenCalled();
  });

  it('edit 모드: Escape 키 → cancel 호출', () => {
    const cancel = vi.fn();
    const api = makeEditingAPI({ cancel, editingCell: { rowIndex: 0, columnId: 'test', draftValue: 'world' } });
    const { container } = render(<TextCell value="hello" columnDef={{ id: 'test', header: 'Test', type: 'text' }} cellEdit={api} />);
    const input = container.querySelector('input[type="text"]')!;
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(cancel).toHaveBeenCalled();
  });
});

// ===== NumberCell =====
describe('NumberCell', () => {
  it('read 모드: 값 텍스트로 렌더', () => {
    const api = makeCellEditAPI();
    render(<NumberCell value={42} columnDef={{ id: 'num', header: 'Num', type: 'number' }} cellEdit={api} />);
    expect(screen.getByText('42')).toBeDefined();
  });

  it('edit 모드: input[type=number] 렌더', () => {
    const api = makeEditingAPI({ editingCell: { rowIndex: 0, columnId: 'num', draftValue: 42 } });
    const { container } = render(<NumberCell value={42} columnDef={{ id: 'num', header: 'Num', type: 'number' }} cellEdit={api} />);
    const input = container.querySelector('input[type="number"]');
    expect(input).not.toBeNull();
  });

  it('edit 모드: Enter 키 → commit', () => {
    const commit = vi.fn();
    const api = makeEditingAPI({ commit, editingCell: { rowIndex: 0, columnId: 'num', draftValue: 42 } });
    const { container } = render(<NumberCell value={42} columnDef={{ id: 'num', header: 'Num', type: 'number' }} cellEdit={api} />);
    const input = container.querySelector('input[type="number"]')!;
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(commit).toHaveBeenCalled();
  });

  it('edit 모드: Escape 키 → cancel', () => {
    const cancel = vi.fn();
    const api = makeEditingAPI({ cancel, editingCell: { rowIndex: 0, columnId: 'num', draftValue: 42 } });
    const { container } = render(<NumberCell value={42} columnDef={{ id: 'num', header: 'Num', type: 'number' }} cellEdit={api} />);
    const input = container.querySelector('input[type="number"]')!;
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(cancel).toHaveBeenCalled();
  });
});

// ===== DateCell =====
describe('DateCell', () => {
  it('read 모드: 날짜 문자열 렌더', () => {
    const api = makeCellEditAPI();
    render(<DateCell value="2026-04-17" columnDef={{ id: 'date', header: 'Date', type: 'date' }} cellEdit={api} />);
    // 날짜 표시 (ISO or formatted)
    const container = document.body;
    expect(container.textContent).toContain('2026');
  });

  it('edit 모드: input[type=date] 렌더', () => {
    const api = makeEditingAPI({ editingCell: { rowIndex: 0, columnId: 'date', draftValue: '2026-04-17' } });
    const { container } = render(<DateCell value="2026-04-17" columnDef={{ id: 'date', header: 'Date', type: 'date' }} cellEdit={api} />);
    const input = container.querySelector('input[type="date"]');
    expect(input).not.toBeNull();
  });

  it('edit 모드: Enter → commit (ISO 문자열)', () => {
    const commit = vi.fn();
    const api = makeEditingAPI({ commit, editingCell: { rowIndex: 0, columnId: 'date', draftValue: '2026-04-17' } });
    const { container } = render(<DateCell value="2026-04-17" columnDef={{ id: 'date', header: 'Date', type: 'date' }} cellEdit={api} />);
    const input = container.querySelector('input[type="date"]')!;
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(commit).toHaveBeenCalled();
  });

  it('edit 모드: Escape → cancel', () => {
    const cancel = vi.fn();
    const api = makeEditingAPI({ cancel, editingCell: { rowIndex: 0, columnId: 'date', draftValue: '2026-04-17' } });
    const { container } = render(<DateCell value="2026-04-17" columnDef={{ id: 'date', header: 'Date', type: 'date' }} cellEdit={api} />);
    const input = container.querySelector('input[type="date"]')!;
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(cancel).toHaveBeenCalled();
  });
});

// ===== BooleanCell =====
describe('BooleanCell', () => {
  it('read + immediate: checkbox 렌더', () => {
    const api = makeCellEditAPI();
    const { container } = render(<BooleanCell value={true} columnDef={{ id: 'active', header: 'Active', type: 'boolean' }} cellEdit={api} />);
    const checkbox = container.querySelector('input[type="checkbox"]');
    expect(checkbox).not.toBeNull();
  });

  it('true → checked, false → unchecked', () => {
    const api = makeCellEditAPI();
    const { container: c1 } = render(<BooleanCell value={true} columnDef={{ id: 'a', header: 'A', type: 'boolean' }} cellEdit={api} />);
    expect((c1.querySelector('input[type="checkbox"]') as HTMLInputElement)?.checked).toBe(true);
    cleanup();
    const api2 = makeCellEditAPI();
    const { container: c2 } = render(<BooleanCell value={false} columnDef={{ id: 'b', header: 'B', type: 'boolean' }} cellEdit={api2} />);
    expect((c2.querySelector('input[type="checkbox"]') as HTMLInputElement)?.checked).toBe(false);
  });

  it('체크 변경 → 즉시 directCommit(rowIndex, colId, !prev) 호출', () => {
    const directCommit = vi.fn();
    const api = makeCellEditAPI({ directCommit });
    const { container } = render(<BooleanCell value={false} columnDef={{ id: 'active', header: 'Active', type: 'boolean', editable: true }} cellEdit={api} rowIndex={0} />);
    const checkbox = container.querySelector('input[type="checkbox"]')!;
    fireEvent.change(checkbox, { target: { checked: true } });
    expect(directCommit).toHaveBeenCalledWith(0, 'active', true);
  });

  it('BooleanCell은 별도 편집 모드 없이 즉시 commit (beginEdit 미호출)', () => {
    const beginEdit = vi.fn();
    const directCommit = vi.fn();
    const api = makeCellEditAPI({ beginEdit, directCommit });
    const { container } = render(<BooleanCell value={true} columnDef={{ id: 'active', header: 'Active', type: 'boolean', editable: true }} cellEdit={api} rowIndex={0} />);
    const checkbox = container.querySelector('input[type="checkbox"]')!;
    fireEvent.change(checkbox, { target: { checked: false } });
    expect(beginEdit).not.toHaveBeenCalled();
    expect(directCommit).toHaveBeenCalledWith(0, 'active', false);
  });
});

// ===== EnumCell =====
describe('EnumCell', () => {
  const enumOptions = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
    { value: 'c', label: 'Gamma' },
  ];

  it('read 모드: 선택된 값의 label 표시', () => {
    const api = makeCellEditAPI();
    render(<EnumCell value="a" columnDef={{ id: 'type', header: 'Type', type: 'enum', meta: { enum: enumOptions } }} cellEdit={api} />);
    expect(screen.getByText('Alpha')).toBeDefined();
  });

  it('edit 모드: select 렌더 + 옵션 목록', () => {
    const api = makeEditingAPI({ editingCell: { rowIndex: 0, columnId: 'type', draftValue: 'a' } });
    const { container } = render(<EnumCell value="a" columnDef={{ id: 'type', header: 'Type', type: 'enum', meta: { enum: enumOptions } }} cellEdit={api} />);
    const select = container.querySelector('select');
    expect(select).not.toBeNull();
    const options = container.querySelectorAll('option');
    expect(options.length).toBeGreaterThanOrEqual(3);
  });

  it('select 변경 → commit(selectedValue)', () => {
    const commit = vi.fn();
    const api = makeEditingAPI({ commit, editingCell: { rowIndex: 0, columnId: 'type', draftValue: 'a' } });
    const { container } = render(<EnumCell value="a" columnDef={{ id: 'type', header: 'Type', type: 'enum', meta: { enum: enumOptions } }} cellEdit={api} />);
    const select = container.querySelector('select')!;
    fireEvent.change(select, { target: { value: 'b' } });
    expect(commit).toHaveBeenCalledWith('b');
  });

  it('EnumCell의 select에 aria-label이 컬럼 헤더와 일치', () => {
    const api = makeEditingAPI({ editingCell: { rowIndex: 0, columnId: 'type', draftValue: 'a' } });
    const { container } = render(<EnumCell value="a" columnDef={{ id: 'type', header: 'Type', type: 'enum', meta: { enum: enumOptions } }} cellEdit={api} />);
    const select = container.querySelector('select');
    expect(select?.getAttribute('aria-label')).toBe('Type');
  });
});
