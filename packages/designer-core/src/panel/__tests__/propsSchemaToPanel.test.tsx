/**
 * propsSchemaToPanel 변환기 단위 테스트
 * - 그룹/순서/showIf/레지스트리 주입 커스텀 위젯
 */
import { describe, it, expect, vi } from 'vitest';
import { propsSchemaToPanel } from '../propsSchemaToPanel';
import { createDefaultRegistry } from '../PanelWidgetRegistry';
import type { PropsSchema } from '../../types';
import type { PanelWidget, PanelWidgetCtx, WidgetMeta, WidgetValidationResult } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSchema(properties: PropsSchema['properties']): PropsSchema {
  return { properties };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('propsSchemaToPanel', () => {
  it('(정상) empty properties → empty array, no throw', () => {
    const result = propsSchemaToPanel(makeSchema({}));
    expect(result).toEqual([]);
  });

  it('(정상) 2 properties → 2 PanelEntry items with correct widgetType', () => {
    const schema = makeSchema({
      a: { type: 'string', label: 'Field A' },
      b: { type: 'number', label: 'Field B' },
    });
    const entries = propsSchemaToPanel(schema);
    expect(entries).toHaveLength(2);
    expect(entries[0]!.widgetType).toBe('string');
    expect(entries[0]!.key).toBe('a');
    expect(entries[1]!.widgetType).toBe('number');
    expect(entries[1]!.key).toBe('b');
  });

  it('(정상) property 메타(label, description, default, group, showIf) 가 PanelEntry에 복사됨', () => {
    const schema = makeSchema({
      myProp: {
        type: 'string',
        label: 'My Label',
        description: 'A description',
        default: 'default-val',
        group: 'advanced',
        showIf: '= x > 0',
      },
    });
    const entries = propsSchemaToPanel(schema);
    expect(entries).toHaveLength(1);
    const entry = entries[0]!;
    expect(entry.label).toBe('My Label');
    expect(entry.description).toBe('A description');
    expect(entry.defaultValue).toBe('default-val');
    expect(entry.group).toBe('advanced');
    expect(entry.showIf).toBe('= x > 0');
  });

  it('(정상) 모든 8 위젯 타입이 변환 가능', () => {
    const schema = makeSchema({
      s: { type: 'string' },
      n: { type: 'number' },
      b: { type: 'boolean' },
      e: { type: 'enum', enum: ['a', 'b'] },
      c: { type: 'color' },
      sp: { type: 'spacing' },
      ex: { type: 'expression' },
      i: { type: 'i18n' },
    });
    const entries = propsSchemaToPanel(schema);
    expect(entries).toHaveLength(8);
    const types = entries.map(e => e.widgetType);
    expect(types).toContain('string');
    expect(types).toContain('number');
    expect(types).toContain('boolean');
    expect(types).toContain('enum');
    expect(types).toContain('color');
    expect(types).toContain('spacing');
    expect(types).toContain('expression');
    expect(types).toContain('i18n');
  });

  it('(에러) unknown type → UnknownWidgetError with type name in message', () => {
    const schema = makeSchema({
      x: { type: 'unknown' as never },
    });
    expect(() => propsSchemaToPanel(schema)).toThrow(/unknown/i);
  });

  it('(정상) 커스텀 레지스트리 주입 — 커스텀 위젯 타입 사용 가능', () => {
    const registry = createDefaultRegistry();
    const mockWidget: PanelWidget<string> = {
      render: (value, _ctx) => <div data-testid="custom">{value}</div>,
      edit: (value, onChange, _ctx) => (
        <input value={value} onChange={(e) => onChange((e.target as HTMLInputElement).value)} />
      ),
      validate: (value) => ({ ok: typeof value === 'string', errors: [] }),
    };
    registry.register('custom-type', mockWidget);

    const schema = makeSchema({
      myCustom: { type: 'custom-type' as never },
    });
    const entries = propsSchemaToPanel(schema, registry);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.widgetType).toBe('custom-type');
  });

  it('(정상) 순서 보존 — properties 선언 순서대로 PanelEntry 배열 순서 결정', () => {
    const schema = makeSchema({
      first: { type: 'string' },
      second: { type: 'boolean' },
      third: { type: 'number' },
    });
    const entries = propsSchemaToPanel(schema);
    expect(entries[0]!.key).toBe('first');
    expect(entries[1]!.key).toBe('second');
    expect(entries[2]!.key).toBe('third');
  });

  it('(정상) collapsed 메타 보존', () => {
    const schema = makeSchema({
      prop: { type: 'string', collapsed: true },
    });
    const entries = propsSchemaToPanel(schema);
    expect(entries[0]!.collapsed).toBe(true);
  });

  it('(정상) widget 인스턴스가 PanelEntry.widget에 연결됨', () => {
    const schema = makeSchema({ x: { type: 'string' } });
    const entries = propsSchemaToPanel(schema);
    const entry = entries[0]!;
    expect(entry.widget).toBeDefined();
    expect(typeof entry.widget.render).toBe('function');
    expect(typeof entry.widget.edit).toBe('function');
    expect(typeof entry.widget.validate).toBe('function');
  });
});
