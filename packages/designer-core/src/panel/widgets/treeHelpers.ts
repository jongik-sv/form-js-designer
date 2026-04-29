/**
 * Phase 1A Task 1 — pure helpers for tree node manipulation.
 *
 * No DOM, no JSX, no preact, no eval/new Function (CSP-safe).
 * Every operation returns a new tree; inputs are never mutated.
 *
 * NOTE: TreeNode interface is intentionally duplicated from
 * `@form-js-designer/designer-components/src/tree/propsSchema.ts` because
 * `designer-core` must not depend on `designer-components` (reverse dep).
 */

export interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
}

export const MAX_DEPTH = 6;

// -----------------------------------------------------------------------------
// internals
// -----------------------------------------------------------------------------

const checkIndex = (arr: TreeNode[], idx: number, ctx: string): void => {
  if (!Number.isInteger(idx) || idx < 0 || idx >= arr.length) {
    throw new RangeError(
      `${ctx}: index ${idx} out of range [0, ${arr.length})`,
    );
  }
};

/**
 * Recursively descend `nodes` along `path`, returning a new array where the
 * node at the given path is replaced by `transform(node)`. If `transform`
 * returns `null`, the node is removed at that level.
 *
 * If `path` is empty, the transform is applied to the array itself via
 * `arrayTransform`.
 */
const transformAtPath = (
  nodes: TreeNode[],
  path: number[],
  transform: (n: TreeNode) => TreeNode | null,
  arrayTransform?: (arr: TreeNode[]) => TreeNode[],
  ctx = 'transformAtPath',
): TreeNode[] => {
  if (path.length === 0) {
    return arrayTransform ? arrayTransform(nodes) : nodes.slice();
  }
  const head = path[0] as number;
  const rest = path.slice(1);
  checkIndex(nodes, head, ctx);
  const next = nodes.slice();
  if (rest.length === 0) {
    const replaced = transform(next[head] as TreeNode);
    if (replaced === null) {
      next.splice(head, 1);
    } else {
      next[head] = replaced;
    }
    return next;
  }
  const child = next[head] as TreeNode;
  const childChildren = child.children ?? [];
  const newChildren = transformAtPath(childChildren, rest, transform, arrayTransform, ctx);
  next[head] = { ...child, children: newChildren };
  return next;
};

// -----------------------------------------------------------------------------
// public ops
// -----------------------------------------------------------------------------

export function addChildAtPath(
  nodes: TreeNode[],
  path: number[],
  newNode: TreeNode,
): TreeNode[] {
  if (path.length === 0) {
    return [...nodes, newNode];
  }
  return transformAtPath(
    nodes,
    path,
    (n) => ({ ...n, children: [...(n.children ?? []), newNode] }),
    undefined,
    'addChildAtPath',
  );
}

export function deleteNodeAtPath(nodes: TreeNode[], path: number[]): TreeNode[] {
  if (path.length === 0) {
    throw new RangeError('deleteNodeAtPath: path must be non-empty');
  }
  return transformAtPath(nodes, path, () => null, undefined, 'deleteNodeAtPath');
}

export function updateNodeAtPath(
  nodes: TreeNode[],
  path: number[],
  patch: Partial<TreeNode>,
): TreeNode[] {
  if (path.length === 0) {
    throw new RangeError('updateNodeAtPath: path must be non-empty');
  }
  return transformAtPath(
    nodes,
    path,
    (n) => ({ ...n, ...patch }),
    undefined,
    'updateNodeAtPath',
  );
}

// -----------------------------------------------------------------------------
// validators
// -----------------------------------------------------------------------------

export function validateNoDuplicateIds(nodes: TreeNode[]): string | null {
  const seen = new Set<string>();
  const walk = (list: TreeNode[]): string | null => {
    for (const n of list) {
      if (seen.has(n.id)) return `Duplicate id: "${n.id}"`;
      seen.add(n.id);
      if (n.children && n.children.length > 0) {
        const e = walk(n.children);
        if (e) return e;
      }
    }
    return null;
  };
  return walk(nodes);
}

export function validateNoCycles(nodes: TreeNode[]): string | null {
  const visited = new WeakSet<TreeNode>();
  const walk = (list: TreeNode[]): string | null => {
    for (const n of list) {
      if (visited.has(n)) return `Cycle detected at id: "${n.id}"`;
      visited.add(n);
      if (n.children && n.children.length > 0) {
        const e = walk(n.children);
        if (e) return e;
      }
    }
    return null;
  };
  return walk(nodes);
}

export function validateMaxDepth(
  nodes: TreeNode[],
  max: number = MAX_DEPTH,
): string | null {
  let deepest = 0;
  const walk = (list: TreeNode[], depth: number): void => {
    for (const n of list) {
      if (depth > deepest) deepest = depth;
      if (n.children && n.children.length > 0) walk(n.children, depth + 1);
    }
  };
  walk(nodes, 1);
  if (deepest > max) return `Max depth exceeded: ${deepest} (max ${max})`;
  return null;
}
