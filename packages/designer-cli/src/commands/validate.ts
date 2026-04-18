/**
 * designer-cli validate command — TSK-08-01 / TSK-09-01
 *
 * form-js 스키마 파일을 검증한다.
 * - schemaVersion=19 확인
 * - 컴포넌트 type 레지스트리 검증
 * - Ajv 기반 구조 검증
 *
 * exit 0: 유효 / exit 1: 오류 목록 출력
 */

import { validateFormSchema } from '@form-js-designer/designer-core/validate';
import type { ValidationResult } from '@form-js-designer/designer-core/validate';

/** 등록된 컴포넌트 type 목록 (designer-components + designer-table) */
const KNOWN_COMPONENT_TYPES = new Set([
  'card',
  'stack',
  'button',
  'tabs',
  'modal',
  'table',
]);

/**
 * 내부 컴포넌트 레지스트리 — validate.ts 독립 동작용 (CLI 컨텍스트)
 */
const cliRegistry = {
  get(type: string): { propsSchema?: { properties: Record<string, { type: string }> } } | undefined {
    if (KNOWN_COMPONENT_TYPES.has(type)) {
      return { propsSchema: undefined };
    }
    return undefined;
  },
};

export interface ValidateOptions {
  /** 검증 대상 schema 객체 (이미 파싱된 JSON) */
  schema: Record<string, unknown>;
  /** 커스텀 레지스트리 (테스트용 override) */
  registry?: typeof cliRegistry;
}

/**
 * form-js 스키마를 검증하여 ValidationResult를 반환한다.
 *
 * AC #2 / D-P1-5 계약:
 * - result.ok === true → exit 0 (CLI에서)
 * - result.ok === false → exit 1 (CLI에서)
 */
export function validate(options: ValidateOptions): ValidationResult {
  const { schema, registry = cliRegistry } = options;

  // schemaVersion 검증
  if (schema['schemaVersion'] !== 19) {
    return {
      ok: false,
      errors: [
        {
          path: 'schemaVersion',
          code: 'INVALID_SCHEMA_VERSION',
          message: `schemaVersion must be 19, got: ${JSON.stringify(schema['schemaVersion'])}`,
        },
      ],
      warnings: [],
    };
  }

  return validateFormSchema(schema, registry);
}

/** CLI 진입점 (직접 실행 시) */
export async function runValidateCli(filePath: string): Promise<void> {
  const { readFile } = await import('node:fs/promises');
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf-8');
  } catch {
    console.error(`[validate] 파일을 읽을 수 없습니다: ${filePath}`);
    process.exit(1);
  }

  let schema: Record<string, unknown>;
  try {
    schema = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    console.error(`[validate] JSON 파싱 실패: ${filePath}`);
    process.exit(1);
  }

  const result = validate({ schema });

  if (result.ok) {
    console.log('[validate] 유효합니다.');
    process.exit(0);
  } else {
    console.error('[validate] 오류 목록:');
    for (const err of result.errors) {
      console.error(`  [${err.code}] ${err.path}: ${err.message}`);
    }
    process.exit(1);
  }
}
