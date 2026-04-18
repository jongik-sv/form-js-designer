/**
 * createT — t 함수 팩토리
 *
 * dict에 키가 있으면 번역된 문자열을 반환.
 * 키 미등록 시 key를 그대로 반환하며 dev 빌드에서 console.warn 발생.
 * {{name}} 형식의 placeholder는 params로 치환.
 */

import type { LocaleT } from '@form-js-designer/designer-core';
import { isProductionEnv } from './envUtils';

/**
 * createT(dict)
 *
 * @param dict - 번역 사전 (key → 번역 문자열)
 * @returns LocaleT — t(key, params?) 함수
 */
export function createT(dict: Record<string, string>): LocaleT {
  return function t(key: string, params?: Record<string, string | number>): string {
    const template = dict[key];

    if (template === undefined) {
      // 키 미등록: dev 빌드에서 경고
      if (!isProductionEnv()) {
        console.warn('[designer-i18n] missing key: ' + key);
      }
      return key;
    }

    // placeholder 치환
    if (params !== undefined) {
      return template.replace(/\{\{(\w+)\}\}/g, (_match, p1: string) => {
        const val = params[p1];
        return val !== undefined ? String(val) : `{{${p1}}}`;
      });
    }

    return template;
  };
}
