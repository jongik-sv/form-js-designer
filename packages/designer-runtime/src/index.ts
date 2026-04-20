/**
 * designer-runtime public API — TSK-09-02
 */

// transport
export { createStaticSource, createApiLoader, verifyStaticManifest, ChannelError } from './transport/index';
export type {
  SchemaSource,
  SchemaLoader,
  LoadResult,
  LoadSource,
  LoaderOptions,
  FormSchema,
  StaticManifest,
  VerifyResult,
  StorageLike,
  ChannelErrorCode,
} from './transport/index';

// boot
export { bootWithSchema, saveLastGood, loadLastGood, MemoryStorage, dispatchSchemaLoaded, dispatchSchemaError, SchemaBootError } from './boot/index';
export type {
  BootOptions,
  BootResult,
  ComponentRegistry,
  SchemaLoadedDetail,
  SchemaErrorDetail,
} from './boot/index';

// watermark
export { initWatermarkMonitor } from './watermark/index';
export type { MonitorOptions, Dispose } from './watermark/index';

// layout height module — 컴포넌트 높이만 (row 높이는 제거됨)
export { LayoutHeightModule, LayoutHeightService, applyLayoutHeight, LAYOUT_HEIGHT_TARGET_TYPES } from './modules/index';
export type { ApplierField, LayoutHeightTargetType } from './modules/index';
