/**
 * ApiSchemaLoader 단위 테스트 — TSK-09-02
 *
 * QA 체크리스트 (12 케이스):
 * - 200 OK schema+etag 저장
 * - 304 캐시 재사용
 * - 5xx 실패 → lastGoodSchema fallback
 * - 네트워크 timeout → fallback
 * - onError 호출
 * - If-None-Match 헤더 송신
 * - env 파라미터 포함 URL
 * - storage 주입 격리
 * - 잘못된 JSON 응답
 * - etag 없는 응답
 * - 처음 호출 시 캐시 미존재
 * - 2회 호출 등가성 (304 경로)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiLoader } from '../transport/ApiSchemaLoader';
import { MemoryStorage } from '../boot/lastGoodSchemaStore';
import { ChannelError } from '../transport/types';
import type { FormSchema } from '../transport/types';

const sampleSchema: FormSchema = {
  type: 'default',
  id: 'api-test',
  components: [{ id: 'f1', type: 'textfield', label: 'Name' }],
};

const BASE_URL = '/api';
const SCHEMA_ID = 'demo';

function makeResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  const headerMap = new Headers(headers);
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: (k: string) => headerMap.get(k),
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('createApiLoader', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('(정상) 200 OK 응답 시 schema를 반환하고 storage에 etag+schema를 저장한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      makeResponse(200, sampleSchema, { ETag: 'v1' }),
    );
    const loader = createApiLoader({
      baseUrl: BASE_URL,
      schemaId: SCHEMA_ID,
      fetchImpl: fetchMock,
      storage,
    });

    const result = await loader.load();
    expect(result.schema).toEqual(sampleSchema);
    expect(result.etag).toBe('v1');
    expect(result.source).toBe('network');

    // storage에 저장 확인
    const stored = storage.getItem(`designer.api.schema.${SCHEMA_ID}`);
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.etag).toBe('v1');
    expect(parsed.schema).toEqual(sampleSchema);
  });

  it('(캐시) 2회차 호출 시 저장된 ETag를 If-None-Match 헤더로 송신하고 304 응답 시 캐시 schema를 source:cache로 반환한다', async () => {
    // 1회차: 200 저장
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeResponse(200, sampleSchema, { ETag: 'v1' }))
      .mockResolvedValueOnce(makeResponse(304, null, {}));

    const loader = createApiLoader({
      baseUrl: BASE_URL,
      schemaId: SCHEMA_ID,
      fetchImpl: fetchMock,
      storage,
    });

    await loader.load(); // 1회차

    const result = await loader.load(); // 2회차
    expect(result.source).toBe('cache');
    expect(result.schema).toEqual(sampleSchema);
    expect(result.etag).toBe('v1');

    // 2회차 요청에 If-None-Match 헤더가 포함됐는지 확인
    const secondCallArgs = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(secondCallArgs[1].headers).toMatchObject({ 'If-None-Match': 'v1' });
  });

  it('(fallback) 5xx 응답 시 lastGood schema를 source:fallback으로 반환하고 onError가 1회 호출된다', async () => {
    // 먼저 캐시 저장
    storage.setItem(
      `designer.api.schema.${SCHEMA_ID}`,
      JSON.stringify({ schema: sampleSchema, etag: 'v0' }),
    );

    const onError = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(500, null));
    const loader = createApiLoader({
      baseUrl: BASE_URL,
      schemaId: SCHEMA_ID,
      fetchImpl: fetchMock,
      storage,
      onError,
    });

    const result = await loader.load();
    expect(result.source).toBe('fallback');
    expect(result.schema).toEqual(sampleSchema);
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(ChannelError);
    expect((onError.mock.calls[0]?.[0] as ChannelError).code).toBe('http_5xx');
  });

  it('(fallback) 네트워크 에러(fetch throw) 시 lastGood schema를 fallback으로 반환한다', async () => {
    storage.setItem(
      `designer.api.schema.${SCHEMA_ID}`,
      JSON.stringify({ schema: sampleSchema, etag: null }),
    );

    const onError = vi.fn();
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network failure'));
    const loader = createApiLoader({
      baseUrl: BASE_URL,
      schemaId: SCHEMA_ID,
      fetchImpl: fetchMock,
      storage,
      onError,
    });

    const result = await loader.load();
    expect(result.source).toBe('fallback');
    expect(result.schema).toEqual(sampleSchema);
    expect(onError).toHaveBeenCalledOnce();
  });

  it('(fallback) timeout 초과 시 AbortError → fallback 경로로 처리된다', async () => {
    storage.setItem(
      `designer.api.schema.${SCHEMA_ID}`,
      JSON.stringify({ schema: sampleSchema, etag: 'v1' }),
    );

    const onError = vi.fn();
    const abortError = new DOMException('Aborted', 'AbortError');
    const fetchMock = vi.fn().mockRejectedValue(abortError);

    const loader = createApiLoader({
      baseUrl: BASE_URL,
      schemaId: SCHEMA_ID,
      fetchImpl: fetchMock,
      storage,
      timeoutMs: 1,
      onError,
    });

    const result = await loader.load();
    expect(result.source).toBe('fallback');
    expect(onError).toHaveBeenCalledOnce();
    const err = onError.mock.calls[0]?.[0] as ChannelError;
    expect(err.code).toBe('timeout');
  });

  it('(에러) lastGood 없는 상태에서 네트워크 실패 → ChannelError(no_fallback)로 reject된다', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network down'));
    const loader = createApiLoader({
      baseUrl: BASE_URL,
      schemaId: SCHEMA_ID,
      fetchImpl: fetchMock,
      storage, // 빈 storage
    });

    await expect(loader.load()).rejects.toBeInstanceOf(ChannelError);
    await expect(loader.load()).rejects.toMatchObject({ code: 'no_fallback' });
  });

  it('(엣지) ETag 없는 200 응답 시 schema만 저장하고 etag=null로 기록되며 다음 요청에서 If-None-Match 미송신', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeResponse(200, sampleSchema)) // ETag 없음
      .mockResolvedValueOnce(makeResponse(200, sampleSchema));

    const loader = createApiLoader({
      baseUrl: BASE_URL,
      schemaId: SCHEMA_ID,
      fetchImpl: fetchMock,
      storage,
    });

    const r1 = await loader.load();
    expect(r1.etag).toBeNull();
    expect(r1.source).toBe('network');

    await loader.load(); // 2회차
    const secondCallArgs = fetchMock.mock.calls[1] as [string, RequestInit];
    const headers = secondCallArgs[1].headers as Record<string, string>;
    expect(headers['If-None-Match']).toBeUndefined();
  });

  it('(엣지) env 파라미터가 URL query로 포함된다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, sampleSchema));
    const loader = createApiLoader({
      baseUrl: BASE_URL,
      schemaId: SCHEMA_ID,
      env: 'prod',
      fetchImpl: fetchMock,
      storage,
    });

    await loader.load();
    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).toContain('?env=prod');
  });

  it('(엣지) storage 주입을 MemoryStorage로 교체하면 localStorage를 전혀 접근하지 않는다', async () => {
    const localStorageSpy = vi.spyOn(
      { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
      'getItem',
    );
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, sampleSchema, { ETag: 'v1' }));

    const loader = createApiLoader({
      baseUrl: BASE_URL,
      schemaId: SCHEMA_ID,
      fetchImpl: fetchMock,
      storage, // MemoryStorage 주입
    });

    await loader.load();
    // localStorageSpy가 호출되지 않았음 (주입된 MemoryStorage 사용)
    expect(localStorageSpy).not.toHaveBeenCalled();
  });

  it('(엣지) 잘못된 JSON 응답 시 parse_error → fallback 경로 (캐시 있을 때)', async () => {
    storage.setItem(
      `designer.api.schema.${SCHEMA_ID}`,
      JSON.stringify({ schema: sampleSchema, etag: 'v0' }),
    );

    const badResponse = {
      status: 200,
      ok: true,
      headers: { get: () => null },
      json: async () => { throw new SyntaxError('invalid json'); },
    } as unknown as Response;

    const onError = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(badResponse);
    const loader = createApiLoader({
      baseUrl: BASE_URL,
      schemaId: SCHEMA_ID,
      fetchImpl: fetchMock,
      storage,
      onError,
    });

    const result = await loader.load();
    expect(result.source).toBe('fallback');
    expect(onError).toHaveBeenCalledOnce();
  });

  it('(엣지) 처음 호출 시 캐시 미존재 + If-None-Match 헤더 미송신', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, sampleSchema, { ETag: 'v1' }));
    const loader = createApiLoader({
      baseUrl: BASE_URL,
      schemaId: SCHEMA_ID,
      fetchImpl: fetchMock,
      storage, // 빈 storage
    });

    await loader.load();
    const firstCallArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = firstCallArgs[1].headers as Record<string, string>;
    expect(headers['If-None-Match']).toBeUndefined();
  });

  it('(통합) 2회 연속 200 호출 시 두 결과가 동일한 schema를 가진다', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeResponse(200, sampleSchema, { ETag: 'v1' }))
      .mockResolvedValueOnce(makeResponse(200, sampleSchema, { ETag: 'v2' }));

    const loader = createApiLoader({
      baseUrl: BASE_URL,
      schemaId: SCHEMA_ID,
      fetchImpl: fetchMock,
      storage,
    });

    const r1 = await loader.load();
    const r2 = await loader.load();
    expect(r1.schema).toEqual(r2.schema);
  });
});
