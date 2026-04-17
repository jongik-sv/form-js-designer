import type { PropsSchema } from '@form-js-designer/designer-core';

export interface StackSchema {
  id: string;
  type: 'stack';
  direction?: 'horizontal' | 'vertical';
  gap?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly';
  [key: string]: unknown;
}

export const stackPropsSchema: PropsSchema = {
  properties: {
    direction: {
      type: 'enum',
      label: 'designer.components.stack.direction',
      default: 'vertical',
      enum: ['horizontal', 'vertical'] as const,
    },
    gap: {
      type: 'number',
      label: 'designer.components.stack.gap',
      default: 0,
      min: 0,
      max: 8,
    },
    align: {
      type: 'enum',
      label: 'designer.components.stack.align',
      default: 'start',
      enum: ['start', 'center', 'end', 'stretch', 'baseline'] as const,
    },
    justify: {
      type: 'enum',
      label: 'designer.components.stack.justify',
      default: 'start',
      enum: ['start', 'center', 'end', 'space-between', 'space-around', 'space-evenly'] as const,
    },
  },
};
