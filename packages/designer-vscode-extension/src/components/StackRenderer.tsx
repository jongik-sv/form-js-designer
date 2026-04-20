/**
 * TSK-05-03: StackRenderer
 *
 * form-js type: 'stack' 스키마 렌더러.
 * - direction: 'vertical' | 'horizontal' → flex-direction (column | row)
 * - gap: number → `${gap}px` CSS gap
 * - wrap?: boolean → flex-wrap: wrap | nowrap
 * - min-height: 0 — overflow 방지
 * - 하위 components → ChildrenSlot 위임
 *
 * CSS: media/form-js-components.css의 .fjs-stack 규칙 참조
 */
import { h } from 'preact';
import { defineComponent, ChildrenSlot } from '@form-js-designer/designer-core';
import type { PureRenderProps, ContainerField, FieldSchema } from '@form-js-designer/designer-core';

void h;

// ── 스키마 타입 ──────────────────────────────────────────
export interface StackRendererSchema extends FieldSchema {
  type: 'stack';
  direction: 'vertical' | 'horizontal';
  gap: number;
  wrap?: boolean;
  components?: Array<{ id: string } & Record<string, unknown>>;
}

// ── props 스키마 ─────────────────────────────────────────
const stackRendererPropsSchema = {
  properties: {
    direction: {
      type: 'string',
      label: 'Direction',
      default: 'vertical',
    },
    gap: {
      type: 'number',
      label: 'Gap (px)',
      default: 8,
    },
    wrap: {
      type: 'boolean',
      label: 'Wrap',
      default: false,
    },
  },
};

// ── 렌더 함수 ────────────────────────────────────────────
function StackRendererRender(props: PureRenderProps<StackRendererSchema>) {
  const field = props.field as StackRendererSchema;
  const { direction, gap, wrap } = field;

  const flexDirection = direction === 'horizontal' ? 'row' : 'column';
  const gapValue = `${gap}px`;
  const flexWrap = wrap ? 'wrap' : 'nowrap';

  return (
    <div
      class="fjs-stack"
      data-component="stack"
      id={props.domId}
      style={{
        display: 'flex',
        flexDirection,
        gap: gapValue,
        flexWrap,
        minHeight: '0',
      }}
    >
      <ChildrenSlot field={field as unknown as ContainerField} />
    </div>
  );
}

// ── 컴포넌트 등록 ─────────────────────────────────────────
export const StackRendererComponent = defineComponent<StackRendererSchema>({
  type: 'stack',
  name: '스택',
  group: 'container',
  keyed: false,
  pathed: false,
  escapeGridRender: false,
  propsSchema: stackRendererPropsSchema,
  create: (options = {}) => ({
    type: 'stack',
    direction: 'vertical',
    gap: 8,
    components: [],
    ...options,
  }),
  render: StackRendererRender,
});
