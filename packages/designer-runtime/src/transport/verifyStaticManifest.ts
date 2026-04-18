/**
 * verifyStaticManifest — SHA-256 해시로 정적 스키마 무결성 검증 — TSK-09-02
 *
 * SubtleCrypto(WebCrypto)를 사용하여 schema의 SHA-256을 계산하고
 * manifest.schemaHash와 비교한다.
 * 직렬화 안정성을 위해 key sort 재귀 적용.
 */

import type { FormSchema, StaticManifest, VerifyResult } from './types';

/**
 * 객체를 key 정렬하여 직렬화 (중첩 객체 포함)
 */
function sortedStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(sortedStringify).join(',') + ']';
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const pairs = keys.map((k) => JSON.stringify(k) + ':' + sortedStringify(obj[k]));
  return '{' + pairs.join(',') + '}';
}

/**
 * ArrayBuffer → hex string 변환
 */
function bufferToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * SubtleCrypto를 사용하여 schema의 SHA-256을 계산
 */
async function computeSha256(schema: FormSchema): Promise<string> {
  const str = sortedStringify(schema);
  const encoder = new TextEncoder();
  const data = encoder.encode(str);

  // Node.js 환경에서 globalThis.crypto가 없으면 node:crypto 사용
  let subtle: SubtleCrypto;
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    subtle = globalThis.crypto.subtle;
  } else {
    // Node.js fallback (테스트 환경)
    const nodeCrypto = await import('node:crypto');
    subtle = nodeCrypto.webcrypto.subtle as SubtleCrypto;
  }

  const hashBuffer = await subtle.digest('SHA-256', data);
  return bufferToHex(hashBuffer);
}

/**
 * schema와 manifest.schemaHash를 비교하여 무결성 검증
 *
 * @param schema - 검증할 form-js 스키마
 * @param manifest - publish CLI가 생성한 manifest (schemaHash 포함)
 * @returns VerifyResult { ok, reason? }
 */
export async function verifyStaticManifest(
  schema: FormSchema,
  manifest: StaticManifest,
): Promise<VerifyResult> {
  try {
    const computed = await computeSha256(schema);
    if (computed === manifest.schemaHash) {
      return { ok: true };
    }
    return {
      ok: false,
      reason: `Hash mismatch: computed=${computed}, expected=${manifest.schemaHash}`,
    };
  } catch (err) {
    return {
      ok: false,
      reason: `Hash computation failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// export for testing
export { computeSha256, sortedStringify };
