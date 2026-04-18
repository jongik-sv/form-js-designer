/**
 * ApiSchemaLoader — API 채널 어댑터 — TSK-09-02
 *
 * ETag 캐시 + localStorage fallback + onError 콜백을 구현하는 SchemaLoader 팩토리.
 *
 * load() 로직:
 *   1. storage에서 (etag, lastGoodSchema) 읽기 → If-None-Match 헤더 준비
 *   2. fetchImpl(url, { headers, signal }) 호출 (AbortController timeout)
 *   3. 304 → storage에서 schema 반환 (source: 'cache')
 *   4. 200 → body json parse + ETag 저장 → schema 반환 (source: 'network')
 *   5. 4xx/5xx/네트워크 오류/timeout → onError + lastGood fallback (source: 'fallback')
 *      lastGood 없으면 ChannelError('no_fallback') throw
 */

import type { SchemaLoader, LoadResult, LoaderOptions, FormSchema, StorageLike } from './types';
import { ChannelError } from './types';

// storage key 접두어
const KEY_PREFIX = 'designer.api.schema.';

interface CachedEntry {
  schema: FormSchema;
  etag: string | null;
  schemaHash?: string;
}

function storageKey(schemaId: string): string {
  return `${KEY_PREFIX}${schemaId}`;
}

function getStorage(injected?: StorageLike): StorageLike | null {
  if (injected !== undefined) return injected;
  if (typeof localStorage !== 'undefined') return localStorage;
  return null;
}

function loadCached(schemaId: string, storage: StorageLike | null): CachedEntry | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(storageKey(schemaId));
    if (!raw) return null;
    return JSON.parse(raw) as CachedEntry;
  } catch {
    return null;
  }
}

function saveCached(schemaId: string, entry: CachedEntry, storage: StorageLike | null): void {
  if (!storage) return;
  try {
    storage.setItem(storageKey(schemaId), JSON.stringify(entry));
  } catch {
    // storage write failure는 무시 (quota exceeded 등)
  }
}

/**
 * API 채널 SchemaLoader 팩토리
 */
export function createApiLoader(opts: LoaderOptions): SchemaLoader {
  const {
    baseUrl,
    schemaId,
    env,
    fetchImpl = fetch,
    storage: injectedStorage,
    timeoutMs = 5000,
    onError,
  } = opts;

  return {
    async load(): Promise<LoadResult> {
      const storage = getStorage(injectedStorage);
      const cached = loadCached(schemaId, storage);

      // URL 구성
      const envParam = env ? `?env=${encodeURIComponent(env)}` : '';
      const url = `${baseUrl}/schemas/${schemaId}${envParam}`;

      // AbortController for timeout
      const controller = new AbortController();
      const timerId = setTimeout(() => controller.abort(), timeoutMs);

      const headers: Record<string, string> = {};
      if (cached?.etag) {
        headers['If-None-Match'] = cached.etag;
      }

      let response: Response;
      try {
        response = await fetchImpl(url, {
          headers,
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timerId);
        // AbortError → timeout
        const isTimeout = err instanceof Error && err.name === 'AbortError';
        const code = isTimeout ? 'timeout' : 'network_error';
        const channelErr = new ChannelError(code, `Fetch failed: ${String(err)}`, err);

        if (onError) onError(channelErr);

        if (cached) {
          return { schema: cached.schema, etag: cached.etag ?? null, source: 'fallback' };
        }
        throw new ChannelError('no_fallback', 'No cached schema available and network failed');
      }
      clearTimeout(timerId);

      // 304 Not Modified → cache hit
      if (response.status === 304) {
        if (cached) {
          return { schema: cached.schema, etag: cached.etag ?? null, source: 'cache' };
        }
        // 304인데 캐시 없음 → fallback path (shouldn't happen normally)
        const channelErr = new ChannelError('network_error', '304 received but no cached schema');
        if (onError) onError(channelErr);
        throw new ChannelError('no_fallback', 'Got 304 but no cached schema');
      }

      // 200 OK → parse and cache
      if (response.status === 200) {
        let schema: FormSchema;
        try {
          schema = (await response.json()) as FormSchema;
        } catch (err) {
          const channelErr = new ChannelError('parse_error', `JSON parse failed: ${String(err)}`, err);
          if (onError) onError(channelErr);
          if (cached) {
            return { schema: cached.schema, etag: cached.etag ?? null, source: 'fallback' };
          }
          throw new ChannelError('no_fallback', 'JSON parse failed and no cached schema');
        }

        const newEtag = response.headers.get('ETag');
        saveCached(schemaId, { schema, etag: newEtag }, storage);
        return { schema, etag: newEtag, source: 'network' };
      }

      // 4xx/5xx 에러
      const is5xx = response.status >= 500;
      const code = is5xx ? 'http_5xx' : 'http_4xx';
      const channelErr = new ChannelError(
        code,
        `HTTP ${response.status} from ${url}`,
      );
      if (onError) onError(channelErr);

      if (cached) {
        return { schema: cached.schema, etag: cached.etag ?? null, source: 'fallback' };
      }
      throw new ChannelError('no_fallback', `HTTP ${response.status} and no cached schema`);
    },
  };
}
