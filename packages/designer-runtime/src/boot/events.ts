/**
 * events.ts — designer:schema-* 이벤트 발화 유틸 — TSK-09-02
 *
 * SSR/Node.js 환경에서는 no-op (window undefined 가드).
 */

import type { ValidationResult } from '@form-js-designer/designer-core/validate';
import type { LoadSource } from '../transport/types';

// ---------------------------------------------------------------------------
// 이벤트 detail 타입
// ---------------------------------------------------------------------------
export interface SchemaLoadedDetail {
  source: LoadSource;
  etag?: string | null;
  schemaId?: string;
}

export interface SchemaErrorDetail {
  stage: 'validate' | 'network' | 'manifest';
  errors: ValidationResult['errors'] | Error[];
  usedFallback: boolean;
}

// ---------------------------------------------------------------------------
// dispatchSchemaLoaded
// ---------------------------------------------------------------------------
export function dispatchSchemaLoaded(detail: SchemaLoadedDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('designer:schema-loaded', { detail }));
}

// ---------------------------------------------------------------------------
// dispatchSchemaError
// ---------------------------------------------------------------------------
export function dispatchSchemaError(detail: SchemaErrorDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('designer:schema-error', { detail }));
}
