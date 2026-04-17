import { h } from 'preact';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { defineComponent } from '@form-js-designer/designer-core';
import type { PureRenderProps } from '@form-js-designer/designer-core';
import type { TabsSchema, TabItem } from './propsSchema';
import { tabsPropsSchema } from './propsSchema';
import './Tabs.css';

void h;

const VALID_ORIENTATIONS = new Set(['horizontal', 'vertical']);

/**
 * Validate tabs field values and warn on issues.
 * Returns a sanitized effective defaultValue.
 */
function validateAndSanitize(field: TabsSchema): {
  tabs: TabItem[];
  effectiveDefaultValue: string;
  orientation: 'horizontal' | 'vertical';
} {
  const tabs: TabItem[] = Array.isArray(field.tabs) ? field.tabs : [];
  const orientation: 'horizontal' | 'vertical' =
    VALID_ORIENTATIONS.has(field.orientation ?? '') ? (field.orientation as 'horizontal' | 'vertical') : 'horizontal';

  // Validate tab labels
  tabs.forEach((tab, i) => {
    if (!tab.label || tab.label === '') {
      console.warn(`[Tabs] tabs[${i}].label is empty — falling back to value "${tab.value}"`);
    }
  });

  // Validate defaultValue
  const values = tabs.map((t) => t.value);
  let effectiveDefaultValue = field.defaultValue ?? '';

  if (tabs.length > 0 && !values.includes(effectiveDefaultValue)) {
    console.warn(
      `[Tabs] defaultValue "${effectiveDefaultValue}" not found in tabs values [${values.join(', ')}] — falling back to "${tabs[0].value}"`,
    );
    effectiveDefaultValue = tabs[0].value;
  }

  return { tabs, effectiveDefaultValue, orientation };
}

function TabsRender(props: PureRenderProps<TabsSchema>) {
  const field = props.field as TabsSchema;
  const { tabs, effectiveDefaultValue, orientation } = validateAndSanitize(field);

  return (
    <TabsPrimitive.Root
      class="dc-tabs"
      data-component="tabs"
      data-orientation={orientation}
      id={props.domId}
      defaultValue={effectiveDefaultValue}
      orientation={orientation}
    >
      <TabsPrimitive.List class="dc-tabs__list" aria-label={field.id}>
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.value}
            class="dc-tabs__trigger"
            value={tab.value}
          >
            {tab.label || tab.value}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {tabs.map((tab) => (
        <TabsPrimitive.Content
          key={tab.value}
          class="dc-tabs__content"
          value={tab.value}
        >
          {/* form-js child content slot — delegated to host renderer */}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}

export const TabsComponent = defineComponent<TabsSchema>({
  type: 'tabs',
  name: 'designer.components.tabs.name',
  group: 'container',
  keyed: false,
  pathed: false,
  escapeGridRender: false,
  propsSchema: tabsPropsSchema,
  create: (options = {}) => ({
    type: 'tabs',
    tabs: [
      { label: 'Tab 1', value: 'tab1' },
      { label: 'Tab 2', value: 'tab2' },
    ],
    defaultValue: 'tab1',
    orientation: 'horizontal',
    ...options,
  }),
  render: TabsRender,
});
