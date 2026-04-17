/**
 * validatePropsSchema — Ajv meta-schema 기반 PropsSchema 검증기
 *
 * PropsSchema 자체의 형상(스키마의 스키마)을 검증한다.
 * - propsSchema.meta.json (JSON Schema draft-07) 기준
 * - 반환: { ok: boolean, errors: string[] }
 * - dev-only 호출용 (defineComponent에서 !isProductionEnv() 조건 하에 호출)
 */
import Ajv from 'ajv';
import metaSchema from './propsSchema.meta.json';
import type { WidgetValidationResult } from './types';

// Ajv 인스턴스는 모듈 로드 시 1회만 생성 (성능 최적화)
const ajv = new Ajv({ allErrors: true, strict: false });

// meta.json compile
const validateFn = ajv.compile(metaSchema);

/**
 * PropsSchema 선언 자체를 meta-schema로 검증한다.
 * 위젯의 validate(value) 와는 다르다 — 이쪽은 "스키마 구조" 검증.
 *
 * @param schema - 검증할 PropsSchema 객체 (or 임의의 unknown)
 * @returns { ok, errors }
 */
export function validatePropsSchema(schema: unknown): WidgetValidationResult {
  const valid = validateFn(schema);
  if (valid) {
    return { ok: true, errors: [] };
  }

  const errors = (validateFn.errors ?? []).map((e) => {
    const path = e.instancePath ? `at ${e.instancePath}: ` : '';
    return `${path}${e.message ?? 'validation error'}`;
  });

  return { ok: false, errors };
}
