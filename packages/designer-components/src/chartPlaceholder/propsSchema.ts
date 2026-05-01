import type { PropsSchema, ResolvableI18nValue } from '@form-js-designer/designer-core';
import type { ChartType } from './chartCatalog';

export type { ChartType };

export interface ChartPlaceholderSchema {
  id: string;
  type: 'chartPlaceholder';
  chartType?: ChartType;
  title?: ResolvableI18nValue;
  description?: ResolvableI18nValue;
  [key: string]: unknown;
}

export const chartPlaceholderPropsSchema: PropsSchema = {
  properties: {
    chartType: {
      type: 'enum',
      label: 'designer.components.chartPlaceholder.chartType',
      default: 'bar',
      enum: [
        'bar',
        'line',
        'pie',
        'donut',
        'area',
        'scatter',
        'stackedBar',
        'horizontalBar',
        'gauge',
        'heatmap',
        'treemap',
      ] as const,
      description: '표시할 차트 종류 (시안용 자리표시자 — 실데이터 미연결)',
    },
    title: {
      type: 'i18n',
      label: 'designer.components.chartPlaceholder.title',
      default: '',
      description: '차트 위에 표시되는 제목',
    },
    description: {
      type: 'i18n',
      label: 'designer.components.chartPlaceholder.description',
      default: '',
      description: '차트 아래에 표시되는 설명 텍스트',
    },
  },
};
