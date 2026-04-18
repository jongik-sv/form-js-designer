/**
 * createKoT — ko.json을 정적 import하여 t 함수를 생성하는 팩토리
 *
 * 사용:
 *   import { createKoT } from '@form-js-designer/designer-i18n'
 *   <LocaleProvider lang="ko" t={createKoT()}>...</LocaleProvider>
 */

import type { LocaleT } from '@form-js-designer/designer-core';
import { createT } from './t';
import koDict from '../locales/ko.json';

/**
 * createKoT()
 *
 * ko.json 사전을 정적 import 후 createT로 생성된 한국어 t 함수를 반환.
 */
export function createKoT(): LocaleT {
  return createT(koDict as Record<string, string>);
}
