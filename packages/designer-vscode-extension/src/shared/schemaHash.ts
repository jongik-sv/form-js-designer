/**
 * schemaHash — 키-정렬 안정 해시 (SHA-256 앞 12자)
 *
 * ## 해시 정책
 *
 * 목적: 동일 스키마 객체가 키 순서만 다르게 직렬화되어도 동일한 해시를 반환하여
 *       렌더 인스턴스를 재사용할 수 있도록 한다 (PRD F1).
 *
 * 입력 정규화 방식:
 *   1. `string` 입력이면 `JSON.parse`로 객체로 변환. 유효하지 않은 JSON이면 `SyntaxError` throw.
 *   2. 객체는 재귀적으로 키를 알파벳순 정렬하여 재직렬화한다.
 *      배열 요소의 순서는 의미가 있으므로 정렬하지 않는다.
 *      배열 내부 객체 요소도 재귀 정렬 대상이다.
 *   3. 정렬 후 `JSON.stringify`한 문자열을 SHA-256 해시한다.
 *
 * Truncation 근거:
 *   SHA-256 hex 256비트 중 앞 48비트(12 hex자)만 사용한다.
 *   폼 스키마 수는 수백~수천 개 수준이므로 48비트 해시 공간(281조)에서
 *   충돌 확률은 무시 가능하며, 12자는 URL·로그에서 가독성을 확보하는 최소 길이다.
 *
 * Node.js 내장 `crypto` 모듈만 사용. 외부 의존성 없음.
 */

import { createHash } from 'node:crypto';

/**
 * 객체를 재귀적으로 키 정렬하여 반환한다.
 * 배열은 요소 순서를 보존하되, 각 요소가 객체이면 재귀 정렬한다.
 */
function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as object).sort()) {
      sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

/**
 * 스키마 JSON의 안정 해시(SHA-256 앞 12자)를 계산한다.
 *
 * @param input - JSON 문자열 또는 객체. 문자열이면 `JSON.parse` 후 처리.
 * @returns 16진수 소문자 12자 해시 문자열.
 * @throws {SyntaxError} input이 유효하지 않은 JSON 문자열인 경우.
 */
export function schemaHash(input: string | object): string {
  const obj: unknown = typeof input === 'string' ? JSON.parse(input) : input;
  const normalized = JSON.stringify(sortKeysDeep(obj));
  return createHash('sha256').update(normalized).digest('hex').slice(0, 12);
}
