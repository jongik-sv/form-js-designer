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
      description: '트리 영역 위에 표시되는 라벨',
    },
    dataSource: {
      type: 'expression',
      label: 'designer.components.tree.dataSource',
      default: '',
      description: '트리 노드 배열을 반환하는 FEEL 표현식. 예: =[{"label":"부모","children":[{"label":"자식"}]}]',
    },
    labelKey: {
      type: 'string',
      label: 'designer.components.tree.labelKey',
      default: 'label',
      description: '각 노드 객체에서 라벨로 사용할 키 이름 (기본: label)',
    },
    childrenKey: {
      type: 'string',
      label: 'designer.components.tree.childrenKey',
      default: 'children',
      description: '각 노드 객체에서 자식 배열로 사용할 키 이름 (기본: children)',
    },
    expandedByDefault: {
      type: 'boolean',
      label: 'designer.components.tree.expandedByDefault',
      default: true,
      description: '켜면 모든 노드가 기본 펼침 상태로 시작합니다',
    },
    showGuides: {
      type: 'boolean',
      label: 'designer.components.tree.showGuides',
      default: false,
      description: '부모-자식 노드를 잇는 가이드 선을 표시합니다',
    },
  },
};
