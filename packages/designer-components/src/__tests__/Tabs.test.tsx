/**
 * TSK-04-02 / tabs-tabpanel-refactor: Tabs 컴포넌트 단위 테스트
 *
 * QA 체크리스트 항목:
 * - defineComponent({ type: 'tabs', ... }) 반환값의 .component.config 메타데이터 5개 필드
 * - DesignerComponentsModule의 components 배열에 Tabs entry 포함
 * - Tabs 초기 렌더 시 tabPanel 기반 Trigger/Content 렌더
 * - 엣지 케이스: components:[] 빈 배열, defaultValue 미일치 fallback+warn
 *
 * tabs-tabpanel-refactor: field.tabs[] 기반 단언 → field.components(tabPanel[]) 기반으로 전환.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/preact';

// Mock form-js-viewer FormField to avoid deep form-js runtime deps in unit tests.
// Tabs.tsx delegates tabPanel render to form-js `FormField` so the `.fjs-element`
// wrapper lands in the DOM for drop routing. In unit tests (happy-dom, no form
// instance), we stub FormField with a minimal marker div — the outer Tabs
// structure (Radix Trigger/Content, data-component) is what these tests cover.
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
import { TabsComponent } from '../tabs/Tabs';
import { tabsPropsSchema } from '../tabs/propsSchema';
import type { TabsSchema } from '../tabs/propsSchema';
import type { PureRenderProps } from '@form-js-designer/designer-core';
import tabsSpec from '../tabs/spec.json';

/** Alias to keep the original test body shape; FormField is mocked globally above. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderInFormContext(children: any) {
  return render(children);
}

// ---------------------------------------------------------------------------
// 1. TabsComponent 메타데이터 검증
// ---------------------------------------------------------------------------
describe('TabsComponent defineComponent contract', () => {
  it('has type "tabs"', () => {
    expect(TabsComponent.type).toBe('tabs');
  });

  it('has a non-empty name string', () => {
    // name은 한국어('탭')로 설정됨 — 비어있지 않으면 충분
    expect(typeof TabsComponent.name).toBe('string');
    expect(TabsComponent.name.length).toBeGreaterThan(0);
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
// 2. create() 기본값 검증 — 신 tabPanel 구조
// ---------------------------------------------------------------------------
describe('TabsComponent.create()', () => {
  it('returns object with type "tabs"', () => {
    const created = TabsComponent.create!();
    expect(created.type).toBe('tabs');
  });

  it('has components array (not tabs[])', () => {
    const created = TabsComponent.create!();
    expect(Array.isArray(created.components)).toBe(true);
    // old tabs[] property must not be present
    expect((created as Record<string, unknown>).tabs).toBeUndefined();
  });

  it('has 2 default tabPanel children in components', () => {
    const created = TabsComponent.create!();
    const comps = created.components as Array<{ type: string }>;
    expect(comps.length).toBe(2);
    expect(comps[0].type).toBe('tabPanel');
    expect(comps[1].type).toBe('tabPanel');
  });

  it('has defaultValue matching first tabPanel id', () => {
    const created = TabsComponent.create!();
    const comps = created.components as Array<{ id: string }>;
    expect(created.defaultValue).toBe(comps[0].id);
  });

  it('has orientation defaulting to horizontal', () => {
    const created = TabsComponent.create!();
    expect(created.orientation).toBe('horizontal');
  });
});

// ---------------------------------------------------------------------------
// 3. TabsComponent 렌더 테스트 — field.components(tabPanel[]) 기반
// ---------------------------------------------------------------------------
function makeTabsProps(overrides?: Partial<TabsSchema>): PureRenderProps<TabsSchema> {
  const field: TabsSchema = {
    id: 'tabs-test',
    type: 'tabs',
    components: [
      { id: 'tabPanel_id-one', type: 'tabPanel', label: 'Tab One', components: [] },
      { id: 'tabPanel_id-two', type: 'tabPanel', label: 'Tab Two', components: [] },
    ],
    defaultValue: 'tabPanel_id-one',
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
    expect(() => renderInFormContext(<Comp {...makeTabsProps()} />)).not.toThrow();
  });

  it('renders tab triggers with correct labels (from tabPanel.label)', () => {
    const Comp = TabsComponent.component;
    const { container } = renderInFormContext(<Comp {...makeTabsProps()} />);
    expect(within(container).getAllByText('Tab One').length).toBeGreaterThan(0);
    expect(within(container).getAllByText('Tab Two').length).toBeGreaterThan(0);
  });

  it('renders data-component="tabs" root element', () => {
    const Comp = TabsComponent.component;
    renderInFormContext(<Comp {...makeTabsProps()} />);
    expect(document.querySelector('[data-component="tabs"]')).toBeTruthy();
  });

  it('root element has correct id from domId', () => {
    const Comp = TabsComponent.component;
    renderInFormContext(<Comp {...makeTabsProps()} />);
    expect(document.getElementById('tabs-test-dom')).toBeTruthy();
  });

  it('orientation="vertical" sets data-orientation attribute', () => {
    const Comp = TabsComponent.component;
    const { container } = renderInFormContext(<Comp {...makeTabsProps({ orientation: 'vertical' })} />);
    const root = container.querySelector('[data-component="tabs"]');
    expect(root?.getAttribute('data-orientation')).toBe('vertical');
  });

  it('renders Radix Trigger for each tabPanel child', () => {
    const Comp = TabsComponent.component;
    const { container } = renderInFormContext(<Comp {...makeTabsProps()} />);
    const triggers = container.querySelectorAll('[role="tab"]');
    expect(triggers.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 4. 엣지 케이스: 빈 components 배열
// ---------------------------------------------------------------------------
describe('TabsComponent edge cases — empty components', () => {
  it('renders without error when components is empty array', () => {
    const Comp = TabsComponent.component;
    const props = makeTabsProps({ components: [], defaultValue: '' });
    expect(() => renderInFormContext(<Comp {...props} />)).not.toThrow();
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

  it('warns when defaultValue is not in tabPanel ids', () => {
    const Comp = TabsComponent.component;
    renderInFormContext(
      <Comp
        {...makeTabsProps({
          components: [{ id: 'tabPanel_id-one', type: 'tabPanel', label: 'Tab 1', components: [] }],
          defaultValue: 'nonexistent-id',
        })}
      />,
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Tabs]'),
    );
  });

  it('still renders (fallback to first tabPanel) when defaultValue mismatches', () => {
    const Comp = TabsComponent.component;
    expect(() =>
      renderInFormContext(
        <Comp
          {...makeTabsProps({
            components: [{ id: 'tabPanel_id-one', type: 'tabPanel', label: 'Tab 1', components: [] }],
            defaultValue: 'nonexistent-id',
          })}
        />,
      ),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 6. 엣지 케이스: tabPanel.label 빈 문자열 → warn
// ---------------------------------------------------------------------------
describe('TabsComponent edge cases — empty tabPanel label', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('warns when tabPanel label is empty string', () => {
    const Comp = TabsComponent.component;
    renderInFormContext(
      <Comp
        {...makeTabsProps({
          components: [{ id: 'tabPanel_id-one', type: 'tabPanel', label: '', components: [] }],
          defaultValue: 'tabPanel_id-one',
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

  it('has defaultValue, orientation properties', () => {
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
