/**
 * boot 모듈 타입 계약 — TSK-09-02
 */

import type { FormSchema, StorageLike } from '../transport/types';
import type { ValidationResult } from '@form-js-designer/designer-core/validate';
export type { DataStoreEntry, DataStoreError } from './resolveDataStores';

// ---------------------------------------------------------------------------
// ComponentRegistry — validateFormSchema duck-type
// ---------------------------------------------------------------------------
export interface ComponentRegistry {
  get(type: string): { propsSchema?: { properties: Record<string, { type: string }> } } | undefined;
}

// ---------------------------------------------------------------------------
// BootResult
// ---------------------------------------------------------------------------
export interface BootResult {
  schema: FormSchema;
  usedFallback: boolean;
  validation: ValidationResult;
  /** dataStores 해석 결과 — { [key]: data }. dataStores 없으면 {}. */
  storeData: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// BootOptions
// ---------------------------------------------------------------------------
export interface BootOptions {
  schema: FormSchema;
  registry: ComponentRegistry;
  storage?: StorageLike;
  onError?: (err: SchemaBootError) => void;
  lastGoodKey?: string;
}

// ---------------------------------------------------------------------------
// SchemaBootError
// ---------------------------------------------------------------------------
export class SchemaBootError extends Error {
  readonly errors: ValidationResult['errors'];

  constructor(errors: ValidationResult['errors']) {
    super(`Schema boot failed: ${errors.map((e) => e.message).join(', ')}`);
    this.name = 'SchemaBootError';
    this.errors = errors;
  }
}
