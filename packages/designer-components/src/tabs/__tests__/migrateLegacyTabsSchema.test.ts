/**
 * tabs-tabpanel-refactor: migrateLegacyTabsSchema 단위 테스트
 *
 * QA 체크리스트 항목:
 * - legacy tabs[] → components: tabPanel[] 변환
 * - defaultValue 매핑: 구 tab.value → 새 tabPanel.id
 * - idempotent: 이미 신포맷 스키마에 대해 no-op
 * - 비-tabs 필드는 무변경
 * - 재귀: 중첩 components 내 tabs 필드도 변환
 * - mutation 없음: 원본 객체 불변
 */
import { describe, it, expect } from 'vitest';
import { migrateLegacyTabsSchema } from '../migrateLegacyTabsSchema';

describe('migrateLegacyTabsSchema — basic conversion', () => {
  it('converts tabs[] to components: tabPanel[] array', () => {
    const input = {
      type: 'tabs',
      tabs: [
        { value: 'a', label: 'Tab A', components: [{ id: 'x', type: 'textfield' }] },
        { value: 'b', label: 'Tab B', components: [] },
      ],
    };
    const result = migrateLegacyTabsSchema(input);
    expect(Array.isArray((result as Record<string, unknown>).components)).toBe(true);
    const comps = (result as { components: Array<{ type: string; label: string; id: string; components: unknown[] }> }).components;
    expect(comps.length).toBe(2);
    expect(comps[0].type).toBe('tabPanel');
    expect(comps[0].label).toBe('Tab A');
    expect(comps[0].id).toMatch(/^tabPanel_[0-9a-f-]+$/);
    expect(comps[0].components).toEqual([{ id: 'x', type: 'textfield' }]);
    expect(comps[1].type).toBe('tabPanel');
    expect(comps[1].label).toBe('Tab B');
    expect(comps[1].components).toEqual([]);
  });

  it('removes tabs[] property from result', () => {
    const input = {
      type: 'tabs',
      tabs: [{ value: 'a', label: 'A', components: [] }],
    };
    const result = migrateLegacyTabsSchema(input) as Record<string, unknown>;
    expect(result.tabs).toBeUndefined();
  });
});

describe('migrateLegacyTabsSchema — defaultValue mapping', () => {
  it('maps defaultValue from old tab.value to new tabPanel.id', () => {
    const input = {
      type: 'tabs',
      defaultValue: 'b',
      tabs: [
        { value: 'a', label: 'Tab A', components: [] },
        { value: 'b', label: 'Tab B', components: [] },
      ],
    };
    const result = migrateLegacyTabsSchema(input) as {
      defaultValue?: string;
      components: Array<{ id: string; label: string }>;
    };
    const tabBId = result.components.find((c) => c.label === 'Tab B')?.id;
    expect(result.defaultValue).toBe(tabBId);
  });

  it('falls back to first tabPanel.id when defaultValue has no match', () => {
    const input = {
      type: 'tabs',
      defaultValue: 'nonexistent',
      tabs: [
        { value: 'a', label: 'Tab A', components: [] },
      ],
    };
    const result = migrateLegacyTabsSchema(input) as {
      defaultValue?: string;
      components: Array<{ id: string }>;
    };
    expect(result.defaultValue).toBe(result.components[0].id);
  });

  it('sets defaultValue to first tabPanel.id when defaultValue is absent', () => {
    const input = {
      type: 'tabs',
      tabs: [{ value: 'a', label: 'Tab A', components: [] }],
    };
    const result = migrateLegacyTabsSchema(input) as {
      defaultValue?: string;
      components: Array<{ id: string }>;
    };
    expect(result.defaultValue).toBe(result.components[0].id);
  });
});

describe('migrateLegacyTabsSchema — idempotency', () => {
  it('is a no-op when schema already has components with tabPanel children', () => {
    const tabPanelId = 'tabPanel_abc-123';
    const input = {
      type: 'tabs',
      defaultValue: tabPanelId,
      components: [
        { id: tabPanelId, type: 'tabPanel', label: 'Tab A', components: [] },
      ],
    };
    const result = migrateLegacyTabsSchema(input) as {
      components: Array<{ id: string; type: string }>;
    };
    // Must not change existing components
    expect(result.components.length).toBe(1);
    expect(result.components[0].id).toBe(tabPanelId);
    expect(result.components[0].type).toBe('tabPanel');
  });

  it('applying twice produces same result (idempotent)', () => {
    const input = {
      type: 'tabs',
      tabs: [{ value: 'a', label: 'Tab A', components: [] }],
    };
    const once = migrateLegacyTabsSchema(input);
    const twice = migrateLegacyTabsSchema(once);
    // Both should be identical (same components count, same types)
    const onceComps = (once as { components: Array<{ type: string }> }).components;
    const twiceComps = (twice as { components: Array<{ type: string }> }).components;
    expect(onceComps.length).toBe(twiceComps.length);
    expect(onceComps[0].type).toBe(twiceComps[0].type);
    // IDs must be stable (not re-generated on second apply)
    const onceIds = (once as { components: Array<{ id: string }> }).components.map((c) => c.id);
    const twiceIds = (twice as { components: Array<{ id: string }> }).components.map((c) => c.id);
    expect(onceIds).toEqual(twiceIds);
  });
});

