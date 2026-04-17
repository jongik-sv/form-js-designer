/**
 * EnumWidget — 열거형 선택 위젯
 * render: 읽기 전용 선택값 표시
 * edit: select (combobox)
 * validate: value ∈ enum
 */
import { h } from 'preact';
import type { PanelWidget, WidgetMeta, WidgetValidationResult } from '../types';

export const EnumWidget: PanelWidget<string> = {
  render(value, _ctx) {
    return (
      <span class="panel-widget-enum-view">
        {value ?? ''}
      </span>
    );
  },

  edit(value, onChange, ctx, meta) {
    const options = meta?.enum ?? [];
    return (
      <select
        id={ctx.domId}
        role="combobox"
        value={value ?? ''}
        disabled={ctx.disabled}
        onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
        style={{ width: '100%' }}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  },

  validate(value: unknown, meta: WidgetMeta): WidgetValidationResult {
    const allowedValues = meta.enum ?? [];
    if (allowedValues.length === 0) {
      return { ok: false, errors: ['No enum values defined'] };
    }
    if (!allowedValues.includes(value as string)) {
      return {
        ok: false,
        errors: [`Value "${String(value)}" is not one of: ${allowedValues.join(', ')}`],
      };
    }
    return { ok: true, errors: [] };
  },
};
