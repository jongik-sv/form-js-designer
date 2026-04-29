import { h } from 'preact';
import { defineComponent } from '@form-js-designer/designer-core';
import type { PureRenderProps } from '@form-js-designer/designer-core';
import { getChart } from './chartCatalog';
import { chartPlaceholderPropsSchema, type ChartPlaceholderSchema } from './propsSchema';
import { ChartIcon } from '../icons';
import './ChartPlaceholder.css';

void h;

function ChartPlaceholderRender(props: PureRenderProps<ChartPlaceholderSchema>) {
  const field = props.field as ChartPlaceholderSchema;
  const entry = getChart(field.chartType);
  const title = field.title?.trim();
  const description = field.description?.trim();

  return (
    <div
      class="dc-chart-placeholder"
      data-component="chartPlaceholder"
      data-chart-type={entry.type}
      id={props.domId}
    >
      {title ? <div class="dc-chart-placeholder__title">{title}</div> : null}
      <div
        class="dc-chart-placeholder__canvas"
        dangerouslySetInnerHTML={{ __html: entry.fullSvg }}
        aria-label={`${entry.koLabel} 차트 자리`}
        role="img"
      />
      {description ? <div class="dc-chart-placeholder__description">{description}</div> : null}
    </div>
  );
}

export const ChartPlaceholderComponent = defineComponent<ChartPlaceholderSchema>({
  type: 'chartPlaceholder',
  name: '차트',
  group: 'presentation',
  icon: ChartIcon,
  keyed: false,
  pathed: false,
  escapeGridRender: true,
  propsSchema: chartPlaceholderPropsSchema,
  create: (options = {}) => ({
    type: 'chartPlaceholder',
    chartType: 'bar',
    title: '',
    description: '',
    ...options,
  }),
  render: ChartPlaceholderRender,
});
