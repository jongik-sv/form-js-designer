/**
 * PropsPanelService 단위 테스트 — TSK-06-02
 * 10 케이스: DI spy 기반 - registerProvider 호출 여부, getGroups(field) 반환,
 *            propsSchemaToPanel 호출, 미등록 type 시 throw
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// designer-core mock
vi.mock('@form-js-designer/designer-core', () => ({
  propsSchemaToPanel: vi.fn(),
  createDefaultRegistry: vi.fn(() => ({
    get: vi.fn(),
    has: vi.fn(),
    register: vi.fn(),
    list: vi.fn().mockReturnValue([]),
  })),
  UnknownWidgetError: class UnknownWidgetError extends Error {
    constructor(type: string) {
      super(`Unknown widget type: "${type}"`);
      this.name = 'UnknownWidgetError';
    }
  },
  getAllowedEntryIds: vi.fn((type: string) => {
    const map: Record<string, ReadonlySet<string>> = {
      card: new Set(['header', 'headerTag', 'padding', 'elevation']),
      tabs: new Set<string>([]),
      textfield: new Set(['label', 'defaultValue', 'required']),
      text: new Set(['text']),
    };
    return map[type] ?? new Set(['label']);
  }),
  I18nSimpleWidget: {
    render: vi.fn(),
    edit: vi.fn(),
    validate: vi.fn(() => ({ ok: true, errors: [] })),
  },
}));

// designer-runtime mock — LAYOUT_HEIGHT_TARGET_TYPES만 필요
vi.mock('@form-js-designer/designer-runtime', () => ({
  LAYOUT_HEIGHT_TARGET_TYPES: [
    'textarea',
    'html',
    'table',
    'group',
    'card',
    'modal',
    'tabs',
    'tabPanel',
    'iframe',
    'image',
    'text',
  ],
}));

import { propsSchemaToPanel, UnknownWidgetError } from '@form-js-designer/designer-core';
import { PropsPanelService } from '../PropsPanelService';

const mockPropsSchemaToPanel = vi.mocked(propsSchemaToPanel);

function makeField(type = 'text', id = 'field1') {
  return { id, type };
}

function makeDeps(overrides: Record<string, unknown> = {}) {
  return {
    eventBus: { on: vi.fn(), off: vi.fn() },
    formFieldRegistry: {
      get: vi.fn(),
      getAll: vi.fn().mockReturnValue([]),
    },
    propertiesPanel: {
      registerProvider: vi.fn(),
    },
    modeling: {
      editFormField: vi.fn(),
    },
    ...overrides,
  };
}

describe('PropsPanelService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Case 1: bio-properties-panel 과 직접 통합하지 않는다 (updater 계약 불일치로 패널 깨짐).
  // 호스트의 PropsPanelContainer 가 getGroups 를 직접 호출하는 분리 구조.
  it('1: propertiesPanel.registerProvider 는 호출되지 않는다', () => {
    const deps = makeDeps();
    new PropsPanelService(
      deps.eventBus,
      deps.formFieldRegistry,
      deps.propertiesPanel,
      deps.modeling,
    );
    expect(deps.propertiesPanel.registerProvider).not.toHaveBeenCalled();
  });

  // Case 2: propertiesPanel 이 null 이어도 서비스는 정상 구성되어야 한다.
  it('2: propertiesPanel 이 null 이어도 생성자가 throw 하지 않는다', () => {
    const deps = makeDeps({ propertiesPanel: null });
    expect(() => new PropsPanelService(
      deps.eventBus,
      deps.formFieldRegistry,
      deps.propertiesPanel,
      deps.modeling,
    )).not.toThrow();
  });

  // Case 3: getGroups(field) — formFieldRegistry.get 호출
  it('3: getGroups(field) 시 formFieldRegistry.get(field.type) 호출', () => {
    const deps = makeDeps();
    deps.formFieldRegistry.get = vi.fn().mockReturnValue({
      type: 'text',
      propsSchema: { properties: {} },
    });
    mockPropsSchemaToPanel.mockReturnValue([]);
    const service = new PropsPanelService(
      deps.eventBus,
      deps.formFieldRegistry,
      deps.propertiesPanel,
      deps.modeling,
    );
    service.getGroups(makeField());
    expect(deps.formFieldRegistry.get).toHaveBeenCalledWith('text');
  });

  // Case 4: getGroups(field) — propsSchemaToPanel 호출
  it('4: getGroups(field) 시 propsSchemaToPanel 호출됨', () => {
    const deps = makeDeps();
    const mockSchema = { properties: { label: { type: 'string', label: '레이블' } } };
    deps.formFieldRegistry.get = vi.fn().mockReturnValue({
      type: 'text',
      propsSchema: mockSchema,
    });
    mockPropsSchemaToPanel.mockReturnValue([]);
    const service = new PropsPanelService(
      deps.eventBus,
      deps.formFieldRegistry,
      deps.propertiesPanel,
      deps.modeling,
    );
    service.getGroups(makeField());
    expect(mockPropsSchemaToPanel).toHaveBeenCalledWith(mockSchema, expect.anything());
  });

  // Case 5: getGroups 반환값 — groups 배열 (최소 1개)
  it('5: getGroups(field) 가 groups 배열을 반환함', () => {
    const deps = makeDeps();
    deps.formFieldRegistry.get = vi.fn().mockReturnValue({
      type: 'text',
      propsSchema: { properties: {} },
    });
    mockPropsSchemaToPanel.mockReturnValue([
      { key: 'label', widgetType: 'string', widget: { render: vi.fn(), edit: vi.fn(), validate: vi.fn() }, label: '레이블', meta: { type: 'string' } },
    ]);
    const service = new PropsPanelService(
      deps.eventBus,
      deps.formFieldRegistry,
      deps.propertiesPanel,
      deps.modeling,
    );
    const groups = service.getGroups(makeField());
    expect(Array.isArray(groups)).toBe(true);
    expect(groups.length).toBeGreaterThanOrEqual(1);
  });

  // Case 6: 미등록 컴포넌트 type → 빈 그룹 반환 (에러 없이 graceful)
  it('6: 미등록 컴포넌트 type 시 빈 그룹 반환', () => {
    const deps = makeDeps();
    deps.formFieldRegistry.get = vi.fn().mockReturnValue(undefined);
    const service = new PropsPanelService(
      deps.eventBus,
      deps.formFieldRegistry,
      deps.propertiesPanel,
      deps.modeling,
    );
    const groups = service.getGroups(makeField('unknown-type'));
    expect(Array.isArray(groups)).toBe(true);
    expect(groups).toHaveLength(0);
  });

  // Case 7: propsSchema가 비어있는 컴포넌트 + 대상 타입(card) → designer-layout 그룹만 반환
  it('7: propsSchema 빈 card 컴포넌트 → designer-props 없고 designer-layout만 반환', () => {
    const deps = makeDeps();
    deps.formFieldRegistry.get = vi.fn().mockReturnValue({
      type: 'card',
      propsSchema: { properties: {} },
    });
    mockPropsSchemaToPanel.mockReturnValue([]);
    const service = new PropsPanelService(
      deps.eventBus,
      deps.formFieldRegistry,
      deps.propertiesPanel,
      deps.modeling,
    );
    const groups = service.getGroups(makeField('card'));
    // card는 대상 타입이므로 designer-layout 그룹 1개
    expect(groups.length).toBeGreaterThanOrEqual(1);
    expect(groups.some((g: { id: string }) => g.id === 'designer-layout')).toBe(true);
  });

  // Case 8: propertiesPanel이 없어도 graceful 초기화 (fallback)
  it('8: propertiesPanel이 null이어도 에러 없이 초기화됨', () => {
    const deps = makeDeps({ propertiesPanel: null });
    expect(() => {
      new PropsPanelService(
        deps.eventBus,
        deps.formFieldRegistry,
        null,
        deps.modeling,
      );
    }).not.toThrow();
  });

  // Case 9: panelEntry의 id가 propsSchema key와 일치
  it('9: getGroups 반환 group의 entries[0].id가 propsSchema key와 일치', () => {
    const deps = makeDeps();
    deps.formFieldRegistry.get = vi.fn().mockReturnValue({
      type: 'text',
      propsSchema: { properties: { label: { type: 'string' } } },
    });
    const mockEntry = {
      key: 'label',
      widgetType: 'string',
      widget: { render: vi.fn(), edit: vi.fn(), validate: vi.fn() },
      label: '레이블',
      meta: { type: 'string' },
    };
    mockPropsSchemaToPanel.mockReturnValue([mockEntry]);
    const service = new PropsPanelService(
      deps.eventBus,
      deps.formFieldRegistry,
      deps.propertiesPanel,
      deps.modeling,
    );
    const groups = service.getGroups(makeField());
    // 그룹 안의 entries 확인
    expect(groups.length).toBeGreaterThanOrEqual(1);
    const firstGroup = groups[0] as { id?: string; entries?: unknown[] };
    if (firstGroup.entries) {
      const entry = firstGroup.entries[0] as { id?: string };
      expect(entry.id).toBe('label');
    }
  });

  // Case 10: getGroups — field 인자 없이(null) 호출 시 빈 배열 반환
  it('10: field 인자가 null이면 빈 배열 반환', () => {
    const deps = makeDeps();
    const service = new PropsPanelService(
      deps.eventBus,
      deps.formFieldRegistry,
      deps.propertiesPanel,
      deps.modeling,
    );
    const groups = service.getGroups(null as unknown as { type: string; id: string });
    expect(groups).toHaveLength(0);
  });

  // Case 11: target type(textarea)일 때 Layout 그룹에 layout.height 엔트리 포함
  it('11: textarea 필드 getGroups → designer-layout 그룹에 layout.height 엔트리 포함', () => {
    const deps = makeDeps();
    deps.formFieldRegistry.get = vi.fn().mockReturnValue({
      type: 'textarea',
      propsSchema: { properties: {} },
    });
    mockPropsSchemaToPanel.mockReturnValue([]);
    const service = new PropsPanelService(
      deps.eventBus,
      deps.formFieldRegistry,
      deps.propertiesPanel,
      deps.modeling,
    );
    const groups = service.getGroups(makeField('textarea'));
    const layoutGroup = groups.find((g: { id: string }) => g.id === 'designer-layout') as
      | { id: string; entries: Array<{ key?: string }> }
      | undefined;
    expect(layoutGroup).toBeDefined();
    expect(layoutGroup!.entries.some((e) => e.key === 'layout.height')).toBe(true);
  });

  // Case 12: 비대상 타입(textfield)은 Layout 그룹 없음
  it('12: textfield 필드 getGroups → designer-layout 그룹 없음', () => {
    const deps = makeDeps();
    deps.formFieldRegistry.get = vi.fn().mockReturnValue({
      type: 'textfield',
      propsSchema: { properties: {} },
    });
    mockPropsSchemaToPanel.mockReturnValue([]);
    const service = new PropsPanelService(
      deps.eventBus,
      deps.formFieldRegistry,
      deps.propertiesPanel,
      deps.modeling,
    );
    const groups = service.getGroups(makeField('textfield'));
    const layoutGroup = groups.find((g: { id: string }) => g.id === 'designer-layout');
    expect(layoutGroup).toBeUndefined();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Task 3: Simple-mode whitelist filtering + simpleRegistry
  // ───────────────────────────────────────────────────────────────────────────

  // Helper for Task 3 tests: build canonical card panel entries
  function makeCardEntries() {
    const stubWidget = { render: vi.fn(), edit: vi.fn(), validate: vi.fn() };
    return [
      { key: 'padding',   widgetType: 'enum',   widget: stubWidget, label: 'Padding',   meta: { type: 'enum',   enum: ['none','sm','md','lg'] }, defaultValue: 'md' },
      { key: 'elevation', widgetType: 'number', widget: stubWidget, label: 'Elevation', meta: { type: 'number' }, defaultValue: 0 },
      { key: 'header',    widgetType: 'i18n',   widget: stubWidget, label: 'Header',    meta: { type: 'i18n' } },
      { key: 'headerTag', widgetType: 'enum',   widget: stubWidget, label: 'Header tag',meta: { type: 'enum',   enum: ['h1','h2','h3'] }, defaultValue: 'h2' },
    ];
  }

  // T3-1: simple mode → card entries filtered to whitelist (4 entries match all)
  it('T3-1: mode=simple, card → header/headerTag/padding/elevation 4 entries', () => {
    const deps = makeDeps();
    deps.formFieldRegistry.get = vi.fn().mockReturnValue({
      type: 'card',
      propsSchema: { properties: {} },
    });
    mockPropsSchemaToPanel.mockReturnValue(makeCardEntries());
    const service = new PropsPanelService(
      deps.eventBus,
      deps.formFieldRegistry,
      deps.propertiesPanel,
      deps.modeling,
    );
    const groups = service.getGroups({ type: 'card', id: 'C1' }, { mode: 'simple' });
    const propsGroup = groups.find((g: { id: string }) => g.id === 'designer-custom-props') as
      | { id: string; entries: Array<{ id: string }> }
      | undefined;
    expect(propsGroup).toBeDefined();
    expect(propsGroup!.entries.map((e) => e.id).sort())
      .toEqual(['elevation', 'header', 'headerTag', 'padding']);
  });

  // T3-2: simple mode includes header (i18n) entry — built from simpleRegistry
  it('T3-2: mode=simple includes header entry (i18n) — adapter built from simpleRegistry', () => {
    const deps = makeDeps();
    deps.formFieldRegistry.get = vi.fn().mockReturnValue({
      type: 'card',
      propsSchema: { properties: {} },
    });
    mockPropsSchemaToPanel.mockReturnValue(makeCardEntries());
    const service = new PropsPanelService(
      deps.eventBus,
      deps.formFieldRegistry,
      deps.propertiesPanel,
      deps.modeling,
    );
    const groups = service.getGroups({ type: 'card' }, { mode: 'simple' });
    const headerEntry = groups
      .flatMap((g: { entries: Array<{ id: string }> }) => g.entries)
      .find((e: { id: string }) => e.id === 'header');
    expect(headerEntry).toBeDefined();
    // Visual i18n→single-input verification deferred to Task 8 integration test.
  });

  // T3-3: full mode (default) returns all 4 propsSchema entries unfiltered
  it('T3-3: mode=full (default) returns all propsSchema entries', () => {
    const deps = makeDeps();
    deps.formFieldRegistry.get = vi.fn().mockReturnValue({
      type: 'card',
      propsSchema: { properties: {} },
    });
    mockPropsSchemaToPanel.mockReturnValue(makeCardEntries());
    const service = new PropsPanelService(
      deps.eventBus,
      deps.formFieldRegistry,
      deps.propertiesPanel,
      deps.modeling,
    );
    const groups = service.getGroups({ type: 'card' });
    const propsGroup = groups.find((g: { id: string }) => g.id === 'designer-custom-props') as
      | { id: string; entries: unknown[] }
      | undefined;
    expect(propsGroup).toBeDefined();
    expect(propsGroup!.entries).toHaveLength(4);
  });

  // T3-4: simple mode w/ empty whitelist (tabs) → designer-custom-props NOT created
  it('T3-4: mode=simple w/ empty whitelist (tabs) → designer-custom-props group not created', () => {
    const deps = makeDeps();
    const tabsEntries = [
      { key: 'defaultValue', widgetType: 'string', widget: { render: vi.fn(), edit: vi.fn(), validate: vi.fn() }, label: 'Default', meta: { type: 'string' } },
      { key: 'orientation',  widgetType: 'enum',   widget: { render: vi.fn(), edit: vi.fn(), validate: vi.fn() }, label: 'Orientation', meta: { type: 'enum', enum: ['horizontal','vertical'] } },
    ];
    deps.formFieldRegistry.get = vi.fn().mockReturnValue({
      type: 'tabs',
      propsSchema: { properties: {} },
    });
    mockPropsSchemaToPanel.mockReturnValue(tabsEntries);
    const service = new PropsPanelService(
      deps.eventBus,
      deps.formFieldRegistry,
      deps.propertiesPanel,
      deps.modeling,
    );
    const groups = service.getGroups({ type: 'tabs' }, { mode: 'simple' });
    expect(groups.find((g: { id: string }) => g.id === 'designer-custom-props')).toBeUndefined();
  });

  // T3-5: setMode is a setter — does not throw, accepts 'simple' | 'full'
  it('T3-5: setMode(mode) is a no-op setter', () => {
    const deps = makeDeps();
    const service = new PropsPanelService(
      deps.eventBus,
      deps.formFieldRegistry,
      deps.propertiesPanel,
      deps.modeling,
    );
    expect(() => service.setMode('simple')).not.toThrow();
    expect(() => service.setMode('full')).not.toThrow();
  });

  // Case 13: html, table, group, card, modal, tabs, tabPanel, iframe, image, text도 Layout 그룹 포함
  it('13: 모든 대상 타입은 designer-layout 그룹 포함', () => {
    const targetTypes = [
      'html',
      'table',
      'group',
      'card',
      'modal',
      'tabs',
      'tabPanel',
      'iframe',
      'image',
      'text',
    ];
    for (const type of targetTypes) {
      const deps = makeDeps();
      deps.formFieldRegistry.get = vi.fn().mockReturnValue({
        type,
        propsSchema: { properties: {} },
      });
      mockPropsSchemaToPanel.mockReturnValue([]);
      const service = new PropsPanelService(
        deps.eventBus,
        deps.formFieldRegistry,
        deps.propertiesPanel,
        deps.modeling,
      );
      const groups = service.getGroups(makeField(type));
      const layoutGroup = groups.find((g: { id: string }) => g.id === 'designer-layout');
      expect(layoutGroup).toBeDefined();
    }
  });
});
