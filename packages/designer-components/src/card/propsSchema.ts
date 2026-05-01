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
      description: 'none(0px) · sm(8px) · md(16px) · lg(24px)',
    },
    elevation: {
      type: 'number',
      label: 'designer.components.card.elevation',
      default: 1,
      min: 0,
      max: 3,
      description: '0: 그림자 없음 · 1: 옅은 그림자 · 2: 보통 그림자 · 3: 진한 그림자',
    },
    header: {
      type: 'string',
      label: '제목',
      default: '',
      description: '카드 상단에 표시되는 제목 텍스트',
    },
    headerTag: {
      type: 'enum',
      label: 'designer.components.card.headerTag',
      default: 'h3',
      enum: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const,
      description: 'h1(가장 큼) → h6(가장 작음). 시각적 제목 크기를 결정합니다.',
    },
  },
};
