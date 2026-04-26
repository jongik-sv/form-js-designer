/**
 * TSK-05-03: CardRenderer
 *
 * form-js type: 'card' 스키마 렌더러.
 * - 상단 label → <header class="fjs-card__header">
 * - 본문 components → ChildrenSlot 위임
 * - 하단 actions[] → <footer class="fjs-card__footer"> + 버튼 목록
 * - label 없으면 header 미렌더, actions 없으면 footer 미렌더
 *
 * CSS: media/form-js-components.css의 .fjs-card 규칙 참조
 */
import { h } from 'preact';
import { defineComponent, ChildrenSlot } from '@form-js-designer/designer-core';
import type { PureRenderProps, ContainerField, FieldSchema, PropsSchema } from '@form-js-designer/designer-core';

void h;

// ── 스키마 타입 ──────────────────────────────────────────
export interface CardAction {
  label: string;
  variant?: string;
}

export interface CardRendererSchema extends FieldSchema {
  type: 'card';
  label?: string;
  components?: Array<{ id: string } & Record<string, unknown>>;
  actions?: CardAction[];
}

// ── props 스키마 ─────────────────────────────────────────
const cardRendererPropsSchema: PropsSchema = {
  properties: {
    label: {
      type: 'string',
      label: 'Label',
      default: '',
    },
  },
};

// ── 렌더 함수 ────────────────────────────────────────────
function CardRendererRender(props: PureRenderProps<CardRendererSchema>) {
  const field = props.field as CardRendererSchema;
  const { label, actions } = field;

  return (
    <div class="fjs-card" data-component="card" id={props.domId}>
      {label ? (
        <header class="fjs-card__header">{label}</header>
      ) : null}
      <div class="fjs-card__body">
        <ChildrenSlot field={field as unknown as ContainerField} />
      </div>
      {actions && actions.length > 0 ? (
        <footer class="fjs-card__footer">
          {actions.map((action, i) => (
            <button
              key={`${action.label}-${i}`}
              type="button"
              class={`fjs-card__action fjs-card__action--${action.variant ?? 'default'}`}
            >
              {action.label}
            </button>
          ))}
        </footer>
      ) : null}
    </div>
  );
}

// ── 컴포넌트 등록 ─────────────────────────────────────────
export const CardRendererComponent = defineComponent<CardRendererSchema>({
  type: 'card',
  name: '카드',
  group: 'container',
  keyed: false,
  pathed: false,
  escapeGridRender: false,
  propsSchema: cardRendererPropsSchema,
  create: (options = {}) => ({
    type: 'card',
    components: [],
    ...options,
  }),
  render: CardRendererRender,
});
