/**
 * ExpressionWidget — FEEL 표현식 편집 위젯
 * render: 코드 스타일 읽기 전용 표시
 * edit: textarea + 얕은 paren 체크 lint
 * validate: 비어있지 않은 문자열 + balanced paren 체크
 */
import { h } from 'preact';
import type { PanelWidget, WidgetMeta, WidgetValidationResult } from '../types';

/**
 * 얕은 괄호 균형 체크 (중첩 미검증, Phase 1 껍데기 수준)
 */
function hasBalancedParens(expr: string): boolean {
  let depth = 0;
  for (const ch of expr) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (depth < 0) return false;
  }
  return depth === 0;
}

export const ExpressionWidget: PanelWidget<string> = {
  render(value, _ctx) {
    return (
      <code
        class="panel-widget-expression-view"
        style={{
          display: 'block',
          fontFamily: 'monospace',
          fontSize: '12px',
          padding: '4px',
          background: '#f5f5f5',
          borderRadius: '2px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
      >
        {value ?? ''}
      </code>
    );
  },

  edit(value, onChange, ctx) {
    const isBalanced = typeof value === 'string' ? hasBalancedParens(value) : true;
    return (
      <div class="panel-widget-expression-edit">
        <textarea
          id={ctx.domId}
          value={value ?? ''}
          disabled={ctx.disabled}
          rows={3}
          onInput={(e) => onChange((e.target as HTMLTextAreaElement).value)}
          onChange={(e) => onChange((e.target as HTMLTextAreaElement).value)}
          style={{
            width: '100%',
            fontFamily: 'monospace',
            fontSize: '12px',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
          spellcheck={false}
        />
        {!isBalanced && (
          <span style={{ color: '#e53e3e', fontSize: '11px' }}>
            Unbalanced parentheses
          </span>
        )}
      </div>
    );
  },

  validate(value: unknown, _meta: WidgetMeta): WidgetValidationResult {
    if (typeof value !== 'string' || value.trim() === '') {
      return { ok: false, errors: ['Expression must be a non-empty string'] };
    }
    if (!hasBalancedParens(value)) {
      return { ok: false, errors: ['Expression has unbalanced parentheses'] };
    }
    return { ok: true, errors: [] };
  },
};
