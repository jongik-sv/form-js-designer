/**
 * TRD §5.1 Table 타입 정의
 * designer-table/src/types.ts
 * TSK-05-02: CellRenderContext, FilterRenderContext, EditingCellState, ColumnReorderContext 추가
 */

import type { LocaleKey } from '@form-js-designer/designer-core';

export type { LocaleKey };

export interface ColumnDef {
  id: string;
  header: LocaleKey;            // i18n
  accessor?: string;            // path 표현식
  /** 런타임 분기 키: BUILTIN_CELL_RENDERERS[type] 매핑용 */
  type?: 'text' | 'number' | 'date' | 'boolean' | 'enum';
  editable?: boolean;
  /** 런타임 분기 키: BUILTIN_FILTER_RENDERERS[filter] 매핑용 */
  filter?: 'text' | 'select' | 'range';
  columns?: ColumnDef[];        // 그룹 헤더용 자식
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta?: Record<string, any>;   // 셀/필터 메타데이터 (enum options, number constraints 등)
}

export interface TableFeatures {
  editing?: boolean;
  filtering?: boolean;
  sorting?: boolean;
  columnReorder?: boolean;
  pagination?: { pageSize: number };
  virtualization?: boolean;
}

export interface TableSchema {
  type: 'table';
  columns: ColumnDef[];         // 트리 구조 → 멀티헤더 자동 colspan
  data: string;                 // FEEL/binding 표현식
  features: TableFeatures;
  [key: string]: unknown;       // FieldSchema 계약 준수
}

/** 편집 셀 상태 (1 슬롯 모델) */
export interface EditingCellState {
  rowIndex: number;
  columnId: string;
  draftValue: unknown;
}

/** CellRenderer 공통 인터페이스 */
export interface CellRendererProps {
  value: unknown;
  columnDef: ColumnDef;
  cellEdit: import('./cells/useCellEdit').CellEditAPI;
}

/** FilterRenderer 공통 인터페이스 */
export interface FilterRendererProps {
  setFilterValue: (value: unknown) => void;
  value: unknown;
}

/** 컬럼 reorder context */
export interface ColumnReorderContext {
  columnOrder: string[];
  setColumnOrder: (updater: (prev: string[]) => string[]) => void;
}
