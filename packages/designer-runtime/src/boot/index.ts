/**
 * boot 모듈 barrel export — TSK-09-02
 */

export { bootWithSchema } from './bootWithSchema';
export { saveLastGood, loadLastGood, MemoryStorage } from './lastGoodSchemaStore';
export { dispatchSchemaLoaded, dispatchSchemaError } from './events';
export { SchemaBootError } from './bootTypes';

export type {
  BootOptions,
  BootResult,
  ComponentRegistry,
} from './bootTypes';

export type {
  SchemaLoadedDetail,
  SchemaErrorDetail,
} from './events';
