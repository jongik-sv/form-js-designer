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
  /**
   * Legacy field — migrated to `layout.height`. Readers must prefer `layout.height`.
   * Kept on the type only so migrateLegacyTabsSchema can read it before stripping.
   */
  tabHeight?: number;
  /** Unified height source for the tabs container — handled by LayoutHeightModule. */
  layout?: { height?: number; [key: string]: unknown };
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
  },
};
