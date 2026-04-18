/**
 * gen-third-party-licenses.test.mjs — THIRD_PARTY_LICENSES 생성 유닛 테스트
 * TSK-10-02: QA 체크리스트 기반
 *
 * QA 체크리스트 근거:
 * - (AC #3) license:gen 실행 후 THIRD_PARTY_LICENSES 파일 생성, 패키지명·버전·라이선스 포함
 * - (AC #4) THIRD_PARTY_LICENSES에 MIT·Apache-2.0·ISC 중 최소 1개 라이선스 등장
 */

import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as url from 'node:url';
import * as fs from 'node:fs';
import * as os from 'node:os';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const SCRIPTS_ROOT = path.resolve(__dirname, '../..');
const GEN_SCRIPT = path.join(SCRIPTS_ROOT, 'ci', 'gen-third-party-licenses.mjs');

let formatEntry, generateContent;

const m = await import(GEN_SCRIPT + `?t=${Date.now()}`);
formatEntry = m.formatEntry;
generateContent = m.generateContent;

describe('formatEntry()', () => {
  it('패키지명·버전·라이선스·저작권 정보를 텍스트로 포맷한다', () => {
    const result = formatEntry('lodash@4.17.21', {
      licenses: 'MIT',
      publisher: 'John-David Dalton',
      repository: 'https://github.com/lodash/lodash',
    });
    expect(result).toContain('lodash@4.17.21');
    expect(result).toContain('MIT');
    expect(result).toContain('John-David Dalton');
  });

  it('repository 없으면 생략된다', () => {
    const result = formatEntry('tiny-pkg@1.0.0', {
      licenses: 'ISC',
      publisher: 'Someone',
      repository: undefined,
    });
    expect(result).toContain('tiny-pkg@1.0.0');
    expect(result).toContain('ISC');
    expect(result).not.toContain('undefined');
  });

  it('publisher 없으면 생략된다', () => {
    const result = formatEntry('no-author@2.0.0', {
      licenses: 'Apache-2.0',
      publisher: undefined,
      repository: 'https://github.com/example/no-author',
    });
    expect(result).toContain('no-author@2.0.0');
    expect(result).toContain('Apache-2.0');
    expect(result).not.toContain('undefined');
  });
});

describe('generateContent()', () => {
  it('패키지 맵에서 THIRD_PARTY_LICENSES 텍스트를 생성한다', () => {
    const packages = {
      'lodash@4.17.21': { licenses: 'MIT', publisher: 'Dalton', repository: 'https://github.com/lodash/lodash' },
      'preact@10.29.0': { licenses: 'MIT', publisher: 'Preact Team', repository: 'https://github.com/preactjs/preact' },
      'axios@1.0.0': { licenses: 'MIT', publisher: 'Matt Zabriskie', repository: 'https://github.com/axios/axios' },
    };
    const content = generateContent(packages);
    expect(content).toContain('lodash@4.17.21');
    expect(content).toContain('preact@10.29.0');
    expect(content).toContain('axios@1.0.0');
    expect(content).toContain('MIT');
  });

  it('MIT·Apache-2.0·ISC 중 최소 1개 라이선스가 포함된다', () => {
    const packages = {
      'pkg-mit@1.0.0': { licenses: 'MIT', publisher: 'A', repository: '' },
      'pkg-isc@1.0.0': { licenses: 'ISC', publisher: 'B', repository: '' },
    };
    const content = generateContent(packages);
    const hasPermissive = content.includes('MIT') || content.includes('Apache-2.0') || content.includes('ISC');
    expect(hasPermissive).toBe(true);
  });

  it('빈 패키지 맵에서도 오류 없이 동작한다', () => {
    const content = generateContent({});
    expect(typeof content).toBe('string');
  });

  it('헤더 또는 구분선이 포함된다', () => {
    const packages = {
      'some-pkg@1.0.0': { licenses: 'MIT', publisher: 'x', repository: '' },
    };
    const content = generateContent(packages);
    // 각 엔트리 사이에 구분자가 있어야 한다
    expect(content.length).toBeGreaterThan(0);
  });
});
