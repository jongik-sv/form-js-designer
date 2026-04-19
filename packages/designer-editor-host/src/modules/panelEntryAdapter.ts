/**
 * panelEntryAdapter — TSK-06-02, TSK-12-02
 *
 * designer-core PanelEntry를 form-js-editor propertiesPanel entry 스펙으로 변환하는 어댑터.
 * (entry: PanelEntry, ctx: { field, modeling, t }) => FormJsPanelEntry
 *
 * TSK-12-02: 중첩 경로(점 표기법, e.g. "layout.height") 지원 추가.
 */

import type { PanelEntry } from '@form-js-designer/designer-core';

/**
 * 점 표기법 경로로 객체에서 값을 읽는다.
 * 예: getByPath({layout:{height:200}}, 'layout.height') → 200
 */
function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * 점 표기법 경로의 루트 키와 중첩 키를 분리한다.
 * 예: 'layout.height' → { rootKey: 'layout', nestedKey: 'height' }
 */
function splitPath(path: string): { rootKey: string; nestedKey: string } | null {
  const dotIndex = path.indexOf('.');
  if (dotIndex === -1) return null;
  return {
    rootKey: path.slice(0, dotIndex),
    nestedKey: path.slice(dotIndex + 1),
  };
}

interface ModelingLike {
  editFormField(field: unknown, props: Record<string, unknown>): void;
  editFormField(field: unknown, key: string, value: unknown): void;
  editFormField(field: unknown, propsOrKey: Record<string, unknown> | string, value?: unknown): void;
}

export interface PanelEntryContext {
  field: Record<string, unknown>;
  modeling: ModelingLike;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export interface FormJsPanelEntry {
  id: string;
  key?: string;
  label?: string;
  component: ((props: Record<string, unknown>) => unknown) | unknown;
  isEdited: (node: unknown) => boolean;
  set: (value: unknown, field?: unknown) => void;
  element: Record<string, unknown>;
}

/**
 * PanelEntry를 form-js-editor의 panel entry 스펙으로 변환한다.
 * 중첩 경로(점 표기법)를 지원한다.
 */
export function panelEntryAdapter(
  entry: PanelEntry,
  ctx: PanelEntryContext,
): FormJsPanelEntry {
  const { key, widget, defaultValue, meta } = entry;
  const { field, modeling, t } = ctx;

  // 점 표기법 중첩 경로 여부 확인
  const nested = splitPath(key);

  /**
   * 현재 field에서 entry.key에 해당하는 값을 읽는다.
   * 중첩 경로이면 getByPath, 아니면 직접 조회.
   */
  const readValue = (): unknown => {
    if (nested) {
      return getByPath(field, key);
    }
    return field[key];
  };

  return {
    id: key,
    label: entry.label,

    /**
     * component — form-js-editor의 propertiesPanel에서 렌더하는 컴포넌트 팩토리.
     * 위젯의 edit() 메서드를 호출하여 JSX를 반환한다.
     */
    component: (props: Record<string, unknown>) => {
      const currentValue = props['value'] !== undefined ? props['value'] : (readValue() ?? defaultValue);
      const onChange = (v: unknown) => {
        if (nested) {
          // 중첩 경로: 루트 객체를 spread해 부모 키로 editFormField 호출
          const parent = (field[nested.rootKey] ?? {}) as Record<string, unknown>;
          modeling.editFormField(field, nested.rootKey, { ...parent, [nested.nestedKey]: v });
        } else {
          modeling.editFormField(field, { [key]: v });
        }
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
      return readValue() !== defaultValue;
    },

    /**
     * set — field의 prop 값을 갱신한다.
     * 중첩 경로이면 부모 객체를 spread하여 modeling.editFormField 호출.
     * form-js-editor의 modeling.editFormField를 통해 CommandStack에 기록.
     */
    set: (value: unknown, _fieldArg?: unknown): void => {
      if (nested) {
        const parent = (field[nested.rootKey] ?? {}) as Record<string, unknown>;
        modeling.editFormField(field, nested.rootKey, { ...parent, [nested.nestedKey]: value });
      } else {
        modeling.editFormField(field, { [key]: value });
      }
    },

    element: field,
  };
}
