/**
 * table 타입 PropsSchema
 * data(expression), features.*: boolean, features.pagination.pageSize: number, columns: array(ColumnDef)
 */
import type { PropsSchema } from '@form-js-designer/designer-core';

export const tablePropsSchema: PropsSchema = {
  properties: {
    data: {
      type: 'expression',
      label: '데이터 소스',
      description: 'FEEL 표현식 또는 binding 경로',
      group: 'general',
    },
    'features.editing': {
      type: 'boolean',
      label: '셀 편집',
      default: false,
      group: 'features',
    },
    'features.filtering': {
      type: 'boolean',
      label: '컬럼 필터',
      default: false,
      group: 'features',
    },
    'features.sorting': {
      type: 'boolean',
      label: '정렬',
      default: false,
      group: 'features',
    },
    'features.columnReorder': {
      type: 'boolean',
      label: '컬럼 이동',
      default: false,
      group: 'features',
    },
    'features.virtualization': {
      type: 'boolean',
      label: '가상 스크롤',
      default: false,
      group: 'features',
    },
    'features.pagination.pageSize': {
      type: 'number',
      label: '페이지 크기',
      default: 10,
      min: 1,
      max: 500,
      group: 'features',
    },
  },
};
