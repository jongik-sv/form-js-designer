/**
 * StringWidget — 문자열 입력 위젯
 * render: 읽기 전용 span
 * edit: text input (uncontrolled — IME composition 보존, focus-steal 회피)
 * validate: typeof string
 *
 * 컨트롤드 입력은 키 입력마다 modeling.editFormField → form-js elements.changed →
 * 패널 re-render 로 input 이 새로 생성되어 포커스/IME 가 끊긴다. NumberWidget 과
 * 동일하게 ref + defaultValue 패턴으로 unconrolled 화하고, compositionstart/end 로
 * 한글 IME 조합 중에는 commit 을 보류한다. focus 밖일 때만 외부 value 변경을 DOM 에 동기화.
 */
import { h } from 'preact';
import { useRef, useEffect } from 'preact/hooks';
import type { PanelWidget, PanelWidgetCtx, WidgetMeta, WidgetValidationResult } from '../types';

interface StringEditProps {
  value: string | undefined;
  onChange: (v: string) => void;
  ctx: PanelWidgetCtx;
}

function StringEdit({ value, onChange, ctx }: StringEditProps) {
  const ref = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);
  const lastEmittedRef = useRef<string>(value ?? '');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const next = value ?? '';
    if (next === lastEmittedRef.current) return;
    if (document.activeElement === el) return;
    if (el.value !== next) el.value = next;
  }, [value]);

  const commit = (text: string) => {
    if (text === lastEmittedRef.current) return;
    lastEmittedRef.current = text;
    onChange(text);
  };

  return (
    <input
      ref={ref}
      id={ctx.domId}
      type="text"
      defaultValue={value ?? ''}
      disabled={ctx.disabled}
      onCompositionStart={() => { composingRef.current = true; }}
      onCompositionEnd={(e) => {
        composingRef.current = false;
        commit((e.target as HTMLInputElement).value);
      }}
      onInput={(e) => {
        if (composingRef.current) return;
        commit((e.target as HTMLInputElement).value);
      }}
      onChange={(e) => {
        if (composingRef.current) return;
        commit((e.target as HTMLInputElement).value);
      }}
      onBlur={(e) => commit((e.target as HTMLInputElement).value)}
      style={{ width: '100%' }}
    />
  );
}

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
    return <StringEdit value={value} onChange={onChange} ctx={ctx} />;
  },

  validate(value: unknown, _meta: WidgetMeta): WidgetValidationResult {
    if (typeof value !== 'string') {
      return { ok: false, errors: ['Value must be a string'] };
    }
    return { ok: true, errors: [] };
  },
};
