import type { PropsSchema, ResolvableI18nValue } from '@form-js-designer/designer-core';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';
export type CardElevation = 0 | 1 | 2 | 3;
export type CardHeaderTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

export interface CardSchema {
  id: string;
  type: 'card';
  padding?: CardPadding;
  elevation?: CardElevation;
  header?: ResolvableI18nValue;
  headerTag?: CardHeaderTag;
  components?: Array<{ id: string } & Record<string, unknown>>;
  verticalAlignment?: string;
  [key: string]: unknown;
}

export const cardPropsSchema: PropsSchema = {
  properties: {
    padding: {
      type: 'enum',
      label: 'designer.components.card.padding',
      default: 'md',
      enum: ['none', 'sm', 'md', 'lg'] as const,
    },
    elevation: {
      type: 'number',
      label: 'designer.components.card.elevation',
      default: 1,
      min: 0,
      max: 3,
    },
    header: {
      type: 'string',
      label: '제목',
      default: '',
    },
    headerTag: {
      type: 'enum',
      label: 'designer.components.card.headerTag',
      default: 'h3',
      enum: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const,
    },
  },
};
