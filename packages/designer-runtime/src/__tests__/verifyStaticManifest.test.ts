/**
 * verifyStaticManifest 단위 테스트 — TSK-09-02
 *
 * QA 체크리스트:
 * - 해시 일치 ok
 * - 해시 불일치 ok=false
 * - manifest 누락 (API 직접 호출 시 undefined manifest는 StaticSchemaSource에서 처리)
 * - SubtleCrypto 의존 안정성
 * - 중첩 객체 직렬화 안정성 (key 순서 무관)
 */

import { describe, it, expect } from 'vitest';
import { verifyStaticManifest, computeSha256, sortedStringify } from '../transport/verifyStaticManifest';
import type { FormSchema, StaticManifest } from '../transport/types';

const sampleSchema: FormSchema = {
  type: 'default',
  id: 'test-form',
  components: [
    { id: 'field1', type: 'textfield', label: 'Name' },
    { id: 'field2', type: 'button', label: 'Submit' },
  ],
};

describe('sortedStringify', () => {
  it('동일 내용이지만 key 순서가 다른 객체는 동일한 문자열을 반환한다', () => {
    const obj1 = { b: 2, a: 1 };
    const obj2 = { a: 1, b: 2 };
    expect(sortedStringify(obj1)).toBe(sortedStringify(obj2));
  });

  it('중첩 객체도 key 정렬을 적용한다', () => {
    const obj1 = { z: { b: 2, a: 1 }, m: 'hello' };
    const obj2 = { m: 'hello', z: { a: 1, b: 2 } };
    expect(sortedStringify(obj1)).toBe(sortedStringify(obj2));
  });

  it('배열 요소 순서는 유지한다', () => {
    const arr = [3, 1, 2];
    expect(sortedStringify(arr)).toBe('[3,1,2]');
  });

  it('null을 올바르게 직렬화한다', () => {
    expect(sortedStringify(null)).toBe('null');
  });
});

describe('computeSha256', () => {
  it('동일 schema에 대해 동일한 해시를 반환한다', async () => {
    const hash1 = await computeSha256(sampleSchema);
    const hash2 = await computeSha256(sampleSchema);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('key 순서가 다른 동일 내용 객체는 동일한 해시를 반환한다', async () => {
    const schema1: FormSchema = { type: 'default', components: [], id: 'x' };
    const schema2: FormSchema = { id: 'x', components: [], type: 'default' };
    const hash1 = await computeSha256(schema1);
    const hash2 = await computeSha256(schema2);
    expect(hash1).toBe(hash2);
  });
});

describe('verifyStaticManifest', () => {
  it('(정상) 해시가 일치하면 ok=true를 반환한다', async () => {
    const hash = await computeSha256(sampleSchema);
    const manifest: StaticManifest = { schemaHash: hash, version: 1 };
    const result = await verifyStaticManifest(sampleSchema, manifest);
    expect(result.ok).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('(에러) 해시가 불일치하면 ok=false와 reason을 반환한다', async () => {
    const manifest: StaticManifest = { schemaHash: 'deadbeef'.padEnd(64, '0'), version: 1 };
    const result = await verifyStaticManifest(sampleSchema, manifest);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('Hash mismatch');
  });

  it('(엣지) schema key 순서가 달라도 동일 해시로 검증된다', async () => {
    const schemaA: FormSchema = { type: 'default', components: [], id: 'form-1' };
    const schemaB: FormSchema = { id: 'form-1', components: [], type: 'default' };
    const hash = await computeSha256(schemaA);
    const manifest: StaticManifest = { schemaHash: hash };
    const result = await verifyStaticManifest(schemaB, manifest);
    expect(result.ok).toBe(true);
  });

  it('(엣지) 중첩 객체를 포함한 schema도 안정적으로 해시 검증된다', async () => {
    const complexSchema: FormSchema = {
      type: 'default',
      id: 'nested',
      components: [
        {
          id: 'card1',
          type: 'card',
          components: [
            { id: 'inner', type: 'textfield', label: 'Inner field' },
          ],
        },
      ],
    };
    const hash = await computeSha256(complexSchema);
    const manifest: StaticManifest = { schemaHash: hash };
    const result = await verifyStaticManifest(complexSchema, manifest);
    expect(result.ok).toBe(true);
  });
});
