/**
 * TreeComponent — 트리 표시 컴포넌트 (Phase 1B: dataSource pattern)
 *
 * Mirrors form-js Table pattern: user supplies a FEEL expression that
 * evaluates to an array of nodes; TreeRender renders read-only.
 *
 * Used in:
 *   - form-js viewer / preview
 *   - VS Code markdown preview
 *   - TipTap viewer node
 *
 * CSP-safe: pure preact JSX, no eval / new Function / dangerouslySetInnerHTML.
 */
import { h, Fragment } from 'preact';
import { useState, useCallback } from 'preact/hooks';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — useExpressionEvaluation is exported at runtime by form-js-viewer
import { useExpressionEvaluation } from '@bpmn-io/form-js-viewer';
import { defineComponent } from '@form-js-designer/designer-core';
import type { PureRenderProps } from '@form-js-designer/designer-core';
import { treePropsSchema } from './propsSchema';
import type { TreeSchema, TreeNode } from './propsSchema';
import { TreeIcon } from '../icons';
import './Tree.css';

void h;
void Fragment;

export type { TreeSchema, TreeNode } from './propsSchema';

interface TreeRowProps {
  node: TreeNode;
  path: string;
  labelKey: string;
  childrenKey: string;
  expandedByDefault: boolean;
  overrides: Record<string, boolean>;
  onToggle: (path: string) => void;
}

function getStringLabel(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function TreeRow({ node, path, labelKey, childrenKey, expandedByDefault, overrides, onToggle }: TreeRowProps) {
  const rawChildren = node[childrenKey];
  const children = Array.isArray(rawChildren) ? (rawChildren as TreeNode[]) : [];
  const hasChildren = children.length > 0;
  const isOpen = path in overrides ? overrides[path] : expandedByDefault;
  const labelText = getStringLabel(node[labelKey]);

  return (
    <li class="dc-tree__item" data-node-path={path}>
      <div class="dc-tree__row">
        {hasChildren ? (
          <button
            type="button"
            class="dc-tree__toggle"
            aria-expanded={isOpen}
            aria-label={isOpen ? '접기' : '펼치기'}
            onClick={() => onToggle(path)}
          >
            {isOpen ? '▼' : '▶'}
          </button>
        ) : (
          <span class="dc-tree__toggle dc-tree__toggle--leaf" aria-hidden="true" />
        )}
        <span class="dc-tree__label">{labelText}</span>
      </div>
      {hasChildren ? (
        <ul
          class="dc-tree__children"
          aria-hidden={isOpen ? 'false' : 'true'}
        >
          {children.map((child, idx) => (
            <TreeRow
              key={`${path}-${idx}`}
              node={child}
              path={`${path}-${idx}`}
              labelKey={labelKey}
              childrenKey={childrenKey}
              expandedByDefault={expandedByDefault}
              overrides={overrides}
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
  const dataSource = typeof field.dataSource === 'string' ? field.dataSource : '';
  const labelKey = typeof field.labelKey === 'string' && field.labelKey ? field.labelKey : 'label';
  const childrenKey = typeof field.childrenKey === 'string' && field.childrenKey ? field.childrenKey : 'children';
  const expandedByDefault = field.expandedByDefault !== false; // default true
  const showGuides = field.showGuides === true;

  const evaluated = useExpressionEvaluation(dataSource) as unknown;
  const nodes: TreeNode[] = Array.isArray(evaluated) ? (evaluated as TreeNode[]) : [];

  // overrides map keyed by node path string. Absence means "use the default".
  // Toggling flips the effective state (default OR previous override) and
  // stores the new value as an override.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const handleToggle = useCallback(
    (path: string) => {
      setOverrides((prev) => {
        const current = path in prev ? prev[path] : expandedByDefault;
        return { ...prev, [path]: !current };
      });
    },
    [expandedByDefault],
  );

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
        {nodes.map((node, idx) => (
          <TreeRow
            key={String(idx)}
            node={node}
            path={String(idx)}
            labelKey={labelKey}
            childrenKey={childrenKey}
            expandedByDefault={expandedByDefault}
            overrides={overrides}
            onToggle={handleToggle}
          />
        ))}
      </ul>
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
  escapeGridRender: false,
  propsSchema: treePropsSchema,
  create: (options = {}) => {
    const { id, ...rest } = options as { id?: string; [k: string]: unknown };
    return {
      type: 'tree',
      label: '트리',
      dataSource: typeof id === 'string' && id ? `=${id}` : '',
      ...(id !== undefined ? { id } : {}),
      ...rest,
    };
  },
  render: TreeRender,
});
