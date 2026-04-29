/**
 * Phase 1B — TreeRender (dataSource pattern)
 *
 * Mocks @bpmn-io/form-js-viewer's useExpressionEvaluation so each test can
 * specify what the FEEL expression "evaluates to".
 *
 * Covers:
 *   - empty / non-array → "Nothing to show."
 *   - flat list → li per item with data-node-path
 *   - custom labelKey/childrenKey
 *   - nested data, default expanded
 *   - expandedByDefault=false → aria-hidden=true
 *   - showGuides → dc-tree--guides class
 */
import { h } from 'preact';
import { describe, it, expect, afterEach, vi } from 'vitest';

// Mutable resolver — each test sets `mockResolver = (expr) => value`.
let mockResolver: (expr: string) => unknown = () => undefined;

vi.mock('@bpmn-io/form-js-viewer', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    useExpressionEvaluation: (expr: string) => mockResolver(expr),
  };
});

// IMPORTANT: import after vi.mock so the mock is in effect.
const { render, cleanup } = await import('@testing-library/preact');
const { TreeComponent } = await import('../index');
import type { TreeSchema } from '../propsSchema';

void h;

afterEach(() => {
  cleanup();
  mockResolver = () => undefined;
});

const TreeRender = TreeComponent.render;

function makeField(partial: Partial<TreeSchema>): TreeSchema {
  return {
    id: 'tree_test',
    type: 'tree',
    label: '트리',
    dataSource: '=data',
    ...partial,
  };
}

const renderTree = (field: TreeSchema) =>
  render(<TreeRender field={field} domId={field.id} value={undefined} />);

