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
      separator: new Set<string>([]),
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
  SIMPLE_MODE_HIDDEN_GROUPS: new Set([
    'condition', 'customProperties', 'custom-values',
    'appearance', 'serialization', 'constraints', 'security',
    'group-condition', 'group-customProperties', 'group-custom-values',
    'group-appearance', 'group-serialization', 'group-constraints', 'group-security',
  ]),
  SIMPLE_MODE_PASSTHROUGH_GROUPS: new Set([
    'columns', 'layout',
    'group-columns', 'group-layout',
    'staticOptions', 'group-staticOptions',
    'valuesSource', 'group-valuesSource',
  ]),
  // panelModeStorage was promoted from `./panelModeStorage` to designer-core.
  // The service constructor seeds `currentMode` via readStoredPanelMode, so
  // the mock must export it. We replicate the real helper's behaviour
  // (read sessionStorage['designer.panelMode'], strict === 'full' check,
  // SSR/quota guard) rather than hard-coding 'simple', because T4-FU2
  // explicitly seeds sessionStorage to verify constructor-time pickup.
  PANEL_MODE_STORAGE_KEY: 'designer.panelMode',
  readStoredPanelMode: vi.fn(() => {
    try {
      if (typeof window === 'undefined') return 'simple';
      return window.sessionStorage.getItem('designer.panelMode') === 'full' ? 'full' : 'simple';
    } catch {
      return 'simple';
    }
  }),
}));

// designer-runtime mock — FU-A: 19종으로 확장된 LAYOUT_HEIGHT_TARGET_TYPES
vi.mock('@form-js-designer/designer-runtime', () => ({
  LAYOUT_HEIGHT_TARGET_TYPES: [
    // Input
    'textarea',
    'filepicker',
    // Selection
    'checklist',
    'radio',
    // Presentation
    'text',
    'html',
    'image',
    'spacer',
    'separator',
    'expression',
    // Containers
    'group',
    'card',
    'modal',
    'tabs',
    'tabPanel',
    // Extra
    'chartPlaceholder',
    'tree',
    'table',
    'iframe',
  ],
}));

