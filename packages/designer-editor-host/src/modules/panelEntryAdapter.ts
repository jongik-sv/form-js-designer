/**
 * panelEntryAdapter — TSK-06-02
 *
 * designer-core PanelEntry를 form-js-editor propertiesPanel entry 스펙으로 변환하는 어댑터.
 * (entry: PanelEntry, ctx: { field, modeling, t }) => FormJsPanelEntry
 */

import type { PanelEntry } from '@form-js-designer/designer-core';

interface ModelingLike {
  editFormField(field: unknown, props: Record<string, unknown>): void;
}

export interface PanelEntryContext {
  field: Record<string, unknown>;
  modeling: ModelingLike;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export interface FormJsPanelEntry {
  id: string;
  label?: string;
  component: ((props: Record<string, unknown>) => unknown) | unknown;
  isEdited: (node: unknown) => boolean;
  set: (value: unknown, field?: unknown) => void;
  element: Record<string, unknown>;
}

/**
 * PanelEntry를 form-js-editor의 panel entry 스펙으로 변환한다.
 */
export function panelEntryAdapter(
  entry: PanelEntry,
  ctx: PanelEntryContext,
): FormJsPanelEntry {
  const { key, widget, defaultValue, meta } = entry;
  const { field, modeling, t } = ctx;

  return {
    id: key,
    label: entry.label,

    /**
     * component — form-js-editor의 propertiesPanel에서 렌더하는 컴포넌트 팩토리.
     * 위젯의 edit() 메서드를 호출하여 JSX를 반환한다.
     */
    component: (props: Record<string, unknown>) => {
      const currentValue = props['value'] ?? field[key] ?? defaultValue;
      const onChange = (v: unknown) => {
        modeling.editFormField(field, { [key]: v });
      };
      return widget.edit(
        currentValue,
        onChange,
        {
          t,
          domId: `props-${key}`,
          label: entry.label,
          disabled: false,
        },
        meta,
      );
    },

    /**
     * isEdited — 현재 field 값이 defaultValue와 다르면 true.
     */
    isEdited: (_node: unknown): boolean => {
      return field[key] !== defaultValue;
    },

    /**
     * set — field의 prop 값을 갱신한다.
     * form-js-editor의 modeling.editFormField를 통해 CommandStack에 기록.
     */
    set: (value: unknown, _fieldArg?: unknown): void => {
      modeling.editFormField(field, { [key]: value });
    },

    element: field,
  };
}
