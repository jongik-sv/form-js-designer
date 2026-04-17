/**
 * RangeFilter: range 필터 renderer
 * [<input type="number">, <input type="number">] min/max 2개
 * 빈값 = 경계 해제 (null)
 * 양쪽 null → filter 해제
 */
import { h } from 'preact';
import { useState } from 'preact/hooks';

interface RangeFilterProps {
  setFilterValue: (value: [number | null, number | null]) => void;
  value: [number | null, number | null];
  minPlaceholder?: string;
  maxPlaceholder?: string;
}

export function RangeFilter({
  setFilterValue,
  value,
  minPlaceholder = '최소',
  maxPlaceholder = '최대',
}: RangeFilterProps) {
  const [min, setMin] = useState<string>(value[0] != null ? String(value[0]) : '');
  const [max, setMax] = useState<string>(value[1] != null ? String(value[1]) : '');

  function emitChange(newMin: string, newMax: string) {
    const minNum = newMin !== '' ? parseFloat(newMin) : null;
    const maxNum = newMax !== '' ? parseFloat(newMax) : null;
    setFilterValue([
      minNum !== null && !isNaN(minNum) ? minNum : null,
      maxNum !== null && !isNaN(maxNum) ? maxNum : null,
    ]);
  }

  return (
    <span class="fjs-designer-table__filter-range">
      <input
        type="number"
        value={min}
        placeholder={minPlaceholder}
        class="fjs-designer-table__filter-input fjs-designer-table__filter-input--range"
        onChange={(e) => {
          const val = (e.currentTarget as HTMLInputElement).value;
          setMin(val);
          emitChange(val, max);
        }}
      />
      <input
        type="number"
        value={max}
        placeholder={maxPlaceholder}
        class="fjs-designer-table__filter-input fjs-designer-table__filter-input--range"
        onChange={(e) => {
          const val = (e.currentTarget as HTMLInputElement).value;
          setMax(val);
          emitChange(min, val);
        }}
      />
    </span>
  );
}
