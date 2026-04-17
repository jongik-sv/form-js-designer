/**
 * BooleanCell: boolean 타입 셀 renderer
 * <input type="checkbox"> inline — 즉시 commit (별도 편집 모드 없음)
 * directCommit(rowIndex, columnId, newValue) 사용하여 beginEdit 없이 즉시 onChange 호출
 *
 * Happy-dom 호환: onChange 대신 onClick 사용 (checked 값은 !currentChecked 계산)
 */
import { h } from 'preact';
import type { CellEditAPI } from './useCellEdit';
import type { ColumnDef } from '../types';

interface BooleanCellProps {
  value: unknown;
  columnDef: ColumnDef;
  cellEdit: CellEditAPI;
  rowIndex?: number;
}

export function BooleanCell({ value, columnDef, cellEdit, rowIndex = 0 }: BooleanCellProps) {
  const checked = Boolean(value);
  const isEditable = columnDef.editable !== false;

  function handleChange(e: Event) {
    if (!isEditable) return;
    // e.target.checked 우선, 없으면 !checked (toggle)
    const target = e.target as HTMLInputElement | null;
    const newVal = target?.checked ?? !checked;
    cellEdit.directCommit(rowIndex, columnDef.id, newVal);
  }

  return (
    <input
      type="checkbox"
      checked={checked}
      aria-label={String(columnDef.header)}
      class="fjs-designer-table__cell-checkbox"
      style={isEditable ? undefined : { pointerEvents: 'none', opacity: 0.6 }}
      onChange={handleChange as unknown as (e: Event) => void}
    />
  );
}
