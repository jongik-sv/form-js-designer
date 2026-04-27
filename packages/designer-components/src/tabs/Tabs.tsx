import { h } from 'preact';
import { useContext, useEffect, useState } from 'preact/hooks';
import * as TabsPrimitive from '@radix-ui/react-tabs';
// @ts-ignore — form-js-viewer has no bundled types for FormField + FormContext
import { FormField, FormContext } from '@bpmn-io/form-js-viewer';
import { defineComponent } from '@form-js-designer/designer-core';
import type { PureRenderProps } from '@form-js-designer/designer-core';
import type { TabsSchema } from './propsSchema';
import type { TabPanelSchema } from '../tabPanel/index';
import { tabsPropsSchema } from './propsSchema';
import { tabPanelId } from './uuid';
import { TabsIcon } from '../icons';
import './Tabs.css';

void h;

const VALID_ORIENTATIONS = new Set(['horizontal', 'vertical']);

/**
 * Survive remount-on-schema-change.
 *
 * form-js editor reconciles by replacing the entire field subtree when the
 * schema changes (e.g. modeling.editFormField on a child field). That nukes
 * the Tabs preact tree, so `useState(effectiveDefaultValue)` re-runs and the
 * UI snaps back to the first tab — even though the user is mid-edit on a
 * different tab. The selection.changed handler below cannot recover state
 * because it only registers AFTER mount, by which point the post-edit
 * selection event has already fired.
 *
 * Keying by field.id (Tabs id, stable across remounts) restores the active
 * tab without polluting the schema with transient UI state.
 */
const activeTabCache = new Map<string, string>();

/**
 * Validate and sanitize tabs field values for render.
 * Now uses field.components (tabPanel[]) instead of field.tabs[].
 */
function validateAndSanitize(field: TabsSchema): {
  tabPanels: TabPanelSchema[];
  effectiveDefaultValue: string;
  orientation: 'horizontal' | 'vertical';
} {
  const tabPanels: TabPanelSchema[] = Array.isArray(field.components)
    ? (field.components as Array<{ type?: string }>).filter((c) => c.type === 'tabPanel') as unknown as TabPanelSchema[]
    : [];

  const orientation: 'horizontal' | 'vertical' =
    VALID_ORIENTATIONS.has(field.orientation ?? '') ? (field.orientation as 'horizontal' | 'vertical') : 'horizontal';

  // Validate tab labels
  tabPanels.forEach((tp, i) => {
    if (!tp.label) {
      console.warn(`[Tabs] components[${i}].label is empty — tab id: "${tp.id}"`);
    }
  });

  // Validate defaultValue
  const ids = tabPanels.map((tp) => tp.id);
  let effectiveDefaultValue = field.defaultValue ?? '';

  if (tabPanels.length > 0 && !ids.includes(effectiveDefaultValue)) {
    console.warn(
      `[Tabs] defaultValue "${effectiveDefaultValue}" not found in tabPanel ids [${ids.join(', ')}] — falling back to "${tabPanels[0]!.id}"`,
    );
    effectiveDefaultValue = tabPanels[0]!.id;
  }

  return { tabPanels, effectiveDefaultValue, orientation };
}

interface EventBusLike {
  on: (event: string, cb: (e?: unknown) => void) => void;
  off: (event: string, cb: (e?: unknown) => void) => void;
}

interface SelectionLike {
  set: (element: unknown) => void;
}

interface FormFieldRegistryLike {
  get: (id: string) => unknown;
}

