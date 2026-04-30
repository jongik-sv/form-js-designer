import type { PropsSchema, ResolvableI18nValue } from '@form-js-designer/designer-core';

export interface TreeNode {
  // Generic tree shape — user-defined keys via labelKey/childrenKey
  [key: string]: unknown;
}

export interface TreeSchema {
  id: string;
  type: 'tree';
  label?: ResolvableI18nValue;
  /** FEEL expression evaluated at render time. Default '=${id}' (auto-bound to own data slot). */
  dataSource?: string;
  /** Property name on each node holding its display label. Default 'label'. */
  labelKey?: string;
  /** Property name on each node holding its children array. Default 'children'. */
  childrenKey?: string;
  /** All nodes start expanded if true. Default true. */
  expandedByDefault?: boolean;
  /** Render dashed connector lines between parent/child. Default false. */
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
    dataSource: {
      type: 'expression',
      label: 'designer.components.tree.dataSource',
      default: '',
    },
    labelKey: {
      type: 'string',
      label: 'designer.components.tree.labelKey',
      default: 'label',
    },
    childrenKey: {
      type: 'string',
      label: 'designer.components.tree.childrenKey',
      default: 'children',
    },
    expandedByDefault: {
      type: 'boolean',
      label: 'designer.components.tree.expandedByDefault',
      default: true,
    },
    showGuides: {
      type: 'boolean',
      label: 'designer.components.tree.showGuides',
      default: false,
    },
  },
};