// designer-i18n mock — returns real ko translations for keys in the dictionary
vi.mock('@form-js-designer/designer-i18n', () => {
  const koDict: Record<string, string> = {
    'designer.components.image.imageSource': '이미지 소스',
    'designer.components.image.altText': '대체 텍스트',
    'designer.components.chartPlaceholder.chartType': '차트 종류',
    'designer.components.chartPlaceholder.title': '제목',
    'designer.components.card.padding': '여백',
    'designer.components.card.elevation': '그림자',
  };
  return {
    createKoT: vi.fn(() => (key: string) => koDict[key] ?? key),
  };
});

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
    // FU-2: ensure no stale sessionStorage state leaks between tests now that
    // PropsPanelService seeds currentMode from `designer.panelMode`.
    try { window.sessionStorage.removeItem('designer.panelMode'); } catch { /* SSR */ }
  });

  // Case 1 (Task 4): native filter provider 등록 — priority 500, getGroups 함수 형태.
  // bio-properties-panel updater 계약: getGroups(field) → (groups) => groups.
  it('1: propertiesPanel.registerProvider(provider, 500) 호출 — Task 4 native filter', () => {
    const deps = makeDeps();
    new PropsPanelService(
      deps.eventBus,
      deps.formFieldRegistry,
      deps.propertiesPanel,
      deps.modeling,
    );
    expect(deps.propertiesPanel.registerProvider).toHaveBeenCalledTimes(1);
    const [provider, priority] = deps.propertiesPanel.registerProvider.mock.calls[0]!;
    expect(priority).toBe(500);
    expect(typeof (provider as { getGroups?: unknown }).getGroups).toBe('function');
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

  // Case 7: propsSchema가 비어있는 컴포넌트 + 대상 타입(card) → FU-A: card는 non-spacer이므로 layout 그룹 없음
  it('7: propsSchema 빈 card 컴포넌트 → designer-props도 없고 designer-layout도 없음 (FU-A)', () => {
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
    // FU-A: card는 non-spacer 타입 → layout entry 없음 (ResizeHandle로만 조절)
    expect(groups.some((g: { id: string }) => g.id === 'designer-layout')).toBe(false);
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

  // Case 11: FU-A: textarea는 LAYOUT_HEIGHT_TARGET_TYPES에 포함되지만
  //          Properties 패널 layout entry는 spacer 전용이므로 designer-layout 그룹 없음.
  //          ResizeHandle을 통해서만 높이 조절 가능.
  it('11: textarea 필드 getGroups → FU-A: designer-layout 그룹 없음 (ResizeHandle 전용)', () => {
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
    // FU-A: non-spacer는 layout entry 없음
    const layoutGroup = groups.find((g: { id: string }) => g.id === 'designer-layout');
    expect(layoutGroup).toBeUndefined();
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

  // T3-1: simple mode → card entries flattened into designer-simple-merged
  // FU-A: card is a non-spacer type, so layout.height entry is NOT included.
  // Only the 4 whitelisted custom-prop entries appear in the merged group.
  it('T3-1: mode=simple, card → designer-simple-merged with custom-props only (FU-A: no layout.height)', () => {
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
    expect(groups).toHaveLength(1);
    const merged = groups[0] as { id: string; label?: string; entries: Array<{ id: string }> };
    expect(merged.id).toBe('designer-simple-merged');
    // No header label — PropsPanelContainer skips <h4> when label is missing.
    expect(merged.label).toBeUndefined();
    // FU-A: card is non-spacer → no layout.height in merged
    expect(merged.entries.map((e) => e.id).sort())
      .toEqual(['elevation', 'header', 'headerTag', 'padding']);
    // Legacy two-group shape must NOT be returned in Simple mode.
    expect(groups.find((g: { id: string }) => g.id === 'designer-custom-props')).toBeUndefined();
    expect(groups.find((g: { id: string }) => g.id === 'designer-layout')).toBeUndefined();
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

  // T3-4: simple mode w/ empty whitelist (tabs) → no custom-props, no layout.
  // FU-A: tabs is a layout-height target type for ResizeHandle, but layout.height
  // entry is NOT shown in Properties panel (spacer-only policy). With empty
  // whitelist and no layout entry, the result is an empty groups array.
  it('T3-4: mode=simple w/ empty whitelist (tabs) → empty groups[] (FU-A: no layout.height for non-spacer)', () => {
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
    // No legacy two-group shape in Simple mode.
    expect(groups.find((g: { id: string }) => g.id === 'designer-custom-props')).toBeUndefined();
    expect(groups.find((g: { id: string }) => g.id === 'designer-layout')).toBeUndefined();
    // FU-A: tabs is non-spacer → no layout.height → empty whitelist → no merged group.
    expect(groups).toHaveLength(0);
  });

  // T3-4b: simple mode + non-layout-target with literally-empty whitelist → empty array.
  // Uses `separator` — a real type whose whitelist mapping in simpleModeWhitelist is
  // `new Set<string>([])` AND which is NOT in LAYOUT_HEIGHT_TARGET_TYPES, so neither the
  // custom-props bucket nor the layout.height bucket can produce any entry → no merged
  // group emitted. (Belt-and-suspenders: ensure we don't emit a stray empty merged group.)
  it('T3-4b: mode=simple, non-layout-target + empty whitelist (separator) → empty groups[]', () => {
    const deps = makeDeps();
    deps.formFieldRegistry.get = vi.fn().mockReturnValue({
      type: 'separator',
      propsSchema: { properties: {} },
    });
    // Mock returns entries; none will match getAllowedEntryIds('separator') = empty set.
    mockPropsSchemaToPanel.mockReturnValue([
      { key: 'label', widgetType: 'string', widget: { render: vi.fn(), edit: vi.fn(), validate: vi.fn() }, label: 'Label', meta: { type: 'string' } },
      { key: 'defaultValue', widgetType: 'string', widget: { render: vi.fn(), edit: vi.fn(), validate: vi.fn() }, label: 'Default', meta: { type: 'string' } },
    ]);
    const service = new PropsPanelService(
      deps.eventBus,
      deps.formFieldRegistry,
      deps.propertiesPanel,
      deps.modeling,
    );
    const groups = service.getGroups({ type: 'separator' }, { mode: 'simple' });
    expect(groups).toEqual([]);
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

  // ───────────────────────────────────────────────────────────────────────────
  // Task 4: native form-js properties panel filter provider
  // ───────────────────────────────────────────────────────────────────────────
  describe('PropsPanelService native filter provider', () => {
    function makePropertiesPanel() {
      const providers: Array<{ provider: { getGroups: (...a: unknown[]) => unknown }; priority: number }> = [];
      return {
        registerProvider: (provider: { getGroups: (...a: unknown[]) => unknown }, priority: number) =>
          providers.push({ provider, priority }),
        _providers: providers,
      };
    }
    function makeGroups() {
      return [
        { id: 'general',          entries: [{ id: 'label' }, { id: 'description' }, { id: 'key' }] },
        { id: 'condition',        entries: [{ id: 'conditional-hide' }] },
        { id: 'customProperties', entries: [{ id: 'properties' }] },
        { id: 'columns',          entries: [{ id: 'columns' }] },
        { id: 'validation',       entries: [{ id: 'required' }, { id: 'validationType' }] },
      ];
    }

    it('T4-1: registerProvider(provider, 500) called exactly once at construction', () => {
      const deps = makeDeps();
      const pp = makePropertiesPanel();
      new PropsPanelService(
        deps.eventBus,
        deps.formFieldRegistry,
        pp as unknown as { registerProvider(p: unknown, prio?: number): void },
        deps.modeling,
      );
      expect(pp._providers).toHaveLength(1);
      expect(pp._providers[0]!.priority).toBe(500);
      expect(typeof pp._providers[0]!.provider.getGroups).toBe('function');
    });

    it('T4-2: mode=full → updater returns groups unchanged', () => {
      const deps = makeDeps();
      const pp = makePropertiesPanel();
      const svc = new PropsPanelService(
        deps.eventBus,
        deps.formFieldRegistry,
        pp as unknown as { registerProvider(p: unknown, prio?: number): void },
        deps.modeling,
      );
      svc.setMode('full');
      const updater = (pp._providers[0]!.provider.getGroups as (f: unknown, e?: unknown) => (g: unknown[]) => unknown[])(
        { type: 'textfield' },
      );
      expect(typeof updater).toBe('function');
      const input = makeGroups();
      expect(updater(input)).toEqual(input);
    });

    it('T4-3: mode=simple, textfield → whitelist entries merged into simple-merged group; condition/customProperties hidden; passthrough groups (columns) kept as separate groups', () => {
      const deps = makeDeps();
      const pp = makePropertiesPanel();
      const svc = new PropsPanelService(
        deps.eventBus,
        deps.formFieldRegistry,
        pp as unknown as { registerProvider(p: unknown, prio?: number): void },
        deps.modeling,
      );
      svc.setMode('simple');
      const updater = (pp._providers[0]!.provider.getGroups as (f: unknown, e?: unknown) => (g: unknown[]) => Array<{ id: string; entries: Array<{ id: string }> }>)(
        { type: 'textfield' },
      );
      const groupsIn = makeGroups().map((g) =>
        g.id === 'general'
          ? { ...g, entries: [{ id: 'label' }, { id: 'description' }, { id: 'key' }, { id: 'defaultValue' }] }
          : g,
      );
      const out = updater(groupsIn);
      // Hidden groups still drop entirely.
      expect(out.find((g) => g.id === 'condition')).toBeUndefined();
      expect(out.find((g) => g.id === 'customProperties')).toBeUndefined();
      // Original general/validation groups are absorbed into simple-merged.
      expect(out.find((g) => g.id === 'general')).toBeUndefined();
      expect(out.find((g) => g.id === 'validation')).toBeUndefined();
      // simple-merged contains the whitelisted survivors (label, defaultValue,
      // required) — columns moved out into its own passthrough group.
      const merged = out.find((g) => g.id === 'simple-merged')!;
      expect(merged.entries.map((e) => e.id)).toEqual(['label', 'defaultValue', 'required']);
      // Passthrough `columns` is preserved as a separate group so its
      // bio-properties-panel `component` (Group / ListGroup) renders intact.
      const columns = out.find((g) => g.id === 'columns');
      expect(columns).toBeDefined();
      expect(columns!.entries!.map((e) => e.id)).toEqual(['columns']);
    });

    it('T4-4: mode=simple, validation entries filtered into merged group — required kept, validationType dropped', () => {
      const deps = makeDeps();
      const pp = makePropertiesPanel();
      const svc = new PropsPanelService(
        deps.eventBus,
        deps.formFieldRegistry,
        pp as unknown as { registerProvider(p: unknown, prio?: number): void },
        deps.modeling,
      );
      svc.setMode('simple');
      const updater = (pp._providers[0]!.provider.getGroups as (f: unknown, e?: unknown) => (g: unknown[]) => Array<{ id: string; entries: Array<{ id: string }> }>)(
        { type: 'textfield' },
      );
      const out = updater(makeGroups());
      const merged = out.find((g) => g.id === 'simple-merged')!;
      const ids = merged.entries.map((e) => e.id);
      expect(ids).toContain('required');
      expect(ids).not.toContain('validationType');
    });

    it('T4-5: mode=simple, passthrough `columns` group preserved separately with its component intact (not merged)', () => {
      const deps = makeDeps();
      const pp = makePropertiesPanel();
      const svc = new PropsPanelService(
        deps.eventBus,
        deps.formFieldRegistry,
        pp as unknown as { registerProvider(p: unknown, prio?: number): void },
        deps.modeling,
      );
      svc.setMode('simple');
      const updater = (pp._providers[0]!.provider.getGroups as (f: unknown, e?: unknown) => (g: unknown[]) => Array<{ id: string; entries: Array<{ id: string }> }>)(
        { type: 'group' },
      );
      const out = updater(makeGroups());
      // simple-merged should NOT contain columns — it is a passthrough.
      const merged = out.find((g) => g.id === 'simple-merged')!;
      expect(merged.entries.map((e) => e.id)).not.toContain('columns');
      // columns kept as its own group with its entries unfiltered.
      const columns = out.find((g) => g.id === 'columns');
      expect(columns).toBeDefined();
      expect(columns!.entries!.map((e) => e.id)).toEqual(['columns']);
    });

    it('T4-6: mode=simple, unregistered field type → simple-merged with label only (DEFAULT_ALLOWED fallback) plus passthrough columns group preserved separately', () => {
      const deps = makeDeps();
      const pp = makePropertiesPanel();
      const svc = new PropsPanelService(
        deps.eventBus,
        deps.formFieldRegistry,
        pp as unknown as { registerProvider(p: unknown, prio?: number): void },
        deps.modeling,
      );
      svc.setMode('simple');
      const updater = (pp._providers[0]!.provider.getGroups as (f: unknown, e?: unknown) => (g: unknown[]) => Array<{ id: string; entries: Array<{ id: string }> }>)(
        { type: 'unknownX' },
      );
      const out = updater(makeGroups());
      const merged = out.find((g) => g.id === 'simple-merged')!;
      // DEFAULT_ALLOWED is just `label`; columns no longer flows into merged.
      expect(merged.entries.map((e) => e.id)).toEqual(['label']);
      // Passthrough columns kept as its own group.
      const columns = out.find((g) => g.id === 'columns');
      expect(columns).toBeDefined();
      expect(columns!.entries!.map((e) => e.id)).toEqual(['columns']);
    });

    it('T4-7: mode=simple, ListGroup-style passthrough (e.g. staticOptions) preserved with component/items/add — fixes FU-1 bug', () => {
      // Regression: `staticOptions` arrives from form-js as a ListGroup with
      // `entries: undefined` and `items: [...]` plus `add: fn` and
      // `component: ListGroup`. The previous merging strategy did
      // `merged.push(...g.entries ?? [])`, which silently dropped the entire
      // group because entries was undefined. Verify the whole group object
      // (component + items + add) survives the updater.
      const deps = makeDeps();
      const pp = makePropertiesPanel();
      const svc = new PropsPanelService(
        deps.eventBus,
        deps.formFieldRegistry,
        pp as unknown as { registerProvider(p: unknown, prio?: number): void },
        deps.modeling,
      );
      svc.setMode('simple');
      const updater = (pp._providers[0]!.provider.getGroups as (f: unknown, e?: unknown) => (g: unknown[]) => Array<{ id: string; entries?: Array<{ id: string }>; items?: unknown[]; add?: unknown; component?: unknown }>)(
        { type: 'select' },
      );
      const ListGroupSentinel = function ListGroup() { /* component */ };
      const addFn = () => { /* add */ };
      const groupsIn = [
        { id: 'general', entries: [{ id: 'label' }, { id: 'description' }, { id: 'key' }] },
        // Native form-js ListGroup shape — note no `entries`, items present, component set.
        { id: 'staticOptions', items: [{ id: 'staticOptions-0' }, { id: 'staticOptions-1' }], add: addFn, component: ListGroupSentinel, label: 'Static options' },
        { id: 'valuesSource', entries: [{ id: 'valuesSource-select' }] },
      ];
      const out = updater(groupsIn);
      const staticOptions = out.find((g) => g.id === 'staticOptions');
      expect(staticOptions).toBeDefined();
      // Whole group object preserved — items, add, component all intact.
      expect(staticOptions!.items).toHaveLength(2);
      expect(staticOptions!.add).toBe(addFn);
      expect(staticOptions!.component).toBe(ListGroupSentinel);
      // valuesSource group also preserved as a passthrough Group.
      const valuesSource = out.find((g) => g.id === 'valuesSource');
      expect(valuesSource).toBeDefined();
      expect(valuesSource!.entries!.map((e) => e.id)).toEqual(['valuesSource-select']);
    });

    // FU-2: Without this, sessionStorage='full' boots rendered as Simple until
    // App.tsx's `setMode` useEffect runs after a microtask. The native filter
    // provider closure reads `currentMode` on every reflow, and the FIRST
    // reflow happens synchronously during `propertiesPanel.attachTo`, before
    // any React effect can fire. The constructor must therefore seed
    // `currentMode` from sessionStorage so that the first reflow already sees
    // the correct mode.
    it('T4-FU2: constructor seeds currentMode from sessionStorage[\'designer.panelMode\'] — first reflow sees full mode without setMode call', () => {
      try {
        window.sessionStorage.setItem('designer.panelMode', 'full');
        const deps = makeDeps();
        const pp = makePropertiesPanel();
        new PropsPanelService(
          deps.eventBus,
          deps.formFieldRegistry,
          pp as unknown as { registerProvider(p: unknown, prio?: number): void },
          deps.modeling,
        );
        // No setMode() call — simulate the first reflow that happens during
        // propertiesPanel.attachTo, before the React useEffect fires.
        const updater = (pp._providers[0]!.provider.getGroups as (f: unknown, e?: unknown) => (g: unknown[]) => unknown[])(
          { type: 'textfield' },
        );
        const input = makeGroups();
        // mode === 'full' means updater returns groups unchanged (no
        // simple-merged group, no hidden-group filtering).
        expect(updater(input)).toEqual(input);
      } finally {
        window.sessionStorage.removeItem('designer.panelMode');
      }
    });

    it('T4-FU2b: constructor defaults currentMode=\'simple\' when sessionStorage missing or invalid', () => {
      // M-2: Use an explicit garbage value rather than just `removeItem`. This
      // catches future loosening of the strict `=== 'full'` check (e.g. if
      // someone changed it to `!== 'simple'`, an invalid value would suddenly
      // resolve to Full mode and this assertion would fail).
      try {
        window.sessionStorage.setItem('designer.panelMode', 'compact');
        const deps = makeDeps();
        const pp = makePropertiesPanel();
        new PropsPanelService(
          deps.eventBus,
          deps.formFieldRegistry,
          pp as unknown as { registerProvider(p: unknown, prio?: number): void },
          deps.modeling,
        );
        const updater = (pp._providers[0]!.provider.getGroups as (f: unknown, e?: unknown) => (g: unknown[]) => Array<{ id: string }>)(
          { type: 'textfield' },
        );
        const out = updater(makeGroups());
        // Simple mode → simple-merged group present, condition group dropped.
        expect(out.find((g) => g.id === 'simple-merged')).toBeDefined();
        expect(out.find((g) => g.id === 'condition')).toBeUndefined();
      } finally {
        window.sessionStorage.removeItem('designer.panelMode');
      }
    });
  });

  // Case 13: 기존 대상 타입들은 designer-layout 그룹 포함 (하위 호환)
  it('13: 기존 대상 타입(html, table, group 등)은 designer-layout 그룹 포함', () => {
    // Note: FU-A 이후 layout entry는 spacer 전용이므로, 이 케이스는
    // 기존 동작(타겟 타입 목록 진입) 자체가 변경되어 designer-layout이 없어짐.
    // 단, 이 테스트는 역사적 문서화 목적으로 유지하고 FU-A 동작은 별도 케이스로.
    // → non-spacer 타입은 이제 designer-layout 그룹이 없어야 함.
    const nonSpacerTargetTypes = [
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
      'textarea',
      'filepicker',
      'checklist',
      'radio',
      'separator',
      'expression',
      'chartPlaceholder',
      'tree',
    ];
    for (const type of nonSpacerTargetTypes) {
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
      // FU-A: non-spacer 타입은 layout entry 없음 (ResizeHandle로만 조절)
      const layoutGroup = groups.find((g: { id: string }) => g.id === 'designer-layout');
      expect(layoutGroup).toBeUndefined();
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // FU-A: spacer-only layout entry policy
  // ───────────────────────────────────────────────────────────────────────────
  describe('FU-A: spacer-only layout entry in Properties panel', () => {
    it('FU-A-1: spacer 타입은 designer-layout 그룹에 layout.height 엔트리 노출', () => {
      const deps = makeDeps();
      deps.formFieldRegistry.get = vi.fn().mockReturnValue({
        type: 'spacer',
        propsSchema: { properties: {} },
      });
      mockPropsSchemaToPanel.mockReturnValue([]);
      const service = new PropsPanelService(
        deps.eventBus,
        deps.formFieldRegistry,
        deps.propertiesPanel,
        deps.modeling,
      );
      const groups = service.getGroups(makeField('spacer'));
      const layoutGroup = groups.find((g: { id: string }) => g.id === 'designer-layout') as
        | { id: string; entries: Array<{ key?: string }> }
        | undefined;
      expect(layoutGroup).toBeDefined();
      expect(layoutGroup!.entries.some((e) => e.key === 'layout.height')).toBe(true);
    });

    it('FU-A-2: textarea 타입은 designer-layout 그룹 없음 (ResizeHandle로만 조절)', () => {
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
      const layoutGroup = groups.find((g: { id: string }) => g.id === 'designer-layout');
      expect(layoutGroup).toBeUndefined();
    });

    it('FU-A-3: group(container) 타입은 designer-layout 그룹 없음', () => {
      const deps = makeDeps();
      deps.formFieldRegistry.get = vi.fn().mockReturnValue({
        type: 'group',
        propsSchema: { properties: {} },
      });
      mockPropsSchemaToPanel.mockReturnValue([]);
      const service = new PropsPanelService(
        deps.eventBus,
        deps.formFieldRegistry,
        deps.propertiesPanel,
        deps.modeling,
      );
      const groups = service.getGroups(makeField('group'));
      const layoutGroup = groups.find((g: { id: string }) => g.id === 'designer-layout');
      expect(layoutGroup).toBeUndefined();
    });

    it('FU-A-4: spacer simple mode → designer-simple-merged에 layout.height 엔트리 포함', () => {
      const deps = makeDeps();
      deps.formFieldRegistry.get = vi.fn().mockReturnValue({
        type: 'spacer',
        propsSchema: { properties: {} },
      });
      mockPropsSchemaToPanel.mockReturnValue([]);
      const service = new PropsPanelService(
        deps.eventBus,
        deps.formFieldRegistry,
        deps.propertiesPanel,
        deps.modeling,
      );
      const groups = service.getGroups({ type: 'spacer', id: 'S1' }, { mode: 'simple' });
      expect(groups).toHaveLength(1);
      const merged = groups[0] as { id: string; entries: Array<{ id: string }> };
      expect(merged.id).toBe('designer-simple-merged');
      expect(merged.entries.map((e) => e.id)).toContain('layout.height');
    });

    it('FU-A-5: filepicker(non-spacer target type)는 simple mode에서도 layout entry 없음', () => {
      const deps = makeDeps();
      deps.formFieldRegistry.get = vi.fn().mockReturnValue({
        type: 'filepicker',
        propsSchema: { properties: {} },
      });
      mockPropsSchemaToPanel.mockReturnValue([]);
      const service = new PropsPanelService(
        deps.eventBus,
        deps.formFieldRegistry,
        deps.propertiesPanel,
        deps.modeling,
      );
      // full mode
      const fullGroups = service.getGroups(makeField('filepicker'));
      expect(fullGroups.find((g: { id: string }) => g.id === 'designer-layout')).toBeUndefined();
      // simple mode
      const simpleGroups = service.getGroups({ type: 'filepicker', id: 'F1' }, { mode: 'simple' });
      const allEntries = simpleGroups.flatMap((g: { entries?: Array<{ id: string }> }) => g.entries ?? []);
      expect(allEntries.find((e: { id: string }) => e.id === 'layout.height')).toBeUndefined();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // FU-C: setMode('simple') regression guard
  // Ensures that calling setMode('simple') after construction correctly sets
  // currentMode so that the native filter provider returns simple-mode output.
  // This is the primary regression guard for the vscode/tiptap default-simple
  // behaviour: customEditor.ts calls propsPanelService.setMode('simple') after
  // every mountEditor, and the next reflow must reflect that.
  // ───────────────────────────────────────────────────────────────────────────
  describe('FU-C: setMode regression guards', () => {
    function makePropertiesPanel() {
      const providers: Array<{ provider: { getGroups: (...a: unknown[]) => unknown }; priority: number }> = [];
      return {
        registerProvider: (provider: { getGroups: (...a: unknown[]) => unknown }, priority: number) =>
          providers.push({ provider, priority }),
        _providers: providers,
      };
    }
    function makeGroups() {
      return [
        { id: 'general',          entries: [{ id: 'label' }, { id: 'description' }, { id: 'key' }] },
        { id: 'condition',        entries: [{ id: 'conditional-hide' }] },
        { id: 'customProperties', entries: [{ id: 'properties' }] },
        { id: 'validation',       entries: [{ id: 'required' }, { id: 'validationType' }] },
      ];
    }

    it('FU-C-1: setMode(\'simple\') after construction → native filter returns simple-mode output', () => {
      const deps = makeDeps();
      const pp = makePropertiesPanel();
      const svc = new PropsPanelService(
        deps.eventBus,
        deps.formFieldRegistry,
        pp as unknown as { registerProvider(p: unknown, prio?: number): void },
        deps.modeling,
      );
      // Explicitly call setMode('simple') — as vscode customEditor.ts does
      svc.setMode('simple');
      const updater = (pp._providers[0]!.provider.getGroups as (f: unknown, e?: unknown) => (g: unknown[]) => Array<{ id: string }>)(
        { type: 'textfield' },
      );
      const out = updater(makeGroups());
      // Simple mode: condition/customProperties hidden, simple-merged emitted
      expect(out.find((g) => g.id === 'condition')).toBeUndefined();
      expect(out.find((g) => g.id === 'customProperties')).toBeUndefined();
      expect(out.find((g) => g.id === 'simple-merged')).toBeDefined();
    });

    it('FU-C-2: setMode(\'simple\') then setMode(\'full\') → native filter returns full-mode output (toggle works)', () => {
      const deps = makeDeps();
      const pp = makePropertiesPanel();
      const svc = new PropsPanelService(
        deps.eventBus,
        deps.formFieldRegistry,
        pp as unknown as { registerProvider(p: unknown, prio?: number): void },
        deps.modeling,
      );
      svc.setMode('simple');
      svc.setMode('full');
      const updater = (pp._providers[0]!.provider.getGroups as (f: unknown, e?: unknown) => (g: unknown[]) => unknown[])(
        { type: 'textfield' },
      );
      const groups = makeGroups();
      // Full mode: updater returns groups unchanged
      expect(updater(groups)).toEqual(groups);
    });

    it('FU-C-3: currentMode starts \'simple\' when sessionStorage is missing (vscode/tiptap default)', () => {
      // Guard: even if sessionStorage has a stale 'full' from a previous run,
      // vscode customEditor.ts sets currentPanelMode='simple' and then calls
      // propsPanelService.setMode('simple'). This test verifies that the service
      // correctly reflects 'simple' after setMode — not the sessionStorage value.
      try {
        window.sessionStorage.setItem('designer.panelMode', 'full');
        const deps = makeDeps();
        const pp = makePropertiesPanel();
        const svc = new PropsPanelService(
          deps.eventBus,
          deps.formFieldRegistry,
          pp as unknown as { registerProvider(p: unknown, prio?: number): void },
          deps.modeling,
        );
        // Simulate what vscode customEditor.ts does: override sessionStorage seed
        svc.setMode('simple');
        const updater = (pp._providers[0]!.provider.getGroups as (f: unknown, e?: unknown) => (g: unknown[]) => Array<{ id: string }>)(
          { type: 'textfield' },
        );
        const out = updater(makeGroups());
        // After setMode('simple'), simple-merged should be present regardless of sessionStorage
        expect(out.find((g) => g.id === 'simple-merged')).toBeDefined();
        expect(out.find((g) => g.id === 'condition')).toBeUndefined();
      } finally {
        window.sessionStorage.removeItem('designer.panelMode');
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // FU-E: identityT → live ko t() wiring
  // Verifies that panelEntryAdapter receives the real koT function so that
  // propsSchema label keys (designer.components.*) resolve to Korean strings
  // in both the Properties group and the form-js native panel.
  // ───────────────────────────────────────────────────────────────────────────
  describe('FU-E: live ko i18n via createKoT()', () => {
    it('FU-E-1: entry label key "designer.components.image.imageSource" resolves to "이미지 소스" via t()', () => {
      const deps = makeDeps();
      deps.formFieldRegistry.get = vi.fn().mockReturnValue({
        type: 'image',
        propsSchema: { properties: {} },
      });
      // Simulate what panelEntryAdapter receives: entry.label is the i18n key
      const capturedCtxArgs: Array<{ t: (key: string) => string }> = [];
      const editFn = vi.fn((...args: unknown[]) => {
        const ctx = args[2] as { t: (key: string) => string };
        capturedCtxArgs.push(ctx);
      });
      const stubWidget = { render: vi.fn(), edit: editFn, validate: vi.fn() };
      mockPropsSchemaToPanel.mockReturnValue([
        {
          key: 'imageSource',
          widgetType: 'string',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          widget: stubWidget as any,
          label: 'designer.components.image.imageSource',
          meta: { type: 'string' },
        },
      ]);
      const service = new PropsPanelService(
        deps.eventBus,
        deps.formFieldRegistry,
        deps.propertiesPanel,
        deps.modeling,
      );
      const groups = service.getGroups({ type: 'image', id: 'I1' });
      // Verify the group was created
      const propsGroup = groups.find((g: { id: string }) => g.id === 'designer-custom-props') as
        | { entries: Array<{ component: (p: Record<string, unknown>) => unknown; label?: string }> }
        | undefined;
      expect(propsGroup).toBeDefined();
      expect(propsGroup!.entries).toHaveLength(1);
      // Invoke the component to trigger widget.edit and capture ctx.t
      propsGroup!.entries[0]!.component({});
      expect(capturedCtxArgs).toHaveLength(1);
      // The t function passed must translate the key to Korean
      expect(capturedCtxArgs[0]!.t('designer.components.image.imageSource')).toBe('이미지 소스');
    });

    it('FU-E-2: undefined key falls back to raw key string (no crash, no undefined)', () => {
      const deps = makeDeps();
      deps.formFieldRegistry.get = vi.fn().mockReturnValue({
        type: 'image',
        propsSchema: { properties: {} },
      });
      const capturedT: Array<(key: string) => string> = [];
      const editFn2 = vi.fn((...args: unknown[]) => {
        const ctx = args[2] as { t: (key: string) => string };
        capturedT.push(ctx.t);
      });
      const stubWidget = { render: vi.fn(), edit: editFn2, validate: vi.fn() };
      mockPropsSchemaToPanel.mockReturnValue([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { key: 'imageSource', widgetType: 'string', widget: stubWidget as any, label: 'unknown.key', meta: { type: 'string' } },
      ]);
      const service = new PropsPanelService(
        deps.eventBus,
        deps.formFieldRegistry,
        deps.propertiesPanel,
        deps.modeling,
      );
      const groups = service.getGroups({ type: 'image', id: 'I2' });
      const propsGroup = groups.find((g: { id: string }) => g.id === 'designer-custom-props') as
        | { entries: Array<{ component: (p: Record<string, unknown>) => unknown }> }
        | undefined;
      propsGroup!.entries[0]!.component({});
      expect(capturedT).toHaveLength(1);
      // Missing key falls back to raw key (not undefined, not empty string)
      const result = capturedT[0]!('designer.components.nonexistent.key');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('FU-E-3: simple mode also receives koT (not identityT)', () => {
      const deps = makeDeps();
      deps.formFieldRegistry.get = vi.fn().mockReturnValue({
        type: 'card',
        propsSchema: { properties: {} },
      });
      const capturedT: Array<(key: string) => string> = [];
      const editFn3 = vi.fn((...args: unknown[]) => {
        const ctx = args[2] as { t: (key: string) => string };
        capturedT.push(ctx.t);
      });
      const stubWidget = { render: vi.fn(), edit: editFn3, validate: vi.fn() };
      mockPropsSchemaToPanel.mockReturnValue([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { key: 'padding', widgetType: 'enum', widget: stubWidget as any, label: 'designer.components.card.padding', meta: { type: 'enum', enum: ['none', 'sm', 'md', 'lg'] }, defaultValue: 'md' },
      ]);
      const service = new PropsPanelService(
        deps.eventBus,
        deps.formFieldRegistry,
        deps.propertiesPanel,
        deps.modeling,
      );
      // simple mode
      const groups = service.getGroups({ type: 'card', id: 'C1' }, { mode: 'simple' });
      const mergedGroup = groups.find((g: { id: string }) => g.id === 'designer-simple-merged') as
        | { entries: Array<{ component: (p: Record<string, unknown>) => unknown }> }
        | undefined;
      expect(mergedGroup).toBeDefined();
      mergedGroup!.entries[0]!.component({});
      expect(capturedT).toHaveLength(1);
      // In simple mode, koT must resolve the key
      expect(capturedT[0]!('designer.components.card.padding')).toBe('여백');
    });
  });
});
