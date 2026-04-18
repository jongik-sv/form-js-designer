/**
 * TSK-03-02 QA #17, #18: Integration smoke tests.
 *
 * #17 — `./panel` subpath export exposes PanelWidget types (typecheck smoke).
 * #18 — defineComponent + propsSchemaToPanel 연쇄 호출 → PanelEntry 생성 성공.
 */
import { describe, it, expect, vi } from 'vitest';
import type { JSX } from 'preact';

import { defineComponent } from '../../defineComponent';
import { propsSchemaToPanel } from '../propsSchemaToPanel';
import { createDefaultRegistry } from '../PanelWidgetRegistry';
import type { ComponentDefinition, FieldSchema, PureRenderProps } from '../../types';

// ---------------------------------------------------------------------------
// QA #17: "./panel" subpath export — direct type imports from subpath resolve.
// The import path mirrors package.json exports["./panel"] resolution target.
// ---------------------------------------------------------------------------
import type { PanelWidget, PanelEntry, PanelWidgetCtx, WidgetMeta } from '../types';

interface DummyField extends FieldSchema {
  id: string;
  type: string;
  label?: string;
}

function makeCardLikeDef(): ComponentDefinition<DummyField> {
  const render = vi.fn(
    (_props: PureRenderProps<DummyField>): JSX.Element =>
      (null as unknown as JSX.Element),
  );
  return {
    type: 'card',
    name: 'Card',
    group: 'container',
    keyed: false,
    pathed: false,
    escapeGridRender: true,
    propsSchema: {
      properties: {
        title: { type: 'string', label: 'Title' },
        count: { type: 'number', label: 'Count', min: 0, max: 100 },
      },
    },
    create: (options = {}) => ({ type: 'card', ...options }),
    render: render as unknown as ComponentDefinition<DummyField>['render'],
  };
}

describe('TSK-03-02 QA #18 — defineComponent + propsSchemaToPanel 연쇄 smoke', () => {
  it('defineComponent 로 정의한 컴포넌트의 propsSchema 를 propsSchemaToPanel 로 변환 → PanelEntry 생성', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const def = makeCardLikeDef();
      const defined = defineComponent(def);

      expect(defined.propsSchema).toBe(def.propsSchema);

      const entries = propsSchemaToPanel(defined.propsSchema, createDefaultRegistry());
      expect(entries).toHaveLength(2);
      expect(entries[0]!.key).toBe('title');
      expect(entries[0]!.widgetType).toBe('string');
      expect(entries[1]!.key).toBe('count');
      expect(entries[1]!.widgetType).toBe('number');
    } finally {
      warnSpy.mockRestore();
    }
  });
});

describe('TSK-03-02 QA #17 — "./panel" subpath export (type smoke)', () => {
  it('PanelWidget / PanelEntry / PanelWidgetCtx / WidgetMeta 타입이 subpath 대상 파일에서 import 가능', () => {
    // Typecheck-only smoke: the imports above compile → the subpath export
    // target (`packages/designer-core/src/panel/types.ts` per package.json
    // "exports[\"./panel\"]") is reachable. Runtime assertion below just
    // exercises the types to prevent tree-shaking / dead-code elimination.
    const ctx: PanelWidgetCtx = { t: (k) => k, domId: 'x' };
    const meta: WidgetMeta = { type: 'string', label: 'T' };
    const stubWidget: PanelWidget<string> = {
      render: () => (null as unknown as JSX.Element),
      edit: () => (null as unknown as JSX.Element),
      validate: (v) => ({ ok: typeof v === 'string', errors: [] }),
    };
    const entry: PanelEntry = {
      key: 'k',
      widgetType: 'string',
      widget: stubWidget,
      meta,
    };
    expect(stubWidget.validate('a', meta).ok).toBe(true);
    expect(entry.key).toBe('k');
    expect(ctx.domId).toBe('x');
  });
});
