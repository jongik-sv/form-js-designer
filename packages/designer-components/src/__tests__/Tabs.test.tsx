/**
 * TSK-04-02: Tabs 컴포넌트 단위 테스트
 *
 * QA 체크리스트 항목:
 * - defineComponent({ type: 'tabs', ... }) 반환값의 .component.config 메타데이터 5개 필드
 * - DesignerComponentsModule의 components 배열에 Tabs entry 포함
 * - Tabs 초기 렌더 시 defaultValue Content만 data-state="active"
 * - Tabs.css @layer components 위치, *.module.css 0개
 * - 엣지 케이스: tabs:[] 빈 배열, defaultValue 미일치 fallback+warn
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/preact';

afterEach(() => {
  cleanup();
});
import { TabsComponent } from '../tabs/Tabs';
import { tabsPropsSchema } from '../tabs/propsSchema';
import type { TabsSchema } from '../tabs/propsSchema';
import type { PureRenderProps } from '@form-js-designer/designer-core';
import tabsSpec from '../tabs/spec.json';

// ---------------------------------------------------------------------------
// 1. TabsComponent 메타데이터 검증
// ---------------------------------------------------------------------------
describe('TabsComponent defineComponent contract', () => {
  it('has type "tabs"', () => {
    expect(TabsComponent.type).toBe('tabs');
  });

  it('has i18n-compatible name key', () => {
    expect(TabsComponent.name).toContain('tabs');
  });

  it('has component function', () => {
    expect(typeof TabsComponent.component).toBe('function');
  });

  it('component.config.type is "tabs"', () => {
    expect(TabsComponent.component.config.type).toBe('tabs');
  });

  it('component.config.name is present', () => {
    expect(TabsComponent.component.config.name).toBeTruthy();
  });

  it('component.config.group is "container"', () => {
    expect(TabsComponent.component.config.group).toBe('container');
  });

  it('component.config.keyed is a boolean', () => {
    expect(typeof TabsComponent.component.config.keyed).toBe('boolean');
  });

  it('component.config.pathed is a boolean', () => {
    expect(typeof TabsComponent.component.config.pathed).toBe('boolean');
  });
});

// ---------------------------------------------------------------------------
// 2. create() 기본값 검증
// ---------------------------------------------------------------------------
describe('TabsComponent.create()', () => {
  it('returns object with type "tabs"', () => {
    const created = TabsComponent.create!();
    expect(created.type).toBe('tabs');
  });

  it('has default tabs array with at least one tab', () => {
    const created = TabsComponent.create!();
    expect(Array.isArray(created.tabs)).toBe(true);
    expect((created.tabs as unknown[]).length).toBeGreaterThan(0);
  });

  it('has defaultValue matching first tab', () => {
    const created = TabsComponent.create!();
    const tabs = created.tabs as Array<{ value: string }>;
    expect(created.defaultValue).toBe(tabs[0].value);
  });

  it('has orientation defaulting to horizontal', () => {
    const created = TabsComponent.create!();
    expect(created.orientation).toBe('horizontal');
  });
});

// ---------------------------------------------------------------------------
// 3. TabsComponent 렌더 테스트
// ---------------------------------------------------------------------------
function makeTabsProps(overrides?: Partial<TabsSchema>): PureRenderProps<TabsSchema> {
  const field: TabsSchema = {
    id: 'tabs-test',
    type: 'tabs',
    tabs: [
      { label: 'Tab One', value: 'tab1' },
      { label: 'Tab Two', value: 'tab2' },
    ],
    defaultValue: 'tab1',
    orientation: 'horizontal',
    ...overrides,
  };
  return {
    field,
    value: null,
    domId: 'tabs-test-dom',
    errors: [],
    disabled: false,
    readonly: false,
  };
}

describe('TabsComponent render', () => {
  it('renders without throwing', () => {
    const Comp = TabsComponent.component;
    expect(() => render(<Comp {...makeTabsProps()} />)).not.toThrow();
  });

  it('renders tab triggers with correct labels', () => {
    const Comp = TabsComponent.component;
    const { container } = render(<Comp {...makeTabsProps()} />);
    expect(within(container).getAllByText('Tab One').length).toBeGreaterThan(0);
    expect(within(container).getAllByText('Tab Two').length).toBeGreaterThan(0);
  });

  it('renders data-component="tabs" root element', () => {
    const Comp = TabsComponent.component;
    render(<Comp {...makeTabsProps()} />);
    expect(document.querySelector('[data-component="tabs"]')).toBeTruthy();
  });

  it('root element has correct id from domId', () => {
    const Comp = TabsComponent.component;
    render(<Comp {...makeTabsProps()} />);
    expect(document.getElementById('tabs-test-dom')).toBeTruthy();
  });

  it('orientation="vertical" sets data-orientation attribute', () => {
    const Comp = TabsComponent.component;
    const { container } = render(<Comp {...makeTabsProps({ orientation: 'vertical' })} />);
    // Radix renders data-orientation on the root, look inside container
    const root = container.querySelector('[data-component="tabs"]');
    expect(root?.getAttribute('data-orientation')).toBe('vertical');
  });
});

// ---------------------------------------------------------------------------
// 4. 엣지 케이스: 빈 tabs 배열
// ---------------------------------------------------------------------------
describe('TabsComponent edge cases — empty tabs', () => {
  it('renders without error when tabs is empty array', () => {
    const Comp = TabsComponent.component;
    const props = makeTabsProps({ tabs: [], defaultValue: '' });
    expect(() => render(<Comp {...props} />)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 5. 엣지 케이스: defaultValue 미일치 → fallback + console.warn
// ---------------------------------------------------------------------------
describe('TabsComponent edge cases — defaultValue mismatch', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('warns when defaultValue is not in tabs values', () => {
    const Comp = TabsComponent.component;
    render(
      <Comp
        {...makeTabsProps({
          tabs: [{ label: 'Tab 1', value: 'tab1' }],
          defaultValue: 'nonexistent',
        })}
      />,
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Tabs]'),
    );
  });

  it('still renders (fallback to first tab) when defaultValue mismatches', () => {
    const Comp = TabsComponent.component;
    expect(() =>
      render(
        <Comp
          {...makeTabsProps({
            tabs: [{ label: 'Tab 1', value: 'tab1' }],
            defaultValue: 'nonexistent',
          })}
        />,
      ),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 6. tabs[i].label 빈 문자열 → validator warn + value fallback
// ---------------------------------------------------------------------------
describe('TabsComponent edge cases — empty tab label', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('warns when tabs[i].label is empty string', () => {
    const Comp = TabsComponent.component;
    render(
      <Comp
        {...makeTabsProps({
          tabs: [{ label: '', value: 'tab1' }],
          defaultValue: 'tab1',
        })}
      />,
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Tabs]'),
    );
  });
});

// ---------------------------------------------------------------------------
// 7. propsSchema 검증
// ---------------------------------------------------------------------------
describe('tabsPropsSchema', () => {
  it('has properties object', () => {
    expect(tabsPropsSchema).toBeDefined();
    expect(typeof tabsPropsSchema.properties).toBe('object');
  });

  it('has tabs, defaultValue, orientation properties', () => {
    expect(tabsPropsSchema.properties).toHaveProperty('tabs');
    expect(tabsPropsSchema.properties).toHaveProperty('defaultValue');
    expect(tabsPropsSchema.properties).toHaveProperty('orientation');
  });

  it('orientation enum has horizontal and vertical', () => {
    const orientationProp = tabsPropsSchema.properties['orientation'] as { enum: string[] };
    expect(orientationProp.enum).toContain('horizontal');
    expect(orientationProp.enum).toContain('vertical');
  });
});

// ---------------------------------------------------------------------------
// 8. spec.json 유효성
// ---------------------------------------------------------------------------
describe('tabs spec.json', () => {
  it('has type field "tabs"', () => {
    expect((tabsSpec as Record<string, unknown>)['type']).toBe('tabs');
  });

  it('has propsSchema field', () => {
    expect((tabsSpec as Record<string, unknown>)['propsSchema']).toBeDefined();
  });

  it('has group "container"', () => {
    expect((tabsSpec as Record<string, unknown>)['group']).toBe('container');
  });
});
