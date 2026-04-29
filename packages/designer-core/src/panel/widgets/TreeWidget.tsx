/**
 * TreeWidget — 트리 노드 배열 편집 위젯 (Phase 1A Task 2)
 *
 * Replaces the Phase 0 textarea-of-JSON stub with a recursive edit UI:
 *   - Indent by depth (paddingLeft = depth * 16)
 *   - Expand/collapse toggle (local state, not persisted)
 *   - Inline-edit label (IME-safe: uncontrolled input + composition guards,
 *     same pattern as StringWidget)
 *   - "+자식" appends child via addChildAtPath, MAX_DEPTH-aware (disabled if
 *     adding would exceed limit)
 *   - "삭제" removes via deleteNodeAtPath
 *   - "+ 루트 추가" appends root-level node
 *   - Empty placeholder when value === []
 *
 * Validation:
 *   Every user mutation runs validateNoDuplicateIds + validateMaxDepth before
 *   commit; failure shows an inline <div role="alert"> and does NOT call
 *   onChange. Pre-existing invalid trees are still rendered (we only block
 *   user-driven mutations).
 *
 * CSP-safe: pure preact JSX, no eval / new Function / dangerouslySetInnerHTML.
 */
import { h, Fragment } from 'preact';
import { useRef, useState, useEffect, useCallback } from 'preact/hooks';
import type { PanelWidget, PanelWidgetCtx, WidgetMeta, WidgetValidationResult } from '../types';
import {
  type TreeNode,
  MAX_DEPTH,
  addChildAtPath,
  deleteNodeAtPath,
  updateNodeAtPath,
  validateNoDuplicateIds,
  validateNoCycles,
  validateMaxDepth,
} from './treeHelpers';

// ---------------------------------------------------------------------------
// id generation
// ---------------------------------------------------------------------------
function genId(): string {
  // crypto.randomUUID is CSP-safe (no eval) and available in modern browsers /
  // happy-dom. Fall back to time + random for older runtimes.
  const c: { randomUUID?: () => string } | undefined =
    (typeof crypto !== 'undefined' ? (crypto as unknown as { randomUUID?: () => string }) : undefined);
  if (c && typeof c.randomUUID === 'function') {
    return 'n_' + c.randomUUID().slice(0, 8);
  }
  return 'n_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36);
}

function newNode(): TreeNode {
  return { id: genId(), label: '새 노드' };
}

// ---------------------------------------------------------------------------
// IME-safe label input — mirrors StringWidget pattern
// ---------------------------------------------------------------------------
interface LabelInputProps {
  value: string;
  disabled?: boolean;
  ariaLabel: string;
  onCommit: (next: string) => void;
}

function LabelInput({ value, disabled, ariaLabel, onCommit }: LabelInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);
  const lastEmittedRef = useRef<string>(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (value === lastEmittedRef.current) return;
    if (document.activeElement === el) return;
    if (el.value !== value) el.value = value;
  }, [value]);

  const commit = (text: string) => {
    if (text === lastEmittedRef.current) return;
    lastEmittedRef.current = text;
    onCommit(text);
  };

  return (
    <input
      ref={ref}
      type="text"
      aria-label={ariaLabel}
      defaultValue={value}
      disabled={disabled}
      onCompositionStart={() => { composingRef.current = true; }}
      onCompositionEnd={(e) => {
        composingRef.current = false;
        commit((e.target as HTMLInputElement).value);
      }}
      onInput={(e) => {
        if (composingRef.current) return;
        commit((e.target as HTMLInputElement).value);
      }}
      onBlur={(e) => commit((e.target as HTMLInputElement).value)}
      style={{ flex: '1 1 auto', minWidth: '4ch' }}
    />
  );
}

// ---------------------------------------------------------------------------
// Recursive edit UI
// ---------------------------------------------------------------------------
interface TreeEditProps {
  value: TreeNode[];
  onChange: (next: TreeNode[]) => void;
  ctx: PanelWidgetCtx;
}

function runUserGuards(next: TreeNode[]): string | null {
  return validateNoDuplicateIds(next) ?? validateMaxDepth(next);
}

