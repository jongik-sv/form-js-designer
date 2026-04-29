import type { PropsSchema } from '@form-js-designer/designer-core';

export interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
}

export interface TreeSchema {
  id: string;
  type: 'tree';
  label?: string;
  nodes?: TreeNode[];
  expandedByDefault?: boolean;
  showGuides?: boolean;
  [key: string]: unknown;
}

export const treePropsSchema: PropsSchema = {
  properties: {
    label: {
      type: 'i18n',
      label: 'designer.components.tree.label',
      default: '트리',
    },
    nodes: {
      type: 'tree',
      label: 'designer.components.tree.nodes',
      default: Object.freeze([] as unknown[]) as unknown[],
    },
  },
};
