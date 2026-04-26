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
 */

import { h } from 'preact';
import type { ComponentType, JSX } from 'preact';
import { propsSchemaToPanel, createDefaultRegistry } from '@form-js-designer/designer-core';
import type { PanelEntry, PanelWidgetRegistry } from '@form-js-designer/designer-core';

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

      const formFields = this.injector.get('formFields') as FormFieldsLike | undefined;
      const definition = formFields?.get(field.type);
      const propsSchema = (definition?.config?.propsSchema ?? definition?.propsSchema) as
        | Parameters<typeof propsSchemaToPanel>[0]
        | undefined;
      if (!propsSchema) return groups;

      let entries: PanelEntry[] = [];
      try {
        entries = propsSchemaToPanel(propsSchema, this.widgetRegistry);
      } catch (err) {
        console.warn('[PropsPanelService] propsSchemaToPanel 실패:', err);
        return groups;
      }
      if (entries.length === 0) return groups;

      const bioEntries = entries.map((entry) =>
        this.#buildEntry(entry, field as Record<string, unknown>, editField),
      );

      const customGroup: BioGroup = {
        id: 'designer-custom-props',
        label: 'Custom properties',
        entries: bioEntries,
      };

      return [...groups, customGroup];
    };
  }

  /** PanelEntry → bio entry 변환. component는 렌더 시점에 매번 widget.edit으로 JSX를 만든다. */
  #buildEntry(entry: PanelEntry, field: Record<string, unknown>, editField: EditField): BioEntry {
    const { key, widget, defaultValue, meta, label } = entry;
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

    const identityT = (k: string): string => k;

    const Component: ComponentType<Record<string, unknown>> = () => {
      const current = readValue() ?? defaultValue;
      return widget.edit(
        current,
        onChange,
        { t: identityT, domId: `designer-props-${key}`, label, disabled: false },
        meta,
      ) as JSX.Element;
    };

    return {
      id: `designer-props-${key}`,
      component: Component,
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
