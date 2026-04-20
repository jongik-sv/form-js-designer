/**
 * createKoT 통합 테스트 — TDD (TSK-07-01)
 *
 * 검증 항목:
 * 1. (정상) formjs.validation.required → 한국어 번역 반환
 * 2. (정상) formjs.validation.minValue + params → 치환된 한국어 반환
 * 3. (정상) designer.palette.table → "테이블"
 * 4. (정상) designer.common.loading → "불러오는 중..."
 * 5. (엣지) 등록되지 않은 키 → key 그대로 반환
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { createKoT } from '../createKoT';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createKoT', () => {
  it('returns Korean translation for formjs.validation.required', () => {
    const t = createKoT();
    expect(t('formjs.validation.required')).toBe('필수 입력 항목입니다.');
  });

  it('substitutes placeholder in formjs.validation.minValue', () => {
    const t = createKoT();
    expect(t('formjs.validation.minValue', { min: 5 })).toBe('최솟값은 5입니다.');
  });

  it('returns Korean translation for designer.palette.table', () => {
    const t = createKoT();
    expect(t('designer.palette.table')).toBe('테이블');
  });

  it('returns Korean translation for designer.common.loading', () => {
    const t = createKoT();
    expect(t('designer.common.loading')).toBe('불러오는 중...');
  });

  it('returns key as-is for unregistered key', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const t = createKoT();
    expect(t('unknown.key')).toBe('unknown.key');
  });

  it('substitutes 0 value placeholder correctly', () => {
    const t = createKoT();
    expect(t('formjs.validation.minValue', { min: 0 })).toBe('최솟값은 0입니다.');
  });

  it('returns translation when params is undefined', () => {
    const t = createKoT();
    expect(t('formjs.validation.required', undefined)).toBe('필수 입력 항목입니다.');
  });

  it('substitutes multiple placeholders in stepValue', () => {
    const t = createKoT();
    expect(t('formjs.validation.stepValue', { prev: '10', next: '20' })).toBe(
      '유효한 값을 선택하세요. 가장 가까운 유효 값은 10와(과) 20입니다.',
    );
  });

  it('returns all expected ko keys', () => {
    const t = createKoT();
    const cases: Array<[string, string]> = [
      ['formjs.validation.required', '필수 입력 항목입니다.'],
      ['formjs.validation.email', '올바른 이메일 주소를 입력하세요.'],
      ['formjs.validation.phone', '올바른 국제 전화번호를 입력하세요. (예: +821012345678)'],
      ['formjs.validation.notANumber', '숫자를 입력하세요.'],
      ['formjs.validation.documentReference', '문서 참조가 정의되지 않았습니다.'],
      ['formjs.validation.minInvalidNumber', '최솟값이 유효한 숫자가 아닙니다.'],
      ['formjs.validation.maxInvalidNumber', '최댓값이 유효한 숫자가 아닙니다.'],
      ['designer.palette.card', '카드'],
      ['designer.palette.tabs', '탭'],
      ['designer.palette.modal', '모달'],
      ['designer.palette.button', '버튼'],
      ['designer.panel.general', '일반'],
      ['designer.panel.appearance', '외형'],
      ['designer.panel.validation', '유효성 검사'],
      ['designer.panel.binding', '데이터 바인딩'],
      ['designer.action.save', '저장'],
      ['designer.action.cancel', '취소'],
      ['designer.action.delete', '삭제'],
      ['designer.action.add', '추가'],
      ['designer.table.column.add', '컬럼 추가'],
      ['designer.table.column.delete', '컬럼 삭제'],
      ['designer.table.filter.placeholder', '필터 입력'],
      ['designer.table.empty', '데이터가 없습니다.'],
      ['designer.common.error', '오류가 발생했습니다.'],
    ];
    for (const [key, expected] of cases) {
      expect(t(key), `key: ${key}`).toBe(expected);
    }
  });
});
