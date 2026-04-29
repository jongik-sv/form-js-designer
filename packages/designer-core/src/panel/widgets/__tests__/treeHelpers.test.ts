/**
 * Phase 1A Task 1 — pure helpers for tree node manipulation (TDD).
 *
 * No DOM, no JSX, no preact — pure data transformation only.
 */
import { describe, it, expect } from 'vitest';
import {
  addChildAtPath,
  deleteNodeAtPath,
  updateNodeAtPath,
  validateNoDuplicateIds,
  validateNoCycles,
  validateMaxDepth,
  MAX_DEPTH,
  type TreeNode,
} from '../treeHelpers';

// -----------------------------------------------------------------------------
// helpers
// -----------------------------------------------------------------------------
const node = (id: string, label: string, children?: TreeNode[]): TreeNode =>
  children !== undefined ? { id, label, children } : { id, label };

const sampleTree = (): TreeNode[] => [
  node('a', 'A', [node('a1', 'A1'), node('a2', 'A2', [node('a2x', 'A2X')])]),
  node('b', 'B'),
];

// Deep clone for input-mutation assertions.
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

// -----------------------------------------------------------------------------
// addChildAtPath
// -----------------------------------------------------------------------------
describe('addChildAtPath', () => {
  it('empty tree + empty path → [newNode]', () => {
    const result = addChildAtPath([], [], node('x', 'X'));
    expect(result).toEqual([{ id: 'x', label: 'X' }]);
  });

  it('single root + path [0] → root with children: [newNode]', () => {
    const tree: TreeNode[] = [node('a', 'A')];
    const result = addChildAtPath(tree, [0], node('x', 'X'));
    expect(result[0]!.children).toEqual([{ id: 'x', label: 'X' }]);
    expect(result[0]!.id).toBe('a');
  });

  it('existing children + path [0] → appended at end', () => {
    const tree: TreeNode[] = [node('a', 'A', [node('a1', 'A1')])];
    const result = addChildAtPath(tree, [0], node('x', 'X'));
    expect(result[0]!.children).toHaveLength(2);
    expect(result[0]!.children?.[1]).toEqual({ id: 'x', label: 'X' });
    expect(result[0]!.children?.[0]).toEqual({ id: 'a1', label: 'A1' });
  });

  it('out-of-range path [5] → throws RangeError', () => {
    const tree: TreeNode[] = [node('a', 'A')];
    expect(() => addChildAtPath(tree, [5], node('x', 'X'))).toThrow(RangeError);
  });

  it('does not mutate the original tree', () => {
    const tree = sampleTree();
    const snapshot = clone(tree);
    addChildAtPath(tree, [0], node('x', 'X'));
    expect(tree).toEqual(snapshot);
  });

  it('appends at deep path [0, 1]', () => {
    const tree = sampleTree();
    const result = addChildAtPath(tree, [0, 1], node('x', 'X'));
    expect(result[0]!.children?.[1]!.children).toHaveLength(2);
    expect(result[0]!.children?.[1]!.children?.[1]).toEqual({ id: 'x', label: 'X' });
  });
});

// -----------------------------------------------------------------------------
// deleteNodeAtPath
// -----------------------------------------------------------------------------
describe('deleteNodeAtPath', () => {
  it('empty path [] → throws RangeError', () => {
    expect(() => deleteNodeAtPath(sampleTree(), [])).toThrow(RangeError);
  });

  it('path [0] removes first root, returns rest', () => {
    const tree = sampleTree();
    const result = deleteNodeAtPath(tree, [0]);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('b');
  });

  it('path [0, 1] removes second child of first root', () => {
    const tree = sampleTree();
    const result = deleteNodeAtPath(tree, [0, 1]);
    expect(result[0]!.children).toHaveLength(1);
    expect(result[0]!.children?.[0]!.id).toBe('a1');
  });

  it('out-of-range path → throws RangeError', () => {
    expect(() => deleteNodeAtPath(sampleTree(), [42])).toThrow(RangeError);
    expect(() => deleteNodeAtPath(sampleTree(), [0, 99])).toThrow(RangeError);
  });

  it('does not mutate the original tree', () => {
    const tree = sampleTree();
    const snapshot = clone(tree);
    deleteNodeAtPath(tree, [0, 0]);
    expect(tree).toEqual(snapshot);
  });
});

// -----------------------------------------------------------------------------
// updateNodeAtPath
// -----------------------------------------------------------------------------
describe('updateNodeAtPath', () => {
  it('empty path [] → throws RangeError', () => {
    expect(() => updateNodeAtPath(sampleTree(), [], { label: 'X' })).toThrow(RangeError);
  });

  it('patch { label: "X" } only changes label, preserves id and children', () => {
    const tree = sampleTree();
    const result = updateNodeAtPath(tree, [0], { label: 'New A' });
    expect(result[0]!.label).toBe('New A');
    expect(result[0]!.id).toBe('a');
    expect(result[0]!.children).toHaveLength(2);
  });

  it('out-of-range path → throws RangeError', () => {
    expect(() => updateNodeAtPath(sampleTree(), [42], { label: 'X' })).toThrow(RangeError);
    expect(() => updateNodeAtPath(sampleTree(), [0, 99], { label: 'X' })).toThrow(RangeError);
  });

  it('does not mutate the original tree', () => {
    const tree = sampleTree();
    const snapshot = clone(tree);
    updateNodeAtPath(tree, [0], { label: 'New A' });
    expect(tree).toEqual(snapshot);
  });

  it('patch { id: "new-id" } works (no internal uniqueness enforcement)', () => {
    const tree = sampleTree();
    const result = updateNodeAtPath(tree, [1], { id: 'new-id' });
    expect(result[1]!.id).toBe('new-id');
    expect(result[1]!.label).toBe('B');
  });

  it('patch at deep path [0, 1, 0]', () => {
    const tree = sampleTree();
    const result = updateNodeAtPath(tree, [0, 1, 0], { label: 'patched' });
    expect(result[0]!.children?.[1]!.children?.[0]!.label).toBe('patched');
    expect(result[0]!.children?.[1]!.children?.[0]!.id).toBe('a2x');
  });
});

