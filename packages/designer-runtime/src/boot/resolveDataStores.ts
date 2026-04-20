/**
 * resolveDataStores — 순수 함수
 *
 * schema.dataStores 배열을 순회하여 source="static" 엔트리의 data를
 * { [key]: data } 딕셔너리(storeData)로 반환한다.
 *
 * Phase 1: source="static"만 채택. 그 외 source는 silent skip + errors append.
 * 런타임 에러는 무시하고 (validator 담당), 미지원 source는 console.warn으로 경고.
 */

export interface DataStoreEntry {
  key: string;
  source: string;
  data?: unknown;
}

export interface DataStoreError {
  code: 'UNSUPPORTED_SOURCE' | 'DUPLICATE_KEY';
  key: string;
  message: string;
}

export interface ResolveDataStoresResult {
  storeData: Record<string, unknown>;
  errors: DataStoreError[];
}

/**
 * schema.dataStores를 해석하여 storeData 딕셔너리를 반환한다.
 *
 * @param schema - form 스키마 객체 (unknown top-level 필드 포함 가능)
 */
export function resolveDataStores(
  schema: Record<string, unknown>,
): ResolveDataStoresResult {
  const storeData: Record<string, unknown> = {};
  const errors: DataStoreError[] = [];

  const dataStores = schema['dataStores'];
  if (!Array.isArray(dataStores)) {
    return { storeData, errors };
  }

  const seenKeys = new Set<string>();

  for (const rawEntry of dataStores) {
    const entry = rawEntry as DataStoreEntry;
    const { key, source, data } = entry;

    if (seenKeys.has(key)) {
      errors.push({
        code: 'DUPLICATE_KEY',
        key,
        message: `Duplicate dataStore key: "${key}"`,
      });
      // 중복 key는 마지막 값으로 덮어쓰기 — seenKeys에 이미 등록됨
    } else {
      seenKeys.add(key);
    }

    if (source !== 'static') {
      console.warn(
        `[resolveDataStores] Unsupported source "${source}" for key "${key}". Only "static" is supported in Phase 1. Skipping.`,
      );
      errors.push({
        code: 'UNSUPPORTED_SOURCE',
        key,
        message: `Unsupported source "${source}" for key "${key}". Supported: ["static"]`,
      });
      continue;
    }

    storeData[key] = data;
  }

  return { storeData, errors };
}
