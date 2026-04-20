/**
 * TSK-05-01: defineComponent 계약 + Zod 검증 단위 테스트
 *
 * QA 체크리스트:
 * - (정상 — 계약) 필수 필드 모두 있으면 예외 없이 반환
 * - (엣지 — Zod dev) type 누락 시 dev 빌드에서 Error throw + 메시지에 "type" 포함
 * - (엣지 — Zod dev) render 누락 시 dev 빌드에서 Error throw + 메시지에 "render" 포함
 * - (엣지 — Zod dev) propsSchema shape 오류 시 dev 빌드에서 Error throw
 * - 선택 필드(layout, i18nKeys, icon) 포함 시 정상 동작
 */
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { h } from 'preact';

// ──────────────────────────────────────────────────────
// mock: @form-js-designer/designer-core의 defineComponent
// ──────────────────────────────────────────────────────
const { mockCoreDefineComponent } = vi.hoisted(() => {
  const mockCoreDefineComponent = vi.fn((def: Record<string, unknown>) => ({
    ...def,
    component: { config: { type: def['type'] } },
  }));
  return { mockCoreDefineComponent };
});

vi.mock('@form-js-designer/designer-core', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    defineComponent: mockCoreDefineComponent,
  };
});

import { defineComponent } from '../../src/components/defineComponent';

// ──────────────────────────────────────────────────────
// 공통 픽스처
// ──────────────────────────────────────────────────────
const validPropsSchema = {
  properties: {
    label: {
      type: 'string' as const,
      label: 'Label',
      default: '',
    },
  },
};

const validDef = {
  type: 'card',
  name: 'Card',
  group: 'container' as const,
  propsSchema: validPropsSchema,
  create: () => ({ type: 'card', id: '' }),
  render: (_props: unknown) => h('div', null, 'card'),
};

// ──────────────────────────────────────────────────────
// NODE_ENV 제어 헬퍼
// ──────────────────────────────────────────────────────
let originalEnv: string | undefined;
beforeEach(() => {
  originalEnv = process.env['NODE_ENV'];
  process.env['NODE_ENV'] = 'development';
  mockCoreDefineComponent.mockClear();
});
afterEach(() => {
  process.env['NODE_ENV'] = originalEnv;
  vi.restoreAllMocks();
});

// ──────────────────────────────────────────────────────
// 1. 정상 케이스
// ──────────────────────────────────────────────────────
describe('defineComponent: 정상 케이스', () => {
  it('필수 필드 모두 있으면 예외 없이 반환되고 core가 호출된다', () => {
    expect(() => defineComponent(validDef)).not.toThrow();
    expect(mockCoreDefineComponent).toHaveBeenCalledTimes(1);
  });

  it('반환값에 component 속성이 존재한다', () => {
    const result = defineComponent(validDef);
    expect(result).toHaveProperty('component');
  });

  it('반환값 component.config.type이 정의된 type과 일치한다', () => {
    const result = defineComponent(validDef);
    expect((result.component as { config: { type: string } }).config.type).toBe('card');
  });

  it('선택 필드(layout, i18nKeys)가 포함되어도 예외 없이 동작한다', () => {
    const defWithOptional = {
      ...validDef,
      layout: { row: 1, columns: 2 },
      i18nKeys: ['label', 'placeholder'],
    };
    expect(() => defineComponent(defWithOptional)).not.toThrow();
    expect(mockCoreDefineComponent).toHaveBeenCalledTimes(1);
  });

  it('icon 선택 필드가 있어도 예외 없이 동작한다', () => {
    const defWithIcon = {
      ...validDef,
      icon: () => h('svg', null),
    };
    expect(() => defineComponent(defWithIcon)).not.toThrow();
  });
});

// ──────────────────────────────────────────────────────
// 2. 필수 필드 누락 — dev 빌드에서 throw
// ──────────────────────────────────────────────────────
describe('defineComponent: 필수 필드 누락 (dev 빌드 throw)', () => {
  it('type 누락 시 Error가 throw되고 메시지에 "type"이 포함된다', () => {
    const defWithoutType = {
      name: 'Card',
      group: 'container' as const,
      propsSchema: validPropsSchema,
      create: () => ({ type: 'card', id: '' }),
      render: (_props: unknown) => h('div', null),
    };
    expect(() => defineComponent(defWithoutType as unknown as Parameters<typeof defineComponent>[0])).toThrow(
      /type/i
    );
  });

  it('render 누락 시 Error가 throw되고 메시지에 "render"이 포함된다', () => {
    const defWithoutRender = {
      type: 'card',
      name: 'Card',
      group: 'container' as const,
      propsSchema: validPropsSchema,
      create: () => ({ type: 'card', id: '' }),
    };
    expect(() => defineComponent(defWithoutRender as unknown as Parameters<typeof defineComponent>[0])).toThrow(
      /render/i
    );
  });

  it('propsSchema 누락 시 Error가 throw된다', () => {
    const defWithoutPropsSchema = {
      type: 'card',
      name: 'Card',
      group: 'container' as const,
      create: () => ({ type: 'card', id: '' }),
      render: (_props: unknown) => h('div', null),
    };
    expect(() => defineComponent(defWithoutPropsSchema as unknown as Parameters<typeof defineComponent>[0])).toThrow();
  });

  it('propsSchema가 배열이면 Error가 throw된다', () => {
    const defWithArrayPropsSchema = {
      ...validDef,
      propsSchema: [] as unknown as typeof validPropsSchema,
    };
    expect(() => defineComponent(defWithArrayPropsSchema)).toThrow();
  });
});

// ──────────────────────────────────────────────────────
// 3. prod 빌드에서는 warn만하고 throw 안 함
// ──────────────────────────────────────────────────────
describe('defineComponent: prod 빌드 graceful degrade', () => {
  it('NODE_ENV=production 이면 type 누락 시 throw하지 않고 console.warn만 출력한다', () => {
    process.env['NODE_ENV'] = 'production';
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const defWithoutType = {
      name: 'Card',
      group: 'container' as const,
      propsSchema: validPropsSchema,
      create: () => ({ type: 'card', id: '' }),
      render: (_props: unknown) => h('div', null),
    };

    expect(() =>
      defineComponent(defWithoutType as unknown as Parameters<typeof defineComponent>[0])
    ).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();
  });
});
