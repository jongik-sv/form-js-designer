import type { PropsSchema } from '@form-js-designer/designer-core';
import type { TabPanelField } from '../tabPanel/propsSchema';

// Legacy TabItem — kept for migration compatibility only
export interface TabItem {
  label: string;
  value: string;
  /** per-tab drop zone components (legacy Option B) */
  components?: Array<{ id: string } & Record<string, unknown>>;
}

export interface TabsSchema {
  id: string;
  type: 'tabs';
  /** New structure: child tabPanel fields */
  components?: TabPanelField[];
  /** Legacy field — present only in old schemas, removed after migration */
  tabs?: TabItem[];
  defaultValue?: string;
  orientation?: 'horizontal' | 'vertical';
  /** Trigger height in pixels. Undefined = content-based auto height. */
  tabHeight?: number;
  [key: string]: unknown;
}

export const tabsPropsSchema: PropsSchema = {
  properties: {
    defaultValue: {
      type: 'string',
      label: 'designer.components.tabs.defaultValue',
    },
    orientation: {
      type: 'enum',
      label: 'designer.components.tabs.orientation',
      default: 'horizontal',
      enum: ['horizontal', 'vertical'] as const,
    },
    tabHeight: {
      type: 'number',
      label: 'designer.components.tabs.tabHeight',
      // 0 = 부모 꽉 채움, 그 외는 min-height(px). 컴포넌트가 많으면 자동 확장.
      min: 0,
      max: 4096,
    },
  },
};
