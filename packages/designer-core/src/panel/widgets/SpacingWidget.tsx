/**
 * SpacingWidget — 4방향 여백 입력 위젯
 * render: top/right/bottom/left 요약 표시
 * edit: 4개 number input (top/right/bottom/left)
 * validate: 객체 형태 + 각 값 >= 0 number
 */
import { h } from 'preact';
import type { PanelWidget, WidgetMeta, WidgetValidationResult } from '../types';

export interface SpacingValue {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const SIDES = ['top', 'right', 'bottom', 'left'] as const;

const DEFAULT_SPACING: SpacingValue = { top: 0, right: 0, bottom: 0, left: 0 };

export const SpacingWidget: PanelWidget<SpacingValue> = {
  render(value, _ctx) {
    const v = value ?? DEFAULT_SPACING;
    return (
      <span class="panel-widget-spacing-view">
        {`${v.top} ${v.right} ${v.bottom} ${v.left}`}
      </span>
    );
  },

  edit(value, onChange, ctx) {
    const v = value ?? DEFAULT_SPACING;
    return (
      <div class="panel-widget-spacing-edit" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
        {SIDES.map((side) => (
          <label key={side} style={{ display: 'flex', flexDirection: 'column', fontSize: '11px' }}>
            {side}
            <input
              id={side === 'top' ? ctx.domId : undefined}
              type="number"
              value={v[side]}
              disabled={ctx.disabled}
              min={0}
              onChange={(e) => {
                const parsed = parseFloat((e.target as HTMLInputElement).value);
                onChange({ ...v, [side]: isNaN(parsed) ? 0 : parsed });
              }}
              style={{ width: '100%' }}
            />
          </label>
        ))}
      </div>
    );
  },

  validate(value: unknown, _meta: WidgetMeta): WidgetValidationResult {
    if (
      typeof value !== 'object' ||
      value === null ||
      Array.isArray(value)
    ) {
      return { ok: false, errors: ['Value must be an object { top, right, bottom, left }'] };
    }

    const v = value as Record<string, unknown>;
    const errors: string[] = [];

    for (const side of SIDES) {
      const sideVal = v[side];
      if (typeof sideVal !== 'number' || isNaN(sideVal)) {
        errors.push(`"${side}" must be a number`);
      } else if (sideVal < 0) {
        errors.push(`"${side}" must be >= 0`);
      }
    }

    if (errors.length > 0) {
      return { ok: false, errors };
    }
    return { ok: true, errors: [] };
  },
};
