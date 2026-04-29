/**
 * Phase 1A Task 3 — TreeRender (read-only viewer)
 *
 * Covers:
 *   - empty placeholder
 *   - root-only render (no toggles)
 *   - parent + children, default expanded
 *   - expandedByDefault=false → collapsed
 *   - toggle click flips aria-hidden
 *   - showGuides class
 *   - data-node-id attributes
 */
import { h } from 'preact';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/preact';
import { TreeComponent } from '../index';
import type { TreeSchema, TreeNode } from '../propsSchema';

void h;

afterEach(() => {
  cleanup();
});

const TreeRender = TreeComponent.render;

function makeField(partial: Partial<TreeSchema>): TreeSchema {
  return {
    id: 'tree_test',
    type: 'tree',
    label: '트리',
    nodes: [],
    ...partial,
  };
}

const renderTree = (field: TreeSchema) =>
  render(<TreeRender field={field} domId={field.id} value={undefined} />);

describe('TreeRender — empty', () => {
  it('renders "Nothing to show." when nodes is empty array', () => {
    const { container, getByText } = renderTree(makeField({ nodes: [] }));
    expect(getByText('Nothing to show.')).toBeTruthy();
    expect(container.querySelector('ul.dc-tree__list')).toBeNull();
  });

  it('renders "Nothing to show." when nodes is undefined', () => {
    const field = makeField({});
    delete (field as { nodes?: unknown }).nodes;
    const { getByText, container } = renderTree(field);
    expect(getByText('Nothing to show.')).toBeTruthy();
    expect(container.querySelector('ul.dc-tree__list')).toBeNull();
  });

  it('renders "Nothing to show." when nodes is non-array', () => {
    const field = makeField({});
    (field as { nodes?: unknown }).nodes = 'not-an-array' as unknown as TreeNode[];
    const { getByText } = renderTree(field);
    expect(getByText('Nothing to show.')).toBeTruthy();
  });
});

describe('TreeRender — flat tree', () => {
  it('renders 2 root nodes without toggles when no children', () => {
    const nodes: TreeNode[] = [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
    ];
    const { container } = renderTree(makeField({ nodes }));
    const items = container.querySelectorAll('li.dc-tree__item');
    expect(items.length).toBe(2);
    // No real toggle buttons
    expect(container.querySelectorAll('button.dc-tree__toggle').length).toBe(0);
    // data-node-id present on each <li>
    const ids = Array.from(items).map((el) => (el as HTMLElement).dataset.nodeId);
    expect(ids).toEqual(['a', 'b']);
  });
});

describe('TreeRender — parent + children, default expanded', () => {
  const nodes: TreeNode[] = [
    {
      id: 'p',
      label: 'Parent',
      children: [
        { id: 'c1', label: 'Child 1' },
        { id: 'c2', label: 'Child 2' },
      ],
    },
  ];

  it('renders toggle on parent and children visible by default (expandedByDefault=true)', () => {
    const { container } = renderTree(makeField({ nodes, expandedByDefault: true }));
    const toggle = container.querySelector('button.dc-tree__toggle') as HTMLButtonElement | null;
    expect(toggle).not.toBeNull();
    expect(toggle!.getAttribute('aria-expanded')).toBe('true');

    const childList = container.querySelector('ul.dc-tree__children');
    expect(childList).not.toBeNull();
    expect(childList!.getAttribute('aria-hidden')).toBe('false');

    // Children rendered as <li>
    const childItems = childList!.querySelectorAll('li.dc-tree__item');
    expect(childItems.length).toBe(2);
  });

  it('default (no expandedByDefault prop) → also expanded (default true)', () => {
    const { container } = renderTree(makeField({ nodes }));
    const childList = container.querySelector('ul.dc-tree__children');
    expect(childList!.getAttribute('aria-hidden')).toBe('false');
  });
});

describe('TreeRender — expandedByDefault=false', () => {
  const nodes: TreeNode[] = [
    {
      id: 'p',
      label: 'Parent',
      children: [{ id: 'c1', label: 'Child 1' }],
    },
  ];

  it('renders children but aria-hidden=true; toggle present with aria-expanded=false', () => {
    const { container } = renderTree(makeField({ nodes, expandedByDefault: false }));
    const toggle = container.querySelector('button.dc-tree__toggle') as HTMLButtonElement | null;
    expect(toggle).not.toBeNull();
    expect(toggle!.getAttribute('aria-expanded')).toBe('false');

    const childList = container.querySelector('ul.dc-tree__children');
    expect(childList).not.toBeNull();
    expect(childList!.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('TreeRender — toggle interaction', () => {
  it('clicking toggle flips aria-hidden / aria-expanded for that subtree', () => {
    const nodes: TreeNode[] = [
      {
        id: 'p',
        label: 'Parent',
        children: [{ id: 'c1', label: 'Child 1' }],
      },
    ];
    const { container } = renderTree(makeField({ nodes, expandedByDefault: true }));

    const toggle = container.querySelector('button.dc-tree__toggle') as HTMLButtonElement;
    const childList = () => container.querySelector('ul.dc-tree__children') as HTMLElement;

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(childList().getAttribute('aria-hidden')).toBe('false');

    fireEvent.click(toggle);

    const toggle2 = container.querySelector('button.dc-tree__toggle') as HTMLButtonElement;
    expect(toggle2.getAttribute('aria-expanded')).toBe('false');
    expect(childList().getAttribute('aria-hidden')).toBe('true');

    fireEvent.click(toggle2);

    const toggle3 = container.querySelector('button.dc-tree__toggle') as HTMLButtonElement;
    expect(toggle3.getAttribute('aria-expanded')).toBe('true');
    expect(childList().getAttribute('aria-hidden')).toBe('false');
  });
});

describe('TreeRender — showGuides', () => {
  const nodes: TreeNode[] = [{ id: 'a', label: 'A' }];

  it('showGuides:true → root has dc-tree--guides class', () => {
    const { container } = renderTree(makeField({ nodes, showGuides: true }));
    const root = container.querySelector('.dc-tree') as HTMLElement;
    expect(root.classList.contains('dc-tree--guides')).toBe(true);
  });

  it('showGuides:false (default) → no dc-tree--guides class', () => {
    const { container } = renderTree(makeField({ nodes }));
    const root = container.querySelector('.dc-tree') as HTMLElement;
    expect(root.classList.contains('dc-tree--guides')).toBe(false);
  });
});

describe('TreeRender — data-node-id', () => {
  it('every <li> has data-node-id matching its node.id (recursive)', () => {
    const nodes: TreeNode[] = [
      {
        id: 'root1',
        label: 'Root 1',
        children: [
          { id: 'leaf1', label: 'L1' },
          {
            id: 'mid',
            label: 'Mid',
            children: [{ id: 'leaf2', label: 'L2' }],
          },
        ],
      },
      { id: 'root2', label: 'Root 2' },
    ];
    const { container } = renderTree(makeField({ nodes }));
    const all = Array.from(container.querySelectorAll('li.dc-tree__item')) as HTMLElement[];
    const ids = all.map((el) => el.dataset.nodeId).sort();
    expect(ids).toEqual(['leaf1', 'leaf2', 'mid', 'root1', 'root2']);
  });
});
