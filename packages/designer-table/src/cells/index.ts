/**
 * cells barrel — 5 셀 renderer + BUILTIN_CELL_RENDERERS 맵
 * TSK-05-02
 */
export { TextCell } from './TextCell';
export { NumberCell } from './NumberCell';
export { DateCell } from './DateCell';
export { BooleanCell } from './BooleanCell';
export { EnumCell } from './EnumCell';
export { useCellEdit } from './useCellEdit';
export type { CellEditAPI, EditingCellState } from './useCellEdit';

import { TextCell } from './TextCell';
import { NumberCell } from './NumberCell';
import { DateCell } from './DateCell';
import { BooleanCell } from './BooleanCell';
import { EnumCell } from './EnumCell';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CellRenderer = (props: any) => any;

/**
 * 타입별 셀 renderer 맵
 * 알 수 없는 type → TextCell fallback (design 결정, throw 금지)
 */
export const BUILTIN_CELL_RENDERERS: Record<string, CellRenderer> = {
  text: TextCell,
  number: NumberCell,
  date: DateCell,
  boolean: BooleanCell,
  enum: EnumCell,
};
