/**
 * @form-js-designer/designer-i18n — public API barrel (browser-safe)
 *
 * t 함수 팩토리, ko 번역 어댑터, Intl 유틸.
 *
 * Node.js 전용 스크립트(extract, diff, reporter)는 이 entry에서 제외됨.
 * CLI/bin 코드는 scripts/* 를 직접 import 하세요:
 *   import { scanPackages } from '@form-js-designer/designer-i18n/src/scripts/extract'
 */

export { createT } from './t';
export { createKoT } from './createKoT';
export { formatNumber, formatDate, formatDateTime } from './intl';
