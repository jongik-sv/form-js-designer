/**
 * TreeComponent — 트리 표시 컴포넌트 (Phase 0 stub)
 *
 * stub render: nodes 배열을 JSON으로 그대로 출력. Phase 1A에서 재귀 TreeView로 교체.
 */
import { h } from 'preact';
import { defineComponent } from '@form-js-designer/designer-core';
import type { PureRenderProps } from '@form-js-designer/designer-core';
import { treePropsSchema } from './propsSchema';
import type { TreeSchema, TreeNode } from './propsSchema';
import { TreeIcon } from '../icons';
import './Tree.css';

void h;

export type { TreeSchema, TreeNode } from './propsSchema';

function TreeRender(props: PureRenderProps<TreeSchema>) {
  const field = props.field as TreeSchema;
  const nodes = field.nodes ?? [];
  return (
    <div class="dc-tree" data-component="tree" id={props.domId}>
      <pre>{JSON.stringify(nodes, null, 2)}</pre>
    </div>
  );
}

export const TreeComponent = defineComponent<TreeSchema>({
  type: 'tree',
  name: '트리',
  group: 'presentation',
  icon: TreeIcon,
  keyed: false,
  pathed: false,
  escapeGridRender: true,
  propsSchema: treePropsSchema,
  create: (options = {}) => ({
    type: 'tree',
    label: '트리',
    nodes: [],
    ...options,
  }),
  render: TreeRender,
});