describe('migrateLegacyTabsSchema — non-tabs fields', () => {
  it('passes through non-tabs fields unchanged', () => {
    const input = { type: 'textfield', id: 'field-1', label: 'Hello' };
    const result = migrateLegacyTabsSchema(input);
    expect(result).toEqual(input);
  });

  it('does not mutate the original object', () => {
    const input = {
      type: 'tabs',
      tabs: [{ value: 'a', label: 'Tab A', components: [] }],
    };
    const original = JSON.parse(JSON.stringify(input));
    migrateLegacyTabsSchema(input);
    expect(input).toEqual(original);
  });
});

describe('migrateLegacyTabsSchema — recursive schema', () => {
  it('converts nested tabs inside a root schema components array', () => {
    const input = {
      id: 'root',
      type: 'default',
      components: [
        {
          type: 'tabs',
          id: 'tabs-1',
          tabs: [{ value: 'a', label: 'Tab A', components: [] }],
        },
      ],
    };
    const result = migrateLegacyTabsSchema(input) as {
      components: Array<{
        type: string;
        components: Array<{ type: string }>;
      }>;
    };
    const tabsField = result.components[0];
    expect(tabsField.type).toBe('tabs');
    expect(tabsField.components[0].type).toBe('tabPanel');
  });
});

describe('migrateLegacyTabsSchema — tabHeight → layout.height consolidation', () => {
  it('absorbs legacy tabHeight into layout.height on legacy schemas', () => {
    const input = {
      type: 'tabs',
      tabHeight: 420,
      tabs: [{ value: 'a', label: 'Tab A', components: [] }],
    };
    const result = migrateLegacyTabsSchema(input) as Record<string, unknown> & {
      layout?: { height?: number };
    };
    expect(result.tabHeight).toBeUndefined();
    expect(result.layout?.height).toBe(420);
  });

  it('absorbs legacy tabHeight on already-new-format schemas', () => {
    const input = {
      type: 'tabs',
      tabHeight: 500,
      components: [
        { id: 'tabPanel_x', type: 'tabPanel', label: 'A', components: [] },
      ],
    };
    const result = migrateLegacyTabsSchema(input) as Record<string, unknown> & {
      layout?: { height?: number };
    };
    expect(result.tabHeight).toBeUndefined();
    expect(result.layout?.height).toBe(500);
  });

  it('keeps existing layout.height when both are present (layout wins)', () => {
    const input = {
      type: 'tabs',
      tabHeight: 200,
      layout: { height: 640 },
      components: [
        { id: 'tabPanel_x', type: 'tabPanel', label: 'A', components: [] },
      ],
    };
    const result = migrateLegacyTabsSchema(input) as Record<string, unknown> & {
      layout?: { height?: number };
    };
    expect(result.tabHeight).toBeUndefined();
    expect(result.layout?.height).toBe(640);
  });

  it('drops tabHeight=0 (legacy "fill parent") without setting layout.height', () => {
    const input = {
      type: 'tabs',
      tabHeight: 0,
      components: [
        { id: 'tabPanel_x', type: 'tabPanel', label: 'A', components: [] },
      ],
    };
    const result = migrateLegacyTabsSchema(input) as Record<string, unknown> & {
      layout?: { height?: number };
    };
    expect(result.tabHeight).toBeUndefined();
    expect(result.layout?.height).toBeUndefined();
  });
});

describe('migrateLegacyTabsSchema — top-level schema (form root)', () => {
  it('migrates tabs inside a form root schema', () => {
    const schema = {
      id: 'form',
      type: 'default',
      components: [
        {
          id: 'tabs-1',
          type: 'tabs',
          tabs: [
            { value: 'tab1', label: 'Tab 1', components: [{ id: 'x', type: 'textfield' }] },
          ],
          defaultValue: 'tab1',
        },
      ],
    };
    const migrated = migrateLegacyTabsSchema(schema) as {
      components: Array<{
        type: string;
        components: Array<{ type: string; label: string; id: string }>;
        defaultValue: string;
      }>;
    };
    const tabsField = migrated.components[0];
    expect(tabsField.components[0].type).toBe('tabPanel');
    expect(tabsField.components[0].label).toBe('Tab 1');
    expect(tabsField.defaultValue).toBe(tabsField.components[0].id);
  });
});
