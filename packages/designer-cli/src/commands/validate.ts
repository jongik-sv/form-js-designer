/**
 * validate — form-js 스키마 검증 CLI 명령
 *
 * 동작:
 * 1. JSON 파싱
 * 2. Ajv로 form-js schemaVersion=19 구조 검증 (+ 신규 컴포넌트 type 등록 여부)
 * 3. i18n 누락 검사 (stub: 항상 pass)
 * 4. exit 0 (성공) / exit 1 (실패)
 */
import * as fs from 'node:fs';
import { Ajv } from 'ajv';
import type { ErrorObject } from 'ajv';
import type { CLIRegistry } from '../registry/types.js';
import { getCLIRegistry } from '../registry/cliRegistry.js';
import { checkI18n } from '../i18n/i18nCheck.js';
import type { FormSchema } from '../i18n/i18nCheck.js';

export interface ValidateOptions {
  /** i18n 검사 로케일 (기본값: 'en') */
  locale?: string;
}

/** 폼 컴포넌트 최소 구조 스키마 */
const COMPONENT_SCHEMA = {
  type: 'object',
  properties: {
    type: { type: 'string' },
    key: { type: 'string' },
  },
  required: ['type'],
  additionalProperties: true,
};

/** form-js FormSchema 최소 구조 (schemaVersion=19) */
const FORM_SCHEMA_DEF = {
  type: 'object',
  properties: {
    schemaVersion: { type: 'number' },
    components: {
      type: 'array',
      items: COMPONENT_SCHEMA,
    },
  },
  required: ['schemaVersion', 'components'],
  additionalProperties: true,
};

const ajv = new Ajv({ allErrors: true, strict: false });
const validateFormStructure = ajv.compile(FORM_SCHEMA_DEF);

interface ValidationResult {
  ok: boolean;
  errors: string[];
}

/** 코드 기반 에러 — AI Skill fixture 테스트 계약 (TSK-09-01 AC #2). */
export interface ValidateError {
  code: 'INVALID_SCHEMA_VERSION' | 'MISSING_COMPONENTS' | 'UNKNOWN_COMPONENT_TYPE' | 'STRUCTURE_ERROR';
  message: string;
  path?: string;
}

export interface ValidatePureResult {
  ok: boolean;
  errors: ValidateError[];
}

/**
 * 순수함수 validate — 파싱된 schema 객체를 받아 structured error 목록을 반환한다.
 * CLI subprocess 없이 AI 산출 JSON의 계약 검증에 사용 (TSK-09-01).
 */
export function validate({ schema }: { schema: unknown }): ValidatePureResult {
  const errors: ValidateError[] = [];
  const s = schema as Record<string, unknown>;

  if (s['schemaVersion'] !== 19) {
    errors.push({
      code: 'INVALID_SCHEMA_VERSION',
      message: `schemaVersion must be 19 (got ${JSON.stringify(s['schemaVersion'])})`,
    });
  }

  if (!Array.isArray(s['components'])) {
    errors.push({ code: 'MISSING_COMPONENTS', message: 'components array is required' });
    return { ok: false, errors };
  }

  const registry = getCLIRegistry();
  const walk = (comps: unknown[], pathPrefix: string): void => {
    comps.forEach((c, i) => {
      const comp = c as Record<string, unknown>;
      const t = comp['type'];
      const p = `${pathPrefix}[${i}]`;
      if (typeof t === 'string' && !registry.has(t)) {
        errors.push({
          code: 'UNKNOWN_COMPONENT_TYPE',
          message: `unknown component type "${t}"`,
          path: p,
        });
      }
      if (Array.isArray(comp['components'])) {
        walk(comp['components'] as unknown[], `${p}.components`);
      }
    });
  };
  walk(s['components'] as unknown[], 'components');

  return { ok: errors.length === 0, errors };
}

/**
 * Ajv 에러 목록을 사람이 읽기 쉬운 문자열 배열로 변환한다.
 */
function formatAjvErrors(errors: ErrorObject[] | null | undefined): string[] {
  if (!errors) return [];
  return errors.map((e) => {
    const prefix = e.instancePath ? `at ${e.instancePath}: ` : '';
    return `${prefix}${e.message ?? 'validation error'}`;
  });
}

/**
 * 폼 스키마에서 등록되지 않은 컴포넌트 type을 검사한다.
 *
 * @param schema - 파싱된 폼 스키마
 * @param registry - CLI 레지스트리
 * @returns 검증 결과
 */
function validateComponentTypes(schema: FormSchema, registry: CLIRegistry): ValidationResult {
  const components = schema.components ?? [];
  const errors = (components as Array<Record<string, unknown>>)
    .map((component, i) => ({ type: component['type'], i }))
    .filter(({ type }) => typeof type === 'string' && !registry.has(type as string))
    .map(({ type, i }) => `components[${i}]: unknown type "${type}"`);

  return { ok: errors.length === 0, errors };
}

/**
 * validate 명령의 핵심 로직.
 *
 * @param filePath - 검증할 JSON 파일 경로
 * @param opts - 검증 옵션
 * @returns exit 코드 (0 = 성공, 1 = 실패)
 */
export async function runValidate(filePath: string, opts: ValidateOptions): Promise<number> {
  // 1. 파일 존재 확인 및 JSON 파싱
  let schema: FormSchema;
  try {
    if (!fs.existsSync(filePath)) {
      process.stderr.write(`Error: File not found: ${filePath}\n`);
      return 1;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    schema = JSON.parse(raw) as FormSchema;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Error: Invalid JSON in ${filePath}: ${msg}\n`);
    return 1;
  }

  // 2. Ajv 구조 검증 (schemaVersion + components 배열 존재)
  const structureValid = validateFormStructure(schema);
  if (!structureValid) {
    const errors = formatAjvErrors(validateFormStructure.errors);
    process.stderr.write(`Validation failed (schema structure):\n`);
    for (const e of errors) {
      process.stderr.write(`  - ${e}\n`);
    }
    return 1;
  }

  // 3. 컴포넌트 타입 등록 여부 검증
  const registry = getCLIRegistry();
  const typeResult = validateComponentTypes(schema, registry);
  if (!typeResult.ok) {
    process.stderr.write(`Validation failed (unknown component types):\n`);
    for (const e of typeResult.errors) {
      process.stderr.write(`  - ${e}\n`);
    }
    return 1;
  }

  // 4. i18n 누락 검사 (stub: 항상 pass)
  const i18nResult = checkI18n(schema, { locale: opts.locale ?? 'en' });
  if (i18nResult.missing.length > 0) {
    process.stdout.write(`i18n missing keys (${i18nResult.missing.length}):\n`);
    for (const key of i18nResult.missing) {
      process.stdout.write(`  - ${key}\n`);
    }
    return 1;
  }

  process.stdout.write(`Validation passed: ${filePath}\n`);
  return 0;
}
