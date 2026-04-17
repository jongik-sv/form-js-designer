/**
 * OutlineModule — form-js additionalModules 규약 모듈 객체
 * TSK-06-01
 *
 * form-js eventBus 이벤트를 구독하여 스키마 트리를 OutlinePanel에 렌더링.
 */

import { h, render } from 'preact';
import { OutlinePanel } from './OutlinePanel';
import { schemaToOutline } from './schemaToOutline';
import type { OutlineNode } from './outlineTypes';

// form-js 서비스 인터페이스 (thin wrapper)
export interface FormJsEventBus {
  on(event: string, callback: (event?: unknown) => void): void;
  off(event: string, callback: (event?: unknown) => void): void;
}

export interface FormJsFormEditor {
  getSchema(): unknown;
}

export interface FormJsSelection {
  get(): Array<{ id?: string }>;
  select(element: unknown): void;
}

/**
 * OutlinePanelService — form-js DI 서비스
 * eventBus, formEditor, selection 서비스를 주입받아 아웃라인 패널 관리
 */
class OutlinePanelService {
  _container: HTMLElement | null = null;
  _nodes: OutlineNode[] = [];
  _selectedIds: string[] = [];
  _eventBus: FormJsEventBus;
  _formEditor: FormJsFormEditor;
  _selection: FormJsSelection;
  private _boundOnImportDone: () => void;
  private _boundOnChanged: () => void;
  private _boundOnSelectionChanged: (event: unknown) => void;

  static inject = ['eventBus', 'formEditor', 'selection'];

  constructor(
    eventBus: FormJsEventBus,
    formEditor: FormJsFormEditor,
    selection: FormJsSelection,
  ) {
    this._eventBus = eventBus;
    this._formEditor = formEditor;
    this._selection = selection;

    // 콜백 함수를 저장 (destroy에서 unsubscribe하기 위함)
    this._boundOnImportDone = () => this._onImportDone();
    this._boundOnChanged = () => this._onChanged();
    this._boundOnSelectionChanged = (event: unknown) => this._onSelectionChanged(event);

    // 이벤트 구독
    eventBus.on('import.done', this._boundOnImportDone);
    eventBus.on('commandStack.changed', this._boundOnChanged);
    eventBus.on('selection.changed', this._boundOnSelectionChanged);
  }

  private _render() {
    if (!this._container) return;
    const nodes = this._nodes;
    const selectedIds = this._selectedIds;
    const service = this;

    render(
      h(OutlinePanel, {
        nodes,
        selectedIds,
        onSelect: (id: string) => {
          // selection.select는 element 객체를 받음 — id로 찾는 방식은 form-js 내부 구조 의존
          // 여기서는 simple proxy: selection 서비스가 있으면 호출
          if (service._selection && typeof service._selection.select === 'function') {
            service._selection.select({ id });
          }
        },
      }),
      this._container,
    );
  }

  private _onImportDone() {
    const schema = this._formEditor.getSchema();
    this._nodes = schemaToOutline(schema as Parameters<typeof schemaToOutline>[0]);
    this._render();
  }

  private _onChanged() {
    const schema = this._formEditor.getSchema();
    this._nodes = schemaToOutline(schema as Parameters<typeof schemaToOutline>[0]);
    this._render();
  }

  private _onSelectionChanged(event: unknown) {
    const e = event as { selection?: Array<{ id?: string }> } | undefined;
    if (e && Array.isArray(e.selection)) {
      this._selectedIds = e.selection
        .map((el) => el?.id)
        .filter((id): id is string => !!id);
    } else {
      try {
        const sel = this._selection.get();
        this._selectedIds = sel
          .map((el) => el?.id)
          .filter((id): id is string => !!id);
      } catch {
        this._selectedIds = [];
      }
    }
    this._render();
  }

  mount(container: HTMLElement) {
    this._container = container;
    this._render();
  }

  destroy() {
    // 이벤트 구독 해제
    this._eventBus.off('import.done', this._boundOnImportDone);
    this._eventBus.off('commandStack.changed', this._boundOnChanged);
    this._eventBus.off('selection.changed', this._boundOnSelectionChanged);

    // 컨테이너 정리
    if (this._container) {
      render(null, this._container);
      this._container = null;
    }
  }
}

/**
 * OutlineModule — form-js additionalModules 규약 객체
 */
export const OutlineModule = {
  __init__: ['outlinePanel'],
  outlinePanel: ['type', OutlinePanelService as unknown as new (...args: unknown[]) => unknown],
};
