import type { PropsSchema } from '@form-js-designer/designer-core';

export interface TabItem {
  label: string;
  value: string;
}

export interface TabsSchema {
  id: string;
  type: 'tabs';
  tabs?: TabItem[];
  defaultValue?: string;
  orientation?: 'horizontal' | 'vertical';
  [key: string]: unknown;
}

export const tabsPropsSchema: PropsSchema = {
  properties: {
    tabs: {
      type: 'array',
      label: 'designer.components.tabs.tabs',
      default: [{ label: 'Tab 1', value: 'tab1' }],
    },
    defaultValue: {
      type: 'string',
      label: 'designer.components.tabs.defaultValue',
      default: 'tab1',
    },
    orientation: {
      type: 'enum',
      label: 'designer.components.tabs.orientation',
      default: 'horizontal',
      enum: ['horizontal', 'vertical'] as const,
    },
  },
};
