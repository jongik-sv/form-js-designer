/**
 * filterFns 단위 테스트
 * QA: text/select/range 각 predicate 9 케이스(빈값/대소문자/경계)
 */
import { describe, it, expect } from 'vitest';
import { textFilterFn, selectFilterFn, rangeFilterFn } from '../filters/filterFns';

describe('textFilterFn', () => {
  // (정상) 포함 문자열 매칭
  it('값에 필터 문자열이 포함되면 true', () => {
    expect(textFilterFn('홍길동', '길')).toBe(true);
  });

  // (정상) 대소문자 무시
  it('대소문자 무관하게 매칭 (ABC vs abc)', () => {
    expect(textFilterFn('Hello World', 'hello')).toBe(true);
  });

  // (엣지) 빈 필터값 → pass-through (true)
  it('빈 필터값 → true (pass-through)', () => {
    expect(textFilterFn('any value', '')).toBe(true);
  });

  // (엣지) null/undefined 값 → false
  it('null 값 → false', () => {
    expect(textFilterFn(null, '검색')).toBe(false);
  });
});

describe('selectFilterFn', () => {
  // (정상) 정확히 일치하면 true
  it('값이 필터와 정확히 일치 → true', () => {
    expect(selectFilterFn('active', 'active')).toBe(true);
  });

  // (정상) 불일치 → false
  it('값이 필터와 불일치 → false', () => {
    expect(selectFilterFn('inactive', 'active')).toBe(false);
  });

  // (엣지) 빈 필터값 → pass-through (true)
  it('빈 문자열 필터 → true (pass-through)', () => {
    expect(selectFilterFn('anything', '')).toBe(true);
  });

  // (엣지) undefined 필터 → pass-through (true)
  it('undefined 필터 → true (pass-through)', () => {
    expect(selectFilterFn('anything', undefined)).toBe(true);
  });
});

describe('rangeFilterFn', () => {
  // (정상) [min, max] 범위 내
  it('[50, 80] 범위 내 값 70 → true', () => {
    expect(rangeFilterFn(70, [50, 80])).toBe(true);
  });

  // (정상) 범위 경계값 포함
  it('[50, 80] 경계값 50 → true (inclusive)', () => {
    expect(rangeFilterFn(50, [50, 80])).toBe(true);
  });

  // (정상) 범위 밖 → false
  it('[50, 80] 범위 밖 값 90 → false', () => {
    expect(rangeFilterFn(90, [50, 80])).toBe(false);
  });

  // (엣지) min만 입력(max null) → max 무제한
  it('min=50, max=null → 50 이상이면 true', () => {
    expect(rangeFilterFn(1000, [50, null])).toBe(true);
    expect(rangeFilterFn(49, [50, null])).toBe(false);
  });

  // (엣지) 양쪽 null → pass-through
  it('[null, null] → true (pass-through)', () => {
    expect(rangeFilterFn(42, [null, null])).toBe(true);
  });
});
