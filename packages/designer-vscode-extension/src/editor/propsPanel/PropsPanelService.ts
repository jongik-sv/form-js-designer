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
import {
  propsSchemaToPanel,
  createDefaultRegistry,
  getAllowedEntryIds,
  I18nSimpleWidget,
  SIMPLE_MODE_HIDDEN_GROUPS,
  SIMPLE_MODE_PASSTHROUGH_GROUPS,
} from '@form-js-designer/designer-core';
import type { PanelEntry, PanelWidget, PanelWidgetRegistry } from '@form-js-designer/designer-core';
import { LAYOUT_HEIGHT_TARGET_TYPES } from '@form-js-designer/designer-runtime/modules';
import { readStoredPanelMode, type PanelMode } from '@form-js-designer/designer-core';

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

/**
 * Priority for the native form-js panel filter provider. bio-properties-panel
 * applies providers via reduce in descending priority order: a higher-priority
 * provider sees an EARLIER (often empty) groups array, while lower-priority
 * providers see the accumulated groups built by earlier ones. Filtering must
 * happen AFTER form-js's default provider (priority 1000) AND after this
 * service's own custom-properties provider (priority 500) have populated the
 * group list, so this filter must run at the LOWEST priority.
 */
const DESIGNER_NATIVE_FILTER_PRIORITY = 400;

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
  // Two registries: `fullRegistry` keeps the legacy default behavior. The
  // `simpleRegistry` swaps the i18n widget for `I18nSimpleWidget` so Simple
  // mode renders a single ko input instead of the full multi-locale picker.
  // The global BUILTIN_WIDGETS map is untouched — both registries are
  // freshly created via `createDefaultRegistry()`.
  private readonly fullRegistry: PanelWidgetRegistry;
  private readonly simpleRegistry: PanelWidgetRegistry;
  // Seeded from sessionStorage in the constructor so the very first native
  // panel reflow already sees the correct mode without waiting for the
  // webview's initial setMode() call.
  private currentMode: PanelMode;

  constructor(propertiesPanel: PropertiesPanelLike | null, injector: InjectorLike) {
    this.injector = injector;
    this.fullRegistry = createDefaultRegistry();
    this.simpleRegistry = createDefaultRegistry();
    this.simpleRegistry.register('i18n', I18nSimpleWidget, { overwrite: true });
    this.currentMode = readStoredPanelMode();

    if (propertiesPanel && typeof propertiesPanel.registerProvider === 'function') {
      // `this` provides the existing custom-properties group at priority 500.
      propertiesPanel.registerProvider(this, DESIGNER_PROVIDER_PRIORITY);

      // Native filter provider — runs after default (1000) and the
      // custom-properties provider (500) so it sees the fully accumulated
      // groups and can filter/hide entries in Simple mode.
      propertiesPanel.registerProvider(
        this._buildNativeFilterProvider(),
        DESIGNER_NATIVE_FILTER_PRIORITY,
      );
    }
  }

  /**
   * Switch active props panel mode. The native filter provider closure reads
   * `currentMode` live on each call, so the next panel reflow picks up the
   * new mode without re-registering. The same field is also consulted by
   * `getGroups()` for the custom-properties group.
   */
  setMode(mode: PanelMode): void {
    this.currentMode = mode;
  }

  /**
   * Build the bio-properties-panel provider that filters native panel groups
   * in Simple mode. The returned provider's `getGroups(field, _editField)`
   * MUST return an updater function `(groups) => updatedGroups`.
   *
   * `self` is captured so the closure reads `currentMode` live on each call.
   */
  private _buildNativeFilterProvider(): {
    getGroups(
      field: { type?: string } | null,
      editField?: unknown,
    ): (
      groups: Array<{ id: string; entries?: Array<{ id: string }>; items?: unknown[]; component?: unknown }>,
    ) => Array<{ id: string; entries?: Array<{ id: string }>; items?: unknown[]; component?: unknown }>;
  } {
    const self = this;
    return {
      getGroups(field, _editField) {
        return (groups) => {
          if (self.currentMode === 'full' || !field || !field.type) return groups;
          const allowed = getAllowedEntryIds(field.type);

          // Simple mode strategy (mirrors host PropsPanelService):
          //  1) Hidden groups (Condition / CustomProperties / Appearance / ...)
          //     drop entirely.
          //  2) Self-rendered designer groups (designer-custom-props,
          //     designer-layout) passthrough untouched — they are filtered
          //     upstream in `getGroups()` already.
          //  3) Passthrough groups (valuesSource / staticOptions / columns /
          //     layout): preserve the WHOLE group object so ListGroup
          //     definitions keep rendering their per-row sub-entries and Add
          //     button. Headers are hidden via CSS.
          //  4) Everything else has its `entries` filtered by the whitelist
          //     and the SURVIVORS are flattened into a single `simple-merged`
          //     group so the user sees one flat list.
          const merged: Array<{ id: string }> = [];
          const passthroughGroups: typeof groups = [];
          const passthroughSelfGroups: typeof groups = [];
          for (const g of groups) {
            if (SIMPLE_MODE_HIDDEN_GROUPS.has(g.id)) continue;
            if (g.id === 'designer-custom-props' || g.id === 'designer-layout') {
              passthroughSelfGroups.push(g);
              continue;
            }
            if (SIMPLE_MODE_PASSTHROUGH_GROUPS.has(g.id)) {
              const hasEntries = (g.entries?.length ?? 0) > 0;
              const hasItems = (g.items?.length ?? 0) > 0;
              const hasAdd = typeof (g as { add?: unknown }).add === 'function';
              if (hasEntries || hasItems || hasAdd) {
                passthroughGroups.push(g);
              }
              continue;
            }
            const filtered = (g.entries ?? []).filter((e) => allowed.has(e.id));
            merged.push(...filtered);
          }
          const out: typeof groups = [];
          if (merged.length > 0) {
            out.push({ id: 'simple-merged', entries: merged });
          }
          out.push(...passthroughGroups);
          out.push(...passthroughSelfGroups);
          return out;
        };
      },
    };
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
        // Simple mode swaps in `simpleRegistry` (i18n → I18nSimpleWidget).
        const registry =
          this.currentMode === 'simple' ? this.simpleRegistry : this.fullRegistry;
        let entries: PanelEntry[] = [];
        try {
          entries = propsSchemaToPanel(propsSchema, registry);
        } catch (err) {
          console.warn('[PropsPanelService] propsSchemaToPanel 실패:', err);
          entries = [];
        }
        // Simple mode filters entries by whitelist on PanelEntry.key (before
        // bio-entry adapter wrapping). Empty result → drop the group entirely
        // so no stray "Custom properties" header appears.
        if (this.currentMode === 'simple') {
          const allowed = getAllowedEntryIds(field.type);
          entries = entries.filter((e) => allowed.has(e.key));
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
  // Expose under `propsPanel` so the webview can `editor.get('propsPanel')`
  // and call `setMode(mode)` from the toggle handler. Matches the host's
  // designer-editor-host module name for parity.
  __init__: ['propsPanel'],
  propsPanel: [
    'type',
    PropsPanelService as unknown as new (...args: unknown[]) => unknown,
  ] as ['type', typeof PropsPanelService],
};
