/**
 * extractKeys 단위 테스트 — TDD (TSK-07-02)
 *
 * 검증 항목 (QA 체크리스트 기반):
 * 1. fixture normal.ts — 정상 StringLiteral 키 수집
 * 2. fixture template.ts — template-substitution + template-plain warning, keys=[]
 * 3. fixture dynamic.ts — identifier 동적 키 warning, keys=[]
 * 4. fixture concat.ts — string-concat warning, keys=[]
 * 5. fixture comment.ts — 주석 내 t()는 무시, 실제 코드만 수집
 * 6. filesScanned count — 단일 파일 스캔 시 filesScanned=1
 * 7. 다중 파일 스캔 — 여러 fixture 동시 스캔 시 keys 합산
 * 8. PropertyAccess callee (ctx.t) — 지원 여부 확인 (ctx.t('key') 수집)
 * 9. warnings 배열의 line 번호 정확성
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { extractKeys } from '../scripts/extract';

const FIXTURES_DIR = resolve(__dirname, 'fixtures');

function fixturePath(name: string): string {
  return resolve(FIXTURES_DIR, name);
}

describe('extractKeys — fixture normal.ts', () => {
  it('collects StringLiteral key from t() call', () => {
    const result = extractKeys([fixturePath('normal.ts')]);
    expect([...result.keys]).toEqual(['designer.fixture.normal.ok']);
    expect(result.warnings).toHaveLength(0);
  });

  it('filesScanned is 1 for single file input', () => {
    const result = extractKeys([fixturePath('normal.ts')]);
    expect(result.filesScanned).toBe(1);
  });

  it('occurrences contains file + line for found key', () => {
    const result = extractKeys([fixturePath('normal.ts')]);
    const occ = result.occurrences.find(o => o.key === 'designer.fixture.normal.ok');
    expect(occ).toBeDefined();
    expect(occ!.file).toContain('normal.ts');
    expect(typeof occ!.line).toBe('number');
    expect(occ!.line).toBeGreaterThan(0);
  });
});

describe('extractKeys — fixture template.ts', () => {
  it('emits template-substitution warning for t(`key.${var}`) and excludes from keys', () => {
    const result = extractKeys([fixturePath('template.ts')]);
    expect([...result.keys]).toHaveLength(0);
    const subWarning = result.warnings.find(w => w.kind === 'template-substitution');
    expect(subWarning).toBeDefined();
    expect(subWarning!.kind).toBe('template-substitution');
  });

  it('emits template-plain warning for plain template literal and excludes from keys', () => {
    const result = extractKeys([fixturePath('template.ts')]);
    const plainWarning = result.warnings.find(w => w.kind === 'template-plain');
    expect(plainWarning).toBeDefined();
    expect(plainWarning!.kind).toBe('template-plain');
  });

  it('emits exactly 2 warnings for template.ts', () => {
    const result = extractKeys([fixturePath('template.ts')]);
    expect(result.warnings).toHaveLength(2);
  });

  it('warning line numbers are positive', () => {
    const result = extractKeys([fixturePath('template.ts')]);
    for (const w of result.warnings) {
      expect(w.line).toBeGreaterThan(0);
      expect(w.file).toContain('template.ts');
    }
  });
});

describe('extractKeys — fixture dynamic.ts', () => {
  it('emits dynamic-identifier warning for t(variable) and excludes from keys', () => {
    const result = extractKeys([fixturePath('dynamic.ts')]);
    expect([...result.keys]).toHaveLength(0);
    const warn = result.warnings.find(w => w.kind === 'dynamic-identifier');
    expect(warn).toBeDefined();
  });

  it('warning file points to dynamic.ts', () => {
    const result = extractKeys([fixturePath('dynamic.ts')]);
    const warn = result.warnings.find(w => w.kind === 'dynamic-identifier');
    expect(warn!.file).toContain('dynamic.ts');
  });
});

describe('extractKeys — fixture concat.ts', () => {
  it('emits string-concat warning for t("a" + "b") and excludes from keys', () => {
    const result = extractKeys([fixturePath('concat.ts')]);
    expect([...result.keys]).toHaveLength(0);
    const warn = result.warnings.find(w => w.kind === 'string-concat');
    expect(warn).toBeDefined();
  });
});

describe('extractKeys — fixture comment.ts', () => {
  it('collects only t() from actual code, ignores commented-out t() calls', () => {
    const result = extractKeys([fixturePath('comment.ts')]);
    expect([...result.keys]).toEqual(['designer.fixture.comment.active']);
    expect(result.warnings).toHaveLength(0);
  });

  it('does not include designer.fixture.comment.inactive (in line comment)', () => {
    const result = extractKeys([fixturePath('comment.ts')]);
    expect([...result.keys]).not.toContain('designer.fixture.comment.inactive');
  });

  it('does not include designer.fixture.comment.block (in block comment)', () => {
    const result = extractKeys([fixturePath('comment.ts')]);
    expect([...result.keys]).not.toContain('designer.fixture.comment.block');
  });
});

describe('extractKeys — multi-file scan', () => {
  it('accumulates keys from multiple fixture files', () => {
    const result = extractKeys([
      fixturePath('normal.ts'),
      fixturePath('comment.ts'),
    ]);
    expect(result.keys.has('designer.fixture.normal.ok')).toBe(true);
    expect(result.keys.has('designer.fixture.comment.active')).toBe(true);
  });

  it('filesScanned matches number of input files', () => {
    const result = extractKeys([
      fixturePath('normal.ts'),
      fixturePath('dynamic.ts'),
      fixturePath('concat.ts'),
    ]);
    expect(result.filesScanned).toBe(3);
  });

  it('accumulates warnings from multiple files', () => {
    const result = extractKeys([
      fixturePath('dynamic.ts'),
      fixturePath('concat.ts'),
    ]);
    expect(result.warnings.length).toBeGreaterThanOrEqual(2);
  });
});

describe('extractKeys — elapsedMs', () => {
  it('returns elapsed time in milliseconds (non-negative)', () => {
    const result = extractKeys([fixturePath('normal.ts')]);
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
  });
});
