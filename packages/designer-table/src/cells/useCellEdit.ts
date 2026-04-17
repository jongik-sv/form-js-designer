/**
 * useCellEdit: 편집 state 훅
 * begin/commit/cancel/isEditing — keydown 핸들러 중앙화
 * TSK-05-02: 1 슬롯 editingCell 모델 (Excel 스타일 단일 인라인 편집)
 */

import { useState } from 'preact/hooks';

export interface EditingCellState {
  rowIndex: number;
  columnId: string;
  draftValue: unknown;
}

export interface CellEditAPI {
  editingCell: EditingCellState | null;
  beginEdit: (rowIndex: number, columnId: string, currentValue: unknown) => void;
  commit: (newValue: unknown) => void;
  /** 편집 모드 없이 즉시 값 변경 (BooleanCell 등 즉시-커밋 셀용) */
  directCommit: (rowIndex: number, columnId: string, newValue: unknown) => void;
  cancel: () => void;
  isEditing: (rowIndex: number, columnId: string) => boolean;
}

/**
 * @param onChange 상위 컴포넌트에서 전달하는 onChange 콜백
 * @returns CellEditAPI
 */
export function useCellEdit(
  onChange?: (rowIndex: number, columnId: string, newValue: unknown) => void
): CellEditAPI {
  const [editingCell, setEditingCell] = useState<EditingCellState | null>(null);

  function beginEdit(rowIndex: number, columnId: string, currentValue: unknown): void {
    setEditingCell({ rowIndex, columnId, draftValue: currentValue });
  }

  function commit(newValue: unknown): void {
    if (editingCell) {
      onChange?.(editingCell.rowIndex, editingCell.columnId, newValue);
    }
    setEditingCell(null);
  }

  function directCommit(rowIndex: number, columnId: string, newValue: unknown): void {
    onChange?.(rowIndex, columnId, newValue);
  }

  function cancel(): void {
    setEditingCell(null);
  }

  function isEditing(rowIndex: number, columnId: string): boolean {
    return (
      editingCell !== null &&
      editingCell.rowIndex === rowIndex &&
      editingCell.columnId === columnId
    );
  }

  return { editingCell, beginEdit, commit, directCommit, cancel, isEditing };
}
