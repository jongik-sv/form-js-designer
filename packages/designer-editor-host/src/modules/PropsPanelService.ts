/**
 * PropsPanelService — TSK-06-02, TSK-12-02
 *
 * DI 주입: eventBus, formFieldRegistry, propertiesPanel, modeling
 * propertiesPanel.registerProvider(500, this) 로 자신을 등록하고
 * getGroups(field) 에서 propsSchemaToPanel + panelEntryAdapter 를 통해
 * form-js 패널 entry 배열을 반환한다.
 *
 * TSK-12-02: 대상 컴포넌트에 "Layout" 가상 그룹(layout.height 숫자 입력) 추가.
 */

import { propsSchemaToPanel, createDefaultRegistry } from '@form-js-designer/designer-core';
import type { PanelWidgetRegistry } from '@form-js-designer/designer-core';
import { LAYOUT_HEIGHT_TARGET_TYPES } from '@form-js-designer/designer-runtime';
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
  editFormField(field: unknown, key: string, value: unknown): void;
  editFormField(field: unknown, propsOrKey: Record<string, unknown> | string, value?: unknown): void;
}

interface RowLike {
  id: string;
  components: string[];
}

interface FormLayouterLike {
  getRows(parentId: string): RowLike[];
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
  // TSK-12-03: formLayouter optional 추가 — 첫 컴포넌트 여부 판단에 사용.
  static inject = ['eventBus', 'formFields', 'propertiesPanel', 'modeling', 'formLayouter'];

  private readonly eventBus: EventBusLike;
  private readonly formFields: RegistryLike;
  private readonly propertiesPanel: PropertiesPanelLike | null;
  private readonly modeling: ModelingLike;
  private readonly formLayouter: FormLayouterLike | undefined;
  private readonly widgetRegistry: PanelWidgetRegistry;

  constructor(
    eventBus: EventBusLike,
    formFields: RegistryLike,
    propertiesPanel: PropertiesPanelLike | null,
    modeling: ModelingLike,
    formLayouter?: FormLayouterLike,
  ) {
    this.eventBus = eventBus;
    this.formFields = formFields;
    this.propertiesPanel = propertiesPanel;
    this.modeling = modeling;
    this.formLayouter = formLayouter;
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

    const groups: PropsGroup[] = [];

    // 타입 레지스트리에서 컴포넌트 조회 (defineComponent → formFields.register)
    const definition = this.formFields.get(field.type);

    if (definition) {
      const propsSchema = (definition.config?.propsSchema ?? definition.propsSchema) as
        | Parameters<typeof propsSchemaToPanel>[0]
        | undefined;

      if (propsSchema) {
        let entries: ReturnType<typeof propsSchemaToPanel> = [];
        try {
          entries = propsSchemaToPanel(propsSchema, this.widgetRegistry);
        } catch (err) {
          console.warn('[PropsPanelService] propsSchemaToPanel 실패:', err);
        }

        if (entries.length > 0) {
          // Fallback 번역 함수 — WP-07 LocaleProvider 통합 전까지 key를 그대로 반환
          const identityT = (key: string) => key;
          const ctx = {
            field: field as unknown as Record<string, unknown>,
            modeling: this.modeling,
            t: identityT,
          };

          const panelEntries = entries.map((entry) => panelEntryAdapter(entry, ctx));
          groups.push({
            id: 'designer-props',
            label: 'Properties',
            entries: panelEntries,
          });
        }
      }
    }

    // TSK-12-02: 대상 타입에 Layout 그룹 추가 (propsSchema/entries 여부와 무관)
    // TSK-12-03: isFirstInRow 여부도 전달하여 rowHeight 엔트리 조건부 추가
    const isFirst = this._isFirstInRow(field as Record<string, unknown>);
    if ((LAYOUT_HEIGHT_TARGET_TYPES as readonly string[]).includes(field.type) || isFirst) {
      groups.push(this._buildLayoutGroup(field as Record<string, unknown>, isFirst));
    }

    return groups;
  }

