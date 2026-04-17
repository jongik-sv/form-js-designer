/**
 * 필터 renderer 단위 테스트
 * QA: 3 필터 × {render, change, debounce/boundary} 9 케이스
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/preact';
import { h } from 'preact';
import { TextFilter } from '../filters/TextFilter';
import { SelectFilter } from '../filters/SelectFilter';
import { RangeFilter } from '../filters/RangeFilter';

afterEach(() => {
  cleanup();
});

// ===== TextFilter =====
describe('TextFilter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('input[type=text] 렌더', () => {
    const setFilterValue = vi.fn();
    render(<TextFilter setFilterValue={setFilterValue} value="" placeholder="검색..." />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDefined();
  });

  it('입력 후 200ms debounce → setFilterValue 호출', async () => {
    const setFilterValue = vi.fn();
    render(<TextFilter setFilterValue={setFilterValue} value="" placeholder="검색..." />);
    const input = screen.getByRole('textbox');

    fireEvent.input(input, { target: { value: '김' } });
    expect(setFilterValue).not.toHaveBeenCalled();

    await act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(setFilterValue).toHaveBeenCalledWith('김');
  });

  it('빈 값 입력 → setFilterValue("") 호출 (필터 해제)', async () => {
    const setFilterValue = vi.fn();
    render(<TextFilter setFilterValue={setFilterValue} value="김" placeholder="검색..." />);
    const input = screen.getByRole('textbox');

    fireEvent.input(input, { target: { value: '' } });
    await act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(setFilterValue).toHaveBeenCalledWith('');
  });
});

// ===== SelectFilter =====
describe('SelectFilter', () => {
  const options = [
    { value: 'active', label: '활성' },
    { value: 'inactive', label: '비활성' },
  ];

  it('select 렌더 + "모두 보기" 기본 옵션 포함', () => {
    const setFilterValue = vi.fn();
    const { container } = render(<SelectFilter setFilterValue={setFilterValue} value="" options={options} />);
    const select = container.querySelector('select');
    expect(select).not.toBeNull();
    // "모두 보기" 또는 빈 기본 옵션이 있어야 함
    const firstOption = container.querySelector('option');
    expect(firstOption).not.toBeNull();
  });

  it('옵션 선택 → setFilterValue(value) 호출', () => {
    const setFilterValue = vi.fn();
    const { container } = render(<SelectFilter setFilterValue={setFilterValue} value="" options={options} />);
    const select = container.querySelector('select')!;
    fireEvent.change(select, { target: { value: 'active' } });
    expect(setFilterValue).toHaveBeenCalledWith('active');
  });

  it('"모두 보기" 선택(빈값) → setFilterValue("") 호출', () => {
    const setFilterValue = vi.fn();
    const { container } = render(<SelectFilter setFilterValue={setFilterValue} value="active" options={options} />);
    const select = container.querySelector('select')!;
    fireEvent.change(select, { target: { value: '' } });
    expect(setFilterValue).toHaveBeenCalledWith('');
  });
});

// ===== RangeFilter =====
describe('RangeFilter', () => {
  it('min/max 두 input 렌더', () => {
    const setFilterValue = vi.fn();
    const { container } = render(<RangeFilter setFilterValue={setFilterValue} value={[null, null]} />);
    const inputs = container.querySelectorAll('input[type="number"]');
    expect(inputs).toHaveLength(2);
  });

  it('min 값 변경 → setFilterValue([min, null])', () => {
    const setFilterValue = vi.fn();
    const { container } = render(<RangeFilter setFilterValue={setFilterValue} value={[null, null]} />);
    const [minInput] = container.querySelectorAll('input[type="number"]');
    fireEvent.change(minInput!, { target: { value: '50' } });
    const call = setFilterValue.mock.calls[0];
    expect(call).toBeDefined();
    expect(call![0][0]).toBe(50);
  });

  it('min/max 모두 빈값 → setFilterValue([null, null])', () => {
    const setFilterValue = vi.fn();
    const { container } = render(<RangeFilter setFilterValue={setFilterValue} value={[50, 80]} />);
    const [minInput, maxInput] = container.querySelectorAll('input[type="number"]');
    fireEvent.change(minInput!, { target: { value: '' } });
    fireEvent.change(maxInput!, { target: { value: '' } });
    // 두 번 호출됨, 마지막 호출의 값 확인
    const lastCall = setFilterValue.mock.calls[setFilterValue.mock.calls.length - 1];
    expect(lastCall).toBeDefined();
    expect(lastCall![0]).toEqual([null, null]);
  });
});
