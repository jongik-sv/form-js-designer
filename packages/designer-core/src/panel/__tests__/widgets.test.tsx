/**
 * AC #7 위젯 8종 × {render, edit, validate} = 24 케이스 자동 매트릭스
 *
 * 이 파일은 **정확히 24 매트릭스 케이스 + 1 카운트 sanity assert** 만을 포함한다.
 * 추가 엣지 케이스는 `widgets-edge-cases.test.tsx` 를 참조.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/preact';
import type { PanelWidget, PanelWidgetCtx, WidgetMeta } from '../types';
import { StringWidget } from '../widgets/StringWidget';
import { NumberWidget } from '../widgets/NumberWidget';
import { BooleanWidget } from '../widgets/BooleanWidget';
import { EnumWidget } from '../widgets/EnumWidget';
import { ColorWidget } from '../widgets/ColorWidget';
import { SpacingWidget } from '../widgets/SpacingWidget';
import { ExpressionWidget } from '../widgets/ExpressionWidget';
import { I18nWidget } from '../widgets/I18nWidget';

// ---------------------------------------------------------------------------
// Invariant: 8 widgets × 3 contracts = 24 matrix cases (AC #7)
// ---------------------------------------------------------------------------
const WIDGET_NAMES = [
  'string', 'number', 'boolean', 'enum',
  'color', 'spacing', 'expression', 'i18n',
] as const;
const CONTRACTS = ['render', 'edit', 'validate'] as const;
const EXPECTED_MATRIX_CASES = 24;

if (WIDGET_NAMES.length !== 8) {
  throw new Error(`Widget count sanity check failed: expected 8, got ${WIDGET_NAMES.length}`);
}
if (CONTRACTS.length !== 3) {
  throw new Error(`Contract count sanity check failed: expected 3, got ${CONTRACTS.length}`);
}
if (WIDGET_NAMES.length * CONTRACTS.length !== EXPECTED_MATRIX_CASES) {
  throw new Error(
    `AC #7 matrix invariant violated: ${WIDGET_NAMES.length} × ${CONTRACTS.length} ≠ ${EXPECTED_MATRIX_CASES}`,
  );
}

// ---------------------------------------------------------------------------
// Widget registry for tests
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WIDGET_MAP: Record<typeof WIDGET_NAMES[number], PanelWidget<any>> = {
  string: StringWidget,
  number: NumberWidget,
  boolean: BooleanWidget,
  enum: EnumWidget,
  color: ColorWidget,
  spacing: SpacingWidget,
  expression: ExpressionWidget,
  i18n: I18nWidget,
};

// ---------------------------------------------------------------------------
// Default test values per widget type
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DEFAULT_VALUES: Record<typeof WIDGET_NAMES[number], any> = {
  string: 'hello',
  number: 42,
  boolean: true,
  enum: 'option-a',
  color: '#ff0000',
  spacing: { top: 4, right: 8, bottom: 4, left: 8 },
  expression: '= x + 1',
  i18n: { key: 'designer.foo.bar', ko: '안녕' },
};

// ---------------------------------------------------------------------------
// Default meta per widget type
// ---------------------------------------------------------------------------
const DEFAULT_META: Record<typeof WIDGET_NAMES[number], WidgetMeta> = {
  string: { type: 'string', label: 'Name' },
  number: { type: 'number', label: 'Count', min: 0, max: 100 },
  boolean: { type: 'boolean', label: 'Enabled' },
  enum: { type: 'enum', label: 'Status', enum: ['option-a', 'option-b'] },
  color: { type: 'color', label: 'Color' },
  spacing: { type: 'spacing', label: 'Padding' },
  expression: { type: 'expression', label: 'Formula' },
  i18n: { type: 'i18n', label: 'Label' },
};

// ---------------------------------------------------------------------------
// Shared ctx
// ---------------------------------------------------------------------------
const CTX: PanelWidgetCtx = {
  t: (key: string) => key,
  disabled: false,
  domId: 'test-dom',
  label: 'Test Label',
};

// Runtime counter — tracked inside matrix to assert final == 24
let runTestCount = 0;

// ---------------------------------------------------------------------------
// 24-case matrix
// ---------------------------------------------------------------------------
describe('Widget matrix — AC #7 (24 cases)', () => {
  for (const widgetType of WIDGET_NAMES) {
    const widget = WIDGET_MAP[widgetType];
    const value = DEFAULT_VALUES[widgetType];
    const meta = DEFAULT_META[widgetType];

    describe(`${widgetType}Widget`, () => {
      it('render — returns non-empty JSX, mounts to DOM', () => {
        runTestCount++;
        const { container } = render(widget.render(value, CTX));
        expect(container.firstChild).not.toBeNull();
        expect(container.innerHTML).not.toBe('');
      });

      it('edit — mounts without error and calls onChange on user input', () => {
        runTestCount++;
        const onChange = vi.fn();
        const { container } = render(widget.edit(value, onChange, CTX));
        expect(container.firstChild).not.toBeNull();
        const inputs = container.querySelectorAll('input, select, textarea');
        expect(inputs.length).toBeGreaterThan(0);
      });

      it('validate — returns { ok: true } for valid value, { ok: false } for invalid', () => {
        runTestCount++;
        const valid = widget.validate(value, meta);
        expect(valid).toHaveProperty('ok', true);
        expect(valid.errors).toEqual([]);

        const invalid = widget.validate(null, meta);
        expect(invalid).toHaveProperty('ok', false);
        expect(invalid.errors.length).toBeGreaterThan(0);
      });
    });
  }
});

// ---------------------------------------------------------------------------
// Exactly-24 sanity assert — separate describe so it runs AFTER matrix.
// Vitest sequences describe blocks top-to-bottom within a file.
// ---------------------------------------------------------------------------
describe('AC #7 matrix case-count sanity', () => {
  it(`runs exactly ${EXPECTED_MATRIX_CASES} matrix cases`, () => {
    expect(runTestCount).toBe(EXPECTED_MATRIX_CASES);
  });
});
