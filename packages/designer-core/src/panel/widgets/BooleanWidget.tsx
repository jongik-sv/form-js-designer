/**
 * BooleanWidget — 불리언 토글 위젯
 * render: 읽기 전용 체크 상태 표시
 * edit: checkbox
 * validate: typeof boolean
 */
import { h } from 'preact';
import type { PanelWidget, WidgetMeta, WidgetValidationResult } from '../types';

export const BooleanWidget: PanelWidget<boolean> = {
  render(value, _ctx) {
    return (
      <span class="panel-widget-boolean-view">
        {value ? '✓' : '✗'}
      </span>
    );
  },

  edit(value, onChange, ctx) {
    return (
      <input
        id={ctx.domId}
        type="checkbox"
        role="checkbox"
        checked={!!value}
        disabled={ctx.disabled}
        onChange={(e) => onChange((e.target as HTMLInputElement).checked)}
      />
    );
  },

  validate(value: unknown, _meta: WidgetMeta): WidgetValidationResult {
    if (typeof value !== 'boolean') {
      return { ok: false, errors: ['Value must be a boolean'] };
    }
    return { ok: true, errors: [] };
  },
};
