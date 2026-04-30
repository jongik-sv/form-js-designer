import { h } from 'preact';
import { cva } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';
import { defineComponent, ChildrenSlot, resolveI18n } from '@form-js-designer/designer-core';
import type { PureRenderProps, ContainerField } from '@form-js-designer/designer-core';
import type { CardSchema, CardElevation, CardHeaderTag } from './propsSchema';
import { cardPropsSchema } from './propsSchema';
import { CardIcon } from '../icons';
import './Card.css';

void h;

const cardVariants = cva('dc-card', {
  variants: {
    padding: {
      none: 'dc-card--padding-none',
      sm: 'dc-card--padding-sm',
      md: 'dc-card--padding-md',
      lg: 'dc-card--padding-lg',
    },
    elevation: {
      0: 'dc-card--elevation-0',
      1: 'dc-card--elevation-1',
      2: 'dc-card--elevation-2',
      3: 'dc-card--elevation-3',
    },
  },
  defaultVariants: {
    padding: 'md',
    elevation: 1,
  },
});

function CardRender(props: PureRenderProps<CardSchema>) {
  const field = props.field as CardSchema;
  const errors = props.errors ?? [];

  const padding = field.padding ?? 'md';
  const elevation: CardElevation = field.elevation ?? 1;
  const headerText = resolveI18n(field.header);
  const headerTag: CardHeaderTag = field.headerTag ?? 'h3';

  const className = twMerge(cardVariants({ padding, elevation }));

  const HeaderTag = headerTag;

  return (
    <div class={className} data-component="card" id={props.domId}>
      {headerText ? (
        <HeaderTag class="dc-card__header">{headerText}</HeaderTag>
      ) : null}
      <div class="dc-card__body dc-container-body">
        {/* Forward parent FormField props (onChange/onBlur/onFocus/disabled/readonly)
            so child fields inside the card receive a working onChange handler.
            Without this, dropdown/datetime/textfield interactions throw
            `_onChange is not a function`. */}
        <ChildrenSlot {...props} field={field as unknown as ContainerField} />
      </div>
      {errors.length > 0 ? (
        <ul class="dc-card__errors" aria-label="errors">
          {errors.map((err, i) => (
            <li key={i} class="dc-card__error-item">{err}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export const CardComponent = defineComponent<CardSchema>({
  type: 'card',
  name: '카드',
  group: 'container',
  icon: CardIcon,
  keyed: false,
  pathed: false,
  escapeGridRender: false,
  propsSchema: cardPropsSchema,
  create: (options = {}) => ({
    type: 'card',
    padding: 'md',
    elevation: 1,
    components: [],
    ...options,
  }),
  render: CardRender,
});
