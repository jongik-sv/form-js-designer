/**
 * useCellEdit 훅 단위 테스트
 * QA: begin/commit/cancel/재진입/Escape 키 동작 (renderHook)
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/preact';
import { useCellEdit } from '../cells/useCellEdit';

describe('useCellEdit', () => {
  // (정상) 초기 상태: editingCell is null
  it('초기 상태: editingCell이 null이다', () => {
    const { result } = renderHook(() => useCellEdit());
    expect(result.current.editingCell).toBeNull();
  });

  // (정상) beginEdit → editingCell 설정
  it('beginEdit(0, "name") → editingCell이 {rowIndex:0, columnId:"name"}', () => {
    const { result } = renderHook(() => useCellEdit());
    act(() => {
      result.current.beginEdit(0, 'name', 'initial');
    });
    expect(result.current.editingCell).toMatchObject({ rowIndex: 0, columnId: 'name' });
  });

  // (정상) commit → editingCell null + onChange 호출
  it('commit(newVal) → editingCell null로 초기화', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useCellEdit(onChange));
    act(() => {
      result.current.beginEdit(1, 'age', 25);
    });
    act(() => {
      result.current.commit('30');
    });
    expect(result.current.editingCell).toBeNull();
    expect(onChange).toHaveBeenCalledWith(1, 'age', '30');
  });

  // (정상) cancel → editingCell null, onChange 미호출
  it('cancel() → editingCell null + onChange 미호출', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useCellEdit(onChange));
    act(() => {
      result.current.beginEdit(0, 'name', 'draft');
    });
    act(() => {
      result.current.cancel();
    });
    expect(result.current.editingCell).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  // (정상) isEditing(row, col) 체크
  it('beginEdit(2, "score") → isEditing(2, "score") = true, isEditing(2, "name") = false', () => {
    const { result } = renderHook(() => useCellEdit());
    act(() => {
      result.current.beginEdit(2, 'score', 0);
    });
    expect(result.current.isEditing(2, 'score')).toBe(true);
    expect(result.current.isEditing(2, 'name')).toBe(false);
    expect(result.current.isEditing(3, 'score')).toBe(false);
  });
});
