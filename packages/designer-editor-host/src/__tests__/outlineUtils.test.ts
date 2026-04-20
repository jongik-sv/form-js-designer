/**
 * outlineUtils 단위 테스트
 * outline-dnd-copy-paste feature
 */

import { describe, it, expect } from 'vitest';
import {
  generateId,
  deepCloneWithNewIds,
  getDropPosition,
  collectKeys,
  generateUniqueKey,
} from '../modules/outlineUtils';
import type { DropPosition } from '../modules/outlineTypes';

describe('generateId', () => {
  it('returns a string with the given prefix', () => {
    const id = generateId('button');
    expect(typeof id).toBe('string');
    expect(id.startsWith('button-')).toBe(true);
  });

  it('appends a 8-char segment after prefix', () => {
    const id = generateId('card');
    // format: `card-XXXXXXXX` (prefix + '-' + 8 chars)
    const parts = id.split('-');
    expect(parts.length).toBeGreaterThanOrEqual(2);
    expect(parts[0]).toBe('card');
    // last segment is 8 chars
    expect(parts[parts.length - 1]!.length).toBe(8);
  });

  it('generates unique IDs on each call', () => {
    const ids = Array.from({ length: 10 }, () => generateId('field'));
    const unique = new Set(ids);
    expect(unique.size).toBe(10);
  });

  it('works with any prefix string', () => {
    const id = generateId('tabs-tabPanel');
    expect(id.startsWith('tabs-tabPanel-')).toBe(true);
  });
});

