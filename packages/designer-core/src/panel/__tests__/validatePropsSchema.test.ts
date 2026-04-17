/**
 * validatePropsSchema Ajv meta-schema 테스트
 * - 6종 케이스: 정상/알 수 없는 type/required 누락/enum 비어있음 등
 */
import { describe, it, expect } from 'vitest';
import { validatePropsSchema } from '../validatePropsSchema';

describe('validatePropsSchema', () => {
  it('(정상) 유효한 schema → { ok: true, errors: [] }', () => {
    const result = validatePropsSchema({
      properties: {
        label: { type: 'string', label: 'Label', default: 'value' },
        count: { type: 'number', min: 0, max: 100 },
        enabled: { type: 'boolean' },
      },
    });
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('(정상) 모든 8 위젯 타입이 유효', () => {
    const result = validatePropsSchema({
      properties: {
        s: { type: 'string' },
        n: { type: 'number' },
        b: { type: 'boolean' },
        e: { type: 'enum', enum: ['a', 'b'] },
        c: { type: 'color' },
        sp: { type: 'spacing' },
        ex: { type: 'expression' },
        i: { type: 'i18n' },
      },
    });
    expect(result.ok).toBe(true);
  });

  it('(에러) 알 수 없는 type → { ok: false }, errors에 type 관련 힌트 포함', () => {
    const result = validatePropsSchema({
      properties: {
        a: { type: 'bogus' as never },
      },
    });
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    // errors 메시지에 type 관련 힌트 포함
    const hasTypeHint = result.errors.some(e => /type|enum|allowed/i.test(e));
    expect(hasTypeHint).toBe(true);
  });

  it('(에러) properties가 없는 schema → { ok: false }', () => {
    const result = validatePropsSchema({} as never);
    expect(result.ok).toBe(false);
  });

  it('(에러) properties 값이 배열인 경우 → { ok: false }', () => {
    const result = validatePropsSchema({
      properties: [] as never,
    });
    expect(result.ok).toBe(false);
  });

  it('(에러) enum 위젯에서 enum 필드가 비어있을 때도 schema 유효 (enum 내용은 validate(value)가 검증)', () => {
    // meta-schema는 enum 배열의 내용을 강제하지 않음 — 빈 배열도 허용
    const result = validatePropsSchema({
      properties: {
        e: { type: 'enum', enum: [] },
      },
    });
    // 빈 enum 배열은 meta-schema 레벨에서 허용 (값 검증은 위젯 validate)
    expect(result.ok).toBe(true);
  });
});
