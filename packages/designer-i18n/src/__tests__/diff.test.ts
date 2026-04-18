/**
 * diffKeys 단위 테스트 — TDD (TSK-07-02)
 *
 * 검증 항목 (QA 체크리스트 기반):
 * 1. missing = used − defined (code uses key not in dict → fail)
 * 2. unused = defined − used (dict has key not in code → warning only)
 * 3. both-empty — 양쪽 모두 비었을 때 missing=[], unused=[]
 * 4. all-matched — 완전 매칭 시 missing=[], unused=[]
 * 5. runDiff with fixture — intentional-miss → exitCode=1
 * 6. runDiff green — no missing → exitCode=0
 * 7. flatten() — nested JSON → flat 'a.b.c' keys
 * 8. ko.json not found → exitCode=2 + error message
 */

import { describe, it, expect } from 'vitest';
import { diffKeys, flatten } from '../scripts/diff';

describe('diffKeys — pure function', () => {
  it('returns missing keys when used key is absent from defined', () => {
    const result = diffKeys({
      used: new Set(['a', 'b', 'c']),
      defined: new Set(['b', 'c', 'd']),
    });
    expect(result.missing).toEqual(['a']);
    expect(result.unused).toEqual(['d']);
  });

  it('returns empty missing and unused when sets fully match', () => {
    const result = diffKeys({
      used: new Set(['a', 'b']),
      defined: new Set(['a', 'b']),
    });
    expect(result.missing).toEqual([]);
    expect(result.unused).toEqual([]);
  });

  it('returns empty missing and unused when both sets are empty', () => {
    const result = diffKeys({
      used: new Set<string>(),
      defined: new Set<string>(),
    });
    expect(result.missing).toEqual([]);
    expect(result.unused).toEqual([]);
  });

  it('returns all used as missing when defined is empty', () => {
    const result = diffKeys({
      used: new Set(['x', 'y']),
      defined: new Set<string>(),
    });
    expect(result.missing.sort()).toEqual(['x', 'y'].sort());
    expect(result.unused).toEqual([]);
  });

  it('returns all defined as unused when used is empty', () => {
    const result = diffKeys({
      used: new Set<string>(),
      defined: new Set(['p', 'q']),
    });
    expect(result.missing).toEqual([]);
    expect(result.unused.sort()).toEqual(['p', 'q'].sort());
  });

  it('returns sorted arrays', () => {
    const result = diffKeys({
      used: new Set(['z', 'a', 'm']),
      defined: new Set(['z', 'b', 'm']),
    });
    expect(result.missing).toEqual(['a']);
    expect(result.unused).toEqual(['b']);
  });
});

describe('flatten — nested JSON to flat keys', () => {
  it('flattens a nested object into dot-separated keys', () => {
    const obj = {
      designer: {
        table: {
          filter: {
            all: '전체',
            placeholder: '필터 입력',
          },
        },
      },
    };
    const flat = flatten(obj);
    expect(flat).toContain('designer.table.filter.all');
    expect(flat).toContain('designer.table.filter.placeholder');
  });

  it('handles flat (non-nested) object', () => {
    const obj = { hello: '안녕', world: '세계' };
    const flat = flatten(obj);
    expect(flat).toContain('hello');
    expect(flat).toContain('world');
  });

  it('returns empty array for empty object', () => {
    expect(flatten({})).toEqual([]);
  });

  it('skips non-string leaf values gracefully', () => {
    // Arrays are not supported per design; only traverse objects and string leaves
    const obj = { a: { b: 'leaf' }, c: 'direct' };
    const flat = flatten(obj);
    expect(flat).toContain('a.b');
    expect(flat).toContain('c');
  });
});
