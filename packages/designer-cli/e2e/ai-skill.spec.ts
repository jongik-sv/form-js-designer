/**
 * ai-skill.spec.ts — TSK-09-01 AC #2 / D-P1-5
 *
 * 4 commands × 2 시나리오(valid/invalid) = 8케이스
 * - AI 실제 호출 없이 사전 생성된 픽스처 JSON으로 Ajv 검증
 * - validate() 함수를 직접 import (CLI subprocess 없이)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from '../src/commands/validate';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** i18n 체크 대상 prop 이름 목록 (SKILL.md §4) */
const I18N_PROPS = ['header', 'title', 'description', 'triggerLabel', 'label'] as const;
/** i18n 허용 패턴: designer.* 키 또는 빈 문자열 */
const I18N_PATTERN = /^(designer\.[a-z.]+|)$/;

function loadFixture(dir: 'valid' | 'invalid', name: string): Record<string, unknown> {
  const filePath = resolve(__dirname, 'fixtures', dir, `${name}.schema.json`);
  return JSON.parse(readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
}

/** components 배열을 재귀적으로 순회하여 i18n 하드코딩 여부를 검증한다. */
function checkI18nProps(comps: Record<string, unknown>[]): void {
  for (const comp of comps) {
    for (const prop of I18N_PROPS) {
      const val = comp[prop];
      if (typeof val === 'string') {
        expect(val).toMatch(I18N_PATTERN);
      }
    }
    if (Array.isArray(comp['components'])) {
      checkI18nProps(comp['components'] as Record<string, unknown>[]);
    }
  }
}

/** components 배열을 재귀적으로 순회하여 모든 id 값을 수집한다. */
function collectComponentIds(comps: Record<string, unknown>[], ids: string[]): void {
  for (const comp of comps) {
    if (typeof comp['id'] === 'string') {
      ids.push(comp['id']);
    }
    if (Array.isArray(comp['components'])) {
      collectComponentIds(comp['components'] as Record<string, unknown>[], ids);
    }
  }
}

// --- design-page ---
describe('design-page', () => {
  it('valid: 올바른 page schema → validate ok', () => {
    const schema = loadFixture('valid', 'design-page');
    const result = validate({ schema });
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('invalid: unknown component type → UNKNOWN_COMPONENT_TYPE 오류', () => {
    const schema = loadFixture('invalid', 'design-page');
    const result = validate({ schema });
    expect(result.ok).toBe(false);
    const codes = result.errors.map((e) => e.code);
    expect(codes).toContain('UNKNOWN_COMPONENT_TYPE');
  });
});

// --- design-add ---
describe('design-add', () => {
  it('valid: 컴포넌트 추가 후 schema → validate ok', () => {
    const schema = loadFixture('valid', 'design-add');
    const result = validate({ schema });
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('invalid: schemaVersion=18 → INVALID_SCHEMA_VERSION 오류', () => {
    const schema = loadFixture('invalid', 'design-add');
    const result = validate({ schema });
    expect(result.ok).toBe(false);
    const codes = result.errors.map((e) => e.code);
    expect(codes).toContain('INVALID_SCHEMA_VERSION');
  });
});

// --- design-modify ---
describe('design-modify', () => {
  it('valid: 컴포넌트 수정 후 schema → validate ok', () => {
    const schema = loadFixture('valid', 'design-modify');
    const result = validate({ schema });
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('invalid: components 배열 누락 → MISSING_COMPONENTS 오류', () => {
    const schema = loadFixture('invalid', 'design-modify');
    const result = validate({ schema });
    expect(result.ok).toBe(false);
    const codes = result.errors.map((e) => e.code);
    expect(codes).toContain('MISSING_COMPONENTS');
  });
});

// --- design-validate ---
describe('design-validate', () => {
  it('valid: modal+table 포함 schema → validate ok', () => {
    const schema = loadFixture('valid', 'design-validate');
    const result = validate({ schema });
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('invalid: unknown-widget + fake-input → UNKNOWN_COMPONENT_TYPE 오류 복수', () => {
    const schema = loadFixture('invalid', 'design-validate');
    const result = validate({ schema });
    expect(result.ok).toBe(false);
    const unknownErrors = result.errors.filter((e) => e.code === 'UNKNOWN_COMPONENT_TYPE');
    expect(unknownErrors.length).toBeGreaterThanOrEqual(2);
  });
});

// --- 추가 엣지 케이스 ---
describe('schema 구조 계약', () => {
  it('schemaVersion=19: 유효 schema에는 항상 schemaVersion=19 포함', () => {
    const fixtures = ['design-page', 'design-add', 'design-modify', 'design-validate'];
    for (const name of fixtures) {
      const schema = loadFixture('valid', name);
      expect(schema['schemaVersion']).toBe(19);
    }
  });

  it('i18n 하드코딩 없음: 유효 schema의 문자열 값이 designer.* 패턴 또는 빈 문자열', () => {
    const fixtures = ['design-page', 'design-add', 'design-modify', 'design-validate'];
    for (const name of fixtures) {
      const schema = loadFixture('valid', name);
      const components = (schema['components'] as Record<string, unknown>[]) ?? [];
      checkI18nProps(components);
    }
  });

  it('중복 id 없음: 유효 schema의 컴포넌트 id가 모두 고유', () => {
    const fixtures = ['design-page', 'design-add', 'design-modify', 'design-validate'];
    for (const name of fixtures) {
      const schema = loadFixture('valid', name);
      const ids: string[] = [];
      collectComponentIds((schema['components'] as Record<string, unknown>[]) ?? [], ids);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    }
  });
});
