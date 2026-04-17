/**
 * TextFilter: text 필터 renderer
 * <input type="text"> + debounce 200ms
 * 빈값 → filter 해제 (setFilterValue(''))
 */
import { h } from 'preact';
import { useRef } from 'preact/hooks';

interface TextFilterProps {
  setFilterValue: (value: string) => void;
  value: string;
  placeholder?: string;
}

export function TextFilter({ setFilterValue, placeholder = '검색...' }: TextFilterProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <input
      type="text"
      placeholder={placeholder}
      class="fjs-designer-table__filter-input"
      onInput={(e) => {
        const val = (e.currentTarget as HTMLInputElement).value;
        if (timerRef.current !== null) {
          clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
          setFilterValue(val);
          timerRef.current = null;
        }, 200);
      }}
    />
  );
}
