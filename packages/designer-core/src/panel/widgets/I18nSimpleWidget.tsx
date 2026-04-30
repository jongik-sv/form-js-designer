/**
 * I18nSimpleWidget — Simple-mode 전용 ko 단일 입력 i18n 위젯
 *
 * 기본 I18nWidget(2-input: key + ko)과 달리 ko 값만 단일 input으로 편집한다.
 * onChange 시 기존 key 필드를 보존한다. BUILTIN_WIDGETS에 등록되지 않는다 —
 * host PropsPanelService가 Simple-mode 한정으로 simpleRegistry에 별도 등록한다.
 */
import { h } from 'preact';
import type { PanelWidget, WidgetMeta, WidgetValidationResult } from '../types';
import type { I18nValue } from './I18nWidget';

const DEFAULT_I18N: I18nValue = { key: '', ko: '' };

export const I18nSimpleWidget: PanelWidget<I18nValue> = {
  render(value, _ctx) {
    const v = value ?? DEFAULT_I18N;
    return <span class="panel-widget-i18n-simple-view">{v.ko || '(no value)'}</span>;
  },

  edit(value, onChange, ctx) {
    const v = value ?? DEFAULT_I18N;
    const update = (e: Event) => {
      const next = (e.target as HTMLInputElement).value;
      onChange({ ...v, ko: next });
    };
    return (
      <input
        id={ctx.domId}
        class="panel-widget-i18n-simple-edit"
        type="text"
        value={v.ko}
        disabled={ctx.disabled}
        placeholder="한국어"
        onInput={update}
        onChange={update}
        style={{ width: '100%' }}
      />
    );
  },

  validate(_value: unknown, _meta: WidgetMeta): WidgetValidationResult {
    return { ok: true, errors: [] };
  },
};
