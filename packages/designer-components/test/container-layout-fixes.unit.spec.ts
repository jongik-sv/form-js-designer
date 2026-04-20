/**
 * container-layout-fixes — Unit Tests (TDD Red→Green)
 *
 * Bug 1: Card에 escapeGridRender:false 누락
 * Bug 2: CSS grid 음수마진 오버플로우 (CSS 직접 확인 불가 → defineComponent 경유 config 확인)
 * Bug 3: Tabs per-tab components 미구현
 */
import { describe, it, expect } from 'vitest';
import { CardComponent } from '../src/card/index';
import { ModalComponent } from '../src/modal/Modal';
import { TabsComponent } from '../src/tabs/Tabs';

// ---------------------------------------------------------------------------
// Bug 1: escapeGridRender: false 명시 여부
// ---------------------------------------------------------------------------
describe('Bug 1 — escapeGridRender: false must be explicitly set on containers', () => {
  it('CardComponent.config.escapeGridRender is false (not undefined)', () => {
    // undefined → falsy이지만 form-js가 Column wrapper를 쓰지 않음
    // false → 명시적으로 Column wrapper를 적용해 grid 가로배치 활성화
    expect(CardComponent.component.config.escapeGridRender).toBe(false);
  });

  it('ModalComponent.config.escapeGridRender is already false (regression guard)', () => {
    expect(ModalComponent.component.config.escapeGridRender).toBe(false);
  });

  it('TabsComponent.config.escapeGridRender is already false (regression guard)', () => {
    expect(TabsComponent.component.config.escapeGridRender).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Bug 1 추가: defineComponent create() 출력에 components 배열이 포함되어야 함
// ---------------------------------------------------------------------------
describe('Bug 1 — container create() includes components array', () => {
  it('CardComponent create() returns components: []', () => {
    const schema = CardComponent.create();
    expect(Array.isArray((schema as Record<string, unknown>)['components'])).toBe(true);
  });

  it('TabsComponent create() returns components: [] for backward compat', () => {
    const schema = TabsComponent.create();
    expect(Array.isArray((schema as Record<string, unknown>)['components'])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Bug 3: Tabs per-tab components — tabs-tabpanel-refactor 신 구조 기준
// ---------------------------------------------------------------------------
describe('Bug 3 — Tabs per-tab components (tabs-tabpanel-refactor)', () => {
  it('TabsComponent create() returns components array with tabPanel children', () => {
    // 신 구조: tabs[] 대신 components: TabPanelField[] 를 사용
    const schema = TabsComponent.create() as Record<string, unknown>;
    const comps = schema['components'] as Array<Record<string, unknown>>;
    expect(Array.isArray(comps)).toBe(true);
    // 각 child가 tabPanel 타입이어야 함
    for (const comp of comps) {
      expect(comp['type']).toBe('tabPanel');
      expect(Array.isArray(comp['components'])).toBe(true);
    }
  });

  it('TabsComponent create() default has 2 tabPanel children with empty components each', () => {
    const schema = TabsComponent.create() as Record<string, unknown>;
    const comps = schema['components'] as Array<Record<string, unknown>>;
    expect(comps).toHaveLength(2);
    expect(comps[0]).toMatchObject({ type: 'tabPanel', label: 'Tab 1', components: [] });
    expect(comps[1]).toMatchObject({ type: 'tabPanel', label: 'Tab 2', components: [] });
    expect(comps[0]['id']).toMatch(/^tabPanel_/);
    expect(comps[1]['id']).toMatch(/^tabPanel_/);
  });

  it('TabsComponent create() with custom options.components can override tabPanel list', () => {
    const customTabPanelId = 'tabPanel_custom-id';
    const schema = TabsComponent.create({
      components: [
        { id: customTabPanelId, type: 'tabPanel', label: 'A', components: [{ id: 'f1', type: 'text' }] },
        { id: 'tabPanel_custom-id-2', type: 'tabPanel', label: 'B', components: [] },
      ],
    }) as Record<string, unknown>;
    const comps = schema['components'] as Array<Record<string, unknown>>;
    expect(comps[0]['components']).toHaveLength(1);
    expect(comps[1]['components']).toHaveLength(0);
  });

  it('Tabs root-level components array is present', () => {
    // components 배열이 root에 존재해야 함 (신 구조: tabPanel 자식들)
    const schema = TabsComponent.create() as Record<string, unknown>;
    expect(Array.isArray(schema['components'])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Bug 3: DesignerFormLayouter recognizes tab pseudo-containers
// ---------------------------------------------------------------------------
describe('Bug 3 — DesignerFormLayouter tabId_ pseudo-container recognition', () => {
  it('calculateLayout does not throw for a tabs field with per-tab pseudo-containers', async () => {
    const { DesignerFormLayouter } = await import('@form-js-designer/designer-core');

    // Mock eventBus
    const mockEventBus = {
      on: () => {},
      off: () => {},
      fire: () => {},
    };

    const layouter = new DesignerFormLayouter(mockEventBus as unknown as never);

    const tabsField = {
      type: 'tabs',
      id: 'tabs-1',
      components: [
        { type: 'textfield', id: 'f1', layout: { row: 'row-1', columns: 8 } },
      ],
      tabs: [
        { label: 'Tab 1', value: 'tab1', components: [{ type: 'textfield', id: 'f1', layout: { row: 'row-1', columns: 8 } }] },
        { label: 'Tab 2', value: 'tab2', components: [] },
      ],
    };

    // Should not throw — tabs type is a DESIGNER_CONTAINER_TYPE
    expect(() => layouter.calculateLayout(tabsField as never)).not.toThrow();
  });

  it('calculateLayout handles card field with nested components', async () => {
    const { DesignerFormLayouter } = await import('@form-js-designer/designer-core');

    const mockEventBus = {
      on: () => {},
      off: () => {},
      fire: () => {},
    };

    const layouter = new DesignerFormLayouter(mockEventBus as unknown as never);

    const cardField = {
      type: 'card',
      id: 'card-1',
      components: [
        { type: 'textfield', id: 'f2', layout: { row: 'row-2', columns: 16 } },
        { type: 'textfield', id: 'f3', layout: { row: 'row-2', columns: 0 } },
      ],
    };

    expect(() => layouter.calculateLayout(cardField as never)).not.toThrow();
  });
});
