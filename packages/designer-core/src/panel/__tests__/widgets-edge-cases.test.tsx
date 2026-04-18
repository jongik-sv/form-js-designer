/**
 * Widget edge-case tests (separated from the 24-case matrix in widgets.test.tsx).
 *
 * widgets.test.tsx는 AC #7 의 "정확히 24 케이스" 를 증명한다.
 * 추가 엣지 케이스는 본 파일에서 검증하여 매트릭스의 invariant 를 보존한다.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import type { PanelWidgetCtx, WidgetMeta } from '../types';
import { StringWidget } from '../widgets/StringWidget';
import { NumberWidget } from '../widgets/NumberWidget';
import { BooleanWidget } from '../widgets/BooleanWidget';
import { EnumWidget } from '../widgets/EnumWidget';
import { SpacingWidget } from '../widgets/SpacingWidget';
import { I18nWidget } from '../widgets/I18nWidget';

const CTX: PanelWidgetCtx = {
  t: (key: string) => key,
  disabled: false,
  domId: 'test-dom',
  label: 'Test Label',
};

const SPACING_META: WidgetMeta = { type: 'spacing', label: 'Padding' };
const I18N_META: WidgetMeta = { type: 'i18n', label: 'Label' };

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
    const { container } = render(EnumWidget.edit('a', onChange, { ...CTX }, meta));
    const select = container.querySelector('select') as HTMLSelectElement;
    expect(select).not.toBeNull();
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
    const result = SpacingWidget.validate({ top: 4, right: 8, bottom: 4, left: 8 }, SPACING_META);
    expect(result.ok).toBe(true);
  });

  it('validate — scalar number fails', () => {
    const result = SpacingWidget.validate(8, SPACING_META);
    expect(result.ok).toBe(false);
  });
});

describe('I18nWidget — extra edge cases', () => {
  it('validate — invalid key pattern fails', () => {
    const result = I18nWidget.validate({ key: 'Invalid Key!', ko: '값' }, I18N_META);
    expect(result.ok).toBe(false);
  });

  it('validate — valid namespace key passes', () => {
    const result = I18nWidget.validate({ key: 'designer.foo.bar', ko: '값' }, I18N_META);
    expect(result.ok).toBe(true);
  });
});

describe('BooleanWidget — extra edge cases', () => {
  it('edit — checkbox reflects boolean value', () => {
    const onChange = vi.fn();
    const { container } = render(BooleanWidget.edit(true, onChange, CTX));
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).not.toBeNull();
    expect(checkbox.checked).toBe(true);
  });

  it('edit — onChange called with false when unchecked', () => {
    const onChange = vi.fn();
    const { container } = render(BooleanWidget.edit(true, onChange, CTX));
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).not.toBeNull();
    fireEvent.change(checkbox, { target: { checked: false } });
    expect(onChange).toHaveBeenCalledWith(false);
  });
});
