import type { PropsSchema } from '@form-js-designer/designer-core';

export interface TabPanelField {
  id: string;
  type: 'tabPanel';
  label: string;
  components: Array<{ id: string } & Record<string, unknown>>;
}

export const tabPanelPropsSchema: PropsSchema = {
  properties: {
    label: {
      type: 'i18n',
      label: 'designer.components.tabPanel.label',
    },
  },
};
