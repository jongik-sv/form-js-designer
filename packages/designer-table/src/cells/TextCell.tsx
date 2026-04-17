/**
 * TextCell: text 타입 셀 renderer
 * read 모드: <span>{value}</span>
 * edit 모드: <input type="text"> → Enter commit, Escape cancel, blur commit
 */
import { h } from 'preact';
import { useRef, useEffect } from 'preact/hooks';
import type { CellEditAPI } from './useCellEdit';
import type { ColumnDef } from '../types';

interface TextCellProps {
  value: unknown;
  columnDef: ColumnDef;
  cellEdit: CellEditAPI;
  rowIndex?: number;
}

export function TextCell({ value, columnDef, cellEdit, rowIndex = 0 }: TextCellProps) {
  const editing = cellEdit.isEditing(rowIndex, columnDef.id);
  const inputRef = useRef<HTMLInputElement>(null);

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
        type="text"
        defaultValue={String(draft ?? value ?? '')}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            cellEdit.commit((e.currentTarget as HTMLInputElement).value);
          } else if (e.key === 'Escape') {
            cellEdit.cancel();
          }
        }}
        onBlur={(e) => {
          cellEdit.commit((e.currentTarget as HTMLInputElement).value);
        }}
        placeholder="텍스트 입력..."
        class="fjs-designer-table__cell-input"
      />
    );
  }

  return (
    <span
      class="fjs-designer-table__cell-value"
      onClick={() => {
        if (columnDef.editable) {
          cellEdit.beginEdit(rowIndex, columnDef.id, value);
        }
      }}
    >
      {value != null ? String(value) : ''}
    </span>
  );
}
