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

import { h } from 'preact';
import {
  propsSchemaToPanel,
  createDefaultRegistry,
  getAllowedEntryIds,
  I18nSimpleWidget,
  SIMPLE_MODE_HIDDEN_GROUPS,
  SIMPLE_MODE_PASSTHROUGH_GROUPS,
} from '@form-js-designer/designer-core';
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

export interface PropsGroup {
  id: string;
  label?: string;
  entries: FormJsPanelEntry[];
}

/**
 * Options for `getGroups(field, opts)`.
 * - `mode: 'simple'` — filter entries via `getAllowedEntryIds(field.type)`.
 *   When the filtered list is empty, the `designer-custom-props` group is
 *   omitted entirely. The Layout group (if applicable) is always preserved.
 * - `mode: 'full'` (default) — current behavior, all propsSchema entries.
 */
export interface GetGroupsOptions {
  mode?: 'simple' | 'full';
}

/**
 * Priority for the native form-js panel filter provider. Above the form-js
 * default of 1000 so this updater runs after baseline groups have been
 * populated, allowing us to filter/hide entries in Simple mode.
 */
// bio-properties-panel applies providers via reduce in descending priority
// order: a higher-priority provider sees an EARLIER (often empty) groups
// array, while lower-priority providers see the accumulated groups built by
// earlier ones. Filtering must happen AFTER form-js's default provider
// (priority 1000) has populated the group list, so this filter must run at
// a LOWER priority than 1000.
const DESIGNER_NATIVE_FILTER_PRIORITY = 500;

export class PropsPanelService {
  // `formFields` = 타입 레지스트리 (form-js의 register(type, component) 대상).
  // 이전에는 `formFieldRegistry` (인스턴스 레지스트리) 를 주입해 타입 조회가 항상 null 이었음.
  static $inject = ['eventBus', 'formFields', 'propertiesPanel', 'modeling'];

  private readonly eventBus: EventBusLike;
  private readonly formFields: RegistryLike;
  private readonly propertiesPanel: PropertiesPanelLike | null;
  private readonly modeling: ModelingLike;
  // Two registries: `fullRegistry` keeps the legacy default behavior (used in
  // both Full mode and as the structural baseline). `simpleRegistry` swaps the
  // i18n widget for `I18nSimpleWidget` so Simple mode renders a single ko
  // input. The global BUILTIN_WIDGETS map is untouched — both registries are
  // freshly created via `createDefaultRegistry()`.
  private readonly fullRegistry: PanelWidgetRegistry;
  private readonly simpleRegistry: PanelWidgetRegistry;
  private currentMode: 'simple' | 'full' = 'simple';

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
    this.fullRegistry = createDefaultRegistry();
    this.simpleRegistry = createDefaultRegistry();
    this.simpleRegistry.register('i18n', I18nSimpleWidget, { overwrite: true });

    // Task 4: register a native form-js properties panel filter provider.
    // bio-properties-panel provider contract: getGroups(field, editField) must
    // return an updater FUNCTION `(groups) => updatedGroups`. Returning a raw
    // array breaks the entire panel ("updater is not a function").
    //
    // The updater reads `this.currentMode` fresh on every call, so `setMode()`
    // takes effect on the next panel reflow without re-registering. In Simple
    // mode it hides Condition/CustomProperties groups, passes Layout/columns
    // through untouched, and filters every other group's entries by
    // `getAllowedEntryIds(field.type)`. In Full mode it returns groups as-is.
    //
    // Self-rendered designer groups (designer-custom-props, designer-layout)
    // are already filtered upstream in `getGroups()`, so they passthrough here.
    //
    // The separate self-rendered PropsPanelContainer (App.tsx) keeps consuming
    // `getGroups(field, { mode })` directly — that path is unaffected.
    if (
      this.propertiesPanel &&
      typeof (this.propertiesPanel as { registerProvider?: unknown }).registerProvider === 'function'
    ) {
      this.propertiesPanel.registerProvider(
        this._buildNativeFilterProvider(),
        DESIGNER_NATIVE_FILTER_PRIORITY,
      );
    }
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

