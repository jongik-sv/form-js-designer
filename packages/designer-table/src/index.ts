/**
 * designer-table public API
 *
 * form-js additionalModules factory: DesignerTableModule
 * 컴포넌트: Table
 * 타입: TableSchema, ColumnDef
 * 유틸: columnDefToTanstack
 */

import { TableComponent } from './Table';

export { Table, TableComponent } from './Table';
export type { TableSchema, ColumnDef, TableFeatures } from './types';
export { columnDefToTanstack } from './columnDefToTanstack';
export { getExpectedMatrix } from './colspanMath';
export type { CellInfo } from './colspanMath';
export { useStableTableState } from './useStableTableState';
export type { TableStateInput, StableTableState } from './useStableTableState';
export { tablePropsSchema } from './propsSchema';

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
export const DesignerTableModule = {
  __init__: ['tableRenderer'],
  tableRenderer: ['type', TableComponent],
};
