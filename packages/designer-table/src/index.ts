/**
 * designer-table public API
 *
 * form-js additionalModules factory: DesignerTableModule
 * 컴포넌트: Table
 * 타입: TableSchema, ColumnDef
 * 유틸: columnDefToTanstack, moveItem
 * 셀/필터: BUILTIN_CELL_RENDERERS, BUILTIN_FILTER_RENDERERS
 */

import { TableComponent } from './Table';

export { Table, TableComponent } from './Table';
export type { TableSchema, ColumnDef, TableFeatures, EditingCellState, ColumnReorderContext } from './types';
export { columnDefToTanstack } from './columnDefToTanstack';
export { getExpectedMatrix } from './colspanMath';
export type { CellInfo } from './colspanMath';
export { useStableTableState } from './useStableTableState';
export type { TableStateInput, StableTableState } from './useStableTableState';
export { tablePropsSchema } from './propsSchema';

// TSK-05-02 신규 exports
export { moveItem } from './dnd/moveItem';
export { useColumnReorder } from './dnd/useColumnReorder';
export { ColumnDragHandle } from './dnd/ColumnDragHandle';
export { BUILTIN_CELL_RENDERERS } from './cells/index';
export { BUILTIN_FILTER_RENDERERS } from './filters/index';
export { textFilterFn, selectFilterFn, rangeFilterFn } from './filters/filterFns';
export { useCellEdit } from './cells/useCellEdit';
export type { CellEditAPI } from './cells/useCellEdit';
export { TextCell } from './cells/TextCell';
export { NumberCell } from './cells/NumberCell';
export { DateCell } from './cells/DateCell';
export { BooleanCell } from './cells/BooleanCell';
export { EnumCell } from './cells/EnumCell';
export { TextFilter } from './filters/TextFilter';
export { SelectFilter } from './filters/SelectFilter';
export { RangeFilter } from './filters/RangeFilter';
export { useRowVirtualizer } from './virtualization/useRowVirtualizer';
export { VirtualRows } from './virtualization/VirtualRows';

/**
 * DesignerTableModule — form-js additionalModules 등록용 factory export
 *
 * form-js 의 DI 컨테이너(`didi`)가 제공하는 `formFields` 서비스에 `table`
 * 타입 컴포넌트를 등록한다. `formFields.register(type, componentDef)` 패턴은
 * designer-components 모듈과 동일하다.
 *
 * 사용 예:
 *   import { Form } from '@bpmn-io/form-js-viewer';
 *   import { DesignerTableModule } from '@form-js-designer/designer-table';
 *
 *   const form = new Form({
 *     container: '#app',
 *     additionalModules: [DesignerTableModule],
 *   });
 */
interface FormFields {
  register: (type: string, componentDef: unknown) => void;
}

function DesignerTableRegistration(formFields: FormFields) {
  // form-js Palette 는 등록된 value 의 `.config` 를 직접 읽으므로
  // `.component` (config 가 붙어있는 Preact component) 를 등록한다.
  formFields.register(TableComponent.type, TableComponent.component);
}
(DesignerTableRegistration as unknown as { $inject: string[] }).$inject = [
  'formFields',
];

export const DesignerTableModule = {
  __init__: ['designerTableRegistration'],
  designerTableRegistration: ['type', DesignerTableRegistration],
};
