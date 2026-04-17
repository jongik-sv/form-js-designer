/**
 * EnumCell: enum 타입 셀 renderer
 * read 모드: 선택된 label 표시
 * edit 모드: <select> → change 즉시 commit
 * aria-label = columnDef.header (WCAG 2.2 AA)
 */
import { h } from 'preact';
import { useRef, useEffect } from 'preact/hooks';
import type { CellEditAPI } from './useCellEdit';
import type { ColumnDef } from '../types';

interface EnumOption {
  value: string;
  label: string;
}

interface EnumCellProps {
  value: unknown;
  columnDef: ColumnDef;
  cellEdit: CellEditAPI;
  rowIndex?: number;
}

export function EnumCell({ value, columnDef, cellEdit, rowIndex = 0 }: EnumCellProps) {
  const editing = cellEdit.isEditing(rowIndex, columnDef.id);
  const options: EnumOption[] = (columnDef.meta?.enum as EnumOption[] | undefined) ?? [];
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (editing) {
      selectRef.current?.focus();
    }
  }, [editing]);

  if (editing) {
    const draft = cellEdit.editingCell?.draftValue;
    const currentValue = String(draft ?? value ?? '');

    return (
      <select
        ref={selectRef}
        value={currentValue}
        aria-label={String(columnDef.header)}
        class="fjs-designer-table__cell-select"
        onChange={(e) => {
          const val = (e.currentTarget as HTMLSelectElement).value;
          cellEdit.commit(val);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            cellEdit.cancel();
          }
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  // read 모드: label 표시
  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption?.label ?? (value != null ? String(value) : '');

  return (
    <span
      class="fjs-designer-table__cell-value"
      onClick={() => {
        if (columnDef.editable) {
          cellEdit.beginEdit(rowIndex, columnDef.id, value);
        }
      }}
    >
      {displayLabel}
    </span>
  );
}
