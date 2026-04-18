/**
 * tag-rc.test.mjs — RC1 태깅 스크립트 유닛 테스트
 * TSK-10-02: QA 체크리스트 기반
 *
 * QA 체크리스트 근거:
 * - (AC #8) --dry-run 시 CHANGELOG 존재·license-gate 통과 확인 + "ready to tag" 메시지
 * - (AC #9) 실 실행 시 git tag v1.0.0-rc.1 생성 (로컬)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import * as url from 'node:url';
import * as fs from 'node:fs';
import * as os from 'node:os';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const SCRIPTS_ROOT = path.resolve(__dirname, '../..');
const TAG_SCRIPT = path.join(SCRIPTS_ROOT, 'ci', 'tag-rc.mjs');

let checkPreFlight, TAG_NAME;

const m = await import(TAG_SCRIPT + `?t=${Date.now()}`);
checkPreFlight = m.checkPreFlight;
TAG_NAME = m.TAG_NAME;

describe('TAG_NAME', () => {
  it('태그 이름이 v1.0.0-rc.1이다', () => {
    expect(TAG_NAME).toBe('v1.0.0-rc.1');
  });
});

describe('checkPreFlight()', () => {
  let tmpDir;

  beforeEach(() => {
    // 임시 디렉토리 생성 (루트로 사용)
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tag-rc-test-'));
  });

  afterEach(() => {
    // 임시 디렉토리 정리
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('CHANGELOG.md가 없으면 오류 반환', () => {
    // CHANGELOG.md 없는 상태
    const result = checkPreFlight(tmpDir);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('CHANGELOG'))).toBe(true);
  });

  it('루트 CHANGELOG.md가 있으면 CHANGELOG 관련 오류 없음', () => {
    // CHANGELOG.md 생성
    fs.writeFileSync(path.join(tmpDir, 'CHANGELOG.md'), '## [1.0.0-rc.1]\n### Added\n- 초기 릴리스');
    const result = checkPreFlight(tmpDir);
    // CHANGELOG 관련 오류는 없어야 함
    const changelogErrors = result.errors.filter((e) => e.toLowerCase().includes('changelog'));
    expect(changelogErrors).toHaveLength(0);
  });

  it('CHANGELOG.md에 [1.0.0-rc.1] 섹션이 없으면 오류 반환', () => {
    fs.writeFileSync(path.join(tmpDir, 'CHANGELOG.md'), '## [Unreleased]\n- nothing yet');
    const result = checkPreFlight(tmpDir);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('1.0.0-rc.1'))).toBe(true);
  });

  it('CHANGELOG.md에 [1.0.0-rc.1] 섹션이 있으면 통과', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'CHANGELOG.md'),
      '# Changelog\n## [Unreleased]\n## [1.0.0-rc.1] - 2026-06-05\n### Added\n- 초기 릴리스'
    );
    const result = checkPreFlight(tmpDir);
    const changelogErrors = result.errors.filter((e) => e.toLowerCase().includes('changelog'));
    expect(changelogErrors).toHaveLength(0);
  });
});
