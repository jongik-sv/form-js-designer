/**
 * validateFormSchema 단위 테스트 — TSK-06-02
 * 12 케이스: 정상/누락 컴포넌트 type/잘못된 propsSchema/중첩 필드/빈 스키마/Ajv 오류 포맷팅
 */

import { describe, it, expect } from 'vitest';
import { validateFormSchema } from '../validateSchema';
import type { ComponentDefinition } from '../../types';

// ------- 테스트용 mock 레지스트리 -------
function makeMockRegistry(definitions: ComponentDefinition[]): {
  get: (type: string) => ComponentDefinition | undefined;
  getAll: () => ComponentDefinition[];
} {
  const map = new Map<string, ComponentDefinition>(definitions.map((d) => [d.type, d]));
  return {
    get: (type: string) => map.get(type),
    getAll: () => definitions,
  };
}

// 최소 유효 컴포넌트 정의
const textDef: ComponentDefinition = {
  type: 'text',
  name: '텍스트',
  group: 'input',
  propsSchema: {
    properties: {
      label: { type: 'string', label: '레이블' },
    },
  },
  create: () => ({ type: 'text' }),
  render: () => null as unknown as ReturnType<ComponentDefinition['render']>,
};

const cardDef: ComponentDefinition = {
  type: 'card',
  name: '카드',
  group: 'container',
  propsSchema: { properties: {} },
  create: () => ({ type: 'card' }),
  render: () => null as unknown as ReturnType<ComponentDefinition['render']>,
};

describe('validateFormSchema', () => {
  // Case 1: 빈 스키마는 ok=true
  it('1: 빈 components 배열이면 ok=true 반환', () => {
    const registry = makeMockRegistry([textDef]);
    const result = validateFormSchema({ type: 'default', components: [] }, registry);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // Case 2: 등록된 컴포넌트만 사용 시 ok=true
  it('2: 등록된 컴포넌트 type만 사용 시 ok=true', () => {
    const registry = makeMockRegistry([textDef, cardDef]);
    const schema = {
      type: 'default',
      components: [
        { id: 'f1', type: 'text', label: '이름' },
        { id: 'f2', type: 'card', components: [] },
      ],
    };
    const result = validateFormSchema(schema, registry);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // Case 3: 미등록 컴포넌트 type → UNKNOWN_COMPONENT_TYPE 에러
  it('3: 미등록 컴포넌트 type 포함 시 UNKNOWN_COMPONENT_TYPE 에러', () => {
    const registry = makeMockRegistry([textDef]);
    const schema = {
      type: 'default',
      components: [{ id: 'f1', type: 'unknown-widget' }],
    };
    const result = validateFormSchema(schema, registry);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.code === 'UNKNOWN_COMPONENT_TYPE')).toBe(true);
    expect(result.errors[0]?.path).toContain('f1');
  });

  // Case 4: schema가 null/undefined → 에러 반환
  it('4: schema가 null이면 INVALID_SCHEMA 에러', () => {
    const registry = makeMockRegistry([textDef]);
    const result = validateFormSchema(null as unknown as Record<string, unknown>, registry);
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe('INVALID_SCHEMA');
  });

  // Case 5: components 배열이 없는 schema → 에러
  it('5: components 배열이 없으면 MISSING_COMPONENTS 에러', () => {
    const registry = makeMockRegistry([textDef]);
    const result = validateFormSchema({ type: 'default' } as unknown as Record<string, unknown>, registry);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.code === 'MISSING_COMPONENTS')).toBe(true);
  });

  // Case 6: 중첩 컴포넌트(card 내 text) — 내부 미등록 type 감지
  it('6: 중첩 컴포넌트 내 미등록 type 감지', () => {
    const registry = makeMockRegistry([cardDef]);
    const schema = {
      type: 'default',
      components: [
        {
          id: 'c1',
          type: 'card',
          components: [{ id: 'f1', type: 'text' }],
        },
      ],
    };
    const result = validateFormSchema(schema, registry);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.code === 'UNKNOWN_COMPONENT_TYPE' && e.path.includes('f1'))).toBe(true);
  });

  // Case 7: 여러 에러가 모두 수집됨 (fail-fast 아님)
  it('7: 여러 미등록 type이 있으면 모두 수집', () => {
    const registry = makeMockRegistry([]);
    const schema = {
      type: 'default',
      components: [
        { id: 'f1', type: 'a' },
        { id: 'f2', type: 'b' },
      ],
    };
    const result = validateFormSchema(schema, registry);
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  // Case 8: propsSchema 검증 — 필드 props가 propsSchema를 위반하면 에러
  it('8: 필드의 props 타입이 propsSchema와 불일치하면 INVALID_FIELD_PROPS 에러', () => {
    const strictDef: ComponentDefinition = {
      ...textDef,
      propsSchema: {
        properties: {
          maxLength: { type: 'number', label: '최대 길이', min: 0 },
        },
      },
    };
    const registry = makeMockRegistry([strictDef]);
    // maxLength가 문자열로 전달 — 타입 불일치
    const schema = {
      type: 'default',
      components: [{ id: 'f1', type: 'text', maxLength: 'not-a-number' }],
    };
    const result = validateFormSchema(schema, registry);
    // 타입 불일치는 warning 또는 error로 처리
    const hasIssue = result.errors.some((e) => e.path.includes('f1')) ||
                     result.warnings.some((w) => w.path.includes('f1'));
    expect(hasIssue).toBe(true);
  });

  // Case 9: id가 없는 컴포넌트 — 경고 처리
  it('9: id가 없는 컴포넌트는 MISSING_ID 경고', () => {
    const registry = makeMockRegistry([textDef]);
    const schema = {
      type: 'default',
      components: [{ type: 'text' }],  // id 없음
    };
    const result = validateFormSchema(schema, registry);
    // id 없는 컴포넌트는 경고나 에러로 처리 (구현에 따라 다름)
    // 최소: ok 여부는 구현에 따르되 warnings 또는 errors 중 하나에 수집
    const hasNote = result.warnings.some((w) => w.code === 'MISSING_ID') ||
                    result.errors.some((e) => e.code === 'MISSING_ID');
    expect(hasNote).toBe(true);
  });

  // Case 10: propsSchema가 빈 컴포넌트(card) — ok=true
  it('10: propsSchema가 비어있는 컴포넌트도 ok=true', () => {
    const registry = makeMockRegistry([cardDef]);
    const schema = {
      type: 'default',
      components: [{ id: 'c1', type: 'card', components: [] }],
    };
    const result = validateFormSchema(schema, registry);
    expect(result.ok).toBe(true);
  });

  // Case 11: registry가 undefined → MISSING_REGISTRY 에러
  it('11: registry가 null이면 에러 반환', () => {
    const result = validateFormSchema(
      { type: 'default', components: [] },
      null,
    );
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe('MISSING_REGISTRY');
  });

  // Case 12: 에러 포맷 — path/code/message 필드가 모두 있음
  it('12: 에러 객체에 path/code/message 필드가 모두 포함됨', () => {
    const registry = makeMockRegistry([]);
    const schema = {
      type: 'default',
      components: [{ id: 'f1', type: 'unknown' }],
    };
    const result = validateFormSchema(schema, registry);
    expect(result.errors.length).toBeGreaterThan(0);
    const err = result.errors[0]!;
    expect(err).toHaveProperty('path');
    expect(err).toHaveProperty('code');
    expect(err).toHaveProperty('message');
    expect(typeof err.path).toBe('string');
    expect(typeof err.code).toBe('string');
    expect(typeof err.message).toBe('string');
  });
});
