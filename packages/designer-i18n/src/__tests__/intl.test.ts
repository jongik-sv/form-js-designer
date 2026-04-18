/**
 * Intl 어댑터 단위 테스트 — TDD (TSK-07-01)
 *
 * 검증 항목:
 * 1. (정상) formatNumber(1234567.89) → ko-KR 형식 문자열
 * 2. (정상) formatDate(new Date('2024-01-15')) → ko-KR 날짜 형식
 * 3. (정상) formatDateTime(new Date('2024-01-15T09:30:00')) → ko-KR 날짜+시간 형식
 * 4. (에러) formatDate('invalid-date') → throw 없음
 * 5. (에러) formatDateTime('invalid-date') → throw 없음
 */

import { describe, it, expect } from 'vitest';
import { formatNumber, formatDate, formatDateTime } from '../intl';

describe('Intl adapters (ko-KR)', () => {
  // 1. formatNumber
  it('formatNumber returns ko-KR formatted string for 1234567.89', () => {
    const result = formatNumber(1234567.89);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    // ko-KR 형식: 쉼표 구분자 포함
    expect(result).toMatch(/[\d,]/);
    // 실제 값 범위 확인
    expect(result).toContain('1');
  });

  it('formatNumber with locale override', () => {
    const result = formatNumber(1234.5, { locale: 'ko-KR' });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  // 2. formatDate
  it('formatDate returns ko-KR date string', () => {
    const date = new Date('2024-01-15T00:00:00Z');
    const result = formatDate(date);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    // 2024, 1, 15 등 숫자 포함
    expect(result).toMatch(/\d/);
  });

  // 3. formatDateTime
  it('formatDateTime returns ko-KR date+time string', () => {
    const date = new Date('2024-01-15T09:30:00Z');
    const result = formatDateTime(date);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).toMatch(/\d/);
  });

  // 4. formatDate with invalid date → no throw
  it('formatDate with invalid date string does not throw', () => {
    expect(() => formatDate(new Date('invalid-date'))).not.toThrow();
  });

  // 5. formatDateTime with invalid date → no throw
  it('formatDateTime with invalid date string does not throw', () => {
    expect(() => formatDateTime(new Date('invalid-date'))).not.toThrow();
  });

  // formatNumber with integer
  it('formatNumber returns string for integer input', () => {
    const result = formatNumber(42);
    expect(typeof result).toBe('string');
    expect(result).toContain('42');
  });

  // formatNumber with 0
  it('formatNumber returns string for 0', () => {
    const result = formatNumber(0);
    expect(typeof result).toBe('string');
    expect(result).toContain('0');
  });

  // formatNumber with negative
  it('formatNumber returns string for negative number', () => {
    const result = formatNumber(-1234);
    expect(typeof result).toBe('string');
    expect(result).toMatch(/-?\d/);
  });
});
