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

// Panel module — TSK-03-02 (PRD §4 AC #7)
export { propsSchemaToPanel } from './panel/propsSchemaToPanel';
export { PanelWidgetRegistry, createDefaultRegistry } from './panel/PanelWidgetRegistry';
export { validatePropsSchema } from './panel/validatePropsSchema';
export type {
  PanelEntry,
  PanelGroup,
  PanelWidget,
  PanelWidgetCtx,
  WidgetMeta,
  WidgetValidationResult,
  LocaleT,
  UnknownWidgetError,
  DuplicateWidgetError,
} from './panel/types';
