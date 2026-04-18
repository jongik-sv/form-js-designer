/**
 * watermark-scss-lint.test.mjs — 워터마크 숨김 CSS 룰 감지 유닛 테스트
 * TSK-10-01: fixture 경로 기반
 *
 * QA 체크리스트 근거:
 * - (정상) 클린 CSS → violations=[]
 * - (엣지) .fjs-powered-by + display:none 공존 시 exit 1
 * - (엣지) .fjs-powered-by + visibility:hidden 공존 시 exit 1
 * - (엣지) .fjs-powered-by + opacity:0 공존 시 exit 1
 * - (정상) 다른 클래스의 display:none은 위반이 아님
 */

import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const SCRIPTS_ROOT = path.resolve(__dirname, '../..');
const LINT_SCRIPT = path.join(SCRIPTS_ROOT, 'ci', 'watermark-scss-lint.mjs');

let detectHidingRules;

const m = await import(LINT_SCRIPT + `?t=${Date.now()}`);
detectHidingRules = m.detectHidingRules;

describe('detectHidingRules()', () => {
  it('클린한 CSS 문자열에서 violations=[]', () => {
    const css = `
      .fjs-powered-by {
        display: flex;
        align-items: center;
        font-size: 12px;
      }
    `;
    const violations = detectHidingRules(css, 'test.css');
    expect(violations).toHaveLength(0);
  });

  it('.fjs-powered-by 룰셋에 display:none이 있으면 violation', () => {
    const css = `
      .fjs-powered-by {
        display: none;
      }
    `;
    const violations = detectHidingRules(css, 'bad.css');
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]).toContain('bad.css');
  });

  it('.fjs-powered-by 룰셋에 visibility:hidden이 있으면 violation', () => {
    const css = `
      .fjs-powered-by {
        visibility: hidden;
      }
    `;
    const violations = detectHidingRules(css, 'bad.css');
    expect(violations.length).toBeGreaterThan(0);
  });

  it('.fjs-powered-by 룰셋에 opacity:0이 있으면 violation', () => {
    const css = `
      .fjs-powered-by {
        opacity: 0;
      }
    `;
    const violations = detectHidingRules(css, 'bad.css');
    expect(violations.length).toBeGreaterThan(0);
  });

  it('.fjs-powered-by와 무관한 다른 선택자의 display:none은 violation이 아님', () => {
    const css = `
      .some-other-class {
        display: none;
      }
      .fjs-powered-by {
        color: #999;
      }
    `;
    const violations = detectHidingRules(css, 'ok.css');
    expect(violations).toHaveLength(0);
  });

  it('중첩 선택자 패턴도 탐지한다: .parent .fjs-powered-by { display:none }', () => {
    const css = `
      .editor-footer .fjs-powered-by {
        display: none;
      }
    `;
    const violations = detectHidingRules(css, 'nested.css');
    expect(violations.length).toBeGreaterThan(0);
  });

  it('빈 CSS 문자열은 violations=[]', () => {
    expect(detectHidingRules('', 'empty.css')).toHaveLength(0);
  });
});
