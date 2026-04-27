/**
 * InlineLabelEditModule — 캔버스 form 필드 라벨 더블클릭 인라인 편집.
 * dblclick capture-phase 리스너가 .fjs-editor-container [data-id] .fjs-form-field-label
 * 타깃을 잡아 input 오버레이를 띄우고, Enter/blur 시 modeling.editFormField로 커밋한다.
 */

export interface EventBusLike {
  on(event: string, callback: (event?: unknown) => void): void;
  off(event: string, callback: (event?: unknown) => void): void;
}

export interface FormFieldRegistryLike {
  get(id: string): { id: string; type: string; label?: string } | undefined;
}

export interface ModelingLike {
  editFormField(field: unknown, props: Record<string, unknown>): void;
  editFormField(field: unknown, key: string, value: unknown): void;
}

export class InlineLabelEditService {
  static $inject = ['eventBus', 'formFieldRegistry', 'modeling'];

  private readonly _eventBus: EventBusLike;
  private readonly _formFieldRegistry: FormFieldRegistryLike;
  private readonly _modeling: ModelingLike;
  private readonly _boundOnDblclick: (e: MouseEvent) => void;

  constructor(eventBus: EventBusLike, formFieldRegistry: FormFieldRegistryLike, modeling: ModelingLike) {
    this._eventBus = eventBus;
    this._formFieldRegistry = formFieldRegistry;
    this._modeling = modeling;
    this._boundOnDblclick = (e: MouseEvent) => this._onDblclick(e);

    if (typeof document !== 'undefined') {
      document.addEventListener('dblclick', this._boundOnDblclick, true);
    }

    eventBus.on('diagram.destroy', () => this.destroy());
    eventBus.on('commandStack.changed', () => this._teardown());
    eventBus.on('selection.changed', () => this._teardown());
  }

  destroy(): void {
    if (typeof document !== 'undefined') {
      document.removeEventListener('dblclick', this._boundOnDblclick, true);
    }
    this._teardown();
  }

  private _onDblclick(_e: MouseEvent): void {
    // Implemented in later tasks
  }

  private _teardown(): void {
    // Implemented in later tasks
  }
}

export const InlineLabelEditModule = {
  __init__: ['inlineLabelEdit'],
  inlineLabelEdit: ['type', InlineLabelEditService] as const,
};
