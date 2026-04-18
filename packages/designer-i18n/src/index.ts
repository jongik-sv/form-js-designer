/**
 * @form-js-designer/designer-i18n — public API barrel
 *
 * t 함수 팩토리, ko 번역 어댑터, Intl 유틸, AST 추출기/diff
 */

export { createT } from './t';
export { createKoT } from './createKoT';
export { formatNumber, formatDate, formatDateTime } from './intl';

// Script utilities (Node.js — not bundled for browser)
export { extractKeys, scanPackages } from './scripts/extract';
export { diffKeys, flatten, runDiff } from './scripts/diff';
export { formatHuman, formatJson } from './scripts/reporter';
export type { ExtractOptions, ExtractResult, Warning, KeyOccurrence } from './scripts/extractTypes';
export type { DiffInput, DiffResult, DiffReport, RunDiffResult } from './scripts/diff';
export type { JsonReport } from './scripts/reporter';
