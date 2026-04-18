/**
 * i18nCheck — i18n 누락 키 검사
 *
 * TSK-07-02 완료 전: stub 구현 (누락 0 반환)
 * TSK-07-02 완료 후: @form-js-designer/designer-i18n/scripts/diff에서 함수 import 후 실 연결
 */

export interface FormSchema {
  schemaVersion?: number;
  components?: unknown[];
  [key: string]: unknown;
}

export interface I18nCheckOptions {
  /** 검사할 로케일 (기본값: 'en') */
  locale?: string;
}

export interface I18nCheckResult {
  /** 누락된 i18n 키 목록 */
  missing: string[];
}

/**
 * 폼 스키마에서 i18n 누락 키를 검사한다.
 *
 * stub 상태: 항상 누락 0 반환.
 * TSK-07-02 완료 후 @form-js-designer/designer-i18n의 diff 함수로 교체.
 *
 * @param _schema - 검사할 폼 스키마 (stub에서는 미사용)
 * @param _options - 검사 옵션
 * @returns 누락된 i18n 키 목록
 */
export function checkI18n(_schema: FormSchema, _options: I18nCheckOptions = {}): I18nCheckResult {
  // TODO: TSK-07-02 완료 후 실 구현으로 교체
  // import { diffI18nKeys } from '@form-js-designer/designer-i18n/scripts/diff';
  // return { missing: diffI18nKeys(_schema, _options.locale ?? 'en') };
  return { missing: [] };
}
