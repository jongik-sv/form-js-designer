/**
 * TreeWidget — 트리 노드 배열 편집 위젯 (Phase 0 stub)
 * render: JSON.stringify 결과를 <pre>로 표시
 * edit: textarea — 입력값 JSON.parse → 배열이면 onChange, 아니면 swallow.
 *       유효성은 textarea의 aria-invalid 속성으로 시그널링한다.
 * validate: 항상 ok (tree shape validation은 Phase 1A)
 */
import { h } from 'preact';
import type { PanelWidget, WidgetMeta, WidgetValidationResult } from '../types';

export const TreeWidget: PanelWidget<unknown[]> = {
  render(value, _ctx) {
    return (
      <pre class="panel-widget-tree-view">
        {JSON.stringify(value ?? [], null, 2)}
      </pre>
    );
  },

  edit(value, onChange, ctx) {
    return (
      <textarea
        id={ctx.domId}
        class="panel-widget-tree-edit"
        rows={6}
        disabled={ctx.disabled}
        spellcheck={false}
        value={JSON.stringify(value ?? [], null, 2)}
        onInput={(e) => {
          const target = e.target as HTMLTextAreaElement;
          try {
            const parsed = JSON.parse(target.value);
            const valid = Array.isArray(parsed);
            target.setAttribute('aria-invalid', String(!valid));
            if (valid) onChange(parsed as unknown[]);
          } catch {
            target.setAttribute('aria-invalid', 'true');
          }
        }}
      />
    );
  },

  validate(_value: unknown, _meta: WidgetMeta): WidgetValidationResult {
    return { ok: true, errors: [] };
  },
};
