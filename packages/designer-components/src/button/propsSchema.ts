import type { PropsSchema } from '@form-js-designer/designer-core';

export interface ButtonSchema {
  id: string;
  type: 'button';
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  label?: string;
  action?: string;
  [key: string]: unknown;
}

export const buttonPropsSchema: PropsSchema = {
  properties: {
    variant: {
      type: 'enum',
      label: 'designer.components.button.variant',
      default: 'primary',
      enum: ['primary', 'secondary', 'ghost'] as const,
    },
    size: {
      type: 'enum',
      label: 'designer.components.button.size',
      default: 'md',
      enum: ['sm', 'md', 'lg'] as const,
    },
    disabled: {
      type: 'boolean',
      label: 'designer.components.button.disabled',
      default: false,
    },
    label: {
      type: 'i18n',
      label: 'designer.components.button.label',
      default: 'Button',
    },
    action: {
      type: 'expression',
      label: 'designer.components.button.action',
      default: '',
    },
  },
};
