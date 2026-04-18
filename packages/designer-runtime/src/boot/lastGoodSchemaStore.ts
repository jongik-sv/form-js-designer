/**
 * lastGoodSchemaStore — localStorage wrapper — TSK-09-02
 *
 * 마지막 정상 스키마를 storage에 저장하고 불러오는 유틸리티.
 * storage 주입 가능 (테스트용 MemoryStorage).
 * SSR/비브라우저 환경에서는 MemoryStorage fallback.
 */

import type { FormSchema, StorageLike } from '../transport/types';

const DEFAULT_KEY = 'designer.lastGood';

interface LastGoodEntry {
  schema: FormSchema;
  etag?: string | null;
  savedAt: number;
}

/**
 * MemoryStorage — SSR/테스트 fallback
 */
export class MemoryStorage implements StorageLike {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

/**
 * 런타임 storage 선택 (주입 > localStorage > MemoryStorage fallback)
 */
function resolveStorage(injected?: StorageLike): StorageLike {
  if (injected !== undefined) return injected;
  if (typeof localStorage !== 'undefined') return localStorage;
  return new MemoryStorage();
}

/**
 * 마지막 정상 스키마 저장
 */
export function saveLastGood(
  key: string = DEFAULT_KEY,
  schema: FormSchema,
  etag?: string | null,
  storage?: StorageLike,
): void {
  const s = resolveStorage(storage);
  const entry: LastGoodEntry = { schema, etag, savedAt: Date.now() };
  try {
    s.setItem(key, JSON.stringify(entry));
  } catch {
    // storage write failure 무시 (quota exceeded 등)
  }
}

/**
 * 마지막 정상 스키마 불러오기
 */
export function loadLastGood(
  key: string = DEFAULT_KEY,
  storage?: StorageLike,
): { schema: FormSchema; etag?: string | null } | null {
  const s = resolveStorage(storage);
  try {
    const raw = s.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as LastGoodEntry;
    return { schema: entry.schema, etag: entry.etag };
  } catch {
    return null;
  }
}
