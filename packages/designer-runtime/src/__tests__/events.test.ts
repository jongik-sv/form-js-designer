/**
 * events.ts 단위 테스트 — TSK-09-02
 *
 * QA 체크리스트:
 * - dispatchSchemaError 이벤트 검증
 * - SSR(window undefined) no-op
 * - detail 스키마 구조
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { dispatchSchemaLoaded, dispatchSchemaError } from '../boot/events';
import type { SchemaLoadedDetail, SchemaErrorDetail } from '../boot/events';

describe('dispatchSchemaLoaded', () => {
  it('window.dispatchEvent를 호출하여 designer:schema-loaded 이벤트를 발화한다', () => {
    const eventSpy = vi.fn();
    window.addEventListener('designer:schema-loaded', eventSpy);

    const detail: SchemaLoadedDetail = { source: 'static', etag: 'v1', schemaId: 'test' };
    dispatchSchemaLoaded(detail);

    expect(eventSpy).toHaveBeenCalledOnce();
    const event = eventSpy.mock.calls[0]?.[0] as CustomEvent<SchemaLoadedDetail>;
    expect(event.type).toBe('designer:schema-loaded');
    expect(event.detail).toEqual(detail);

    window.removeEventListener('designer:schema-loaded', eventSpy);
  });
});

describe('dispatchSchemaError', () => {
  it('designer:schema-error 이벤트를 발화하고 detail 구조가 올바르다', () => {
    const eventSpy = vi.fn();
    window.addEventListener('designer:schema-error', eventSpy);

    const detail: SchemaErrorDetail = {
      stage: 'validate',
      errors: [{ path: '', code: 'INVALID_SCHEMA', message: 'bad schema' }],
      usedFallback: false,
    };
    dispatchSchemaError(detail);

    expect(eventSpy).toHaveBeenCalledOnce();
    const event = eventSpy.mock.calls[0]?.[0] as CustomEvent<SchemaErrorDetail>;
    expect(event.type).toBe('designer:schema-error');
    expect(event.detail.stage).toBe('validate');
    expect(event.detail.usedFallback).toBe(false);
    expect(event.detail.errors).toHaveLength(1);

    window.removeEventListener('designer:schema-error', eventSpy);
  });

  it('(엣지) SSR 환경(window undefined) 에서 no-op으로 처리된다', () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error — window 제거 시뮬레이션
    delete globalThis.window;

    expect(() => {
      dispatchSchemaError({
        stage: 'validate',
        errors: [],
        usedFallback: false,
      });
    }).not.toThrow();

    // 복원
    globalThis.window = originalWindow;
  });
});
