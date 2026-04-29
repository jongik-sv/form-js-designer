/**
 * TreeComponent — 트리 표시 컴포넌트 (read-only viewer, Phase 1A Task 3)
 *
 * Recursive ul/li display with expand/collapse toggle. Used in:
 *   - form-js viewer / preview
 *   - VS Code markdown preview (morphdom-safe via stable node-id keys)
 *   - TipTap viewer node
 *
 * No editing here — TreeWidget (designer-core) handles authoring.
 *
 * CSP-safe: pure preact JSX, no eval / new Function / dangerouslySetInnerHTML.
 */
import { h, Fragment } from 'preact';
import { useState, useMemo, useCallback } from 'preact/hooks';
import { defineComponent } from '@form-js-designer/designer-core';
import type { PureRenderProps } from '@form-js-designer/designer-core';
import { treePropsSchema } from './propsSchema';
import type { TreeSchema, TreeNode } from './propsSchema';
import { TreeIcon } from '../icons';
import './Tree.css';

void h;

export type { TreeSchema, TreeNode } from './propsSchema';

// ---------------------------------------------------------------------------
// Build a record of all node ids (recursively) → initialExpanded flag.
// ---------------------------------------------------------------------------
function collectIds(nodes: TreeNode[], acc: string[] = []): string[] {
  for (const node of nodes) {
    if (!node || typeof node.id !== 'string') continue;
    acc.push(node.id);
    if (Array.isArray(node.children) && node.children.length > 0) {
      collectIds(node.children, acc);
    }
  }
  return acc;
}

interface TreeRowProps {
  node: TreeNode;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
}

function TreeRow({ node, expanded, onToggle }: TreeRowProps) {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const isOpen = expanded[node.id] === true;

  return (
    <li class="dc-tree__item" data-node-id={node.id}>
      <div class="dc-tree__row">
        {hasChildren ? (
          <button
            type="button"
            class="dc-tree__toggle"
            aria-expanded={isOpen}
            aria-label={isOpen ? '접기' : '펼치기'}
            onClick={() => onToggle(node.id)}
          >
            {isOpen ? '▼' : '▶'}
          </button>
        ) : (
          <span class="dc-tree__toggle dc-tree__toggle--leaf" aria-hidden="true" />
        )}
        <span class="dc-tree__label">{node.label}</span>
      </div>
      {hasChildren ? (
        <ul
          class="dc-tree__children"
          aria-hidden={isOpen ? 'false' : 'true'}
        >
          {(node.children as TreeNode[]).map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function TreeRender(props: PureRenderProps<TreeSchema>) {
  const field = props.field as TreeSchema;
  const nodes: TreeNode[] = Array.isArray(field.nodes) ? field.nodes : [];
  const expandedByDefault = field.expandedByDefault !== false; // default true
  const showGuides = field.showGuides === true;

  // Initial expanded state map. Recompute when default changes or set of node
  // ids changes (we deliberately only seed this once via useState initializer
  // and rely on toggles afterwards — schema mutation is not a concern for the
  // viewer use case).
  const initialExpanded = useMemo<Record<string, boolean>>(() => {
    const ids = collectIds(nodes);
    const map: Record<string, boolean> = {};
    for (const id of ids) map[id] = expandedByDefault;
    return map;
    // We seed once based on initial props; subsequent prop changes won't
    // re-seed (acceptable for read-only viewer). Tests cover both branches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [expanded, setExpanded] = useState<Record<string, boolean>>(initialExpanded);

  const handleToggle = useCallback((id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const rootClass = showGuides ? 'dc-tree dc-tree--guides' : 'dc-tree';

  if (nodes.length === 0) {
    return (
      <div class={rootClass} data-component="tree" id={props.domId}>
        <div class="dc-tree__empty">Nothing to show.</div>
      </div>
    );
  }

  return (
    <div class={rootClass} data-component="tree" id={props.domId}>
      <ul class="dc-tree__list">
        {nodes.map((node) => (
          <TreeRow
            key={node.id}
            node={node}
            expanded={expanded}
            onToggle={handleToggle}
          />
        ))}
      </ul>
    </div>
  );
}

void Fragment;

export const TreeComponent = defineComponent<TreeSchema>({
  type: 'tree',
  name: '트리',
  group: 'presentation',
  icon: TreeIcon,
  keyed: false,
  pathed: false,
  escapeGridRender: false,
  propsSchema: treePropsSchema,
  create: (options = {}) => ({
    type: 'tree',
    label: '트리',
    nodes: [],
    ...options,
  }),
  render: TreeRender,
});