describe('deepCloneWithNewIds', () => {
  it('returns a new object (not same reference)', () => {
    const field = { id: 'btn-1', type: 'button', label: 'Click me', components: [] };
    const cloned = deepCloneWithNewIds(field);
    expect(cloned).not.toBe(field);
  });

  it('preserves type and label', () => {
    const field = { id: 'btn-1', type: 'button', label: 'Submit', components: [] };
    const cloned = deepCloneWithNewIds(field);
    expect(cloned.type).toBe('button');
    expect(cloned.label).toBe('Submit');
  });

  it('assigns a new id different from original', () => {
    const field = { id: 'btn-1', type: 'button', components: [] };
    const cloned = deepCloneWithNewIds(field);
    expect(cloned.id).toBeDefined();
    expect(cloned.id).not.toBe('btn-1');
  });

  it('new id starts with the field type as prefix', () => {
    const field = { id: 'btn-1', type: 'button', components: [] };
    const cloned = deepCloneWithNewIds(field);
    expect(cloned.id!.startsWith('button-')).toBe(true);
  });

  it('recursively reassigns ids for nested components', () => {
    const field = {
      id: 'card-1',
      type: 'card',
      label: 'My Card',
      components: [
        { id: 'btn-1', type: 'button', label: 'OK', components: [] },
        { id: 'btn-2', type: 'button', label: 'Cancel', components: [] },
      ],
    };
    const cloned = deepCloneWithNewIds(field);

    expect(cloned.id).not.toBe('card-1');
    expect(cloned.components).toBeDefined();
    expect(cloned.components!.length).toBe(2);
    expect(cloned.components![0]!.id).not.toBe('btn-1');
    expect(cloned.components![1]!.id).not.toBe('btn-2');
    // types preserved
    expect(cloned.components![0]!.type).toBe('button');
    expect(cloned.components![1]!.type).toBe('button');
  });

  it('handles deeply nested containers', () => {
    const field = {
      id: 'outer-1',
      type: 'card',
      components: [
        {
          id: 'inner-1',
          type: 'card',
          components: [
            { id: 'leaf-1', type: 'button', components: [] },
          ],
        },
      ],
    };
    const cloned = deepCloneWithNewIds(field);

    const inner = cloned.components![0]!;
    expect(inner.id).not.toBe('inner-1');
    const leaf = inner.components![0]!;
    expect(leaf.id).not.toBe('leaf-1');
  });

  it('all ids in the clone are different from originals', () => {
    const field = {
      id: 'card-1',
      type: 'card',
      components: [
        { id: 'btn-1', type: 'button', components: [] },
      ],
    };
    const originalIds = new Set(['card-1', 'btn-1']);
    const cloned = deepCloneWithNewIds(field);

    expect(originalIds.has(cloned.id!)).toBe(false);
    expect(originalIds.has(cloned.components![0]!.id!)).toBe(false);
  });

  it('field without components works (no error)', () => {
    const field = { id: 'btn-1', type: 'button' };
    const cloned = deepCloneWithNewIds(field);
    expect(cloned.type).toBe('button');
    expect(cloned.id).not.toBe('btn-1');
  });

  // existingKeys 파라미터 — paste 시 key 충돌 회피
  describe('with existingKeys (paste mode)', () => {
    it('renames colliding key to baseKey_copy', () => {
      const field = { id: 'tf-1', type: 'textfield', key: 'first' };
      const cloned = deepCloneWithNewIds(field, new Set(['first']));
      expect(cloned.key).toBe('first_copy');
    });

    it('renames to baseKey_copy_2 when baseKey_copy is also taken', () => {
      const field = { id: 'tf-1', type: 'textfield', key: 'first' };
      const cloned = deepCloneWithNewIds(field, new Set(['first', 'first_copy']));
      expect(cloned.key).toBe('first_copy_2');
    });

    it('keeps original key when no collision', () => {
      const field = { id: 'tf-1', type: 'textfield', key: 'unique' };
      const cloned = deepCloneWithNewIds(field, new Set(['other']));
      expect(cloned.key).toBe('unique');
    });

    it('does not rename key when existingKeys is omitted (copy mode)', () => {
      const field = { id: 'tf-1', type: 'textfield', key: 'first' };
      const cloned = deepCloneWithNewIds(field);
      expect(cloned.key).toBe('first');
    });

    it('adds minted keys to set so nested children stay unique', () => {
      const field = {
        id: 'card-1',
        type: 'card',
        components: [
          { id: 'tf-1', type: 'textfield', key: 'name' },
          { id: 'tf-2', type: 'textfield', key: 'name' }, // sibling with same key (hypothetical)
        ],
      };
      const existing = new Set(['name']);
      const cloned = deepCloneWithNewIds(field, existing);
      const keys = cloned.components!.map((c) => c.key);
      // both renamed, and distinct from each other
      expect(new Set(keys).size).toBe(2);
      expect(keys).not.toContain('name');
    });

    it('leaves fields without key untouched (containers)', () => {
      const field = { id: 'card-1', type: 'card', components: [] };
      const cloned = deepCloneWithNewIds(field, new Set(['anything']));
      expect(cloned.key).toBeUndefined();
    });
  });
});

describe('collectKeys', () => {
  it('returns empty set for field with no key', () => {
    const field = { id: 'card-1', type: 'card' };
    expect(collectKeys(field).size).toBe(0);
  });

  it('collects a single key', () => {
    const field = { id: 'tf-1', type: 'textfield', key: 'first' };
    const keys = collectKeys(field);
    expect(keys.has('first')).toBe(true);
  });

  it('collects keys recursively from nested components', () => {
    const field = {
      id: 'root',
      type: 'default',
      components: [
        { id: 'tf-1', type: 'textfield', key: 'a' },
        {
          id: 'card-1',
          type: 'card',
          components: [
            { id: 'tf-2', type: 'textfield', key: 'b' },
          ],
        },
      ],
    };
    const keys = collectKeys(field);
    expect(keys.has('a')).toBe(true);
    expect(keys.has('b')).toBe(true);
    expect(keys.size).toBe(2);
  });

  it('accumulates into provided set', () => {
    const field = { id: 'tf-1', type: 'textfield', key: 'added' };
    const seed = new Set(['preexisting']);
    collectKeys(field, seed);
    expect(seed.has('preexisting')).toBe(true);
    expect(seed.has('added')).toBe(true);
  });
});

