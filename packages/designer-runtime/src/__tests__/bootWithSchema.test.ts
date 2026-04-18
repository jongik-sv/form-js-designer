/**
 * bootWithSchema 단위 테스트 — TSK-09-02
 *
 * QA 체크리스트 (10 케이스):
 * - 정상 validate 통과
 * - validate 실패 + lastGood 존재 → fallback
 * - validate 실패 + lastGood 없음 → SchemaBootError + 이벤트 발화
 * - onError 콜백 호출 1회
 * - dispatchEvent detail 포맷
 * - registry 누락
 * - 빈 schema (components 없음 → MISSING_COMPONENTS)
 * - storage 주입
 * - SSR 환경 이벤트 no-op
 * - dispatchSchemaLoaded 성공 이벤트 발화
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { bootWithSchema } from '../boot/bootWithSchema';
import { MemoryStorage } from '../boot/lastGoodSchemaStore';
import { SchemaBootError } from '../boot/bootTypes';
import type { FormSchema } from '../transport/types';
import type { ComponentRegistry } from '../boot/bootTypes';

// 유효한 schema + registry mock
const validSchema: FormSchema = {
  type: 'default',
  id: 'boot-test',
  components: [{ id: 'f1', type: 'textfield', label: 'Name' }],
};

const invalidSchema: FormSchema = {
  type: 'default',
  id: 'bad-schema',
  // components 없음 → MISSING_COMPONENTS 에러
} as unknown as FormSchema;

// Registry mock: textfield 등록
const mockRegistry: ComponentRegistry = {
  get: (type: string) => {
    if (type === 'textfield') return { propsSchema: undefined };
    return undefined;
  },
};

// components 미포함 schema → validate 실패
const schemaNoComponents: FormSchema = {
  type: 'default',
  id: 'no-comp',
} as unknown as FormSchema;

describe('bootWithSchema', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('(정상) 유효한 schema + registry → usedFallback:false + designer:schema-loaded 이벤트 발화', async () => {
    const eventSpy = vi.fn();
    window.addEventListener('designer:schema-loaded', eventSpy);

    const result = await bootWithSchema({
      schema: validSchema,
      registry: mockRegistry,
      storage,
    });

    expect(result.usedFallback).toBe(false);
    expect(result.schema).toBe(validSchema);
    expect(result.validation.ok).toBe(true);
    expect(eventSpy).toHaveBeenCalledOnce();

    window.removeEventListener('designer:schema-loaded', eventSpy);
  });

  it('(fallback) validate 실패 + lastGood 존재 → lastGood schema 반환 + usedFallback:true + onError 1회 호출', async () => {
    // lastGood 미리 저장
    const lastGoodKey = 'designer.lastGood.test';
    const lastGoodSchema: FormSchema = { type: 'default', components: [], id: 'last-good' };
    storage.setItem(lastGoodKey, JSON.stringify({ schema: lastGoodSchema, savedAt: Date.now() }));

    const onError = vi.fn();
    const errorEventSpy = vi.fn();
    window.addEventListener('designer:schema-error', errorEventSpy);

    const result = await bootWithSchema({
      schema: schemaNoComponents,
      registry: mockRegistry,
      storage,
      onError,
      lastGoodKey,
    });

    expect(result.usedFallback).toBe(true);
    expect(result.schema).toEqual(lastGoodSchema);
    expect(result.validation.ok).toBe(false);
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(SchemaBootError);
    expect(errorEventSpy).toHaveBeenCalledOnce();
    const event = errorEventSpy.mock.calls[0]?.[0] as CustomEvent;
    expect(event.detail.usedFallback).toBe(true);

    window.removeEventListener('designer:schema-error', errorEventSpy);
  });

  it('(에러) validate 실패 + lastGood 없음 → SchemaBootError throw + designer:schema-error 이벤트 발화(usedFallback:false)', async () => {
    const onError = vi.fn();
    const errorEventSpy = vi.fn();
    window.addEventListener('designer:schema-error', errorEventSpy);

    await expect(
      bootWithSchema({
        schema: schemaNoComponents,
        registry: mockRegistry,
        storage,
        onError,
      }),
    ).rejects.toBeInstanceOf(SchemaBootError);

    expect(onError).toHaveBeenCalledOnce();
    expect(errorEventSpy).toHaveBeenCalledOnce();
    const event = errorEventSpy.mock.calls[0]?.[0] as CustomEvent;
    expect(event.detail.usedFallback).toBe(false);
    expect(event.detail.stage).toBe('validate');

    window.removeEventListener('designer:schema-error', errorEventSpy);
  });

  it('(이벤트) designer:schema-error detail 구조가 { stage, errors, usedFallback } 형태를 만족한다', async () => {
    const errorEventSpy = vi.fn();
    window.addEventListener('designer:schema-error', errorEventSpy);

    await expect(
      bootWithSchema({
        schema: schemaNoComponents,
        registry: mockRegistry,
        storage,
      }),
    ).rejects.toThrow();

    const event = errorEventSpy.mock.calls[0]?.[0] as CustomEvent;
    expect(event.detail).toHaveProperty('stage');
    expect(event.detail).toHaveProperty('errors');
    expect(event.detail).toHaveProperty('usedFallback');

    window.removeEventListener('designer:schema-error', errorEventSpy);
  });

  it('(엣지) registry 누락 시 SchemaBootError throw된다', async () => {
    await expect(
      bootWithSchema({
        schema: validSchema,
        registry: null as unknown as ComponentRegistry,
        storage,
      }),
    ).rejects.toBeInstanceOf(SchemaBootError);
  });

  it('(엣지) components 없는 schema 시 validate 실패 + SchemaBootError', async () => {
    await expect(
      bootWithSchema({
        schema: { type: 'default', id: 'x' } as unknown as FormSchema,
        registry: mockRegistry,
        storage,
      }),
    ).rejects.toBeInstanceOf(SchemaBootError);
  });

  it('(통합) storage 주입으로 lastGood가 올바르게 저장/로드된다', async () => {
    // 1회차: 성공 → storage에 lastGood 저장
    await bootWithSchema({
      schema: validSchema,
      registry: mockRegistry,
      storage,
    });

    const stored = storage.getItem('designer.lastGood');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.schema).toEqual(validSchema);
  });

  it('(통합) validate 성공 후 다음 실패 호출 시 저장된 lastGood로 fallback된다', async () => {
    // 1회차: 성공
    await bootWithSchema({
      schema: validSchema,
      registry: mockRegistry,
      storage,
    });

    // 2회차: 실패 → 1회차 lastGood로 fallback
    const result = await bootWithSchema({
      schema: schemaNoComponents,
      registry: mockRegistry,
      storage,
    });

    expect(result.usedFallback).toBe(true);
    expect(result.schema).toEqual(validSchema);
  });

  it('(엣지) SSR 환경(window undefined)에서 이벤트 발화가 no-op으로 처리된다', async () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error
    delete globalThis.window;

    // SchemaBootError가 throw되지만 이벤트 발화에서 throw가 없어야 한다
    await expect(
      bootWithSchema({
        schema: schemaNoComponents,
        registry: mockRegistry,
        storage,
      }),
    ).rejects.toBeInstanceOf(SchemaBootError);

    // 복원
    globalThis.window = originalWindow;
  });
});
