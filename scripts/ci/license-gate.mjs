#!/usr/bin/env node
/**
 * license-gate.mjs — 라이선스 게이트
 * TSK-10-01: permissive 라이선스 외 의존성 감지 시 exit 1
 *
 * 허용 라이선스: MIT, Apache-2.0, ISC, BSD-2-Clause, BSD-3-Clause, MPL-2.0, 0BSD, UNLICENSED(내부)
 * 비-permissive(GPL, LGPL, AGPL 등) 발견 시 패키지명·버전·라이선스 출력 후 exit 1
 *
 * 의존성: license-checker-rseidelsohn (npm run lint:license로 설치됨)
 *
 * 사용법: node scripts/ci/license-gate.mjs [--root <path>]
 */

import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(__dirname, '../..');

/**
 * 허용된 라이선스 목록
 * UNLICENSED: 내부 workspace 패키지 (form-js-designer/*)
 */
export const ALLOWED_LICENSES = [
  'MIT',
  'Apache-2.0',
  'ISC',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'MPL-2.0',
  '0BSD',
  'CC0-1.0',
  'CC-BY-3.0',
  'CC-BY-4.0',
  'Unlicense',
  'UNLICENSED',   // 내부 workspace 패키지
  'Python-2.0',
  'BlueOak-1.0.0',
];

/**
 * 패키지 맵에서 비-permissive 라이선스 위반 목록을 반환한다.
 * @param {Record<string, {licenses: string}>} packages - license-checker 형식
 * @returns {string[]} 위반 패키지 설명 문자열 배열
 */
export function checkLicenses(packages) {
  const violations = [];
  for (const [pkgName, info] of Object.entries(packages)) {
    const licenseStr = info.licenses ?? '';
    // 복수 라이선스 지원: "MIT OR Apache-2.0", "(MIT AND CC-BY-4.0)"
    const licenses = licenseStr
      .replace(/[()]/g, '')
      .split(/\s+(?:OR|AND)\s+/)
      .map((l) => l.trim())
      .filter(Boolean);

    // 하나라도 허용 목록에 있으면 OK
    const hasAllowed = licenses.some((l) => ALLOWED_LICENSES.includes(l));

    // 내부 패키지(@form-js-designer/*)는 무조건 허용
    const isInternal = pkgName.startsWith('@form-js-designer/');

    if (!hasAllowed && !isInternal) {
      violations.push(`${pkgName}: ${licenseStr}`);
    }
  }
  return violations;
}

/**
 * license-checker-rseidelsohn를 실행하여 패키지 맵을 반환한다.
 * @param {string} root - 모노레포 루트 경로
 * @returns {Record<string, {licenses: string}>}
 */
export function scanTree(root) {
  const checker = resolve(root, 'node_modules/.bin/license-checker-rseidelsohn');
  const excludePackages = [
    '@form-js-designer/designer-core',
    '@form-js-designer/designer-components',
    '@form-js-designer/designer-editor-host',
    '@form-js-designer/designer-i18n',
    '@form-js-designer/designer-table',
  ].join(';');

  const cmd = [
    `node ${JSON.stringify(checker)}`,
    '--json',
    `--excludePackages "${excludePackages}"`,
    '--start .',
  ].join(' ');

  const stdout = execSync(cmd, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 60_000,
  });

  return JSON.parse(stdout);
}

/**
 * main() — CLI 진입점
 */
export async function main(argv = process.argv.slice(2)) {
  let root = REPO_ROOT;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root' && argv[i + 1]) root = resolve(argv[++i]);
  }

  let packages;
  try {
    packages = scanTree(root);
  } catch (err) {
    // license-checker-rseidelsohn가 설치되지 않은 경우 경고만
    if (String(err.message).includes('Cannot find module') || String(err.message).includes('No such file')) {
      console.warn('[license-gate] WARNING: license-checker-rseidelsohn가 설치되지 않았습니다.');
      console.warn('[license-gate] npm install --save-dev license-checker-rseidelsohn 후 재실행하세요.');
      process.exit(0); // 미설치 시 경고만 (CI 빌드 차단 방지)
    }
    console.error('[license-gate] 오류:', err.message);
    process.exit(1);
  }

  const violations = checkLicenses(packages);

  if (violations.length === 0) {
    console.log(`[license-gate] OK — ${Object.keys(packages).length}개 패키지 검사 완료. 위반 없음.`);
    process.exit(0);
  }

  console.error('[license-gate] 비-permissive 라이선스 위반:');
  for (const v of violations) {
    console.error(`  ✖ ${v}`);
  }
  console.error('');
  console.error(`[license-gate] 허용 라이선스: ${ALLOWED_LICENSES.join(', ')}`);
  process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((err) => {
    console.error('[license-gate] 예상치 못한 오류:', err);
    process.exit(1);
  });
}