  /**
   * 선택된 field가 자신의 row에서 첫 번째 컴포넌트인지 확인한다.
   * formLayouter가 없으면 항상 false.
   */
  private _isFirstInRow(field: Record<string, unknown>): boolean {
    const layouter = this.formLayouter;
    if (!layouter || !field['id']) return false;

    // formLayouter.getRows는 parentId 기준이므로 root와 각 컨테이너를 조회해야 하나,
    // 여기서는 getRows('root') 또는 모든 부모를 순회하는 대신
    // 간단한 접근: 인자 없이 전체 rows를 찾는 헬퍼 없이, 공통 parent를 찾기 어려움.
    // 현재 구현에서는 formLayouter.getRows를 다양한 parentId로 호출하는 대신
    // 기존 _rows 접근 방식과 유사하게 처리한다.
    //
    // 실제 form-js FormLayouter의 getRows(parentId)는 parentId 기준으로만 row를 반환.
    // PropsPanelService에는 field의 parent를 알 방법이 없으므로,
    // formLayouter에 _rows가 있으면 해당 방식으로, 없으면 getRows('root') 시도.
    const anyLayouter = layouter as Record<string, unknown>;
    if (anyLayouter['_rows']) {
      const rows = anyLayouter['_rows'] as Array<{ formFieldId: string; rows: RowLike[] }>;
      for (const group of rows) {
        for (const row of group.rows ?? []) {
          if ((row.components ?? [])[0] === field['id']) return true;
        }
      }
      return false;
    }

    // _rows가 없으면 getRows를 시도 (최선)
    try {
      const rows = layouter.getRows('root') ?? [];
      for (const row of rows) {
        if ((row.components ?? [])[0] === field['id']) return true;
      }
    } catch { /* getRows 실패 시 무시 */ }
    return false;
  }

  /**
   * 대상 컴포넌트용 Layout 가상 그룹을 생성한다.
   * layout.height 숫자 입력 엔트리와 (첫 컴포넌트일 때) layout.rowHeight 엔트리를 포함한다.
   * layout.height와 layout.rowHeight는 완전히 독립적인 엔트리이다 (TSK-12-03).
   */
  private _buildLayoutGroup(field: Record<string, unknown>, isFirstInRow = false): PropsGroup {
    const { modeling } = this;

    const getLayout = () => (field['layout'] ?? {}) as Record<string, unknown>;
    const toNum = (v: unknown): number | undefined =>
      v === '' || v === null || v === undefined ? undefined : Number(v);

    const entries: FormJsPanelEntry[] = [];

    // layout.height — 컴포넌트 개별 높이 (LAYOUT_HEIGHT_TARGET_TYPES에만 적용)
    if ((LAYOUT_HEIGHT_TARGET_TYPES as readonly string[]).includes(field['type'] as string)) {
      const setHeight = (v: unknown) =>
        modeling.editFormField(field, 'layout', { ...getLayout(), height: toNum(v) });

      entries.push({
        id: 'props-entry-layout.height',
        key: 'layout.height',
        label: '높이(px)',
        component: (props: Record<string, unknown>) => {
          const currentValue = props['value'] !== undefined ? props['value'] : (getLayout()['height'] ?? undefined);
          return { type: 'number-input', value: currentValue, onChange: setHeight, min: 36, max: 2000 };
        },
        isEdited: (_node: unknown) => getLayout()['height'] != null,
        set: setHeight,
        element: field,
      });
    }

    // layout.rowHeight — 행 높이 (첫 컴포넌트일 때만 노출, layout.height와 독립적)
    if (isFirstInRow) {
      const setRowHeight = (v: unknown) =>
        // layout.rowHeight만 갱신 — layout.height 등 다른 키는 스프레드로 보존
        modeling.editFormField(field, 'layout', { ...getLayout(), rowHeight: toNum(v) });

      entries.push({
        id: 'props-entry-layout.rowHeight',
        key: 'layout.rowHeight',
        label: '행 높이(px)',
        component: (props: Record<string, unknown>) => {
          const currentValue = props['value'] !== undefined ? props['value'] : (getLayout()['rowHeight'] ?? undefined);
          return { type: 'number-input', value: currentValue, onChange: setRowHeight, min: 36, max: 2000 };
        },
        isEdited: (_node: unknown) => getLayout()['rowHeight'] != null,
        set: setRowHeight,
        element: field,
      });
    }

    return {
      id: 'designer-layout',
      label: 'Layout',
      entries,
    };
  }
}
