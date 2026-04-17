/**
 * TRD §5.1 Table 타입 정의
 * designer-table/src/types.ts
 */

import type { LocaleKey } from '@form-js-designer/designer-core';

export type { LocaleKey };

export interface ColumnDef {
  id: string;
  header: LocaleKey;            // i18n
  accessor?: string;            // path 표현식
  type?: 'text' | 'number' | 'date' | 'boolean' | 'enum';
  editable?: boolean;
  filter?: 'text' | 'select' | 'range';
  columns?: ColumnDef[];        // 그룹 헤더용 자식
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
