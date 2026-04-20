/**
 * TSK-01-03: LRU 캐시 단위 테스트
 * QA 체크리스트 기반 — design.md §QA 체크리스트
 *
 * eviction, hit, miss, capacity 경계 케이스를 검증한다.
 */
import { describe, it, expect } from 'vitest';
import { LRUCache } from '../../src/markdown/lruCache';

describe('LRUCache: 기본 동작', () => {
  it('set 후 get하면 동일한 값을 반환한다', () => {
    const cache = new LRUCache<string, number>(3);
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
  });

  it('존재하지 않는 키로 get하면 undefined를 반환한다', () => {
    const cache = new LRUCache<string, number>(3);
    expect(cache.get('missing')).toBeUndefined();
  });

  it('has(key)는 존재하는 키에서 true를 반환한다', () => {
    const cache = new LRUCache<string, number>(3);
    cache.set('k', 42);
    expect(cache.has('k')).toBe(true);
  });

  it('has(key)는 존재하지 않는 키에서 false를 반환한다', () => {
    const cache = new LRUCache<string, number>(3);
    expect(cache.has('missing')).toBe(false);
  });

  it('동일 키에 set을 두 번 하면 최신 값으로 덮어쓴다', () => {
    const cache = new LRUCache<string, number>(3);
    cache.set('k', 1);
    cache.set('k', 2);
    expect(cache.get('k')).toBe(2);
  });
});

describe('LRUCache: 용량 및 eviction', () => {
  it('capacity 초과 시 가장 오래전에 사용된 항목이 제거된다 (LRU eviction)', () => {
    const cache = new LRUCache<string, number>(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    // 'a'가 가장 오래됨 — 4번째 항목 추가 시 evict
    cache.set('d', 4);

    expect(cache.has('a')).toBe(false); // evicted
    expect(cache.has('b')).toBe(true);
    expect(cache.has('c')).toBe(true);
    expect(cache.has('d')).toBe(true);
  });

  it('get을 호출하면 해당 항목이 recently used로 갱신된다', () => {
    const cache = new LRUCache<string, number>(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    // 'a'를 access → 'b'가 LRU가 됨
    cache.get('a');
    cache.set('d', 4); // 'b'가 evict되어야 함

    expect(cache.has('b')).toBe(false); // evicted
    expect(cache.has('a')).toBe(true);
    expect(cache.has('c')).toBe(true);
    expect(cache.has('d')).toBe(true);
  });

  it('set으로 기존 키를 업데이트하면 recently used로 갱신된다', () => {
    const cache = new LRUCache<string, number>(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    // 'a'를 update → 'b'가 LRU가 됨
    cache.set('a', 10);
    cache.set('d', 4); // 'b'가 evict되어야 함

    expect(cache.has('b')).toBe(false); // evicted
    expect(cache.get('a')).toBe(10);
    expect(cache.has('c')).toBe(true);
    expect(cache.has('d')).toBe(true);
  });

  it('capacity=1인 캐시에서 두 번째 항목 추가 시 첫 번째 항목이 제거된다', () => {
    const cache = new LRUCache<string, number>(1);
    cache.set('a', 1);
    cache.set('b', 2);

    expect(cache.has('a')).toBe(false);
    expect(cache.get('b')).toBe(2);
  });

  it('capacity=20에서 21번째 항목 추가 시 가장 오래된 항목이 evict된다', () => {
    const cache = new LRUCache<string, number>(20);
    for (let i = 0; i < 20; i++) {
      cache.set(`key${i}`, i);
    }
    // 'key0'이 가장 오래됨
    cache.set('key20', 20);

    expect(cache.has('key0')).toBe(false); // evicted
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('key20')).toBe(true);
  });
});

describe('LRUCache: clear', () => {
  it('clear() 호출 후 모든 항목이 제거된다', () => {
    const cache = new LRUCache<string, number>(5);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();

    expect(cache.has('a')).toBe(false);
    expect(cache.has('b')).toBe(false);
  });

  it('clear() 후 다시 set하면 정상 동작한다', () => {
    const cache = new LRUCache<string, number>(3);
    cache.set('a', 1);
    cache.clear();
    cache.set('b', 2);

    expect(cache.get('b')).toBe(2);
    expect(cache.has('a')).toBe(false);
  });
});

describe('LRUCache: 제네릭 타입', () => {
  it('객체 값을 저장하고 동일 참조를 반환한다', () => {
    const cache = new LRUCache<string, { id: string }>(3);
    const obj = { id: 'test' };
    cache.set('k', obj);

    expect(cache.get('k')).toBe(obj);
  });
});
