/**
 * tabs-tabpanel-refactor: TabPanel 컴포넌트 단위 테스트
 *
 * QA 체크리스트 항목:
 * - tabPanel.create({ label: 'X' }) 가 올바른 구조를 반환한다
 * - tabPanel.id 형식은 'tabPanel_<uuid>'
 * - tabPanel 의 keyed: false, pathed: false, escapeGridRender: false
 * - tabPanel type/group/name 계약
 * - tabPanel render가 ChildrenSlot만 반환 (동작 보존용 smoke)
 */
import { describe, it, expect } from 'vitest';
import { TabPanelComponent } from '../index';

describe('TabPanelComponent defineComponent contract', () => {
  it('has type "tabPanel"', () => {
    expect(TabPanelComponent.type).toBe('tabPanel');
  });

  it('has a non-empty name string', () => {
    expect(typeof TabPanelComponent.name).toBe('string');
    expect(TabPanelComponent.name.length).toBeGreaterThan(0);
  });

  it('has component function', () => {
    expect(typeof TabPanelComponent.component).toBe('function');
  });

  it('component.config.type is "tabPanel"', () => {
    expect(TabPanelComponent.component.config.type).toBe('tabPanel');
  });

  it('component.config.group is "container"', () => {
    expect(TabPanelComponent.component.config.group).toBe('container');
  });

  it('component.config.keyed is false', () => {
    expect(TabPanelComponent.component.config.keyed).toBe(false);
  });

  it('component.config.pathed is false', () => {
    expect(TabPanelComponent.component.config.pathed).toBe(false);
  });

  it('component.config.escapeGridRender is false', () => {
    expect(TabPanelComponent.component.config.escapeGridRender).toBe(false);
  });
});

describe('TabPanelComponent.create()', () => {
  it('returns object with type "tabPanel"', () => {
    const created = TabPanelComponent.create!();
    expect(created.type).toBe('tabPanel');
  });

  it('returns id matching pattern tabPanel_<uuid>', () => {
    const created = TabPanelComponent.create!();
    expect(typeof created.id).toBe('string');
    expect(created.id).toMatch(/^tabPanel_[0-9a-f-]+$/);
  });

  it('returns id different on each call (unique)', () => {
    const a = TabPanelComponent.create!();
    const b = TabPanelComponent.create!();
    expect(a.id).not.toBe(b.id);
  });

  it('returns empty components array', () => {
    const created = TabPanelComponent.create!();
    expect(Array.isArray(created.components)).toBe(true);
    expect((created.components as unknown[]).length).toBe(0);
  });

  it('returns default label when not provided', () => {
    const created = TabPanelComponent.create!();
    expect(typeof (created as { label?: string }).label).toBe('string');
    expect(((created as { label?: string }).label ?? '').length).toBeGreaterThan(0);
  });

  it('uses custom label when provided', () => {
    const created = TabPanelComponent.create!({ label: 'Custom Tab' });
    expect((created as { label?: string }).label).toBe('Custom Tab');
  });

  it('uses custom id when provided', () => {
    const created = TabPanelComponent.create!({ id: 'tabPanel_my-custom-id' });
    expect((created as { id?: string }).id).toBe('tabPanel_my-custom-id');
  });
});
