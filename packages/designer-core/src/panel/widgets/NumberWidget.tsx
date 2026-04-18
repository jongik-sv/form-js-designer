/**
 * NumberWidget — 숫자 입력 위젯 (min/max/step 지원)
 * render: 읽기 전용 span
 * edit: number input (컨트롤드 입력 cursor-reset 방지 위해 내부 컴포넌트로 감쌈)
 * validate: typeof number + range
 */
import { h } from 'preact';
import { useRef, useEffect } from 'preact/hooks';
import type { PanelWidget, PanelWidgetCtx, WidgetMeta, WidgetValidationResult } from '../types';

interface NumberEditProps {
  value: number | undefined;
  onChange: (v: number) => void;
  ctx: PanelWidgetCtx;
  meta?: WidgetMeta;
}

/**
 * 내부 컴포넌트 — uncontrolled 입력.
 * 외부 value 변경은 포커스 밖일 때만 DOM 값을 동기화한다 (cursor 보존).
 * form-js 의 canvas auto-focus-steal 은 App 레벨의 HTMLElement.focus 훅으로 차단.
 * (installPropsPanelFocusGuard in designer-editor-host/App.tsx)
 */
function NumberEdit({ value, onChange, ctx, meta }: NumberEditProps) {
  const ref = useRef<HTMLInputElement>(null);
  const lastEmittedRef = useRef<number | undefined>(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (value === lastEmittedRef.current) return;
    if (document.activeElement === el) return;
    const nextText = value == null ? '' : String(value);
    if (el.value !== nextText) el.value = nextText;
  }, [value]);

  const commit = (text: string) => {
    if (text === '') return;
    const parsed = parseFloat(text);
    if (isNaN(parsed)) return;
    if (parsed === lastEmittedRef.current) return;
    lastEmittedRef.current = parsed;
    onChange(parsed);
  };

  return (
    <input
      ref={ref}
      id={ctx.domId}
      type="text"
      inputmode="numeric"
      defaultValue={value == null ? '' : String(value)}
      disabled={ctx.disabled}
      min={meta?.min}
      max={meta?.max}
      onInput={(e) => commit((e.target as HTMLInputElement).value)}
      style={{ width: '100%' }}
    />
  );
}

export const NumberWidget: PanelWidget<number> = {
  render(value, _ctx) {
    return (
      <span class="panel-widget-number-view">
        {value ?? ''}
      </span>
    );
  },

  edit(value, onChange, ctx, meta) {
    return <NumberEdit value={value} onChange={onChange} ctx={ctx} meta={meta} />;
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
