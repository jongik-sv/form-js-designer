/**
 * PanelWidgetRegistry 단위 테스트
 * - register/get/list/중복 에러/기본 9종 선등록 검증
 */
import { describe, it, expect } from 'vitest';
import { PanelWidgetRegistry, createDefaultRegistry } from '../PanelWidgetRegistry';
import type { PanelWidget } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeMockWidget(): PanelWidget<string> {
  return {
    render: (_value, _ctx) => null as never,
    edit: (_value, _onChange, _ctx) => null as never,
    validate: (_value, _meta) => ({ ok: true, errors: [] }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PanelWidgetRegistry', () => {
  it('(정상) 빈 registry 생성 — list() 반환 빈 배열', () => {
    const registry = new PanelWidgetRegistry();
    expect(registry.list()).toEqual([]);
  });

  it('(정상) register + get — 등록 후 조회 가능', () => {
    const registry = new PanelWidgetRegistry();
    const widget = makeMockWidget();
    registry.register('my-type', widget);
    expect(registry.get('my-type')).toBe(widget);
  });

  it('(정상) has — 등록된 type은 true, 미등록은 false', () => {
    const registry = new PanelWidgetRegistry();
    registry.register('existing', makeMockWidget());
    expect(registry.has('existing')).toBe(true);
    expect(registry.has('not-existing')).toBe(false);
  });

  it('(정상) list() — 등록된 모든 type 반환', () => {
    const registry = new PanelWidgetRegistry();
    registry.register('type-a', makeMockWidget());
    registry.register('type-b', makeMockWidget());
    const list = registry.list();
    expect(list).toContain('type-a');
    expect(list).toContain('type-b');
    expect(list.length).toBe(2);
  });

  it('(에러) register — 중복 type 등록 시 DuplicateWidgetError throw', () => {
    const registry = new PanelWidgetRegistry();
    registry.register('string', makeMockWidget());
    expect(() => registry.register('string', makeMockWidget())).toThrow(/DuplicateWidget|string/i);
  });

  it('(정상) register — overwrite: true 옵션으로 중복 덮어쓰기 가능', () => {
    const registry = new PanelWidgetRegistry();
    const widget1 = makeMockWidget();
    const widget2 = makeMockWidget();
    registry.register('string', widget1);
    registry.register('string', widget2, { overwrite: true });
    expect(registry.get('string')).toBe(widget2);
  });

  it('(에러) get — 미등록 type 조회 시 undefined 반환', () => {
    const registry = new PanelWidgetRegistry();
    expect(registry.get('nonexistent')).toBeUndefined();
  });
});

describe('createDefaultRegistry', () => {
  it('(정상) 기본 9종 위젯이 모두 등록됨', () => {
    const registry = createDefaultRegistry();
    const list = registry.list();
    const expected = ['string', 'number', 'boolean', 'enum', 'color', 'spacing', 'expression', 'i18n', 'tree'];
    for (const type of expected) {
      expect(list).toContain(type);
    }
    expect(list.length).toBe(9);
  });

  it('(정상) 각 기본 위젯이 {render, edit, validate} 3 계약 모두 구현', () => {
    const registry = createDefaultRegistry();
    for (const type of registry.list()) {
      const widget = registry.get(type);
      expect(widget).toBeDefined();
      expect(typeof widget!.render).toBe('function');
      expect(typeof widget!.edit).toBe('function');
      expect(typeof widget!.validate).toBe('function');
    }
  });

  it('(정상) createDefaultRegistry()는 독립 인스턴스를 반환 (레지스트리 격리)', () => {
    const r1 = createDefaultRegistry();
    const r2 = createDefaultRegistry();
    r1.register('custom', makeMockWidget());
    expect(r2.has('custom')).toBe(false);
  });
});
