/**
 * StaticSchemaSource — 정적 번들 채널 구현 — TSK-09-02
 *
 * 이미 import된 JSON schema를 동기적으로 반환하는 SchemaSource 팩토리.
 * manifest가 있으면 SHA-256 해시 검증(verifyStaticManifest)을 수행한다.
 */

import type { SchemaSource, FormSchema, StaticManifest, LoadResult } from './types';
import { ChannelError } from './types';
import { verifyStaticManifest } from './verifyStaticManifest';

/**
 * 정적 채널 SchemaSource 팩토리
 *
 * @param schema - 이미 import된 JSON 스키마
 * @param manifest - (선택) publish CLI manifest. 있으면 해시 검증 수행
 * @returns SchemaSource
 */
export function createStaticSource(
  schema: FormSchema,
  manifest?: StaticManifest,
): SchemaSource {
  return {
    async load(): Promise<LoadResult> {
      if (manifest !== undefined) {
        const result = await verifyStaticManifest(schema, manifest);
        if (!result.ok) {
          throw new ChannelError(
            'manifest_mismatch',
            result.reason ?? 'Manifest hash mismatch',
          );
        }
        return {
          schema,
          etag: manifest.schemaHash,
          source: 'static',
        };
      }

      return {
        schema,
        etag: undefined,
        source: 'static',
      };
    },
  };
}