function TabsRender(props: PureRenderProps<TabsSchema>) {
  const field = props.field as TabsSchema;
  const { tabPanels, effectiveDefaultValue, orientation } = validateAndSanitize(field);
  const panelIds = tabPanels.map((tp) => tp.id);

  // 높이는 layout.height(LayoutHeightModule)가 wrapper `.fjs-element` 의 min-height 로 주입하고,
  // `.dc-tabs-container { min-height: inherit }` 가 받아 쓴다 — 여기서는 어떤 높이도 인라인으로
  // 지정하지 않는다. (tabHeight 는 legacy 필드로 migrateLegacyTabsSchema 가 layout.height 로 흡수한다.)

  const cachedActiveId = activeTabCache.get(field.id);
  const initialActiveId =
    cachedActiveId && panelIds.includes(cachedActiveId) ? cachedActiveId : effectiveDefaultValue;
  const [activeId, setActiveId] = useState<string>(initialActiveId);

  // Mirror activeId into the cache so a subsequent remount restores it.
  useEffect(() => {
    activeTabCache.set(field.id, activeId);
  }, [field.id, activeId]);

  // Keep activeId valid if panels change (e.g. panel deleted, schema re-imported).
  useEffect(() => {
    if (panelIds.length > 0 && !panelIds.includes(activeId)) {
      setActiveId(effectiveDefaultValue);
    }
  }, [panelIds.join('|'), effectiveDefaultValue]);

  // Sync active tab with form-js selection: when a tabPanel of this Tabs is
  // selected (outline click, canvas click, or drop), switch to that panel.
  const ctx = useContext(FormContext) as
    | { getService?: <T>(type: string, strict?: boolean) => T }
    | undefined;
  useEffect(() => {
    const getService = ctx?.getService;
    if (!getService) return;
    const eventBus = getService<EventBusLike>('eventBus', false);
    if (!eventBus) return;
    const handler = (event?: unknown) => {
      const e = event as { selection?: { id?: string } | null } | undefined;
      const id = e?.selection?.id;
      if (id && panelIds.includes(id)) {
        setActiveId(id);
      }
    };
    eventBus.on('selection.changed', handler);
    return () => eventBus.off('selection.changed', handler);
  }, [panelIds.join('|')]);

  return (
    <div
      class="dc-tabs-container"
      data-component="tabs"
      data-orientation={orientation}
      id={props.domId}
    >
      <TabsPrimitive.Root
        class="dc-tabs"
        value={activeId}
        onValueChange={setActiveId}
        orientation={orientation}
      >
        <TabsPrimitive.List class="dc-tabs__list" aria-label={field.id}>
          {tabPanels.map((tp) => (
            <TabsPrimitive.Trigger
              key={tp.id}
              class="dc-tabs__trigger"
              value={tp.id}
              data-tab-id={tp.id}
              // form-js draggle calls preventDefault() on pointerdown, which
              // cancels the synthesized mousedown Radix relies on for tab
              // activation. Use click (still fires) + explicit setState so the
              // trigger works inside the designer canvas.
              // Also select the tabPanel in form-js so the designer props
              // panel shows its label editor (otherwise users must dig into
              // the outline to rename tabs).
              onClick={(e: MouseEvent) => {
                e.stopPropagation();
                setActiveId(tp.id);
                const getService = ctx?.getService;
                if (!getService) return;
                const registry = getService<FormFieldRegistryLike>('formFieldRegistry', false);
                const selection = getService<SelectionLike>('selection', false);
                const panel = registry?.get(tp.id);
                if (panel && selection) selection.set(panel);
              }}
            >
              {tp.label || tp.id}
            </TabsPrimitive.Trigger>
          ))}
        </TabsPrimitive.List>
        {/*
         * Grid stacking: 모든 tabPanel 을 동일 grid cell 에 쌓아 DOM 에 유지한다.
         * - grid 셀 크기는 가장 큰 콘텐츠에 맞춰지므로 탭을 전환해도 높이가 줄지 않음
         * - 비활성 패널은 visibility:hidden 으로 숨김 (레이아웃은 유지)
         * - forceMount 로 Radix 가 비활성 패널을 unmount/hidden 하지 않도록 함
         */}
        <div class="dc-tabs__contents">
          {tabPanels.map((tp) => (
            <TabsPrimitive.Content
              key={tp.id}
              class="dc-tabs__content dc-container-body"
              value={tp.id}
              data-tab-id={tp.id}
              forceMount
            >
              {/*
               * Delegate tabPanel render to form-js FormField.
               * FormField wraps the child with a `.fjs-element[data-id=tabPanel.id]`
               * wrapper (via FormRenderContext.Element). That wrapper is required by
               * form-js drop routing (`getFormParent = node => node.closest('.fjs-element')`)
               * so dragula resolves drop target to the tabPanel, not its parent tabs.
               * Without this, `tabs-tabpanel-refactor` fix: dropped fields land as
               * siblings of tabPanels in tabs.components[] and never render.
               */}
              <FormField field={tp as never} />
            </TabsPrimitive.Content>
          ))}
        </div>
      </TabsPrimitive.Root>
    </div>
  );
}

export const TabsComponent = defineComponent<TabsSchema>({
  type: 'tabs',
  name: '탭',
  group: 'container',
  icon: TabsIcon,
  keyed: false,
  pathed: false,
  escapeGridRender: false,
  propsSchema: tabsPropsSchema,
  create: (options = {}) => {
    const tabA: TabPanelSchema = {
      id: tabPanelId(),
      type: 'tabPanel',
      label: 'Tab 1',
      components: [],
    };
    const tabB: TabPanelSchema = {
      id: tabPanelId(),
      type: 'tabPanel',
      label: 'Tab 2',
      components: [],
    };
    return {
      type: 'tabs',
      components: [tabA, tabB],
      defaultValue: tabA.id,
      orientation: 'horizontal',
      layout: { height: 300 },
      ...options,
    };
  },
  render: TabsRender,
});
