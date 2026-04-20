/**
 * 스키마 JSON 문자열로부터 고유 해시 ID를 생성한다.
 * SHA-256 앞 12자 16진수 — TSK-00-02와 알고리즘 일치 필수.
 *
 * 동일 스키마 → 동일 ID를 보장하여 LRU 캐시(TSK-01-03)가 올바르게 동작한다.
 */
import { createHash } from 'crypto';

export function schemaHash(raw: string): string {
  return createHash('sha256').update(raw).digest('hex').slice(0, 12);
}
