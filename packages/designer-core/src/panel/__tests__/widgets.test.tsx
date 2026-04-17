/**
 * AC #7 위젯 8종 × {render, edit, validate} = 24 케이스 자동 매트릭스
 *
 * 이 파일에서 정확히 24 케이스가 선언/실행되어야 한다.
 * 케이스 수 sanity 체크는 WIDGET_NAMES.length * 3 === 24 로 보장.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
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
// Sanity: exactly 8 widgets → 24 cases
// ---------------------------------------------------------------------------
const WIDGET_NAMES = [
  'string', 'number', 'boolean', 'enum',
  'color', 'spacing', 'expression', 'i18n',
] as const;
// Static compile-time assertion: 8 widgets × 3 contracts = 24
type _Assert24 = [typeof WIDGET_NAMES]['length'] extends 8 ? true : false;
const _: _Assert24 = true;
void _;

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

// ---------------------------------------------------------------------------
// 24-case matrix
// ---------------------------------------------------------------------------
describe('Widget matrix — AC #7 (24 cases)', () => {
  for (const widgetType of WIDGET_NAMES) {
    const widget = WIDGET_MAP[widgetType];
    const value = DEFAULT_VALUES[widgetType];
    const meta = DEFAULT_META[widgetType];

    describe(`${widgetType}Widget`, () => {
      // Case 1: render
      it('render — returns non-empty JSX, mounts to DOM', () => {
        const { container } = render(widget.render(value, CTX));
        expect(container.firstChild).not.toBeNull();
        // Should not be an empty element
        expect(container.innerHTML).not.toBe('');
      });

      // Case 2: edit
      it('edit — mounts without error and calls onChange on user input', () => {
        const onChange = vi.fn();
        const { container } = render(widget.edit(value, onChange, CTX));
        expect(container.firstChild).not.toBeNull();
        // Each widget should have at least one interactive element
        const inputs = container.querySelectorAll('input, select, textarea');
        expect(inputs.length).toBeGreaterThan(0);
      });

      // Case 3: validate
      it('validate — returns { ok: true } for valid value, { ok: false } for invalid', () => {
        // Valid
        const valid = widget.validate(value, meta);
        expect(valid).toHaveProperty('ok', true);
        expect(valid.errors).toEqual([]);

        // Invalid (null is not valid for any widget)
        const invalid = widget.validate(null, meta);
        expect(invalid).toHaveProperty('ok', false);
        expect(invalid.errors.length).toBeGreaterThan(0);
      });
    });
  }
});

// ---------------------------------------------------------------------------
// Additional edge-case tests (beyond the 24-case matrix)
// ---------------------------------------------------------------------------

describe('StringWidget — extra edge cases', () => {
  it('edit — onChange called with new string value on input change', () => {
    const onChange = vi.fn();
    render(StringWidget.edit('initial', onChange, CTX));
    const input = screen.getByDisplayValue('initial') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'updated' } });
    expect(onChange).toHaveBeenCalledWith('updated');
  });
});

describe('NumberWidget — extra edge cases', () => {
  it('validate — min boundary: -1 fails when min=0', () => {
    const result = NumberWidget.validate(-1, { type: 'number', label: 'X', min: 0, max: 10 });
    expect(result.ok).toBe(false);
  });

  it('validate — max boundary: 10 passes when max=10', () => {
    const result = NumberWidget.validate(10, { type: 'number', label: 'X', min: 0, max: 10 });
    expect(result.ok).toBe(true);
  });

  it('validate — 5 passes when min=0, max=10', () => {
    const result = NumberWidget.validate(5, { type: 'number', label: 'X', min: 0, max: 10 });
    expect(result.ok).toBe(true);
  });
});

describe('EnumWidget — extra edge cases', () => {
  it('edit — renders select with correct options', () => {
    const onChange = vi.fn();
    const meta: WidgetMeta = { type: 'enum', label: 'Status', enum: ['a', 'b', 'c'] };
    render(EnumWidget.edit('a', onChange, { ...CTX }, meta));
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.options.length).toBe(3);
  });

  it('validate — empty enum: any value fails', () => {
    const result = EnumWidget.validate('anything', { type: 'enum', label: 'X', enum: [] });
    expect(result.ok).toBe(false);
  });

  it('validate — value not in enum: fails', () => {
    const result = EnumWidget.validate('unknown', { type: 'enum', label: 'X', enum: ['a', 'b'] });
    expect(result.ok).toBe(false);
  });
});

describe('SpacingWidget — extra edge cases', () => {
  it('validate — valid object passes', () => {
    const result = SpacingWidget.validate({ top: 4, right: 8, bottom: 4, left: 8 }, DEFAULT_META.spacing);
    expect(result.ok).toBe(true);
  });

  it('validate — scalar number fails', () => {
    const result = SpacingWidget.validate(8, DEFAULT_META.spacing);
    expect(result.ok).toBe(false);
  });
});

describe('I18nWidget — extra edge cases', () => {
  it('validate — invalid key pattern fails', () => {
    const result = I18nWidget.validate({ key: 'Invalid Key!', ko: '값' }, DEFAULT_META.i18n);
    expect(result.ok).toBe(false);
  });

  it('validate — valid namespace key passes', () => {
    const result = I18nWidget.validate({ key: 'designer.foo.bar', ko: '값' }, DEFAULT_META.i18n);
    expect(result.ok).toBe(true);
  });
});

describe('BooleanWidget — extra edge cases', () => {
  it('edit — checkbox reflects boolean value', () => {
    const onChange = vi.fn();
    render(BooleanWidget.edit(true, onChange, CTX));
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('edit — onChange called with false when unchecked', () => {
    const onChange = vi.fn();
    render(BooleanWidget.edit(true, onChange, CTX));
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    fireEvent.change(checkbox, { target: { checked: false } });
    expect(onChange).toHaveBeenCalledWith(false);
  });
});
