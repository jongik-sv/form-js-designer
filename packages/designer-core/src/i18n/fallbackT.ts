/**
 * fallbackT — LocaleProvider 미설치 시 기본 t 함수
 *
 * - 첫 호출 시 dev 빌드에서 console.warn 1회 발생
 * - 이후 호출은 조용히 key 반환
 * - key에 {{name}} placeholder가 있으면 params로 치환
 * - params가 없거나 key에 placeholder가 없으면 key 그대로 반환
 */

import { isProductionEnv } from '../envUtils';
import type { LocaleT } from './localeTypes';

/**
 * createFallbackT()
 *
 * 클로저 기반 단일 인스턴스 fallback t 함수를 반환한다.
 * 각 호출마다 독립적인 warned 플래그를 가진다 (테스트 격리).
 */
export function createFallbackT(): LocaleT {
  let warned = false;

  return function fallbackT(key: string, params?: Record<string, string | number>): string {
    if (!warned && !isProductionEnv()) {
      warned = true;
      console.warn(
        '[designer-i18n] LocaleProvider not installed; returning key as-is. ' +
          'Install <LocaleProvider> from @form-js-designer/designer-core to provide translations.',
      );
    }

    if (params && Object.keys(params).length > 0) {
      // {{name}} 형식의 placeholder 치환
      return key.replace(/\{\{(\w+)\}\}/g, (_match, p1: string) => {
        const val = params[p1];
        return val !== undefined ? String(val) : `{{${p1}}}`;
      });
    }

    return key;
  };
}