          // Simple mode strategy:
          //  1) Hidden groups (Condition / CustomProperties / Appearance / ...)
          //     drop entirely.
          //  2) Self-rendered designer groups (designer-custom-props,
          //     designer-layout) passthrough untouched.
          //  3) Passthrough groups (valuesSource / staticOptions / columns / layout):
          //     preserve the WHOLE group object — `component` (Group/ListGroup),
          //     `items`, `add`, `entries`, `label`, `tooltip`, … — so that
          //     ListGroup definitions like `staticOptions` keep rendering
          //     their per-row sub-entries and Add button. Headers for these
          //     groups are hidden via CSS (see app.css). Empty passthrough
          //     groups are dropped to avoid stray empty headers.
          //  4) Everything else has its `entries` filtered by the whitelist
          //     and the SURVIVORS are flattened into a single `simple-merged`
          //     group so the user sees one flat list (label, defaultValue,
          //     required, ...). Group `component` is intentionally omitted
          //     so bio-properties-panel renders the default Group component.
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
              // Keep ListGroup-style groups even when items is empty as long
              // as they expose an `add` button (so users can create rows);
              // drop plain Group passthroughs that have no entries at all.
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
   * Switch active props panel mode. Currently a no-op setter — Task 4 will
   * use `currentMode` to drive the form-js native panel registerProvider
   * filter. The self-rendered PropsPanelContainer passes `mode` explicitly
   * to `getGroups(field, { mode })`, so this setter is only consulted by the
   * native-panel pathway introduced later.
   */
  setMode(mode: 'simple' | 'full'): void {
    this.currentMode = mode;
  }

  /**
   * 선택된 field에 대한 패널 그룹 배열을 반환한다.
   * form-js-editor propertiesPanel provider 계약: getGroups(element) 반환값.
   *
   * Simple mode (`opts.mode === 'simple'`):
   *   - widget registry는 simpleRegistry (i18n → I18nSimpleWidget)
   *   - entries는 `getAllowedEntryIds(field.type)` whitelist로 필터링
   *   - 필터 결과가 빈 배열이면 designer-custom-props 그룹은 생성하지 않음
   *   - designer-layout 그룹은 두 모드 모두 동일하게 유지
   */
  getGroups(
    field: { type: string; id?: string } | null,
    opts: GetGroupsOptions = {},
  ): PropsGroup[] {
    if (!field) return [];

    const mode: 'simple' | 'full' = opts.mode ?? 'full';
    const registry = mode === 'simple' ? this.simpleRegistry : this.fullRegistry;

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
          entries = propsSchemaToPanel(propsSchema, registry);
        } catch (err) {
          console.warn('[PropsPanelService] propsSchemaToPanel 실패:', err);
        }

        // Simple mode: filter by whitelist (filter on PanelEntry.key, before adapter).
        let effective = entries;
        if (mode === 'simple') {
          const allowed = getAllowedEntryIds(field.type);
          effective = entries.filter((e) => allowed.has(e.key));
        }

        if (effective.length > 0) {
          // Fallback 번역 함수 — WP-07 LocaleProvider 통합 전까지 key를 그대로 반환
          const identityT = (key: string) => key;
          const ctx = {
            field: field as unknown as Record<string, unknown>,
            modeling: this.modeling,
            t: identityT,
          };

          const panelEntries = effective.map((entry) => panelEntryAdapter(entry, ctx));
          groups.push({
            id: 'designer-custom-props',
            label: 'Properties',
            entries: panelEntries,
          });
        }
      }
    }

    // TSK-12-02: 대상 타입에 Layout 그룹 (layout.height) 추가 — 두 모드 모두 동일.
    if ((LAYOUT_HEIGHT_TARGET_TYPES as readonly string[]).includes(field.type)) {
      groups.push(this._buildLayoutGroup(field as Record<string, unknown>));
    }

    return groups;
  }

  /**
   * 대상 컴포넌트용 Layout 가상 그룹을 생성한다. layout.height 숫자 입력 엔트리 1개.
   */
  private _buildLayoutGroup(field: Record<string, unknown>): PropsGroup {
    const { modeling } = this;

    const getLayout = () => (field['layout'] ?? {}) as Record<string, unknown>;
    const toNum = (v: unknown): number | undefined =>
      v === '' || v === null || v === undefined ? undefined : Number(v);

    const setHeight = (v: unknown) =>
      modeling.editFormField(field, 'layout', { ...getLayout(), height: toNum(v) });

    const entries: FormJsPanelEntry[] = [
      {
        id: 'layout.height',
        key: 'layout.height',
        label: '높이(px)',
        component: (props: Record<string, unknown>) => {
          const currentValue = props['value'] !== undefined ? props['value'] : (getLayout()['height'] ?? '');
          return h('input', {
            type: 'number',
            'data-testid': 'props-entry-layout.height-input',
            value: currentValue as number | string,
            min: 36,
            max: 2000,
            onInput: (e: Event) => setHeight((e.target as HTMLInputElement).value),
            onChange: (e: Event) => setHeight((e.target as HTMLInputElement).value),
            style: 'width:100%;box-sizing:border-box;',
          });
        },
        isEdited: (_node: unknown) => getLayout()['height'] != null,
        set: setHeight,
        element: field,
      },
    ];

    return {
      id: 'designer-layout',
      label: 'Layout',
      entries,
    };
  }
}
