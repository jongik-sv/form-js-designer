/**
 * NumberWidget — 숫자 입력 위젯 (min/max/step 지원)
 * render: 읽기 전용 span
 * edit: number input
 * validate: typeof number + range
 */
import { h } from 'preact';
import type { PanelWidget, WidgetMeta, WidgetValidationResult } from '../types';

export const NumberWidget: PanelWidget<number> = {
  render(value, _ctx) {
    return (
      <span class="panel-widget-number-view">
        {value ?? ''}
      </span>
    );
  },

  edit(value, onChange, ctx, meta) {
    return (
      <input
        id={ctx.domId}
        type="number"
        value={value ?? ''}
        disabled={ctx.disabled}
        min={meta?.min}
        max={meta?.max}
        onChange={(e) => {
          const parsed = parseFloat((e.target as HTMLInputElement).value);
          if (!isNaN(parsed)) onChange(parsed);
        }}
        style={{ width: '100%' }}
      />
    );
  },

  validate(value: unknown, meta: WidgetMeta): WidgetValidationResult {
    if (typeof value !== 'number' || isNaN(value)) {
      return { ok: false, errors: ['Value must be a number'] };
    }
    if (meta.min !== undefined && value < meta.min) {
      return { ok: false, errors: [`Value must be >= ${meta.min}`] };
    }
    if (meta.max !== undefined && value > meta.max) {
      return { ok: false, errors: [`Value must be <= ${meta.max}`] };
    }
    return { ok: true, errors: [] };
  },
};
