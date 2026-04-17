/**
 * I18nWidget — i18n key + ko 값 입력 위젯
 * render: key / ko 요약 표시
 * edit: key input + ko textarea (2-row)
 * validate: key 네임스페이스 패턴(^[a-z][\w.-]*$) + ko string
 */
import { h } from 'preact';
import type { PanelWidget, WidgetMeta, WidgetValidationResult } from '../types';

export interface I18nValue {
  key: string;
  ko: string;
}

// i18n 키 패턴: 소문자 시작, 단어문자/점/하이픈 허용
const I18N_KEY_PATTERN = /^[a-z][\w.-]*$/;

const DEFAULT_I18N: I18nValue = { key: '', ko: '' };

export const I18nWidget: PanelWidget<I18nValue> = {
  render(value, _ctx) {
    const v = value ?? DEFAULT_I18N;
    return (
      <span class="panel-widget-i18n-view" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#666' }}>{v.key || '(no key)'}</span>
        <span>{v.ko || '(no value)'}</span>
      </span>
    );
  },

  edit(value, onChange, ctx) {
    const v = value ?? DEFAULT_I18N;
    return (
      <div class="panel-widget-i18n-edit" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '11px' }}>
          i18n key
          <input
            id={ctx.domId}
            type="text"
            value={v.key}
            disabled={ctx.disabled}
            placeholder="designer.foo.bar"
            onInput={(e) => onChange({ ...v, key: (e.target as HTMLInputElement).value })}
            onChange={(e) => onChange({ ...v, key: (e.target as HTMLInputElement).value })}
            style={{ width: '100%', fontFamily: 'monospace', fontSize: '12px' }}
          />
        </label>
        <label style={{ fontSize: '11px' }}>
          ko (한국어)
          <input
            type="text"
            value={v.ko}
            disabled={ctx.disabled}
            placeholder="한국어 번역"
            onInput={(e) => onChange({ ...v, ko: (e.target as HTMLInputElement).value })}
            onChange={(e) => onChange({ ...v, ko: (e.target as HTMLInputElement).value })}
            style={{ width: '100%' }}
          />
        </label>
      </div>
    );
  },

  validate(value: unknown, _meta: WidgetMeta): WidgetValidationResult {
    if (
      typeof value !== 'object' ||
      value === null ||
      Array.isArray(value)
    ) {
      return { ok: false, errors: ['Value must be an object { key, ko }'] };
    }

    const v = value as Record<string, unknown>;
    const errors: string[] = [];

    if (typeof v['key'] !== 'string' || v['key'].trim() === '') {
      errors.push('i18n key must be a non-empty string');
    } else if (!I18N_KEY_PATTERN.test(v['key'])) {
      errors.push(`i18n key "${v['key']}" must match pattern ^[a-z][\\w.-]*$`);
    }

    if (typeof v['ko'] !== 'string') {
      errors.push('"ko" value must be a string');
    }

    if (errors.length > 0) {
      return { ok: false, errors };
    }
    return { ok: true, errors: [] };
  },
};
