/**
 * ColorWidget — 색상 선택 위젯
 * render: 색상 swatch + hex 텍스트
 * edit: color input + hex text input
 * validate: CSS color string regex (hex/rgb/hsl/named)
 */
import { h } from 'preact';
import type { PanelWidget, WidgetMeta, WidgetValidationResult } from '../types';

// CSS color 유효성 검증 정규식
// hex(3/4/6/8자리), rgb(), rgba(), hsl(), hsla(), named colors
const CSS_COLOR_PATTERN =
  /^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(\s*,\s*[\d.]+)?\s*\)|hsla?\(\s*\d+\s*,\s*[\d.]+%\s*,\s*[\d.]+%(\s*,\s*[\d.]+)?\s*\)|[a-zA-Z]+)$/;

export const ColorWidget: PanelWidget<string> = {
  render(value, _ctx) {
    return (
      <span class="panel-widget-color-view" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <span
          style={{
            display: 'inline-block',
            width: '16px',
            height: '16px',
            backgroundColor: value ?? 'transparent',
            border: '1px solid #ccc',
            borderRadius: '2px',
          }}
        />
        <span>{value ?? ''}</span>
      </span>
    );
  },

  edit(value, onChange, ctx) {
    return (
      <div class="panel-widget-color-edit" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <input
          id={ctx.domId}
          type="color"
          value={value ?? '#000000'}
          disabled={ctx.disabled}
          onChange={(e) => onChange((e.target as HTMLInputElement).value)}
          style={{ width: '36px', height: '28px', padding: '0', border: 'none', cursor: 'pointer' }}
        />
        <input
          type="text"
          value={value ?? ''}
          disabled={ctx.disabled}
          placeholder="#rrggbb"
          onInput={(e) => onChange((e.target as HTMLInputElement).value)}
          onChange={(e) => onChange((e.target as HTMLInputElement).value)}
          style={{ flex: 1 }}
        />
      </div>
    );
  },

  validate(value: unknown, _meta: WidgetMeta): WidgetValidationResult {
    if (typeof value !== 'string' || value.trim() === '') {
      return { ok: false, errors: ['Value must be a non-empty CSS color string'] };
    }
    if (!CSS_COLOR_PATTERN.test(value.trim())) {
      return { ok: false, errors: [`"${value}" is not a valid CSS color`] };
    }
    return { ok: true, errors: [] };
  },
};
