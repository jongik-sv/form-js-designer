/**
 * createT 단위 테스트 — TDD (TSK-07-01)
 *
 * 검증 항목:
 * 1. (정상) 등록된 키 번역 반환
 * 2. (정상) placeholder {{name}} 치환
 * 3. (정상) 0 값 placeholder 치환
 * 4. (정상) params=undefined 호출 시 정상 번역 반환
 * 5. (엣지) 등록되지 않은 키 → key 그대로 반환
 * 6. (엣지) 등록되지 않은 키 → dev 빌드에서 console.warn 발생
 * 7. (엣지) prod 빌드에서 누락 키 호출 시 console.warn 미발생
 * 8. (에러) 빈 dict로 생성된 t → 모든 키가 key 그대로 반환
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { createT } from '../t';
import * as envUtils from '../envUtils';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createT', () => {
  const dict = {
    'greeting': '안녕하세요.',
    'formjs.validation.required': '필수 입력 항목입니다.',
    'formjs.validation.minValue': '최솟값은 {{min}}입니다.',
    'formjs.validation.stepValue': '유효한 값을 선택하세요. 가장 가까운 유효 값은 {{prev}}와(과) {{next}}입니다.',
  };

  // 1. 등록된 키 번역 반환
  it('returns translated string for a registered key', () => {
    const t = createT(dict);
    expect(t('greeting')).toBe('안녕하세요.');
    expect(t('formjs.validation.required')).toBe('필수 입력 항목입니다.');
  });

  // 2. placeholder 치환
  it('substitutes {{name}} placeholders with params', () => {
    const t = createT(dict);
    expect(t('formjs.validation.minValue', { min: 5 })).toBe('최솟값은 5입니다.');
  });

  // 3. 0 값 placeholder 치환
  it('substitutes placeholder with value 0 correctly', () => {
    const t = createT(dict);
    expect(t('formjs.validation.minValue', { min: 0 })).toBe('최솟값은 0입니다.');
  });

  // 4. params=undefined 호출 시 정상 번역 반환
  it('returns translated string when params is undefined', () => {
    const t = createT(dict);
    expect(t('formjs.validation.required', undefined)).toBe('필수 입력 항목입니다.');
  });

  // 5. 등록되지 않은 키 → key 그대로 반환
  it('returns key as-is when key is not in dict', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const t = createT(dict);
    expect(t('unknown.key')).toBe('unknown.key');
  });

  // 6. 등록되지 않은 키 → dev 빌드에서 console.warn 발생
  it('emits console.warn for missing key in dev build', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const t = createT(dict);
    t('unknown.key');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toMatch(/missing key/i);
  });

  // 7. prod 빌드에서 누락 키 호출 시 console.warn 미발생
  it('does not emit console.warn for missing key in production env', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    // isProductionEnv를 vi.spyOn으로 true 반환하도록 mock
    vi.spyOn(envUtils, 'isProductionEnv').mockReturnValue(true);
    const t = createT(dict);
    t('unknown.key.prod');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  // 8. 빈 dict로 생성된 t → 모든 키가 key 그대로 반환
  it('returns key as-is for all keys when dict is empty', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const t = createT({});
    expect(t('any.key')).toBe('any.key');
    expect(t('another.key')).toBe('another.key');
  });

  // 다중 placeholder 치환
  it('substitutes multiple placeholders in a single string', () => {
    const t = createT(dict);
    expect(t('formjs.validation.stepValue', { prev: '10', next: '20' })).toBe(
      '유효한 값을 선택하세요. 가장 가까운 유효 값은 10와(과) 20입니다.',
    );
  });
});
