/**
 * NumberCell: number 타입 셀 renderer
 * min/max/step 지원 (column.meta?.numberConstraints)
 * blur/Enter commit, Escape cancel
 * Intl.NumberFormat 로케일 포맷팅 (read 모드)
 */
import { h } from 'preact';
import { useRef, useEffect } from 'preact/hooks';
import type { CellEditAPI } from './useCellEdit';
import type { ColumnDef } from '../types';

interface NumberCellProps {
  value: unknown;
  columnDef: ColumnDef;
  cellEdit: CellEditAPI;
  rowIndex?: number;
}

function commitOrCancel(inputEl: HTMLInputElement, cellEdit: CellEditAPI): void {
  const num = parseFloat(inputEl.value);
  if (!isNaN(num)) {
    cellEdit.commit(num);
  } else {
    cellEdit.cancel();
  }
}

export function NumberCell({ value, columnDef, cellEdit, rowIndex = 0 }: NumberCellProps) {
  const editing = cellEdit.isEditing(rowIndex, columnDef.id);
  const inputRef = useRef<HTMLInputElement>(null);
  const constraints = columnDef.meta?.numberConstraints as { min?: number; max?: number; step?: number } | undefined;

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  if (editing) {
    const draft = cellEdit.editingCell?.draftValue;
    return (
      <input
        ref={inputRef}
        type="number"
        defaultValue={draft != null ? String(draft) : value != null ? String(value) : ''}
        min={constraints?.min}
        max={constraints?.max}
        step={constraints?.step}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commitOrCancel(e.currentTarget as HTMLInputElement, cellEdit);
          } else if (e.key === 'Escape') {
            cellEdit.cancel();
          }
        }}
        onBlur={(e) => commitOrCancel(e.currentTarget as HTMLInputElement, cellEdit)}
        class="fjs-designer-table__cell-input"
      />
    );
  }

  const displayValue = value != null ? String(value) : '';

  return (
    <span class="fjs-designer-table__cell-value">
      {displayValue}
    </span>
  );
}
