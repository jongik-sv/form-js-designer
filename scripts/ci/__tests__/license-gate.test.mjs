/**
 * license-gate.test.mjs — 라이선스 게이트 유닛 테스트
 * TSK-10-01: fixture package.json 기반
 *
 * QA 체크리스트 근거:
 * - (정상) 클린 repo(permissive only) → exit 0
 * - (에러) 비-permissive(GPL) 의존성 발견 시 exit 1 + 패키지명 출력
 */

import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const SCRIPTS_ROOT = path.resolve(__dirname, '../..');
const GATE_SCRIPT = path.join(SCRIPTS_ROOT, 'ci', 'license-gate.mjs');

let checkLicenses, ALLOWED_LICENSES;

// dynamic import
const m = await import(GATE_SCRIPT + `?t=${Date.now()}`);
checkLicenses = m.checkLicenses;
ALLOWED_LICENSES = m.ALLOWED_LICENSES;

describe('checkLicenses()', () => {
  it('ALLOWED_LICENSES 목록이 MIT·Apache-2.0·ISC·BSD 계열 등을 포함한다', () => {
    expect(ALLOWED_LICENSES).toContain('MIT');
    expect(ALLOWED_LICENSES).toContain('Apache-2.0');
    expect(ALLOWED_LICENSES).toContain('ISC');
    expect(ALLOWED_LICENSES).toContain('BSD-2-Clause');
    expect(ALLOWED_LICENSES).toContain('BSD-3-Clause');
  });

  it('permissive 라이선스만 있는 패키지 맵에서 violations=[] 반환', () => {
    const packages = {
      'lodash@4.17.21': { licenses: 'MIT' },
      'preact@10.29.0': { licenses: 'MIT' },
      'js-yaml@4.1.0': { licenses: 'MIT' },
    };
    const violations = checkLicenses(packages);
    expect(violations).toHaveLength(0);
  });

  it('GPL 라이선스 패키지가 있으면 violations에 포함된다', () => {
    const packages = {
      'some-gpl-pkg@1.0.0': { licenses: 'GPL-3.0' },
      'safe-pkg@1.0.0': { licenses: 'MIT' },
    };
    const violations = checkLicenses(packages);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain('some-gpl-pkg');
  });

  it('내부 workspace(UNLICENSED) 패키지는 허용된다', () => {
    const packages = {
      '@form-js-designer/designer-core@0.0.0': { licenses: 'UNLICENSED' },
    };
    const violations = checkLicenses(packages);
    expect(violations).toHaveLength(0);
  });

  it('MPL-2.0·0BSD는 허용된다', () => {
    const packages = {
      'some-mpl@1.0.0': { licenses: 'MPL-2.0' },
      'some-0bsd@1.0.0': { licenses: '0BSD' },
    };
    const violations = checkLicenses(packages);
    expect(violations).toHaveLength(0);
  });

  it('LGPL 라이선스는 violation으로 간주한다', () => {
    const packages = {
      'lgpl-pkg@1.0.0': { licenses: 'LGPL-2.1' },
    };
    const violations = checkLicenses(packages);
    expect(violations).toHaveLength(1);
  });
});
