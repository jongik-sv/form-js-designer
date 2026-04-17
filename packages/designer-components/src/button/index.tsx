import { h } from 'preact';
import { cva } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';
import { defineComponent } from '@form-js-designer/designer-core';
import type { PureRenderProps } from '@form-js-designer/designer-core';
import type { ButtonSchema } from './propsSchema';
import { buttonPropsSchema } from './propsSchema';
import './Button.css';

void h;

const buttonVariants = cva('dc-button', {
  variants: {
    variant: {
      primary: 'dc-button--variant-primary',
      secondary: 'dc-button--variant-secondary',
      ghost: 'dc-button--variant-ghost',
    },
    size: {
      sm: 'dc-button--size-sm',
      md: 'dc-button--size-md',
      lg: 'dc-button--size-lg',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

function ButtonRender(props: PureRenderProps<ButtonSchema>) {
  const field = props.field as ButtonSchema;

  const variant = field.variant ?? 'primary';
  const size = field.size ?? 'md';
  const disabled = field.disabled ?? props.disabled ?? false;
  const label = field.label ?? 'Button';

  const className = twMerge(
    buttonVariants({ variant, size }),
    disabled ? 'dc-button--disabled' : '',
  );

  return (
    <button
      class={className}
      data-component="button"
      id={props.domId}
      type="button"
      disabled={disabled}
      aria-disabled={disabled}
      data-variant={variant}
    >
      {label}
    </button>
  );
}

export const ButtonComponent = defineComponent<ButtonSchema>({
  type: 'button',
  name: 'designer.components.button.name',
  group: 'action',
  keyed: false,
  pathed: false,
  escapeGridRender: false,
  propsSchema: buttonPropsSchema,
  create: (options = {}) => ({
    type: 'button',
    variant: 'primary',
    size: 'md',
    label: 'Button',
    ...options,
  }),
  render: ButtonRender,
});
