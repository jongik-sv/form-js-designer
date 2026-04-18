/**
 * tabs-tabpanel-refactor: Tabs.create() 신규 구조 단위 테스트
 *
 * QA 체크리스트 항목:
 * - Tabs.create()는 2개의 기본 tabPanel 자식을 포함한
 *   { type:'tabs', components: TabPanelField[], defaultValue: <첫 tabPanel.id>, orientation:'horizontal' }
 *   를 반환한다
 * - Tabs render는 field.tabs가 아닌 field.components 를 순회한다
 */
import { describe, it, expect } from 'vitest';
import { TabsComponent } from '../Tabs';

describe('TabsComponent.create() — new tabPanel structure', () => {
  it('returns components array (not tabs[])', () => {
    const created = TabsComponent.create!();
    expect(Array.isArray(created.components)).toBe(true);
    // old tabs[] should not be present
    expect((created as Record<string, unknown>).tabs).toBeUndefined();
  });

  it('contains exactly 2 default tabPanel children', () => {
    const created = TabsComponent.create!();
    const comps = created.components as Array<{ type: string }>;
    expect(comps.length).toBe(2);
    expect(comps[0].type).toBe('tabPanel');
    expect(comps[1].type).toBe('tabPanel');
  });

  it('each tabPanel child has valid id matching tabPanel_<uuid>', () => {
    const created = TabsComponent.create!();
    const comps = created.components as Array<{ id: string; type: string }>;
    expect(comps[0].id).toMatch(/^tabPanel_[0-9a-f-]+$/);
    expect(comps[1].id).toMatch(/^tabPanel_[0-9a-f-]+$/);
    expect(comps[0].id).not.toBe(comps[1].id);
  });

  it('defaultValue matches first tabPanel id', () => {
    const created = TabsComponent.create!();
    const comps = created.components as Array<{ id: string }>;
    expect(created.defaultValue).toBe(comps[0].id);
  });

  it('has orientation defaulting to horizontal', () => {
    const created = TabsComponent.create!();
    expect(created.orientation).toBe('horizontal');
  });

  it('each tabPanel child has empty components array', () => {
    const created = TabsComponent.create!();
    const comps = created.components as Array<{ components: unknown[] }>;
    expect(comps[0].components).toEqual([]);
    expect(comps[1].components).toEqual([]);
  });

  it('each tabPanel child has a label', () => {
    const created = TabsComponent.create!();
    const comps = created.components as Array<{ label?: string }>;
    expect(typeof comps[0].label).toBe('string');
    expect(comps[0].label!.length).toBeGreaterThan(0);
    expect(typeof comps[1].label).toBe('string');
  });
});
