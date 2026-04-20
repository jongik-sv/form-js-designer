/**
 * bootWithSchema — 부팅 파이프라인 — TSK-09-02
 *
 * 1. validateFormSchema(schema, registry) 호출
 * 2. ok=true → saveLastGood + dispatchSchemaLoaded → BootResult 반환
 * 3. ok=false → loadLastGood
 *    - lastGood 존재 → onError + dispatchSchemaError(usedFallback:true) → fallback BootResult 반환
 *    - lastGood 없음 → SchemaBootError throw + dispatchSchemaError(usedFallback:false)
 */

import { validateFormSchema } from '@form-js-designer/designer-core/validate';
import { saveLastGood, loadLastGood } from './lastGoodSchemaStore';
import { dispatchSchemaLoaded, dispatchSchemaError } from './events';
import { SchemaBootError } from './bootTypes';
import { resolveDataStores } from './resolveDataStores';
import type { BootOptions, BootResult } from './bootTypes';

const DEFAULT_KEY = 'designer.lastGood';

/**
 * 스키마 부팅 파이프라인 실행
 */
export async function bootWithSchema(opts: BootOptions): Promise<BootResult> {
  const {
    schema,
    registry,
    storage,
    onError,
    lastGoodKey = DEFAULT_KEY,
  } = opts;

  const validation = validateFormSchema(
    schema as Record<string, unknown>,
    registry,
  );

  if (validation.ok) {
    // 성공 경로: lastGood 저장 + 이벤트 발화
    saveLastGood(lastGoodKey, schema, undefined, storage);
    dispatchSchemaLoaded({ source: 'static' });
    const { storeData } = resolveDataStores(schema as Record<string, unknown>);
    return { schema, usedFallback: false, validation, storeData };
  }

  // 실패 경로: lastGood fallback 시도
  const lastGood = loadLastGood(lastGoodKey, storage);

  if (lastGood) {
    const err = new SchemaBootError(validation.errors);
    if (onError) onError(err);
    dispatchSchemaError({
      stage: 'validate',
      errors: validation.errors,
      usedFallback: true,
    });
    const { storeData } = resolveDataStores(lastGood.schema as Record<string, unknown>);
    return { schema: lastGood.schema, usedFallback: true, validation, storeData };
  }


  // lastGood 없음 → 완전 실패
  const err = new SchemaBootError(validation.errors);
  if (onError) onError(err);
  dispatchSchemaError({
    stage: 'validate',
    errors: validation.errors,
    usedFallback: false,
  });
  throw err;
}