// ---------------------------------------------------------------------------
// empty / non-array
// ---------------------------------------------------------------------------
describe('TreeRender — empty / non-array', () => {
  it('renders "Nothing to show." when dataSource evaluates to []', () => {
    mockResolver = () => [];
    const { container, getByText } = renderTree(makeField({}));
    expect(getByText('Nothing to show.')).toBeTruthy();
    expect(container.querySelector('ul.dc-tree__list')).toBeNull();
  });

  it('renders "Nothing to show." when dataSource evaluates to undefined', () => {
    mockResolver = () => undefined;
    const { getByText } = renderTree(makeField({}));
    expect(getByText('Nothing to show.')).toBeTruthy();
  });

  it('renders "Nothing to show." when dataSource evaluates to a non-array (string/number/object)', () => {
    mockResolver = () => 'not an array';
    const { getByText, unmount } = renderTree(makeField({}));
    expect(getByText('Nothing to show.')).toBeTruthy();
    unmount();

    mockResolver = () => 42;
    const r2 = renderTree(makeField({}));
    expect(r2.getByText('Nothing to show.')).toBeTruthy();
    r2.unmount();

    mockResolver = () => ({ not: 'an array' });
    const r3 = renderTree(makeField({}));
    expect(r3.getByText('Nothing to show.')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// flat list
// ---------------------------------------------------------------------------
describe('TreeRender — flat list', () => {
  it('renders one <li> per item with default labelKey "label"', () => {
    mockResolver = () => [{ label: 'A' }, { label: 'B' }];
    const { container, getByText } = renderTree(makeField({}));
    const items = container.querySelectorAll('li.dc-tree__item');
    expect(items.length).toBe(2);
    expect(getByText('A')).toBeTruthy();
    expect(getByText('B')).toBeTruthy();
    // No toggles since there are no children
    expect(container.querySelectorAll('button.dc-tree__toggle').length).toBe(0);
  });

  it('each <li> has data-node-path attribute', () => {
    mockResolver = () => [{ label: 'A' }, { label: 'B' }];
    const { container } = renderTree(makeField({}));
    const items = Array.from(container.querySelectorAll('li.dc-tree__item')) as HTMLElement[];
    const paths = items.map((el) => el.dataset.nodePath);
    expect(paths).toEqual(['0', '1']);
  });
});

// ---------------------------------------------------------------------------
// custom labelKey / childrenKey
// ---------------------------------------------------------------------------
describe('TreeRender — custom labelKey / childrenKey', () => {
  it('reads node.name when labelKey is "name"', () => {
    mockResolver = () => [{ name: 'X' }, { name: 'Y' }];
    const { getByText } = renderTree(makeField({ labelKey: 'name' }));
    expect(getByText('X')).toBeTruthy();
    expect(getByText('Y')).toBeTruthy();
  });

  it('walks node.kids when childrenKey is "kids"', () => {
    mockResolver = () => [
      { label: 'P', kids: [{ label: 'C1' }, { label: 'C2' }] },
    ];
    const { container, getByText } = renderTree(makeField({ childrenKey: 'kids' }));
    expect(getByText('P')).toBeTruthy();
    expect(getByText('C1')).toBeTruthy();
    expect(getByText('C2')).toBeTruthy();
    // Toggle present since parent has kids
    expect(container.querySelectorAll('button.dc-tree__toggle').length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// nested + default expanded
// ---------------------------------------------------------------------------
describe('TreeRender — nested data, default expanded', () => {
  it('renders parent with toggle and children visible (default expandedByDefault=true)', () => {
    mockResolver = () => [
      { label: 'P', children: [{ label: 'C1' }, { label: 'C2' }] },
    ];
    const { container, getByText } = renderTree(makeField({}));
    expect(getByText('P')).toBeTruthy();
    expect(getByText('C1')).toBeTruthy();
    expect(getByText('C2')).toBeTruthy();

    const toggle = container.querySelector('button.dc-tree__toggle') as HTMLButtonElement;
    expect(toggle).not.toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    const childList = container.querySelector('ul.dc-tree__children') as HTMLElement;
    expect(childList).not.toBeNull();
    expect(childList.getAttribute('aria-hidden')).toBe('false');
  });
});

// ---------------------------------------------------------------------------
// expandedByDefault=false
// ---------------------------------------------------------------------------
describe('TreeRender — expandedByDefault=false', () => {
  it('renders children with aria-hidden=true and toggle aria-expanded=false', () => {
    mockResolver = () => [{ label: 'P', children: [{ label: 'C1' }] }];
    const { container } = renderTree(makeField({ expandedByDefault: false }));

    const toggle = container.querySelector('button.dc-tree__toggle') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    const childList = container.querySelector('ul.dc-tree__children') as HTMLElement;
    expect(childList.getAttribute('aria-hidden')).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// showGuides
// ---------------------------------------------------------------------------
describe('TreeRender — showGuides', () => {
  it('showGuides:true → root has dc-tree--guides class', () => {
    mockResolver = () => [{ label: 'A' }];
    const { container } = renderTree(makeField({ showGuides: true }));
    const root = container.querySelector('.dc-tree') as HTMLElement;
    expect(root.classList.contains('dc-tree--guides')).toBe(true);
  });

  it('showGuides:false (default) → no dc-tree--guides class', () => {
    mockResolver = () => [{ label: 'A' }];
    const { container } = renderTree(makeField({}));
    const root = container.querySelector('.dc-tree') as HTMLElement;
    expect(root.classList.contains('dc-tree--guides')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// data-node-path on nested items
// ---------------------------------------------------------------------------
describe('TreeRender — data-node-path on nested items', () => {
  it('every <li> has a unique data-node-path matching its index path', () => {
    mockResolver = () => [
      {
        label: 'R0',
        children: [
          { label: 'L0' },
          { label: 'M', children: [{ label: 'L1' }] },
        ],
      },
      { label: 'R1' },
    ];
    const { container } = renderTree(makeField({}));
    const items = Array.from(container.querySelectorAll('li.dc-tree__item')) as HTMLElement[];
    const paths = items.map((el) => el.dataset.nodePath).sort();
    // 0, 0-0, 0-1, 0-1-0, 1
    expect(paths).toEqual(['0', '0-0', '0-1', '0-1-0', '1']);
  });
});
