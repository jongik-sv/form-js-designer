/**
 * propsSchemaToPanel — 순수 변환기
 *
 * PropsSchema → PanelEntry[] 변환.
 * 각 property에 대해 registry에서 위젯을 조회하고 PanelEntry를 생성한다.
 * 미등록 위젯 타입이면 UnknownWidgetError를 throw한다.
 */
import type { PropsSchema } from '../types';
import type { PanelEntry, WidgetMeta } from './types';
import { UnknownWidgetError } from './types';
import { PanelWidgetRegistry, createDefaultRegistry } from './PanelWidgetRegistry';

export { PanelWidgetRegistry };

/**
 * propsSchema를 PanelEntry 배열로 변환한다.
 *
 * @param propsSchema - 컴포넌트가 선언한 propsSchema
 * @param registry - 위젯 레지스트리 (미지정 시 기본 8종 레지스트리)
 * @returns PanelEntry[] (선언 순서 보존)
 * @throws UnknownWidgetError — registry에 없는 type 발견 시
 */
export function propsSchemaToPanel(
  propsSchema: PropsSchema,
  registry?: PanelWidgetRegistry,
): PanelEntry[] {
  const reg = registry ?? createDefaultRegistry();
  const entries: PanelEntry[] = [];

  for (const [key, propDef] of Object.entries(propsSchema.properties)) {
    const widgetType = propDef.type as string;
    const widget = reg.get(widgetType);

    if (widget === undefined) {
      throw new UnknownWidgetError(widgetType);
    }

    const meta: WidgetMeta = {
      type: widgetType,
      label: propDef.label,
      default: propDef.default,
      enum: propDef.enum,
      min: propDef.min,
      max: propDef.max,
      description: (propDef as { description?: string }).description,
      group: (propDef as { group?: string }).group,
      showIf: (propDef as { showIf?: string }).showIf,
      collapsed: (propDef as { collapsed?: boolean }).collapsed,
    };

    const entry: PanelEntry = {
      key,
      widgetType,
      widget,
      label: propDef.label,
      description: (propDef as { description?: string }).description,
      defaultValue: propDef.default,
      group: (propDef as { group?: string }).group,
      showIf: (propDef as { showIf?: string }).showIf,
      collapsed: (propDef as { collapsed?: boolean }).collapsed,
      meta,
    };

    entries.push(entry);
  }

  return entries;
}
