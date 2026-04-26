#!/usr/bin/env node
/**
 * TSK-05-04: i18n-check 래퍼 — CI gate
 *
 * packages/designer-i18n/bin/i18n-check.mjs를 실행하여
 * ko.json 누락 키 0을 보장한다. 누락 키가 있으면 exit code 1로 CI fail.
 *
 * Usage:
 *   node scripts/assert-i18n-coverage.mjs
 *
 * Exit codes:
 *   0 — 누락 키 없음 (pass)
 *   1 — 누락 키 있음 (CI fail)
 *   2 — ko.json 파일 없음 (CI fail)
 */

import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');
const I18N_CHECK = resolve(REPO_ROOT, 'packages/designer-i18n/bin/i18n-check.mjs');

// Use npx tsx to load TypeScript sources
const child = spawn(
  'npx',
  ['tsx', I18N_CHECK],
  {
    stdio: 'inherit',
    cwd: REPO_ROOT,
    env: { ...process.env },
  },
);

child.on('exit', (code) => {
  if (code !== 0) {
    console.error(`[assert-i18n-coverage] i18n-check 실패 (exit ${code}) — CI gate fail`);
  }
  process.exit(code ?? 1);
});

child.on('error', (err) => {
  console.error('[assert-i18n-coverage] i18n-check 실행 오류:', err.message);
  process.exit(1);
});
