import type { PropsSchema } from '@form-js-designer/designer-core';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';
export type CardElevation = 0 | 1 | 2 | 3;
export type CardHeaderTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

export interface CardSchema {
  id: string;
  type: 'card';
  padding?: CardPadding;
  elevation?: CardElevation;
  header?: string;
  headerTag?: CardHeaderTag;
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
      type: 'i18n',
      label: 'designer.components.card.header',
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
