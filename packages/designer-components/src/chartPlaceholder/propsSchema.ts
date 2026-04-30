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
    },
    title: {
      type: 'i18n',
      label: 'designer.components.chartPlaceholder.title',
      default: '',
    },
    description: {
      type: 'i18n',
      label: 'designer.components.chartPlaceholder.description',
      default: '',
    },
  },
};
