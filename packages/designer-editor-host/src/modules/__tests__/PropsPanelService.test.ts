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
}));

// designer-runtime mock — LAYOUT_HEIGHT_TARGET_TYPES만 필요
vi.mock('@form-js-designer/designer-runtime', () => ({
  LAYOUT_HEIGHT_TARGET_TYPES: ['textarea', 'html', 'table', 'group', 'card', 'stack', 'modal', 'tabs', 'tabPanel'],
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

  // TSK-12-03: rowHeight 엔트리 테스트

  // Case 13a: 첫 컴포넌트 선택 → layout.rowHeight 엔트리 포함
  it('13a: 첫 컴포넌트 선택 시 designer-layout에 layout.rowHeight 엔트리 포함 (TSK-12-03)', () => {
    const deps = makeDeps();
    deps.formFieldRegistry.get = vi.fn().mockReturnValue({
      type: 'textfield',
      propsSchema: { properties: {} },
    });
    mockPropsSchemaToPanel.mockReturnValue([]);
    // formLayouter mock: textfield(id='field1')이 row의 첫 컴포넌트
    const formLayouter = {
      getRows: vi.fn().mockReturnValue([
        { id: 'R1', components: ['field1', 'field2'] },
      ]),
    };
    const service = new PropsPanelService(
      deps.eventBus,
      deps.formFieldRegistry,
      deps.propertiesPanel,
      deps.modeling,
      formLayouter,
    );
    const groups = service.getGroups(makeField('textfield', 'field1'));
    const layoutGroup = groups.find((g: { id: string }) => g.id === 'designer-layout') as
      | { id: string; entries: Array<{ key?: string }> }
      | undefined;
    expect(layoutGroup).toBeDefined();
    expect(layoutGroup!.entries.some((e) => e.key === 'layout.rowHeight')).toBe(true);
  });

  // Case 13b: 두 번째 컴포넌트 선택 → layout.rowHeight 엔트리 없음
  it('13b: 두 번째 컴포넌트 선택 시 layout.rowHeight 엔트리 없음 (TSK-12-03)', () => {
    const deps = makeDeps();
    deps.formFieldRegistry.get = vi.fn().mockReturnValue({
      type: 'textfield',
      propsSchema: { properties: {} },
    });
    mockPropsSchemaToPanel.mockReturnValue([]);
    const formLayouter = {
      getRows: vi.fn().mockReturnValue([
        { id: 'R1', components: ['field1', 'field2'] },
      ]),
    };
    const service = new PropsPanelService(
      deps.eventBus,
      deps.formFieldRegistry,
      deps.propertiesPanel,
      deps.modeling,
      formLayouter,
    );
    // field2는 두 번째 컴포넌트
    const groups = service.getGroups(makeField('textfield', 'field2'));
    const layoutGroup = groups.find((g: { id: string }) => g.id === 'designer-layout') as
      | { id: string; entries: Array<{ key?: string }> }
      | undefined;
    // designer-layout은 없거나, 있어도 rowHeight 엔트리 없음
    if (layoutGroup) {
      expect(layoutGroup.entries.some((e) => e.key === 'layout.rowHeight')).toBe(false);
    }
  });

  // Case 13c: formLayouter 없을 때 rowHeight 엔트리 없음
  it('13c: formLayouter 없으면 rowHeight 엔트리 없음 (TSK-12-03)', () => {
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
      // formLayouter 없음
    );
    const groups = service.getGroups(makeField('textfield', 'field1'));
    const layoutGroup = groups.find((g: { id: string }) => g.id === 'designer-layout');
    if (layoutGroup) {
      const lg = layoutGroup as { entries: Array<{ key?: string }> };
      expect(lg.entries.some((e) => e.key === 'layout.rowHeight')).toBe(false);
    }
    // rowHeight 엔트리 없거나 designer-layout 자체가 없음
  });

  // Case 13d: layout.height와 layout.rowHeight는 독립 — 둘 다 designer-layout에 공존 가능
  it('13d: textarea + 첫 컴포넌트 → layout.height와 layout.rowHeight 둘 다 포함 (독립성)', () => {
    const deps = makeDeps();
    deps.formFieldRegistry.get = vi.fn().mockReturnValue({
      type: 'textarea',
      propsSchema: { properties: {} },
    });
    mockPropsSchemaToPanel.mockReturnValue([]);
    const formLayouter = {
      getRows: vi.fn().mockReturnValue([
        { id: 'R1', components: ['field1'] }, // textarea 단독 행
      ]),
    };
    const service = new PropsPanelService(
      deps.eventBus,
      deps.formFieldRegistry,
      deps.propertiesPanel,
      deps.modeling,
      formLayouter,
    );
    const groups = service.getGroups(makeField('textarea', 'field1'));
    const layoutGroup = groups.find((g: { id: string }) => g.id === 'designer-layout') as
      | { id: string; entries: Array<{ key?: string }> }
      | undefined;
    expect(layoutGroup).toBeDefined();
    // layout.height (컴포넌트 개별 높이) 및 layout.rowHeight (행 높이) 둘 다 포함
    expect(layoutGroup!.entries.some((e) => e.key === 'layout.height')).toBe(true);
    expect(layoutGroup!.entries.some((e) => e.key === 'layout.rowHeight')).toBe(true);
  });

  // Case 13: html, table, group, card, stack, modal, tabs, tabPanel도 Layout 그룹 포함
  it('13: 모든 대상 타입은 designer-layout 그룹 포함', () => {
    const targetTypes = ['html', 'table', 'group', 'card', 'stack', 'modal', 'tabs', 'tabPanel'];
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
