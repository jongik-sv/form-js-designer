/**
 * StaticSchemaSource 단위 테스트 — TSK-09-02
 *
 * QA 체크리스트:
 * - 정상 load (manifest 없음)
 * - manifest 해시 일치 시 성공
 * - manifest 해시 불일치 시 ChannelError('manifest_mismatch')
 * - manifest 미전달 시 해시 검증 스킵
 * - 반복 호출 시 동일 schema 참조 반환
 */

import { describe, it, expect } from 'vitest';
import { createStaticSource } from '../transport/StaticSchemaSource';
import { computeSha256 } from '../transport/verifyStaticManifest';
import { ChannelError } from '../transport/types';
import type { FormSchema, StaticManifest } from '../transport/types';

const sampleSchema: FormSchema = {
  type: 'default',
  id: 'static-test',
  components: [
    { id: 'f1', type: 'textfield', label: 'Field 1' },
    { id: 'btn', type: 'button', label: 'Submit' },
  ],
};

describe('createStaticSource', () => {
  it('(정상) manifest 없이 load() 호출 시 schema와 source=static을 반환한다', async () => {
    const source = createStaticSource(sampleSchema);
    const result = await source.load();
    expect(result.schema).toBe(sampleSchema);
    expect(result.source).toBe('static');
    expect(result.etag).toBeUndefined();
  });

  it('(정상) manifest의 schemaHash가 일치하면 load()가 성공하고 etag=schemaHash를 반환한다', async () => {
    const hash = await computeSha256(sampleSchema);
    const manifest: StaticManifest = { schemaHash: hash, version: 1 };
    const source = createStaticSource(sampleSchema, manifest);
    const result = await source.load();
    expect(result.schema).toBe(sampleSchema);
    expect(result.etag).toBe(hash);
    expect(result.source).toBe('static');
  });

  it('(에러) manifest 해시 불일치 시 ChannelError(manifest_mismatch)로 reject된다', async () => {
    const manifest: StaticManifest = { schemaHash: 'wronghash'.padEnd(64, '0') };
    const source = createStaticSource(sampleSchema, manifest);
    await expect(source.load()).rejects.toBeInstanceOf(ChannelError);
    await expect(source.load()).rejects.toMatchObject({ code: 'manifest_mismatch' });
  });

  it('(엣지) manifest 미전달 시 해시 검증 스킵하고 성공 반환한다', async () => {
    const source = createStaticSource(sampleSchema, undefined);
    const result = await source.load();
    expect(result.schema).toBe(sampleSchema);
    expect(result.source).toBe('static');
  });

  it('(엣지) 반복 load() 호출 시 동일한 schema 참조를 반환한다', async () => {
    const source = createStaticSource(sampleSchema);
    const r1 = await source.load();
    const r2 = await source.load();
    expect(r1.schema).toBe(r2.schema);
    expect(r1.schema).toBe(sampleSchema);
  });

  it('(엣지) null/빈 schema도 처리 가능하다 (타입 캐스팅 후 반환)', async () => {
    // null schema는 TypeScript 상에서 강제되지 않지만 런타임 robustness 확인
    const emptySchema: FormSchema = { type: 'default', components: [] };
    const source = createStaticSource(emptySchema);
    const result = await source.load();
    expect(result.schema).toBe(emptySchema);
  });
});
