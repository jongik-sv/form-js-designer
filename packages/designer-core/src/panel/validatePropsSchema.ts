/**
 * validatePropsSchema — Ajv meta-schema 기반 PropsSchema 검증기
 *
 * PropsSchema 자체의 형상(스키마의 스키마)을 검증한다.
 * - propsSchema.meta.json (JSON Schema draft-07) 기준
 * - 반환: { ok: boolean, errors: string[] }
 * - dev-only 호출용 (defineComponent에서 !isProductionEnv() 조건 하에 호출)
 */
import Ajv, { type ValidateFunction } from 'ajv';
import metaSchema from './propsSchema.meta.json';
import type { WidgetValidationResult } from './types';

// Ajv는 `new Function(...)`으로 검증기를 JIT 컴파일한다. VS Code 웹뷰 CSP는
// `unsafe-eval`이 없어 Ajv 생성/compile 시점에 EvalError가 터진다. 모듈 import
// 시점에 즉시 실행되지 않도록 lazy-init으로 바꿨다. 호출자가 실제로
// validatePropsSchema를 부를 때만 인스턴스를 만들고 compile한다.
// (CSP-제한 환경에서는 validatePropsSchema 호출 자체를 피해야 한다 — 예:
// 프로덕션 번들에서 dev-only 검사 skip.)
let _validateFn: ValidateFunction | null = null;

function getValidator(): ValidateFunction {
  if (_validateFn === null) {
    const ajv = new Ajv({ allErrors: true, strict: false });
    _validateFn = ajv.compile(metaSchema);
  }
  return _validateFn;
}

/**
 * PropsSchema 선언 자체를 meta-schema로 검증한다.
 * 위젯의 validate(value) 와는 다르다 — 이쪽은 "스키마 구조" 검증.
 *
 * @param schema - 검증할 PropsSchema 객체 (or 임의의 unknown)
 * @returns { ok, errors }
 */
export function validatePropsSchema(schema: unknown): WidgetValidationResult {
  const validateFn = getValidator();
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
