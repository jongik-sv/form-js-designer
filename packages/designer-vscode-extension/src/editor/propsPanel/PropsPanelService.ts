/**
 * PropsPanelService — form-js 기본 properties panel에 "Custom properties" 그룹을 추가하는 provider.
 *
 * form-js `propertiesPanel.registerProvider(provider, priority)` 계약:
 *   - `getGroups(field, editField)` → `(groups) => newGroups` (updater)
 *   - 반환된 updater는 기존 groups를 받아 새 그룹을 배열에 추가하여 반환
 *
 * 현재 field type에 `config.propsSchema`가 있으면 designer-core의
 * `propsSchemaToPanel`로 PanelEntry 배열을 얻어, 각 엔트리를 bio-properties-panel
 * entry 계약({ id, component }) 로 래핑한 뒤 Custom properties 그룹에 싣는다.
 *
 * priority 500: form-js 기본 provider(1000)보다 낮아서 reduce에서 후순위로 실행 →
 * Custom properties 그룹이 General/Condition/Layout 등 뒤에 추가된다.
 *
 * IMPORTANT — entry component reference 안정화:
 * bio-properties-panel은 schema 변경마다 모든 provider의 getGroups를 재호출하고
 * 결과 entries 를 `createElement(entry.component, { ...entry, element, key: id })` 로
 * 렌더한다. 매 호출마다 새 component 함수를 만들면 Preact 가 type 변화로 보고
 * input 을 unmount/remount → 사용자 타이핑 중 포커스 손실. 따라서 component 는
 * 모듈 레벨에서 한 번만 정의하고, 엔트리별 동적 데이터(widget, key, editField …)
 * 는 entry 객체의 추가 필드(__widget, __entryKey …)로 실어 props 로 전달한다.
 */

import { h } from 'preact';
import type { ComponentType, JSX } from 'preact';
import { propsSchemaToPanel, createDefaultRegistry } from '@form-js-designer/designer-core';
import type { PanelEntry, PanelWidget, PanelWidgetRegistry } from '@form-js-designer/designer-core';
import { LAYOUT_HEIGHT_TARGET_TYPES } from '@form-js-designer/designer-runtime/modules';

interface PropertiesPanelLike {
  registerProvider(provider: unknown, priority?: number): void;
}

interface InjectorLike {
  get<T = unknown>(name: string, strict?: boolean): T | undefined;
}

interface FormFieldsLike {
  get(type: string):
    | {
        config?: { propsSchema?: unknown; [key: string]: unknown };
        propsSchema?: unknown;
        [key: string]: unknown;
      }
    | undefined;
}

type EditField = (field: unknown, key: string | string[], value: unknown) => void;

/** form-js bio-properties-panel이 기대하는 그룹 형태 */
interface BioGroup {
  id: string;
  label: string;
  entries: BioEntry[];
}

/** bio-properties-panel entry — component는 Preact FC, 렌더 시 `{ ...entry, element, key }` 주입 */
interface BioEntry {
  id: string;
  component: ComponentType<Record<string, unknown>>;
  isEdited?: (node: unknown) => boolean;
  [key: string]: unknown;
}

const DESIGNER_PROVIDER_PRIORITY = 500;

const identityT = (k: string): string => k;

/**
 * 모듈 레벨 stable widget entry component.
 * bio-properties-panel 이 `{...entry, element}` 를 props 로 spread 해 주므로
 * 엔트리 데이터는 props 로 받는다.
 */
interface WidgetEntryProps extends Record<string, unknown> {
  element: Record<string, unknown>;
  __widget: PanelWidget;
  __entryKey: string;
  __defaultValue: unknown;
  __meta?: import('@form-js-designer/designer-core').WidgetMeta;
  __label?: string;
  __editField: EditField;
}

const WidgetEntryComponent: ComponentType<WidgetEntryProps> = (props) => {
  const { element: field, __widget: widget, __entryKey: key, __defaultValue: dflt, __meta: meta, __label: label, __editField: editField } = props as WidgetEntryProps;
  const nested = splitPath(key);
  const readValue = (): unknown => (nested ? getByPath(field, key) : field[key]);
  const onChange = (value: unknown): void => {
    if (nested) {
      const parent = (field[nested.rootKey] ?? {}) as Record<string, unknown>;
      editField(field, nested.rootKey, { ...parent, [nested.nestedKey]: value });
    } else {
      editField(field, key, value);
    }
  };
  const current = readValue() ?? dflt;
  return widget.edit(
    current,
    onChange,
    { t: identityT, domId: `designer-props-${key}`, label, disabled: false },
    meta,
  ) as JSX.Element;
};

/**
 * 모듈 레벨 stable layout.height 입력 컴포넌트.
 */
interface LayoutHeightProps extends Record<string, unknown> {
  element: Record<string, unknown>;
  __editField: EditField;
}

