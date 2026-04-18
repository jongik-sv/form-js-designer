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
 * 사용 예:
 *   import { Form } from '@bpmn-io/form-js-viewer';
 *   import { DesignerTableModule } from '@form-js-designer/designer-table';
 *
 *   const form = new Form({
 *     container: '#app',
 *     additionalModules: [DesignerTableModule],
 *   });
 */
/** form-js didi 컨테이너가 주입하는 FormFields 최소 인터페이스 */
interface FormFieldsService {
  register: (type: string, componentDef: unknown) => void;
}

function DesignerTableRegistration(formFields: FormFieldsService) {
  formFields.register(TableComponent.component.config.type, TableComponent.component);
}
(DesignerTableRegistration as unknown as { $inject: string[] }).$inject = ['formFields'];

export const DesignerTableModule = {
  __init__: ['designerTableRegistration'],
  designerTableRegistration: ['type', DesignerTableRegistration],
};
