export { defineComponent } from './defineComponent';
export type {
  ReadonlyDeep,
  FieldSchema,
  ContainerField,
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
} from './panel/types';
export { UnknownWidgetError, DuplicateWidgetError } from './panel/types';

// Host module — TSK-03-03 (PRD §4 AC #4, #4-1)
export { ViewerHost, EditorHost, useViewportWidth } from './host';
export type {
  ViewerHostProps,
  EditorHostProps,
  HostOnChangeEvent,
  HostViewportInfo,
  FormSchema,
  FormRenderContextSlots,
} from './host';

// i18n module — TSK-03-03 (PRD §4 AC #5)
export { LocaleProvider, useT, useLocale, createFallbackT } from './i18n/LocaleProvider';
export type { LocaleT, LocaleContextValue, LocaleKey } from './i18n/localeTypes';

// Validate module — TSK-06-02 (PRD §4 AC #3, #4)
export { validateFormSchema } from './validate/validateSchema';
export type { ValidationResult, ValidationError, ValidationWarning } from './validate/types';

// container module — custom container 필드용 children drop-zone 슬롯 + FormLayouter override + 중첩 자식 자동 등록
export { ChildrenSlot, DesignerFormLayouter, DesignerContainerModule, NestedFieldRegistrar } from './container/index';
