/**
 * outlineUtils — outline-dnd-copy-paste feature 순수 함수 모음
 */

import type { DropPosition } from './outlineTypes';

export interface FieldSchema {
  id?: string;
  type?: string;
  label?: string;
  key?: string;
  components?: FieldSchema[];
  [key: string]: unknown;
}

/**
 * UUID v4 기반 ID 생성.
 * format: `${prefix}-${crypto.randomUUID().slice(0, 8)}`
 */
export function generateId(prefix: string): string {
  // crypto.randomUUID() is available in secure contexts (localhost / HTTPS)
  const uuid = crypto.randomUUID();
  return `${prefix}-${uuid.slice(0, 8)}`;
}

/** form-js 내부 참조 키 목록 — clone 시 제외 */
const INTERNAL_KEYS = new Set(['_parent', '_path']);

/**
 * FieldSchema 트리를 순회하며 `key` 속성을 수집한다.
 * form-js data field의 `key`는 바인딩 경로(유일해야 함)로, paste 시 충돌 검사용.
 */
export function collectKeys(field: FieldSchema, set: Set<string> = new Set()): Set<string> {
  if (typeof field.key === 'string') set.add(field.key);
  if (Array.isArray(field.components)) {
    for (const child of field.components) collectKeys(child, set);
  }
  return set;
}

/**
 * `baseKey`와 충돌하지 않는 key를 생성한다.
 * 패턴: `baseKey`가 비어있으면 그대로, 충돌 시 `baseKey_copy`, `baseKey_copy_2`, ...
 * 반환값은 caller가 existingKeys에 추가할 책임(재귀 호출 간 상호 충돌 방지).
 */
export function generateUniqueKey(baseKey: string, existingKeys: Set<string>): string {
  if (!existingKeys.has(baseKey)) return baseKey;
  let candidate = `${baseKey}_copy`;
  let i = 1;
  while (existingKeys.has(candidate)) {
    i += 1;
    candidate = `${baseKey}_copy_${i}`;
  }
  return candidate;
}

/**
 * FieldSchema를 deep clone하고 모든 id 필드를 재귀적으로 새로 할당한다.
 * type·label 등 나머지 속성은 원본 그대로 복사한다.
 * form-js 내부 참조(_parent, _path)는 제외하여 modeling.addFormField에서 에러 방지.
 *
 * `existingKeys`가 주어지면 `key` 속성도 충돌 회피 방식으로 재할당한다.
 * (paste 시점: form-js 바인딩 경로 'already claimed' 에러 방지)
 * 재귀 중 새로 생성된 key도 `existingKeys`에 추가하여 자식 간 상호 충돌도 방지한다.
 *
 * 재귀 조건: `components` 배열에 담긴 자식 FieldSchema만 재귀 클론한다.
 * 그 외 중첩 객체(options, validate 등)는 FieldSchema가 아니므로
 * 재귀 대상에서 제외하고 원본을 그대로 복사한다.
 */
export function deepCloneWithNewIds(
  field: FieldSchema,
  existingKeys?: Set<string>,
): FieldSchema {
  // 내부 키(_parent, _path)를 제외하고 shallow copy
  const cloned: FieldSchema = Object.fromEntries(
    Object.entries(field).filter(([k]) => !INTERNAL_KEYS.has(k)),
  ) as FieldSchema;

  // 새 id 할당 (type이 없으면 'field' prefix)
  const prefix = field.type ?? 'field';
  cloned.id = generateId(prefix);

  // key 재할당 (existingKeys 제공 + 원본에 key가 있을 때만)
  if (existingKeys && typeof field.key === 'string') {
    const uniqueKey = generateUniqueKey(field.key, existingKeys);
    cloned.key = uniqueKey;
    existingKeys.add(uniqueKey);
  }

  // components 배열: FieldSchema 자식만 재귀 클론 (다른 배열 필드는 해당 없음)
  if (Array.isArray(field.components)) {
    cloned.components = field.components.map((c) => deepCloneWithNewIds(c, existingKeys));
  }

  return cloned;
}

/**
 * 컨테이너 드롭 위치 계산에 사용하는 경계 비율 상수.
 * - CONTAINER_UPPER_RATIO: 이 비율 미만이면 'before' (상위 25%)
 * - CONTAINER_LOWER_RATIO: 이 비율 이상이면 'after'  (하위 25%)
 * - 나머지 구간: 'inside'
 */
const CONTAINER_UPPER_RATIO = 0.25;
const CONTAINER_LOWER_RATIO = 0.75;

/**
 * DnD 드롭 위치 계산 순수 함수.
 *
 * 비컨테이너: 50% 기준 before / after
 * 컨테이너:   상위 25% = before, 하위 25% = after, 나머지 = inside
 */
export function getDropPosition(
  rect: DOMRect,
  clientY: number,
  isContainer: boolean,
): DropPosition {
  const relativeY = clientY - rect.top;
  const height = rect.height;

  if (!isContainer) {
    // 비컨테이너: 50% 기준
    return relativeY < height / 2 ? 'before' : 'after';
  }

  // 컨테이너: 상위 25% / 하위 25% / 나머지 inside
  if (relativeY < height * CONTAINER_UPPER_RATIO) return 'before';
  if (relativeY >= height * CONTAINER_LOWER_RATIO) return 'after';
  return 'inside';
}
