/**
 * schemaToOutline 단위 테스트
 * TSK-06-01
 */

import { describe, it, expect } from 'vitest';
import { schemaToOutline } from '../modules/schemaToOutline';
import type { FormSchema } from '../modules/schemaToOutline';

describe('schemaToOutline', () => {
  // ----- 1. null/undefined/빈 schema -----
  it('returns [] for null schema', () => {
    expect(schemaToOutline(null)).toEqual([]);
  });

  it('returns [] for undefined schema', () => {
    expect(schemaToOutline(undefined)).toEqual([]);
  });

  it('returns [] for schema without components', () => {
    expect(schemaToOutline({ type: 'default' })).toEqual([]);
  });

  it('returns [] for schema with empty components array', () => {
    expect(schemaToOutline({ type: 'default', components: [] })).toEqual([]);
  });

  // ----- 2. 플랫 schema -----
  it('converts flat schema with a single component', () => {
    const schema: FormSchema = {
      type: 'default',
      components: [
        { id: 'btn-1', type: 'button', label: 'Submit' },
      ],
    };
    const result = schemaToOutline(schema);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'btn-1',
      type: 'button',
      label: 'Submit',
      children: [],
    });
  });

  it('converts flat schema with multiple components', () => {
    const schema: FormSchema = {
      type: 'default',
      components: [
        { id: 'c1', type: 'card', label: 'Card' },
        { id: 'c2', type: 'button' },
        { id: 'c3', type: 'table', text: 'Table Header' },
      ],
    };
    const result = schemaToOutline(schema);
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ id: 'c1', type: 'card', label: 'Card', children: [] });
    expect(result[1]).toMatchObject({ id: 'c2', type: 'button', children: [] });
    // text 필드를 label로 사용
    expect(result[2]).toMatchObject({ id: 'c3', type: 'table', label: 'Table Header', children: [] });
  });

  // ----- 3. 중첩 schema -----
  it('converts nested schema (components within components)', () => {
    const schema: FormSchema = {
      type: 'default',
      components: [
        {
          id: 'card-1',
          type: 'card',
          label: 'My Card',
          components: [
            { id: 'stack-1', type: 'stack' },
            { id: 'btn-1', type: 'button', label: 'OK' },
          ],
        },
      ],
    };
    const result = schemaToOutline(schema);
    expect(result).toHaveLength(1);
    const cardNode = result[0]!;
    expect(cardNode.id).toBe('card-1');
    expect(cardNode.type).toBe('card');
    expect(cardNode.children).toHaveLength(2);
    expect(cardNode.children[0]).toMatchObject({ id: 'stack-1', type: 'stack', children: [] });
    expect(cardNode.children[1]).toMatchObject({ id: 'btn-1', type: 'button', label: 'OK', children: [] });
  });

  it('converts deeply nested schema (3 levels)', () => {
    const schema: FormSchema = {
      type: 'default',
      components: [
        {
          id: 'card-1',
          type: 'card',
          components: [
            {
              id: 'stack-1',
              type: 'stack',
              components: [
                { id: 'btn-1', type: 'button', label: 'Deep' },
              ],
            },
          ],
        },
      ],
    };
    const result = schemaToOutline(schema);
    const deepNode = result[0]?.children[0]?.children[0];
    expect(deepNode).toMatchObject({ id: 'btn-1', type: 'button', label: 'Deep', children: [] });
  });

  // ----- 4. rows/cells 패턴 -----
  it('converts rows/cells pattern (table-like fields)', () => {
    const schema: FormSchema = {
      type: 'default',
      components: [
        {
          id: 'table-1',
          type: 'table',
          rows: [
            {
              cells: [
                {
                  components: [
                    { id: 'txt-1', type: 'textfield', label: 'Name' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const result = schemaToOutline(schema);
    expect(result).toHaveLength(1);
    const tableNode = result[0]!;
    expect(tableNode.id).toBe('table-1');
    expect(tableNode.children).toHaveLength(1);
    expect(tableNode.children[0]).toMatchObject({ id: 'txt-1', type: 'textfield', label: 'Name' });
  });

  // ----- 5. id 없는 컴포넌트 (fallback) -----
  it('generates fallback id when field.id is missing', () => {
    const schema: FormSchema = {
      type: 'default',
      components: [
        { type: 'button', label: 'No ID' },
      ],
    };
    const result = schemaToOutline(schema);
    expect(result).toHaveLength(1);
    const node = result[0]!;
    expect(node.id).toBeDefined();
    expect(node.id).not.toBe('');
    expect(node.type).toBe('button');
    expect(node.label).toBe('No ID');
  });

  // ----- 6. label과 text 우선순위 -----
  it('prefers label over text when both present', () => {
    const schema: FormSchema = {
      type: 'default',
      components: [
        { id: 'f1', type: 'text', label: 'Label Value', text: 'Text Value' },
      ],
    };
    const result = schemaToOutline(schema);
    expect(result[0]?.label).toBe('Label Value');
  });

  it('uses text as label when label is absent', () => {
    const schema: FormSchema = {
      type: 'default',
      components: [
        { id: 'f1', type: 'text', text: 'Text Only' },
      ],
    };
    const result = schemaToOutline(schema);
    expect(result[0]?.label).toBe('Text Only');
  });

  // ----- 7. 반환값 구조 -----
  it('every node has id, type, children properties', () => {
    const schema: FormSchema = {
      type: 'default',
      components: [
        { id: 'c1', type: 'card' },
        { id: 'c2', type: 'button', label: 'B' },
      ],
    };
    const result = schemaToOutline(schema);
    for (const node of result) {
      expect(node).toHaveProperty('id');
      expect(node).toHaveProperty('type');
      expect(node).toHaveProperty('children');
      expect(Array.isArray(node.children)).toBe(true);
    }
  });
});
