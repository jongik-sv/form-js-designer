#!/usr/bin/env node
/**
 * watermark-hash.mjs — PoweredBy.js sha256 해시 게이트
 * TSK-10-01: TSK-09-03 산출물(해시 로직)을 CI 워크플로에 배선한다.
 *
 * TSK-09-03이 완료되기 전까지 이 스크립트는 경고만 출력하고 exit 0.
 * TSK-09-03 산출물이 존재하면 해당 스크립트를 호출한다.
 *
 * 사용법: node scripts/ci/watermark-hash.mjs
 */

import { access, constants as fsConstants } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(__dirname, '../..');

// TSK-09-03 산출물 경로 (예상)
const TSK_09_03_HASH_SCRIPT = resolve(REPO_ROOT, 'scripts/ci/watermark-hash-check.mjs');
// 또는 packages/designer-editor-host 내 워터마크 컴포넌트
const WATERMARK_SOURCE = resolve(REPO_ROOT, 'packages/designer-components/src/PoweredBy.tsx');

/**
 * main() — TSK-09-03 산출물 존재 여부 확인 후 배선 또는 경고
 */
export async function main() {
  // TSK-09-03 hash-check 스크립트 존재 여부 확인
  let hashScriptExists = false;
  try {
    await access(TSK_09_03_HASH_SCRIPT, fsConstants.R_OK);
    hashScriptExists = true;
  } catch {
    hashScriptExists = false;
  }

  if (hashScriptExists) {
    // TSK-09-03 산출물이 존재 → 위임 실행
    console.log('[watermark-hash] TSK-09-03 해시 스크립트 실행...');
    try {
      execSync(`node ${JSON.stringify(TSK_09_03_HASH_SCRIPT)}`, {
        cwd: REPO_ROOT,
        stdio: 'inherit',
      });
      console.log('[watermark-hash] OK');
      process.exit(0);
    } catch (err) {
      console.error('[watermark-hash] FAIL — 해시 검증 실패');
      process.exit(1);
    }
  } else {
    // TSK-09-03 미완 → 경고 + exit 0 (RC 머지 차단하지 않음, 단 로그에 기록)
    console.warn('[watermark-hash] WARNING: TSK-09-03 산출물(watermark-hash-check.mjs)이 없습니다.');
    console.warn('[watermark-hash] missing: blocked by TSK-09-03');
    console.warn('[watermark-hash] 이 게이트는 TSK-09-03 머지 후 활성화됩니다.');
    // 파일 자체가 없으면 exit 0 (stub 상태)
    // 실제 WP-10 RC 머지 시점에 TSK-09-03 완료 전제로 활성화됨
    process.exit(0);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((err) => {
    console.error('[watermark-hash] 오류:', err);
    process.exit(1);
  });
}
