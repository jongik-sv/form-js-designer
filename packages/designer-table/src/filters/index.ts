/**
 * filters barrel — 3 필터 renderer + BUILTIN_FILTER_RENDERERS 맵
 * TSK-05-02
 */
export { TextFilter } from './TextFilter';
export { SelectFilter } from './SelectFilter';
export { RangeFilter } from './RangeFilter';
export { textFilterFn, selectFilterFn, rangeFilterFn, customFilterFns } from './filterFns';

import { TextFilter } from './TextFilter';
import { SelectFilter } from './SelectFilter';
import { RangeFilter } from './RangeFilter';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FilterRenderer = (props: any) => any;

/**
 * 필터 타입별 renderer 맵
 * 알 수 없는 filter → undefined (헤더만 표시, throw 금지)
 */
export const BUILTIN_FILTER_RENDERERS: Record<string, FilterRenderer> = {
  text: TextFilter,
  select: SelectFilter,
  range: RangeFilter,
};