// -----------------------------------------------------------------------------
// validateNoDuplicateIds
// -----------------------------------------------------------------------------
describe('validateNoDuplicateIds', () => {
  it('empty tree → null', () => {
    expect(validateNoDuplicateIds([])).toBeNull();
  });

  it('all unique → null', () => {
    expect(validateNoDuplicateIds(sampleTree())).toBeNull();
  });

  it('two roots with same id → error string mentioning the id', () => {
    const tree: TreeNode[] = [node('dup', 'A'), node('dup', 'B')];
    const result = validateNoDuplicateIds(tree);
    expect(result).not.toBeNull();
    expect(result).toContain('dup');
  });

  it('root and grandchild with same id → error', () => {
    const tree: TreeNode[] = [
      node('a', 'A', [node('a1', 'A1', [node('a', 'collision')])]),
    ];
    const result = validateNoDuplicateIds(tree);
    expect(result).not.toBeNull();
    expect(result).toContain('a');
  });

  it('single character labels are fine', () => {
    const tree: TreeNode[] = [node('a', 'X'), node('b', 'Y')];
    expect(validateNoDuplicateIds(tree)).toBeNull();
  });
});

// -----------------------------------------------------------------------------
// validateNoCycles
// -----------------------------------------------------------------------------
describe('validateNoCycles', () => {
  it('normal tree → null', () => {
    expect(validateNoCycles(sampleTree())).toBeNull();
  });

  it('manually constructed cycle → error', () => {
    const shared: TreeNode = node('shared', 'S');
    const tree: TreeNode[] = [
      { id: 'a', label: 'A', children: [shared] },
      { id: 'b', label: 'B', children: [shared] },
    ];
    const result = validateNoCycles(tree);
    expect(result).not.toBeNull();
    expect(result).toContain('shared');
  });

  it('empty tree → null', () => {
    expect(validateNoCycles([])).toBeNull();
  });
});

// -----------------------------------------------------------------------------
// validateMaxDepth
// -----------------------------------------------------------------------------
describe('validateMaxDepth', () => {
  // build a chain of given depth: depth 1 = [{a1}], depth 2 = [{a1,children:[{a2}]}]
  const chain = (depth: number): TreeNode[] => {
    if (depth <= 0) return [];
    let acc: TreeNode | undefined;
    for (let i = depth; i >= 1; i--) {
      const n: TreeNode = acc ? { id: `n${i}`, label: `N${i}`, children: [acc] } : { id: `n${i}`, label: `N${i}` };
      acc = n;
    }
    return [acc as TreeNode];
  };

  it('empty tree → null', () => {
    expect(validateMaxDepth([])).toBeNull();
  });

  it('depth 1 (just roots) → null', () => {
    expect(validateMaxDepth([node('a', 'A'), node('b', 'B')])).toBeNull();
  });

  it('depth 6 (default max) → null', () => {
    expect(validateMaxDepth(chain(6))).toBeNull();
  });

  it('depth 7 → error mentioning 7 and 6', () => {
    const result = validateMaxDepth(chain(7));
    expect(result).not.toBeNull();
    expect(result).toContain('7');
    expect(result).toContain('6');
  });

  it('custom max=2: depth 2 ok, depth 3 errors', () => {
    expect(validateMaxDepth(chain(2), 2)).toBeNull();
    const err = validateMaxDepth(chain(3), 2);
    expect(err).not.toBeNull();
    expect(err).toContain('3');
    expect(err).toContain('2');
  });

  it('MAX_DEPTH constant equals 6', () => {
    expect(MAX_DEPTH).toBe(6);
  });
});

// -----------------------------------------------------------------------------
// edge cases
// -----------------------------------------------------------------------------
describe('edge cases', () => {
  it('empty nodes array passes all validators', () => {
    expect(validateNoDuplicateIds([])).toBeNull();
    expect(validateNoCycles([])).toBeNull();
    expect(validateMaxDepth([])).toBeNull();
  });

  it('single character label is fine', () => {
    const tree: TreeNode[] = [node('a', 'X')];
    expect(validateNoDuplicateIds(tree)).toBeNull();
    expect(validateNoCycles(tree)).toBeNull();
    expect(validateMaxDepth(tree)).toBeNull();
  });

  it('node without children property vs children: [] both work', () => {
    const treeA: TreeNode[] = [{ id: 'a', label: 'A' }];
    const treeB: TreeNode[] = [{ id: 'a', label: 'A', children: [] }];
    // adding to either should produce a child.
    const ra = addChildAtPath(treeA, [0], node('x', 'X'));
    const rb = addChildAtPath(treeB, [0], node('x', 'X'));
    expect(ra[0]!.children).toEqual([{ id: 'x', label: 'X' }]);
    expect(rb[0]!.children).toEqual([{ id: 'x', label: 'X' }]);
  });
});
