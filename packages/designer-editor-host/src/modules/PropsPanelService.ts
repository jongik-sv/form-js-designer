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
  /**
   * form-js `formFields` 서비스. `.get(type)` 은 등록된 field component 를 반환한다.
   * defineComponent 로 생성된 컴포넌트는 `.config.propsSchema` 에 스키마를 실어둔다.
   */
  get(type: string): { config?: { propsSchema?: unknown; [key: string]: unknown }; propsSchema?: unknown; [key: string]: unknown } | undefined;
}

interface PropertiesPanelLike {
  // form-js signature: registerProvider(provider, priority)
  registerProvider(provider: unknown, priority?: number): void;
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
  // `formFields` = 타입 레지스트리 (form-js의 register(type, component) 대상).
  // 이전에는 `formFieldRegistry` (인스턴스 레지스트리) 를 주입해 타입 조회가 항상 null 이었음.
  static inject = ['eventBus', 'formFields', 'propertiesPanel', 'modeling'];

  private readonly eventBus: EventBusLike;
  private readonly formFields: RegistryLike;
  private readonly propertiesPanel: PropertiesPanelLike | null;
  private readonly modeling: ModelingLike;
  private readonly widgetRegistry: PanelWidgetRegistry;

  constructor(
    eventBus: EventBusLike,
    formFields: RegistryLike,
    propertiesPanel: PropertiesPanelLike | null,
    modeling: ModelingLike,
  ) {
    this.eventBus = eventBus;
    this.formFields = formFields;
    this.propertiesPanel = propertiesPanel;
    this.modeling = modeling;
    this.widgetRegistry = createDefaultRegistry();

    // propertiesPanel에 자신을 provider로 등록
    // 주: bio-properties-panel provider 계약은 getGroups(element) 가 `(groups) => groups` 형태의
    // updater 함수를 반환해야 한다. 현재 panelEntryAdapter 는 bio 네이티브 entry 타입을 내지 않으므로
    // 직접 registerProvider 하면 내부에서 "updater is not a function" 으로 패널 전체가 깨진다.
    // 대신 App.tsx 에서 우리 PropsPanelContainer 가 PropsPanelService.getGroups 를 직접 호출해
    // 화면 하단에 렌더하는 구조로 분리한다. bio 패널은 form-js 기본 속성만 보여준다.
    void this.propertiesPanel;
    void DESIGNER_PROVIDER_PRIORITY;
  }

  /**
   * 선택된 field에 대한 패널 그룹 배열을 반환한다.
   * form-js-editor propertiesPanel provider 계약: getGroups(element) 반환값.
   */
  getGroups(field: { type: string; id?: string } | null): PropsGroup[] {
    if (!field) return [];

    // 타입 레지스트리에서 컴포넌트 조회 (defineComponent → formFields.register)
    const definition = this.formFields.get(field.type);
    if (!definition) return [];

    const propsSchema = (definition.config?.propsSchema ?? definition.propsSchema) as
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
