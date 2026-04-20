/**
 * resolveDataStores 단위 테스트 — data-store Feature
 *
 * design.md QA 체크리스트 기반:
 * - 엣지: dataStores 빈 배열([]) → storeData {}
 * - 정상: source="static" 엔트리 → storeData[key] = data
 * - 엣지: dataStores 필드 없음 → storeData {}
 * - 엣지: unsupported source → errors에 추가, storeData에 미포함 (silent skip)
 * - 엣지: 중복 key → errors에 추가
 * - 복합: static + unknown source 혼합 → static만 storeData에 포함
 * - console.warn: unsupported source 시 경고
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveDataStores } from '../boot/resolveDataStores';

describe('resolveDataStores', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('(엣지) dataStores 필드 없는 schema → storeData {}, errors []', () => {
    const schema = { type: 'default', components: [] };
    const result = resolveDataStores(schema);
    expect(result.storeData).toEqual({});
    expect(result.errors).toEqual([]);
  });

  it('(엣지) dataStores 빈 배열 → storeData {}, errors []', () => {
    const schema = { type: 'default', components: [], dataStores: [] };
    const result = resolveDataStores(schema);
    expect(result.storeData).toEqual({});
    expect(result.errors).toEqual([]);
  });

  it('(정상) source="static" 단일 엔트리 → storeData[key] = data', () => {
    const data = [{ label: '대한민국', value: 'KR' }, { label: '일본', value: 'JP' }];
    const schema = {
      type: 'default',
      components: [],
      dataStores: [{ key: 'countryOptions', source: 'static', data }],
    };
    const result = resolveDataStores(schema);
    expect(result.storeData).toEqual({ countryOptions: data });
    expect(result.errors).toEqual([]);
  });

  it('(정상) static 엔트리 복수개 → 모두 storeData에 포함', () => {
    const schema = {
      type: 'default',
      components: [],
      dataStores: [
        { key: 'options1', source: 'static', data: [{ label: 'A', value: 'a' }] },
        { key: 'options2', source: 'static', data: [{ label: 'B', value: 'b' }] },
      ],
    };
    const result = resolveDataStores(schema);
    expect(result.storeData).toEqual({
      options1: [{ label: 'A', value: 'a' }],
      options2: [{ label: 'B', value: 'b' }],
    });
    expect(result.errors).toEqual([]);
  });

  it('(엣지) unsupported source → errors에 추가 + storeData에 미포함 + console.warn', () => {
    const schema = {
      type: 'default',
      components: [],
      dataStores: [{ key: 'urlOptions', source: 'url', data: [] }],
    };
    const result = resolveDataStores(schema);
    expect(result.storeData).toEqual({});
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('UNSUPPORTED_SOURCE');
    expect(result.errors[0].key).toBe('urlOptions');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('(복합) static + unsupported 혼합 → static만 storeData에 포함, unsupported는 errors에', () => {
    const staticData = [{ label: 'X', value: 'x' }];
    const schema = {
      type: 'default',
      components: [],
      dataStores: [
        { key: 'goodOptions', source: 'static', data: staticData },
        { key: 'badOptions', source: 'expression', data: [] },
      ],
    };
    const result = resolveDataStores(schema);
    expect(result.storeData).toEqual({ goodOptions: staticData });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('UNSUPPORTED_SOURCE');
    expect(result.errors[0].key).toBe('badOptions');
  });

  it('(엣지) dataStores가 배열이 아닌 값 → storeData {}, errors []', () => {
    const schema = { type: 'default', components: [], dataStores: 'invalid' };
    const result = resolveDataStores(schema as Record<string, unknown>);
    expect(result.storeData).toEqual({});
    expect(result.errors).toEqual([]);
  });

  it('(엣지) 중복 key(static) → 두 번째 엔트리가 storeData에 추가되고 errors에 DUPLICATE_KEY', () => {
    const data1 = [{ label: 'A', value: 'a' }];
    const data2 = [{ label: 'B', value: 'b' }];
    const schema = {
      type: 'default',
      components: [],
      dataStores: [
        { key: 'myOptions', source: 'static', data: data1 },
        { key: 'myOptions', source: 'static', data: data2 },
      ],
    };
    const result = resolveDataStores(schema);
    // resolveDataStores는 silent — 중복을 errors에 기록하되 마지막 값 유지
    expect(result.errors.some((e) => e.code === 'DUPLICATE_KEY')).toBe(true);
  });
});