describe('generateUniqueKey', () => {
  it('returns baseKey when no collision', () => {
    expect(generateUniqueKey('first', new Set(['other']))).toBe('first');
  });

  it('returns baseKey_copy on first collision', () => {
    expect(generateUniqueKey('first', new Set(['first']))).toBe('first_copy');
  });

  it('returns baseKey_copy_2 when _copy is also taken', () => {
    expect(generateUniqueKey('first', new Set(['first', 'first_copy']))).toBe('first_copy_2');
  });

  it('finds next slot past contiguous holes', () => {
    const taken = new Set(['first', 'first_copy', 'first_copy_2', 'first_copy_3']);
    expect(generateUniqueKey('first', taken)).toBe('first_copy_4');
  });

  it('does not mutate the input set', () => {
    const set = new Set(['first']);
    generateUniqueKey('first', set);
    expect(set.size).toBe(1);
  });
});

describe('getDropPosition', () => {
  function makeRect(top: number, height: number): DOMRect {
    return {
      top,
      bottom: top + height,
      height,
      left: 0,
      right: 100,
      width: 100,
      x: 0,
      y: top,
      toJSON() { return this; },
    };
  }

  // Non-container: 50% 기준 before/after
  describe('non-container', () => {
    it('returns "before" when clientY is in upper half', () => {
      const rect = makeRect(100, 40); // top=100, bottom=140, mid=120
      const result = getDropPosition(rect, 110, false); // 110 < 120
      expect(result).toBe<DropPosition>('before');
    });

    it('returns "after" when clientY is in lower half', () => {
      const rect = makeRect(100, 40);
      const result = getDropPosition(rect, 130, false); // 130 > 120
      expect(result).toBe<DropPosition>('after');
    });

    it('returns "before" when clientY equals exactly the top', () => {
      const rect = makeRect(100, 40);
      const result = getDropPosition(rect, 100, false);
      expect(result).toBe<DropPosition>('before');
    });

    it('returns "after" when clientY equals exactly the bottom', () => {
      const rect = makeRect(100, 40);
      const result = getDropPosition(rect, 140, false);
      expect(result).toBe<DropPosition>('after');
    });
  });

  // Container: 25/75% 기준 before/inside/after
  describe('container', () => {
    it('returns "before" when clientY is in upper 25%', () => {
      // rect: top=100, height=40 → upper25=110, lower75=130
      const rect = makeRect(100, 40);
      const result = getDropPosition(rect, 105, true); // 105 < 110
      expect(result).toBe<DropPosition>('before');
    });

    it('returns "inside" when clientY is in middle 50%', () => {
      const rect = makeRect(100, 40);
      const result = getDropPosition(rect, 120, true); // between 110 and 130
      expect(result).toBe<DropPosition>('inside');
    });

    it('returns "after" when clientY is in lower 25%', () => {
      const rect = makeRect(100, 40);
      const result = getDropPosition(rect, 135, true); // > 130
      expect(result).toBe<DropPosition>('after');
    });

    it('returns "before" at exactly upper 25% boundary', () => {
      const rect = makeRect(0, 100); // top=0, height=100 → upper25=25
      const result = getDropPosition(rect, 24, true); // 24 < 25
      expect(result).toBe<DropPosition>('before');
    });

    it('returns "inside" at exactly 25% boundary', () => {
      const rect = makeRect(0, 100);
      const result = getDropPosition(rect, 25, true); // at upper25
      expect(result).toBe<DropPosition>('inside');
    });

    it('returns "after" at exactly 75% boundary', () => {
      const rect = makeRect(0, 100);
      const result = getDropPosition(rect, 75, true); // at lower75
      expect(result).toBe<DropPosition>('after');
    });
  });
});
