/**
 * PropsPanelContainer — TSK-06-02
 *
 * 선택된 필드를 eventBus.on('selection.changed') 로 추적하고
 * PropsPanelService.getGroups(field)를 호출하여 패널을 렌더한다.
 */

import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import type { PropsGroup } from '../modules/PropsPanelService';
import type { PanelMode } from './PropsPanelModeToggle';

/**
 * i18n 키("designer.components.tabs.orientation") 또는 camelCase 식별자를
 * 사람이 읽는 라벨로 변환. LocaleProvider 통합 전 임시 fallback.
 */
function humanizeLabel(label: string | undefined, fallbackKey: string): string {
  const raw = label ?? fallbackKey;
  const last = raw.includes('.') ? raw.split('.').pop()! : raw;
  const spaced = last.replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

interface PropsPanelContainerProps {
  propsPanelService: {
    getGroups(field: { type: string; id?: string } | null, opts?: { mode?: PanelMode }): PropsGroup[];
  } | null;
  eventBus: {
    on(event: string, handler: (...args: unknown[]) => void): void;
    off(event: string, handler: (...args: unknown[]) => void): void;
  } | null;
  mode?: PanelMode;
}

export function PropsPanelContainer({ propsPanelService, eventBus, mode = 'full' }: PropsPanelContainerProps): h.JSX.Element {
  const [selectedField, setSelectedField] = useState<{ type: string; id?: string } | null>(null);
  const [groups, setGroups] = useState<PropsGroup[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventBus) return;

    const onSelectionChanged = (e: unknown) => {
      // form-js selection service fires with `selection` as a single field
      // (sometimes null). Legacy shapes may pass an array — handle both.
      const event = e as {
        selection?:
          | { type: string; id?: string }
          | Array<{ type: string; id?: string }>
          | null;
      };
      const raw = event?.selection ?? null;
      const field = Array.isArray(raw) ? raw[0] ?? null : raw;
      setSelectedField(field);
      setError(null);

      if (field && propsPanelService) {
        try {
          const newGroups = propsPanelService.getGroups(field, { mode });
          setGroups(newGroups);
        } catch (err) {
          console.warn('[PropsPanelContainer] getGroups 실패:', err);
          setError(String(err));
          setGroups([]);
        }
      } else {
        setGroups([]);
      }
    };

    eventBus.on('selection.changed', onSelectionChanged);
    return () => {
      eventBus.off('selection.changed', onSelectionChanged);
    };
  }, [eventBus, propsPanelService, mode]);

  // mode 변경 시 현재 selectedField에 대해 그룹을 재계산.
  // selection.changed 핸들러가 setSelectedField+setGroups를 함께 처리하므로
  // 새로운 selection 시점에는 redundant idempotent 호출이 한 번 더 발생할 수 있다 (수용).
  useEffect(() => {
    if (!selectedField || !propsPanelService) return;
    try {
      const newGroups = propsPanelService.getGroups(selectedField, { mode });
      setGroups(newGroups);
      setError(null);
    } catch (err) {
      console.warn('[PropsPanelContainer] getGroups 실패 (mode 재계산):', err);
      setError(String(err));
      setGroups([]);
    }
  }, [mode, selectedField, propsPanelService]);

  if (!selectedField) {
    return (
      <div class="props-panel props-panel--empty" data-testid="props-empty">
        <p>필드를 선택하면 속성이 표시됩니다.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div class="props-panel props-panel--error" data-testid="props-error">
        <p>패널 로드 오류: {error}</p>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div class="props-panel props-panel--empty" data-testid="props-empty">
        <p>편집 가능한 속성이 없습니다.</p>
      </div>
    );
  }

  return (
    <div class="props-panel" data-testid="props-panel">
      {groups.map((group) => (
        <div key={group.id} class="props-group" data-testid={`props-group-${group.id}`}>
          {group.label && <h4 class="props-group__label">{group.label}</h4>}
          <div class="props-group__entries">
            {group.entries.map((entry) => (
              <div key={entry.id} class="props-entry" data-testid={`props-entry-${entry.id}`}>
                <label
                  class="props-entry__label"
                  htmlFor={`props-${entry.id}`}
                  data-testid={`props-label-${entry.id}`}
                >
                  {humanizeLabel((entry as { label?: string }).label, entry.id)}
                </label>
                {typeof entry.component === 'function'
                  ? (entry.component as (p: Record<string, unknown>) => h.JSX.Element)({
                      value: (selectedField as Record<string, unknown>)[entry.id],
                      editField: () => {},
                      field: selectedField,
                    })
                  : null}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
