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
      `[Tabs] defaultValue "${effectiveDefaultValue}" not found in tabPanel ids [${ids.join(', ')}] — falling back to "${tabPanels[0].id}"`,
    );
    effectiveDefaultValue = tabPanels[0].id;
  }

  return { tabPanels, effectiveDefaultValue, orientation };
}

interface EventBusLike {
  on: (event: string, cb: (e?: unknown) => void) => void;
  off: (event: string, cb: (e?: unknown) => void) => void;
}

function TabsRender(props: PureRenderProps<TabsSchema>) {
  const field = props.field as TabsSchema;
  const { tabPanels, effectiveDefaultValue, orientation } = validateAndSanitize(field);
  const panelIds = tabPanels.map((tp) => tp.id);

  const [activeId, setActiveId] = useState<string>(effectiveDefaultValue);

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
              // form-js draggle calls preventDefault() on pointerdown, which
              // cancels the synthesized mousedown Radix relies on for tab
              // activation. Use click (still fires) + explicit setState so the
              // trigger works inside the designer canvas.
              onClick={() => setActiveId(tp.id)}
            >
              {tp.label || tp.id}
            </TabsPrimitive.Trigger>
          ))}
        </TabsPrimitive.List>
        {tabPanels.map((tp) => (
          <TabsPrimitive.Content
            key={tp.id}
            class="dc-tabs__content dc-container-body"
            value={tp.id}
            data-tab-id={tp.id}
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
      ...options,
    };
  },
  render: TabsRender,
});
