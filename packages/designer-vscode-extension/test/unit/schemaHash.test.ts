import { describe, it, expect } from 'vitest';
import { schemaHash } from '../../src/shared/schemaHash';

describe('schemaHash', () => {
  it('동일 스키마 객체의 키 순서가 달라도 동일한 해시를 반환한다', () => {
    const a = schemaHash({ a: 1, b: 2 });
    const b = schemaHash({ b: 2, a: 1 });
    expect(a).toBe(b);
  });

  it('중첩 객체에서도 내부 키 순서가 달라도 해시가 동일하다', () => {
    const a = schemaHash({ nested: { x: 1, y: 2 }, top: 'val' });
    const b = schemaHash({ top: 'val', nested: { y: 2, x: 1 } });
    expect(a).toBe(b);
  });

  it('서로 다른 스키마는 반드시 다른 해시를 반환한다', () => {
    const a = schemaHash({ a: 1 });
    const b = schemaHash({ a: 2 });
    expect(a).not.toBe(b);
  });

  it('빈 객체 {} 입력 시 유효한 12자 해시를 반환한다', () => {
    const hash = schemaHash({});
    expect(hash).toHaveLength(12);
    expect(/^[0-9a-f]{12}$/.test(hash)).toBe(true);
  });

  it('반환값은 항상 정확히 12자이다', () => {
    const hash = schemaHash({ components: [{ type: 'textfield', key: 'name' }] });
    expect(hash).toHaveLength(12);
  });

  it('string 입력(JSON 문자열)도 동일하게 처리한다', () => {
    const fromObj = schemaHash({ a: 1, b: 2 });
    const fromStr = schemaHash('{"b":2,"a":1}');
    expect(fromObj).toBe(fromStr);
  });

  it('유효하지 않은 JSON 문자열 입력 시 에러를 throw한다', () => {
    expect(() => schemaHash('not-valid-json')).toThrow();
  });

  it('배열을 포함한 스키마도 안정적으로 해시한다', () => {
    const a = schemaHash({ items: [1, 2, 3], name: 'test' });
    const b = schemaHash({ name: 'test', items: [1, 2, 3] });
    expect(a).toBe(b);
  });

  it('깊이 중첩된 객체도 재귀 정렬하여 동일 해시를 반환한다', () => {
    const a = schemaHash({ a: { b: { c: 1, d: 2 } } });
    const b = schemaHash({ a: { b: { d: 2, c: 1 } } });
    expect(a).toBe(b);
  });
});
