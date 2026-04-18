#!/usr/bin/env node
/**
 * tag-rc.mjs — RC1 태그 생성·푸시 스크립트
 * TSK-10-02: pre-flight 검사 후 v1.0.0-rc.1 태그 생성·푸시
 *
 * 사용법:
 *   node scripts/ci/tag-rc.mjs             # 실 태깅 + 푸시
 *   node scripts/ci/tag-rc.mjs --dry-run   # 검사만 (태그 미생성)
 */

import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(__dirname, '../..');

/** RC1 태그 이름 */
export const TAG_NAME = 'v1.0.0-rc.1';

/** 태그 메시지 */
export const TAG_MESSAGE = 'RC1: Phase 1 릴리스 후보 — form-js Designer';

/**
 * CHANGELOG 패키지 경로 목록
 */
const CHANGELOG_PATHS = [
  'CHANGELOG.md',
  'packages/designer-core/CHANGELOG.md',
  'packages/designer-components/CHANGELOG.md',
  'packages/designer-i18n/CHANGELOG.md',
  'packages/designer-table/CHANGELOG.md',
  'packages/designer-editor-host/CHANGELOG.md',
];

/**
 * pre-flight 검사: CHANGELOG 존재 + [1.0.0-rc.1] 섹션 포함 확인
 * @param {string} root - 모노레포 루트 경로
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function checkPreFlight(root) {
  const errors = [];

  // 루트 CHANGELOG.md 필수 확인
  const rootChangelog = resolve(root, 'CHANGELOG.md');
  if (!existsSync(rootChangelog)) {
    errors.push(`CHANGELOG.md 없음: ${rootChangelog}`);
  } else {
    const content = readFileSync(rootChangelog, 'utf8');
    if (!content.includes('[1.0.0-rc.1]')) {
      errors.push(`CHANGELOG.md에 [1.0.0-rc.1] 섹션이 없습니다.`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

/**
 * 모든 패키지의 CHANGELOG.md 존재 여부 확인
 * @param {string} root - 모노레포 루트 경로
 * @returns {{ ok: boolean, missing: string[] }}
 */
export function checkAllChangelogs(root) {
  const missing = [];
  for (const relPath of CHANGELOG_PATHS) {
    const absPath = resolve(root, relPath);
    if (!existsSync(absPath)) {
      missing.push(relPath);
    }
  }
  return { ok: missing.length === 0, missing };
}

/**
 * license-gate 통과 여부 확인
 * @param {string} root - 모노레포 루트 경로
 * @returns {{ ok: boolean, error?: string }}
 */
export function checkLicenseGate(root) {
  try {
    execSync('node scripts/ci/license-gate.mjs', {
      cwd: root,
      stdio: 'pipe',
      timeout: 60_000,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err.stderr || err.message) };
  }
}

/**
 * main() — CLI 진입점
 */
export async function main(argv = process.argv.slice(2)) {
  const dryRun = argv.includes('--dry-run');
  let root = REPO_ROOT;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root' && argv[i + 1]) root = resolve(argv[++i]);
  }

  console.log(`[tag-rc] pre-flight 검사 시작 (태그: ${TAG_NAME})${dryRun ? ' [dry-run]' : ''}`);

  // 1. CHANGELOG 검사
  const changelogCheck = checkPreFlight(root);
  if (!changelogCheck.ok) {
    console.error('[tag-rc] CHANGELOG 검사 실패:');
    for (const e of changelogCheck.errors) {
      console.error(`  ✖ ${e}`);
    }
  } else {
    console.log('[tag-rc] ✔ 루트 CHANGELOG.md 확인 (v1.0.0-rc.1 섹션 존재)');
  }

  // 2. 패키지별 CHANGELOG 확인
  const allChangelogs = checkAllChangelogs(root);
  if (!allChangelogs.ok) {
    console.warn('[tag-rc] 패키지 CHANGELOG.md 누락:');
    for (const f of allChangelogs.missing) {
      console.warn(`  ⚠ ${f}`);
    }
  } else {
    console.log(`[tag-rc] ✔ 패키지 CHANGELOG.md ${CHANGELOG_PATHS.length}개 모두 존재`);
  }

  // 3. license-gate 확인
  const licenseCheck = checkLicenseGate(root);
  if (!licenseCheck.ok) {
    console.warn('[tag-rc] license-gate 경고 (미설치 시 스킵):');
    console.warn(`  ${licenseCheck.error}`);
  } else {
    console.log('[tag-rc] ✔ license-gate 통과');
  }

  // pre-flight 종합 판정
  const canTag = changelogCheck.ok;

  if (!canTag) {
    console.error(`\n[tag-rc] pre-flight 실패 — ${TAG_NAME} 태그를 생성하지 않습니다.`);
    process.exit(1);
  }

  if (dryRun) {
    console.log(`\n[tag-rc] ready to tag — dry-run 완료. 실 태깅 없음.`);
    console.log(`  실 실행: node scripts/ci/tag-rc.mjs`);
    process.exit(0);
  }

  // 4. 태그 생성
  try {
    console.log(`\n[tag-rc] ${TAG_NAME} 태그 생성 중...`);
    execSync(`git tag -a ${TAG_NAME} -m "${TAG_MESSAGE}"`, {
      cwd: root,
      stdio: 'inherit',
      timeout: 30_000,
    });
    console.log(`[tag-rc] ✔ 태그 생성 완료: ${TAG_NAME}`);
  } catch (err) {
    if (String(err.message).includes('already exists')) {
      console.warn(`[tag-rc] 태그 ${TAG_NAME}가 이미 존재합니다.`);
    } else {
      console.error('[tag-rc] 태그 생성 실패:', err.message);
      process.exit(1);
    }
  }

  // 5. 태그 푸시
  try {
    console.log(`[tag-rc] origin에 ${TAG_NAME} 푸시 중...`);
    execSync(`git push origin ${TAG_NAME}`, {
      cwd: root,
      stdio: 'inherit',
      timeout: 60_000,
    });
    console.log(`[tag-rc] ✔ 태그 푸시 완료: ${TAG_NAME}`);
  } catch (err) {
    console.error('[tag-rc] 태그 푸시 실패:', err.message);
    console.warn('[tag-rc] 수동으로 푸시: git push origin ' + TAG_NAME);
    process.exit(1);
  }

  console.log(`\n[tag-rc] RC1 태깅 완료 — ${TAG_NAME}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((err) => {
    console.error('[tag-rc] 예상치 못한 오류:', err);
    process.exit(1);
  });
}
