/**
 * Transport layer 공통 타입 계약 — TSK-09-02
 */

// ---------------------------------------------------------------------------
// StorageLike — localStorage 호환 인터페이스 (테스트 주입용)
// ---------------------------------------------------------------------------
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// ---------------------------------------------------------------------------
// LoadResult — 모든 채널의 공통 반환 타입
// ---------------------------------------------------------------------------
export type LoadSource = 'network' | 'cache' | 'fallback' | 'static';

export interface LoadResult {
  schema: FormSchema;
  etag: string | null | undefined;
  source: LoadSource;
}

// ---------------------------------------------------------------------------
// FormSchema — form-js viewer 스키마 최소 타입
// ---------------------------------------------------------------------------
export interface FormSchema {
  components: unknown[];
  type: string;
  id?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// StaticManifest — publish CLI 출력 포맷
// ---------------------------------------------------------------------------
export interface StaticManifest {
  schemaHash: string;
  version?: number;
}

// ---------------------------------------------------------------------------
// VerifyResult
// ---------------------------------------------------------------------------
export interface VerifyResult {
  ok: boolean;
  reason?: string;
}

// ---------------------------------------------------------------------------
// ChannelError — transport 계층 에러
// ---------------------------------------------------------------------------
export type ChannelErrorCode =
  | 'manifest_mismatch'
  | 'no_fallback'
  | 'http_5xx'
  | 'http_4xx'
  | 'network_error'
  | 'timeout'
  | 'parse_error';

export class ChannelError extends Error {
  readonly code: ChannelErrorCode;
  override readonly cause?: unknown;

  constructor(code: ChannelErrorCode, message?: string, cause?: unknown) {
    super(message ?? code);
    this.name = 'ChannelError';
    this.code = code;
    this.cause = cause;
  }
}

// ---------------------------------------------------------------------------
// SchemaSource — 정적 채널 계약
// ---------------------------------------------------------------------------
export interface SchemaSource {
  load(): Promise<LoadResult>;
}

// ---------------------------------------------------------------------------
// LoaderOptions — ApiSchemaLoader 옵션
// ---------------------------------------------------------------------------
export interface LoaderOptions {
  baseUrl: string;
  schemaId: string;
  env?: 'dev' | 'staging' | 'prod';
  fetchImpl?: typeof fetch;
  storage?: StorageLike;
  timeoutMs?: number;
  onError?: (err: ChannelError) => void;
}

// ---------------------------------------------------------------------------
// SchemaLoader — API 채널 계약
// ---------------------------------------------------------------------------
export interface SchemaLoader {
  load(): Promise<LoadResult>;
}
