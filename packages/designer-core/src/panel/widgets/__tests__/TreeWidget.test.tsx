/**
 * TreeWidget — Phase 1A Task 2 tests
 *
 * Covers:
 *   - validate: array shape + duplicate id + max-depth
 *   - render: empty placeholder + count summary
 *   - edit: smoke render, row-per-node, "+ 루트 추가" → onChange, toggle present
 *
 * Uses @testing-library/preact (already a devDependency).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { TreeWidget } from '../TreeWidget';
import type { TreeNode } from '../treeHelpers';
import type { PanelWidgetCtx, WidgetMeta } from '../../types';

const ctx: PanelWidgetCtx = {
  t: (k: string) => k,
  domId: 'tree-test',
  disabled: false,
  label: 'Tree',
};

const meta: WidgetMeta = { type: 'tree', label: 'Tree' };

// Build a chain of `n` nested nodes — depth = n.
function chain(n: number, prefix = 'd'): TreeNode {
  const root: TreeNode = { id: `${prefix}1`, label: 'L1' };
  let cur = root;
  for (let i = 2; i <= n; i++) {
    const child: TreeNode = { id: `${prefix}${i}`, label: `L${i}` };
    cur.children = [child];
    cur = child;
  }
  return root;
}

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------
describe('TreeWidget.validate', () => {
  it('null → ok=false', () => {
    const r = TreeWidget.validate(null, meta);
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('non-array (object) → ok=false', () => {
    const r = TreeWidget.validate({ foo: 1 }, meta);
    expect(r.ok).toBe(false);
  });

  it('empty array → ok=true', () => {
    const r = TreeWidget.validate([], meta);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('duplicate id → ok=false, errors mentions id', () => {
    const v: TreeNode[] = [
      { id: 'a', label: 'A' },
      { id: 'a', label: 'A2' },
    ];
    const r = TreeWidget.validate(v, meta);
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/id/i);
  });

  it('depth exceeding 6 → ok=false', () => {
    const v: TreeNode[] = [chain(7)];
    const r = TreeWidget.validate(v, meta);
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/depth/i);
  });

  it('clean valid tree → ok=true', () => {
    const v: TreeNode[] = [
      { id: 'a', label: 'A', children: [{ id: 'a1', label: 'A1' }] },
      { id: 'b', label: 'B' },
    ];
    const r = TreeWidget.validate(v, meta);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// render
// ---------------------------------------------------------------------------
describe('TreeWidget.render', () => {
  it('empty → "(no nodes)"', () => {
    const { container } = render(TreeWidget.render([], ctx));
    expect(container.textContent).toContain('(no nodes)');
  });

  it('three nodes → contains "3 nodes"', () => {
    const v: TreeNode[] = [
      { id: 'a', label: '부서A' },
      { id: 'b', label: '부서B' },
      { id: 'c', label: '부서C' },
    ];
    const { container } = render(TreeWidget.render(v, ctx));
    expect(container.textContent).toMatch(/3 nodes/);
    expect(container.textContent).toContain('부서A');
  });

  it('counts nested nodes', () => {
    const v: TreeNode[] = [
      { id: 'a', label: 'A', children: [{ id: 'a1', label: 'A1' }, { id: 'a2', label: 'A2' }] },
    ];
    const { container } = render(TreeWidget.render(v, ctx));
    // 1 root + 2 children = 3
    expect(container.textContent).toMatch(/3 nodes/);
  });
});

// ---------------------------------------------------------------------------
// edit smoke
// ---------------------------------------------------------------------------
describe('TreeWidget.edit', () => {
  it('renders without throwing for empty value', () => {
    const onChange = vi.fn();
    const { container } = render(TreeWidget.edit([], onChange, ctx));
    expect(container.firstChild).not.toBeNull();
    // empty placeholder is shown
    expect(container.textContent).toContain('트리가 비어 있습니다.');
  });

  it('renders one row per top-level node', () => {
    const v: TreeNode[] = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
    ];
    const onChange = vi.fn();
    const { container } = render(TreeWidget.edit(v, onChange, ctx));
    const rows = container.querySelectorAll('[role="treeitem"]');
    expect(rows.length).toBe(3);
  });

  it('clicking "+ 루트 추가" calls onChange with a new array containing one node', () => {
    const onChange = vi.fn();
    const { container } = render(TreeWidget.edit([], onChange, ctx));
    const btn = container.querySelector('.panel-widget-tree-add-root') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    fireEvent.click(btn);
    expect(onChange).toHaveBeenCalledTimes(1);
    const arg = onChange.mock.calls[0]![0] as TreeNode[];
    expect(Array.isArray(arg)).toBe(true);
    expect(arg.length).toBe(1);
    expect(arg[0]).toMatchObject({ label: '새 노드' });
    expect(typeof arg[0]!.id).toBe('string');
    expect(arg[0]!.id.length).toBeGreaterThan(0);
  });

  it('node with children renders an expand/collapse toggle element', () => {
    const v: TreeNode[] = [
      {
        id: 'p',
        label: 'Parent',
        children: [{ id: 'c1', label: 'C1' }],
      },
    ];
    const onChange = vi.fn();
    const { container } = render(TreeWidget.edit(v, onChange, ctx));
    const toggle = container.querySelector('.panel-widget-tree-toggle');
    expect(toggle).not.toBeNull();
  });

  it('leaf node has no toggle button', () => {
    const v: TreeNode[] = [{ id: 'leaf', label: 'Leaf' }];
    const onChange = vi.fn();
    const { container } = render(TreeWidget.edit(v, onChange, ctx));
    const toggle = container.querySelector('.panel-widget-tree-toggle');
    expect(toggle).toBeNull();
  });

  it('"+자식" disabled at MAX_DEPTH=6 (last level cannot accept child)', () => {
    // chain of 6 — leaf is at level 6; adding a child would create level 7.
    const v: TreeNode[] = [chain(6)];
    const onChange = vi.fn();
    const { container } = render(TreeWidget.edit(v, onChange, ctx));
    const addChildBtns = container.querySelectorAll('.panel-widget-tree-add-child');
    expect(addChildBtns.length).toBe(6);
    // The last (deepest) row's "+자식" must be disabled.
    const last = addChildBtns[addChildBtns.length - 1] as HTMLButtonElement;
    expect(last.disabled).toBe(true);
    // The first (root) row's "+자식" should be enabled.
    const first = addChildBtns[0] as HTMLButtonElement;
    expect(first.disabled).toBe(false);
  });
});
