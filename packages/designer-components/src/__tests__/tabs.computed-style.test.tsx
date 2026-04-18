/**
 * TSK-04-02 / tabs-tabpanel-refactor: Tabs computed-style 단위 테스트 (happy-dom)
 *
 * QA 체크리스트:
 * - Tabs orientation별 flex-direction 스냅샷
 * - Tabs 가로/세로 방향 CSS 클래스 확인
 *
 * tabs-tabpanel-refactor: field.tabs[] → field.components(tabPanel[]) 구조로 전환.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import { TabsComponent } from '../tabs/Tabs';
import type { TabsSchema } from '../tabs/propsSchema';
import type { PureRenderProps } from '@form-js-designer/designer-core';

// Mock form-js FormField — see Tabs.test.tsx for rationale.
vi.mock('@bpmn-io/form-js-viewer', async (orig) => {
  const actual = (await (orig as () => Promise<Record<string, unknown>>)()) as Record<
    string,
    unknown
  >;
  return {
    ...actual,
    FormField: (props: { field: { id: string; type: string } }) => {
      const { h } = require('preact');
      return h('div', {
        class: 'fjs-element-stub',
        'data-id': props.field.id,
        'data-field-type': props.field.type,
      });
    },
  };
});

afterEach(() => {
  cleanup();
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderInFormContext(children: any) {
  return render(children);
}

function makeTabsProps(overrides?: Partial<TabsSchema>): PureRenderProps<TabsSchema> {
  const field: TabsSchema = {
    id: 'tabs-style-test',
    type: 'tabs',
    components: [
      { id: 'tabPanel_aaa-111', type: 'tabPanel', label: 'Tab A', components: [] },
      { id: 'tabPanel_bbb-222', type: 'tabPanel', label: 'Tab B', components: [] },
    ],
    defaultValue: 'tabPanel_aaa-111',
    orientation: 'horizontal',
    ...overrides,
  };
  return {
    field,
    value: null,
    domId: 'tabs-style-dom',
    errors: [],
    disabled: false,
    readonly: false,
  };
}

describe('Tabs computed-style — orientation', () => {
  it('horizontal orientation: data-orientation attribute is "horizontal"', () => {
    const Comp = TabsComponent.component;
    const { container } = renderInFormContext(<Comp {...makeTabsProps({ orientation: 'horizontal' })} />);
    const root = container.querySelector('[data-component="tabs"]');
    expect(root?.getAttribute('data-orientation')).toBe('horizontal');
  });

  it('vertical orientation: data-orientation attribute is "vertical"', () => {
    const Comp = TabsComponent.component;
    const { container } = renderInFormContext(<Comp {...makeTabsProps({ orientation: 'vertical' })} />);
    const root = container.querySelector('[data-component="tabs"]');
    expect(root?.getAttribute('data-orientation')).toBe('vertical');
  });

  it('tabs list container exists with role="tablist"', () => {
    const Comp = TabsComponent.component;
    const { container } = renderInFormContext(<Comp {...makeTabsProps()} />);
    const tablist = container.querySelector('[role="tablist"]');
    expect(tablist).toBeTruthy();
  });

  it('individual tab triggers have role="tab"', () => {
    const Comp = TabsComponent.component;
    const { container } = renderInFormContext(<Comp {...makeTabsProps()} />);
    const tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(2);
  });
});
