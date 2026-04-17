/**
 * DateCell: date 타입 셀 renderer
 * ISO 날짜 문자열만 허용 (Date 객체 변환 없음, FEEL 파이프라인 일관성)
 * read 모드: Intl.DateTimeFormat ko-KR 포맷팅
 * edit 모드: <input type="date"> → Enter commit, Escape cancel, blur commit
 */
import { h } from 'preact';
import { useRef, useEffect } from 'preact/hooks';
import type { CellEditAPI } from './useCellEdit';
import type { ColumnDef } from '../types';

interface DateCellProps {
  value: unknown;
  columnDef: ColumnDef;
  cellEdit: CellEditAPI;
  rowIndex?: number;
}

function formatDate(value: unknown): string {
  if (!value) return '';
  const str = String(value);
  // ISO date 형식 (YYYY-MM-DD) 파싱
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    try {
      const date = new Date(str);
      if (!isNaN(date.getTime())) {
        return new Intl.DateTimeFormat('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(date);
      }
    } catch {
      // fallback
    }
  }
  return str;
}

export function DateCell({ value, columnDef, cellEdit, rowIndex = 0 }: DateCellProps) {
  const editing = cellEdit.isEditing(rowIndex, columnDef.id);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  if (editing) {
    const draft = cellEdit.editingCell?.draftValue;
    const isoValue = String(draft ?? value ?? '').split('T')[0] ?? '';
    return (
      <input
        ref={inputRef}
        type="date"
        defaultValue={isoValue}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const val = (e.currentTarget as HTMLInputElement).value;
            cellEdit.commit(val); // ISO 문자열 그대로 전달
          } else if (e.key === 'Escape') {
            cellEdit.cancel();
          }
        }}
        onBlur={(e) => {
          const val = (e.currentTarget as HTMLInputElement).value;
          cellEdit.commit(val);
        }}
        class="fjs-designer-table__cell-input"
      />
    );
  }

  return (
    <span class="fjs-designer-table__cell-value">
      {formatDate(value)}
    </span>
  );
}
