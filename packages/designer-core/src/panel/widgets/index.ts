/**
 * 위젯 8종 barrel re-export + BUILTIN_WIDGETS 맵
 */
import type { PanelWidget } from '../types';
import { StringWidget } from './StringWidget';
import { NumberWidget } from './NumberWidget';
import { BooleanWidget } from './BooleanWidget';
import { EnumWidget } from './EnumWidget';
import { ColorWidget } from './ColorWidget';
import { SpacingWidget } from './SpacingWidget';
import { ExpressionWidget } from './ExpressionWidget';
import { I18nWidget } from './I18nWidget';

export { StringWidget } from './StringWidget';
export { NumberWidget } from './NumberWidget';
export { BooleanWidget } from './BooleanWidget';
export { EnumWidget } from './EnumWidget';
export { ColorWidget } from './ColorWidget';
export { SpacingWidget } from './SpacingWidget';
export { ExpressionWidget } from './ExpressionWidget';
export { I18nWidget } from './I18nWidget';

/**
 * 기본 8종 위젯 맵. PanelWidgetRegistry에서 createDefaultRegistry()가 이를 사용.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const BUILTIN_WIDGETS: Record<string, PanelWidget<any>> = {
  string: StringWidget,
  number: NumberWidget,
  boolean: BooleanWidget,
  enum: EnumWidget,
  color: ColorWidget,
  spacing: SpacingWidget,
  expression: ExpressionWidget,
  i18n: I18nWidget,
};
