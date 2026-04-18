#!/usr/bin/env node
/**
 * gen-third-party-licenses.mjs — THIRD_PARTY_LICENSES 파일 생성기
 * TSK-10-02: license-checker-rseidelsohn --json --production 파싱 후 텍스트 파일 생성
 *
 * 사용법: node scripts/ci/gen-third-party-licenses.mjs [--root <path>] [--out <path>]
 */

import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(__dirname, '../..');
export const DEFAULT_OUT = resolve(REPO_ROOT, 'THIRD_PARTY_LICENSES');

const SEPARATOR = '---';

/**
 * 단일 패키지 항목을 텍스트 포맷으로 변환한다.
 * @param {string} pkgName - "lodash@4.17.21" 형식
 * @param {{ licenses?: string, publisher?: string, repository?: string, email?: string }} info
 * @returns {string}
 */
export function formatEntry(pkgName, info) {
  const lines = [];
  lines.push(pkgName);
  lines.push(`  License: ${info.licenses ?? 'UNKNOWN'}`);
  if (info.publisher) {
    lines.push(`  Author: ${info.publisher}`);
  }
  if (info.email) {
    lines.push(`  Email: ${info.email}`);
  }
  if (info.repository) {
    lines.push(`  Repository: ${info.repository}`);
  }
  return lines.join('\n');
}

/**
 * 패키지 맵 전체를 THIRD_PARTY_LICENSES 텍스트로 변환한다.
 * @param {Record<string, { licenses?: string, publisher?: string, repository?: string }>} packages
 * @returns {string}
 */
export function generateContent(packages) {
  const entries = Object.entries(packages)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([pkgName, info]) => formatEntry(pkgName, info));

  if (entries.length === 0) {
    return 'No third-party dependencies found.\n';
  }

  const header = [
    'THIRD PARTY LICENSES',
    '====================',
    '',
    'This file lists all third-party packages used in this project,',
    'along with their licenses and authors.',
    '',
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
    `Total packages: ${entries.length}`,
    '',
    SEPARATOR,
    '',
  ].join('\n');

  return header + entries.join(`\n${SEPARATOR}\n`) + `\n${SEPARATOR}\n`;
}

/**
 * license-checker-rseidelsohn를 실행하여 패키지 맵을 반환한다.
 * @param {string} root - 모노레포 루트 경로
 * @returns {Record<string, { licenses?: string, publisher?: string, repository?: string }>}
 */
export function scanPackages(root) {
  const checker = resolve(root, 'node_modules/.bin/license-checker-rseidelsohn');

  const result = spawnSync(
    'node',
    [
      checker,
      '--json',
      '--excludePrivatePackages',
      '--start', '.',
    ],
    {
      cwd: root,
      encoding: 'utf8',
      timeout: 60_000,
    }
  );

  if (result.error) {
    throw new Error(`license-checker-rseidelsohn 실행 오류: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`license-checker-rseidelsohn 오류 (exit ${result.status}): ${result.stderr}`);
  }

  return JSON.parse(result.stdout);
}

/**
 * argv 배열에서 특정 플래그의 값을 파싱한다.
 * @param {string[]} argv
 * @param {string} flag - 예: '--root'
 * @param {string} defaultValue
 * @returns {string}
 */
export function parseFlag(argv, flag, defaultValue) {
  const idx = argv.indexOf(flag);
  return idx !== -1 && argv[idx + 1] ? resolve(argv[idx + 1]) : defaultValue;
}

/**
 * main() — CLI 진입점
 */
export async function main(argv = process.argv.slice(2)) {
  const root = parseFlag(argv, '--root', REPO_ROOT);
  const outFile = parseFlag(argv, '--out', DEFAULT_OUT);

  let packages;
  try {
    packages = scanPackages(root);
  } catch (err) {
    if (
      String(err.message).includes('Cannot find module') ||
      String(err.message).includes('No such file') ||
      String(err.message).includes('ENOENT')
    ) {
      console.warn('[gen-third-party-licenses] WARNING: license-checker-rseidelsohn가 설치되지 않았습니다.');
      console.warn('[gen-third-party-licenses] npm install --save-dev license-checker-rseidelsohn 후 재실행하세요.');
      process.exit(0);
    }
    console.error('[gen-third-party-licenses] 오류:', err.message);
    process.exit(1);
  }

  const content = generateContent(packages);
  writeFileSync(outFile, content, 'utf8');

  console.log(`[gen-third-party-licenses] THIRD_PARTY_LICENSES 생성 완료: ${outFile}`);
  console.log(`  총 ${Object.keys(packages).length}개 패키지 처리됨.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((err) => {
    console.error('[gen-third-party-licenses] 예상치 못한 오류:', err);
    process.exit(1);
  });
}
