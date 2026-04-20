/**
 * TSK-05-01: defineComponent 래퍼 — Zod 검증 + designer-core 위임
 *
 * @form-js-designer/designer-core의 defineComponent를 얇게 감싸서:
 * 1. 필수 필드(type, name, group, propsSchema, create, render) Zod 런타임 검증
 * 2. 선택 메타(layout, i18nKeys, icon) 허용
 * 3. dev: Zod 실패 시 throw, prod: console.warn 후 core에 위임 (graceful degrade)
 *
 * PRD G5: designer-core 중복 구현 금지 — core 함수를 re-export하여 계약만 추가.
 */
import { z } from 'zod';
import { defineComponent as coreDefineComponent } from '@form-js-designer/designer-core';
import type { ComponentDefinition, FieldSchema } from '@form-js-designer/designer-core';

// ──────────────────────────────────────────────────────
// Zod 스키마 — 컴포넌트 정의 계약
// ──────────────────────────────────────────────────────

/** PropsSchema 최소 형상: { properties: Record<string, object> } */
const propsSchemaZod = z.object({
  properties: z.record(z.string(), z.record(z.string(), z.unknown())),
});

/** ComponentDefinition 계약 검증 스키마 */
const componentDefSchema = z.object({
  // 필수 필드
  type: z.string().min(1, 'type은 비어 있을 수 없습니다'),
  name: z.string().min(1, 'name은 비어 있을 수 없습니다'),
  group: z.enum(['container', 'data', 'input', 'presentation', 'action']),
  propsSchema: propsSchemaZod,
  create: z.function(),
  render: z.function(),
  // 선택 필드
  icon: z.function().optional(),
  keyed: z.boolean().optional(),
  pathed: z.boolean().optional(),
  escapeGridRender: z.boolean().optional(),
  layout: z
    .object({
      row: z.number().optional(),
      columns: z.number().optional(),
    })
    .optional(),
  i18nKeys: z.array(z.string()).optional(),
});

// ──────────────────────────────────────────────────────
// 공개 타입
// ──────────────────────────────────────────────────────

/** vscode-extension 확장 컴포넌트 정의 타입 (layout, i18nKeys 포함) */
export type ExtensionComponentDef<F extends FieldSchema = FieldSchema> = ComponentDefinition<F> & {
  layout?: { row?: number; columns?: number };
  i18nKeys?: string[];
};

// ──────────────────────────────────────────────────────
// 내부 헬퍼
// ──────────────────────────────────────────────────────

/** Zod 에러 배열을 사람이 읽기 쉬운 문자열로 포맷 */
function formatZodErrors(errors: z.ZodIssue[]): string {
  const details = errors.map((e) => `  - ${e.path.join('.')}: ${e.message}`).join('\n');
  return `[defineComponent] 컴포넌트 정의가 계약을 위반합니다:\n${details}`;
}

// ──────────────────────────────────────────────────────
// defineComponent 래퍼
// ──────────────────────────────────────────────────────

/**
 * vscode-extension용 defineComponent.
 *
 * Zod로 입력을 검증한 뒤 @form-js-designer/designer-core의 defineComponent에 위임.
 * - dev(NODE_ENV !== 'production'): 검증 실패 시 Error throw
 * - prod(NODE_ENV === 'production'): console.warn 후 core에 위임 (graceful degrade)
 */
export function defineComponent<F extends FieldSchema = FieldSchema>(
  def: ExtensionComponentDef<F>,
): ReturnType<typeof coreDefineComponent<F>> {
  const result = componentDefSchema.safeParse(def);

  if (!result.success) {
    const message = formatZodErrors(result.error.errors);
    if (process.env['NODE_ENV'] === 'production') {
      console.warn(message);
    } else {
      throw new Error(message);
    }
  }

  // designer-core에 위임 (propsSchema 검증 + assertPureRender 포함)
  return coreDefineComponent(def);
}

// re-export: 소비자가 직접 core 타입을 쓸 수 있도록
export type { ComponentDefinition, FieldSchema } from '@form-js-designer/designer-core';
