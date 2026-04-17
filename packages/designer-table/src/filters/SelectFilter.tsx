/**
 * SelectFilter: select 필터 renderer
 * 옵션 소스: column.meta.selectOptions 우선 → getFacetedUniqueValues() fallback
 * 기본값: "모두 보기" (i18n: designer-table.filter.all)
 */
import { h } from 'preact';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFilterProps {
  setFilterValue: (value: string) => void;
  value: string;
  options?: SelectOption[];
  allLabel?: string;
}

export function SelectFilter({ setFilterValue, value, options = [], allLabel = '모두 보기' }: SelectFilterProps) {
  return (
    <select
      class="fjs-designer-table__filter-select"
      value={value}
      onChange={(e) => {
        // e.target 우선 (testing-library fireEvent.change 호환성)
        const target = (e.target as HTMLSelectElement) ?? (e.currentTarget as HTMLSelectElement);
        const val = target.value;
        setFilterValue(val);
      }}
    >
      <option value="">{allLabel}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
