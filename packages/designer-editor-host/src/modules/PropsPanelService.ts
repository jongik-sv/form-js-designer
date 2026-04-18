/**
 * PropsPanelService — TSK-06-02
 *
 * DI 주입: eventBus, formFieldRegistry, propertiesPanel, modeling
 * propertiesPanel.registerProvider(500, this) 로 자신을 등록하고
 * getGroups(field) 에서 propsSchemaToPanel + panelEntryAdapter 를 통해
 * form-js 패널 entry 배열을 반환한다.
 */

import { propsSchemaToPanel, createDefaultRegistry } from '@form-js-designer/designer-core';
import type { PanelWidgetRegistry } from '@form-js-designer/designer-core';
import { panelEntryAdapter } from './panelEntryAdapter';
import type { FormJsPanelEntry } from './panelEntryAdapter';

interface EventBusLike {
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
}

interface RegistryLike {
  get(type: string): { propsSchema?: unknown; [key: string]: unknown } | undefined;
}

interface PropertiesPanelLike {
  registerProvider(priority: number, provider: unknown): void;
}

interface ModelingLike {
  editFormField(field: unknown, props: Record<string, unknown>): void;
}

export interface PropsGroup {
  id: string;
  label?: string;
  entries: FormJsPanelEntry[];
}

const DESIGNER_PROVIDER_PRIORITY = 500;

export class PropsPanelService {
  static inject = ['eventBus', 'formFieldRegistry', 'propertiesPanel', 'modeling'];

  private readonly eventBus: EventBusLike;
  private readonly formFieldRegistry: RegistryLike;
  private readonly propertiesPanel: PropertiesPanelLike | null;
  private readonly modeling: ModelingLike;
  private readonly widgetRegistry: PanelWidgetRegistry;

  constructor(
    eventBus: EventBusLike,
    formFieldRegistry: RegistryLike,
    propertiesPanel: PropertiesPanelLike | null,
    modeling: ModelingLike,
  ) {
    this.eventBus = eventBus;
    this.formFieldRegistry = formFieldRegistry;
    this.propertiesPanel = propertiesPanel;
    this.modeling = modeling;
    this.widgetRegistry = createDefaultRegistry();

    // propertiesPanel에 자신을 provider로 등록
    if (this.propertiesPanel) {
      try {
        this.propertiesPanel.registerProvider(DESIGNER_PROVIDER_PRIORITY, this);
      } catch (err) {
        console.warn('[PropsPanelService] propertiesPanel.registerProvider 실패 (fallback 모드):', err);
      }
    }
  }

  /**
   * 선택된 field에 대한 패널 그룹 배열을 반환한다.
   * form-js-editor propertiesPanel provider 계약: getGroups(element) 반환값.
   */
  getGroups(field: { type: string; id?: string } | null): PropsGroup[] {
    if (!field) return [];

    // 레지스트리에서 컴포넌트 정의 조회
    const definition = this.formFieldRegistry.get(field.type);
    if (!definition) return [];

    const propsSchema = definition.propsSchema as
      | Parameters<typeof propsSchemaToPanel>[0]
      | undefined;
    if (!propsSchema) return [];

    let entries: ReturnType<typeof propsSchemaToPanel> = [];
    try {
      entries = propsSchemaToPanel(propsSchema, this.widgetRegistry);
    } catch (err) {
      console.warn('[PropsPanelService] propsSchemaToPanel 실패:', err);
      return [];
    }

    if (entries.length === 0) return [];

    // Fallback 번역 함수 — WP-07 LocaleProvider 통합 전까지 key를 그대로 반환
    const identityT = (key: string) => key;
    const ctx = {
      field: field as unknown as Record<string, unknown>,
      modeling: this.modeling,
      t: identityT,
    };

    const panelEntries = entries.map((entry) => panelEntryAdapter(entry, ctx));

    return [
      {
        id: 'designer-props',
        label: 'Properties',
        entries: panelEntries,
      },
    ];
  }
}
