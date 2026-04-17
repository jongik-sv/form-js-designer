/**
 * StringWidget — 문자열 입력 위젯
 * render: 읽기 전용 span
 * edit: text input
 * validate: typeof string
 */
import { h } from 'preact';
import type { PanelWidget, WidgetMeta, WidgetValidationResult } from '../types';

export const StringWidget: PanelWidget<string> = {
  render(value, _ctx) {
    return (
      <span
        class="panel-widget-string-view"
        style={{ display: 'inline-block', minWidth: '1ch' }}
      >
        {value ?? ''}
      </span>
    );
  },

  edit(value, onChange, ctx) {
    return (
      <input
        id={ctx.domId}
        type="text"
        value={value ?? ''}
        disabled={ctx.disabled}
        onInput={(e) => onChange((e.target as HTMLInputElement).value)}
        onChange={(e) => onChange((e.target as HTMLInputElement).value)}
        style={{ width: '100%' }}
      />
    );
  },

  validate(value: unknown, _meta: WidgetMeta): WidgetValidationResult {
    if (typeof value !== 'string') {
      return { ok: false, errors: ['Value must be a string'] };
    }
    return { ok: true, errors: [] };
  },
};
