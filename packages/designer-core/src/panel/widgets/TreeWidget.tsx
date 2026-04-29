/**
 * TreeWidget — 트리 노드 배열 편집 위젯 (Phase 0 stub)
 * render: JSON.stringify 결과를 <pre>로 표시
 * edit: textarea — 입력값 JSON.parse → 배열이면 onChange, 아니면 swallow
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
          try {
            const parsed = JSON.parse((e.target as HTMLTextAreaElement).value);
            if (Array.isArray(parsed)) onChange(parsed);
          } catch {
            // swallow — invalid JSON during typing
          }
        }}
      />
    );
  },

  validate(_value: unknown, _meta: WidgetMeta): WidgetValidationResult {
    return { ok: true, errors: [] };
  },
};
