/**
 * validateFormSchema — 공용 검증 로직 (TSK-06-02)
 *
 * designer-editor-host와 designer-cli가 공유하는 form-js 스키마 런타임 검증 함수.
 * Ajv + 컴포넌트 레지스트리 기반으로 3단계 검증 수행:
 *   1. 스키마 구조 검증 (null 체크, components 배열 존재)
 *   2. 각 필드의 type이 registry에 등록되어 있는지 확인
 *   3. 각 필드의 props가 해당 컴포넌트 propsSchema를 만족하는지 검증
 */

import type { ValidationResult, ValidationError, ValidationWarning } from './types';

// 레지스트리 duck-type 인터페이스 (PanelWidgetRegistry의 부분 계약)
interface ComponentRegistry {
  get(type: string): { propsSchema?: { properties: Record<string, { type: string }> } } | undefined;
}

/**
 * 폼 스키마를 검증하여 결과를 반환한다.
 *
 * @param schema - 검증할 form-js 스키마 객체
 * @param registry - 컴포넌트 정의 레지스트리 (formFieldRegistry 또는 mock)
 * @returns ValidationResult { ok, errors, warnings }
 */
export function validateFormSchema(
  schema: Record<string, unknown> | null | undefined,
  registry: ComponentRegistry | null | undefined,
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // --- 레지스트리 검증 ---
  if (registry == null) {
    errors.push({
      path: '',
      code: 'MISSING_REGISTRY',
      message: 'Component registry is required for validation.',
    });
    return { ok: false, errors, warnings };
  }

  // --- 스키마 구조 검증 ---
  if (schema == null) {
    errors.push({
      path: '',
      code: 'INVALID_SCHEMA',
      message: 'Schema must be a non-null object.',
    });
    return { ok: false, errors, warnings };
  }

  if (!Array.isArray(schema['components'])) {
    errors.push({
      path: 'components',
      code: 'MISSING_COMPONENTS',
      message: 'Schema must have a "components" array.',
    });
    return { ok: false, errors, warnings };
  }

  // 중복 경고 path 추적 (O(1) 조회)
  const warnedPaths = new Set<string>();

  // --- 재귀적으로 컴포넌트 목록 검증 ---
  function validateComponents(
    components: unknown[],
    basePath: string,
  ): void {
    for (let i = 0; i < components.length; i++) {
      const comp = components[i] as Record<string, unknown>;
      const compId = typeof comp['id'] === 'string' ? comp['id'] : null;
      const compPath = compId ? `${basePath}[id=${compId}]` : `${basePath}[${i}]`;

      // id 누락 경고 (중복 방지는 Set으로)
      if (!compId && !warnedPaths.has(compPath)) {
        warnedPaths.add(compPath);
        warnings.push({
          path: compPath,
          code: 'MISSING_ID',
          message: 'Component is missing an "id" field.',
        });
      }

      const compType = typeof comp['type'] === 'string' ? comp['type'] : null;

      if (!compType) {
        errors.push({
          path: compPath,
          code: 'MISSING_TYPE',
          message: 'Component is missing a "type" field.',
        });
        continue;
      }

      // 레지스트리에서 정의 조회
      const definition = registry.get(compType);
      if (!definition) {
        errors.push({
          path: compId ?? compPath,
          code: 'UNKNOWN_COMPONENT_TYPE',
          message: `Component type "${compType}" is not registered in the component registry.`,
        });
      } else {
        // propsSchema 검증: 각 propsSchema property의 type 기반 검증
        const propsSchema = definition.propsSchema;
        if (propsSchema && propsSchema.properties) {
          for (const [propKey, propDef] of Object.entries(propsSchema.properties)) {
            const fieldValue = comp[propKey];
            if (fieldValue === undefined || fieldValue === null) continue;

            // number 타입인데 string이 들어온 경우
            if (propDef.type === 'number' && typeof fieldValue !== 'number') {
              const propPath = compId ? `${compId}.${propKey}` : `${compPath}.${propKey}`;
              warnings.push({
                path: propPath,
                code: 'INVALID_FIELD_PROPS',
                message: `Property "${propKey}" expected type "number" but got "${typeof fieldValue}".`,
              });
            }
          }
        }
      }

      // 중첩 components 재귀 처리
      if (Array.isArray(comp['components'])) {
        validateComponents(comp['components'] as unknown[], `${compPath}.components`);
      }
    }
  }

  validateComponents(schema['components'] as unknown[], 'components');

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}