const LayoutHeightComponent: ComponentType<LayoutHeightProps> = (props) => {
  const { element: field, __editField: editField } = props as LayoutHeightProps;
  const getLayout = (): Record<string, unknown> =>
    (field['layout'] ?? {}) as Record<string, unknown>;
  const toNum = (v: unknown): number | undefined =>
    v === '' || v === null || v === undefined ? undefined : Number(v);
  const setHeight = (v: unknown): void => {
    editField(field, 'layout', { ...getLayout(), height: toNum(v) });
  };
  const current = (getLayout()['height'] ?? '') as number | string;
  return h('input', {
    type: 'number',
    'data-testid': 'props-entry-layout.height-input',
    value: current,
    min: 36,
    max: 2000,
    onInput: (e: Event) => setHeight((e.target as HTMLInputElement).value),
    onChange: (e: Event) => setHeight((e.target as HTMLInputElement).value),
    style: 'width:100%;box-sizing:border-box;',
  }) as JSX.Element;
};

export class PropsPanelService {
  static $inject = ['propertiesPanel', 'injector'];

  private readonly injector: InjectorLike;
  private readonly widgetRegistry: PanelWidgetRegistry;

  constructor(propertiesPanel: PropertiesPanelLike | null, injector: InjectorLike) {
    this.injector = injector;
    this.widgetRegistry = createDefaultRegistry();

    if (propertiesPanel && typeof propertiesPanel.registerProvider === 'function') {
      propertiesPanel.registerProvider(this, DESIGNER_PROVIDER_PRIORITY);
    }
  }

  /**
   * form-js properties panel provider 계약 진입점.
   * 현재 field의 propsSchema를 읽어 "Custom properties" 그룹을 기존 groups 뒤에 추가한다.
   */
  getGroups(
    field: { type?: string; id?: string } | null | undefined,
    editField: EditField,
  ): (groups: BioGroup[]) => BioGroup[] {
    return (groups) => {
      if (!field || !field.type) return groups;

      const next = [...groups];

      const formFields = this.injector.get('formFields') as FormFieldsLike | undefined;
      const definition = formFields?.get(field.type);
      const propsSchema = (definition?.config?.propsSchema ?? definition?.propsSchema) as
        | Parameters<typeof propsSchemaToPanel>[0]
        | undefined;

      if (propsSchema) {
        let entries: PanelEntry[] = [];
        try {
          entries = propsSchemaToPanel(propsSchema, this.widgetRegistry);
        } catch (err) {
          console.warn('[PropsPanelService] propsSchemaToPanel 실패:', err);
          entries = [];
        }
        if (entries.length > 0) {
          const bioEntries = entries.map((entry) =>
            this.#buildEntry(entry, field as Record<string, unknown>, editField),
          );
          next.push({
            id: 'designer-custom-props',
            label: 'Custom properties',
            entries: bioEntries,
          });
        }
      }

      // 대상 타입(textarea/html/table/group/card/modal/tabs/tabPanel/iframe/image/text)에
      // height 숫자 입력 그룹을 추가한다 (TSK-12-02 포팅).
      if ((LAYOUT_HEIGHT_TARGET_TYPES as readonly string[]).includes(field.type)) {
        next.push(this.#buildLayoutGroup(field as Record<string, unknown>, editField));
      }

      return next;
    };
  }

  #buildLayoutGroup(field: Record<string, unknown>, editField: EditField): BioGroup {
    const getLayout = (): Record<string, unknown> =>
      (field['layout'] ?? {}) as Record<string, unknown>;
    return {
      id: 'designer-layout',
      label: 'Layout',
      entries: [
        {
          id: 'designer-layout-height',
          component: LayoutHeightComponent as ComponentType<Record<string, unknown>>,
          __editField: editField,
          isEdited: () => getLayout()['height'] != null,
        },
      ],
    };
  }

  /**
   * PanelEntry → bio entry 변환.
   * component 는 모듈 레벨 stable WidgetEntryComponent 를 사용 (re-render 시 input DOM 보존).
   * 엔트리별 데이터는 __ prefix props 로 전달.
   */
  #buildEntry(entry: PanelEntry, field: Record<string, unknown>, editField: EditField): BioEntry {
    const { key, widget, defaultValue, meta, label } = entry;
    const nested = splitPath(key);
    const readValue = (): unknown => (nested ? getByPath(field, key) : field[key]);
    return {
      id: `designer-props-${key}`,
      component: WidgetEntryComponent as ComponentType<Record<string, unknown>>,
      __widget: widget,
      __entryKey: key,
      __defaultValue: defaultValue,
      __meta: meta,
      __label: label,
      __editField: editField,
      isEdited: () => readValue() !== defaultValue,
    };
  }
}

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function splitPath(path: string): { rootKey: string; nestedKey: string } | null {
  const dotIndex = path.indexOf('.');
  if (dotIndex === -1) return null;
  return { rootKey: path.slice(0, dotIndex), nestedKey: path.slice(dotIndex + 1) };
}

// preact h이 제거되지 않도록 side-effect 방지용 reference (JSX factory 호환)
void h;

export const PropsPanelModule = {
  __init__: ['designerPropsProvider'],
  designerPropsProvider: [
    'type',
    PropsPanelService as unknown as new (...args: unknown[]) => unknown,
  ] as ['type', typeof PropsPanelService],
};