function TreeEdit({ value, onChange, ctx }: TreeEditProps) {
  const safeValue: TreeNode[] = Array.isArray(value) ? value : [];
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  }, []);

  const tryCommit = (next: TreeNode[]) => {
    const err = runUserGuards(next);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    onChange(next);
  };

  const handleAddRoot = () => {
    tryCommit(addChildAtPath(safeValue, [], newNode()));
  };

  const handleAddChild = (path: number[]) => {
    tryCommit(addChildAtPath(safeValue, path, newNode()));
  };

  const handleDelete = (path: number[]) => {
    tryCommit(deleteNodeAtPath(safeValue, path));
  };

  const handleLabel = (path: number[], label: string) => {
    tryCommit(updateNodeAtPath(safeValue, path, { label }));
  };

  return (
    <div class="panel-widget-tree-edit" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {error ? (
        <div role="alert" class="panel-widget-tree-error" style={{ color: '#b91c1c', fontSize: '12px' }}>
          {error}
        </div>
      ) : null}

      <div>
        <button
          type="button"
          disabled={ctx.disabled}
          onClick={handleAddRoot}
          class="panel-widget-tree-add-root"
        >
          + 루트 추가
        </button>
      </div>

      {safeValue.length === 0 ? (
        <div class="panel-widget-tree-empty" style={{ fontSize: '12px', color: '#666' }}>
          트리가 비어 있습니다.
        </div>
      ) : (
        <ul role="tree" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {safeValue.map((node, idx) => (
            <TreeRow
              key={node.id}
              node={node}
              path={[idx]}
              depth={0}
              expanded={expanded}
              onToggle={toggle}
              onAddChild={handleAddChild}
              onDelete={handleDelete}
              onLabel={handleLabel}
              disabled={ctx.disabled}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

interface TreeRowProps {
  node: TreeNode;
  path: number[];
  depth: number;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  onAddChild: (path: number[]) => void;
  onDelete: (path: number[]) => void;
  onLabel: (path: number[], label: string) => void;
  disabled?: boolean;
}

function TreeRow({
  node,
  path,
  depth,
  expanded,
  onToggle,
  onAddChild,
  onDelete,
  onLabel,
  disabled,
}: TreeRowProps) {
  const hasChildren = !!node.children && node.children.length > 0;
  // default expanded = true; collapsed only when explicitly set false
  const isOpen = expanded[node.id] !== false;

  // would adding a child exceed MAX_DEPTH?
  // Current node sits at level (depth + 1). New child would be at level (depth + 2).
  // depth is 0-based (root row depth=0); MAX_DEPTH counts levels (1..MAX_DEPTH).
  const childWouldBeLevel = depth + 2;
  const addChildBlocked = childWouldBeLevel > MAX_DEPTH;

  return (
    <Fragment>
      <li
        role="treeitem"
        aria-expanded={hasChildren ? isOpen : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          paddingLeft: `${depth * 16}px`,
          paddingTop: '2px',
          paddingBottom: '2px',
        }}
      >
        {hasChildren ? (
          <button
            type="button"
            class="panel-widget-tree-toggle"
            aria-label={isOpen ? '접기' : '펼치기'}
            onClick={() => onToggle(node.id)}
            style={{
              width: '20px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {isOpen ? '▼' : '▶'}
          </button>
        ) : (
          <span aria-hidden="true" style={{ width: '20px', display: 'inline-block' }} />
        )}

        <LabelInput
          value={node.label}
          disabled={disabled}
          ariaLabel={`노드 라벨 (${node.id})`}
          onCommit={(next) => onLabel(path, next)}
        />

        <button
          type="button"
          class="panel-widget-tree-add-child"
          disabled={disabled || addChildBlocked}
          title={addChildBlocked ? `최대 깊이 ${MAX_DEPTH} 초과` : undefined}
          onClick={() => onAddChild(path)}
        >
          +자식
        </button>
        <button
          type="button"
          class="panel-widget-tree-delete"
          disabled={disabled}
          onClick={() => onDelete(path)}
        >
          삭제
        </button>
      </li>

      {hasChildren && isOpen
        ? (node.children as TreeNode[]).map((child, idx) => (
            <TreeRow
              key={child.id}
              node={child}
              path={[...path, idx]}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onLabel={onLabel}
              disabled={disabled}
            />
          ))
        : null}
    </Fragment>
  );
}

// ---------------------------------------------------------------------------
// render — read-only summary
// ---------------------------------------------------------------------------
function countNodes(nodes: TreeNode[]): number {
  let n = 0;
  for (const node of nodes) {
    n += 1;
    if (node.children && node.children.length > 0) n += countNodes(node.children);
  }
  return n;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + '…';
}

// ---------------------------------------------------------------------------
// PanelWidget contract
// ---------------------------------------------------------------------------
export const TreeWidget: PanelWidget<TreeNode[]> = {
  render(value, _ctx) {
    const nodes = Array.isArray(value) ? value : [];
    if (nodes.length === 0) {
      return <span class="panel-widget-tree-view">(no nodes)</span>;
    }
    const total = countNodes(nodes);
    const previewLabels = nodes
      .slice(0, 2)
      .map((n) => truncate(n.label ?? '', 12))
      .join(', ');
    return (
      <span class="panel-widget-tree-view">
        {`${total} nodes: ${previewLabels}`}
      </span>
    );
  },

  edit(value, onChange, ctx) {
    const safe = Array.isArray(value) ? value : [];
    return <TreeEdit value={safe} onChange={onChange as (v: TreeNode[]) => void} ctx={ctx} />;
  },

  validate(value: unknown, _meta: WidgetMeta): WidgetValidationResult {
    if (!Array.isArray(value)) {
      return { ok: false, errors: ['Value must be an array of TreeNode'] };
    }
    const errors: string[] = [];
    const dup = validateNoDuplicateIds(value as TreeNode[]);
    if (dup) errors.push(dup);
    const cyc = validateNoCycles(value as TreeNode[]);
    if (cyc) errors.push(cyc);
    const dep = validateMaxDepth(value as TreeNode[]);
    if (dep) errors.push(dep);
    if (errors.length > 0) return { ok: false, errors };
    return { ok: true, errors: [] };
  },
};
