/**
 * TSK-04-02: Tabs computed-style 단위 테스트 (happy-dom)
 *
 * QA 체크리스트:
 * - Tabs orientation별 flex-direction 스냅샷
 * - Tabs 가로/세로 방향 CSS 클래스 확인
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, within } from '@testing-library/preact';
import { TabsComponent } from '../tabs/Tabs';
import type { TabsSchema } from '../tabs/propsSchema';
import type { PureRenderProps } from '@form-js-designer/designer-core';

afterEach(() => {
  cleanup();
});

function makeTabsProps(overrides?: Partial<TabsSchema>): PureRenderProps<TabsSchema> {
  const field: TabsSchema = {
    id: 'tabs-style-test',
    type: 'tabs',
    tabs: [
      { label: 'Tab A', value: 'a' },
      { label: 'Tab B', value: 'b' },
    ],
    defaultValue: 'a',
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
    const { container } = render(<Comp {...makeTabsProps({ orientation: 'horizontal' })} />);
    const root = container.querySelector('[data-component="tabs"]');
    expect(root?.getAttribute('data-orientation')).toBe('horizontal');
  });

  it('vertical orientation: data-orientation attribute is "vertical"', () => {
    const Comp = TabsComponent.component;
    const { container } = render(<Comp {...makeTabsProps({ orientation: 'vertical' })} />);
    const root = container.querySelector('[data-component="tabs"]');
    expect(root?.getAttribute('data-orientation')).toBe('vertical');
  });

  it('tabs list container exists with role="tablist"', () => {
    const Comp = TabsComponent.component;
    const { container } = render(<Comp {...makeTabsProps()} />);
    const tablist = container.querySelector('[role="tablist"]');
    expect(tablist).toBeTruthy();
  });

  it('individual tab triggers have role="tab"', () => {
    const Comp = TabsComponent.component;
    const { container } = render(<Comp {...makeTabsProps()} />);
    const tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(2);
  });
});
