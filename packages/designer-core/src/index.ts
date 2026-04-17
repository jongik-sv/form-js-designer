export { defineComponent } from './defineComponent';
export type {
  ReadonlyDeep,
  FieldSchema,
  PureRenderProps,
  PropsSchema,
  RenderFn,
  ComponentDefinition,
  FormJsFieldComponent,
} from './types';

// OverlayLayer — TSK-03-01 (ADR-0001 §3 D3 WYSIWYG overlay primitives)
export { OverlayLayer } from './overlay/OverlayLayer';
export type { OverlayLayerProps } from './overlay/OverlayLayer';
export { assertSharedOrigin, SharedOriginViolation } from './overlay/assertSharedOrigin';
export type { SharedOriginMeasured } from './overlay/assertSharedOrigin';
