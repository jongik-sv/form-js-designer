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
  private _activeFieldId: string | null = null;
  private _inputEl: HTMLInputElement | null = null;
  private _activeLabelEl: HTMLElement | null = null;
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

  private _onDblclick(e: MouseEvent): void {
    const target = e.target as HTMLElement | null;
    if (!target || typeof target.closest !== 'function') return;

    const labelEl = target.closest('.fjs-form-field-label') as HTMLElement | null;
    if (!labelEl) return;

    if (!labelEl.closest('.fjs-editor-container')) return;

    const fieldEl = labelEl.closest('[data-id]') as HTMLElement | null;
    if (!fieldEl) return;
    const fieldId = fieldEl.getAttribute('data-id');
    if (!fieldId) return;

    const field = this._formFieldRegistry.get(fieldId);
    if (!field) return;
    if (typeof field.label !== 'string') return;

    e.preventDefault();
    e.stopPropagation();
    this._activate(fieldId, labelEl, field.label);
  }

  private _activate(fieldId: string, labelEl: HTMLElement, currentLabel: string): void {
    this._teardown();
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'fjs-inline-label-edit-input';
    input.value = currentLabel;
    input.setAttribute('data-testid', 'inline-label-edit-input');
    input.setAttribute('data-field-id', fieldId);

    const rect = labelEl.getBoundingClientRect();
    input.style.position = 'fixed';
    input.style.left = `${rect.left}px`;
    input.style.top = `${rect.top}px`;
    input.style.width = `${Math.max(rect.width, 80)}px`;
    input.style.height = `${rect.height}px`;
    input.style.zIndex = '9999';

    document.body.appendChild(input);
    input.focus();
    input.select();

    this._activeFieldId = fieldId;
    this._inputEl = input;
    this._activeLabelEl = labelEl;

    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        this._commit(currentLabel);
      } else if (ev.key === 'Escape') {
        ev.preventDefault();
        this._teardown();
      }
    };
    const onBlur = () => this._commit(currentLabel);

    input.addEventListener('keydown', onKeyDown);
    input.addEventListener('blur', onBlur);
  }

  private _commit(originalLabel: string): void {
    if (!this._inputEl || !this._activeFieldId) {
      this._teardown();
      return;
    }
    const newLabel = this._inputEl.value;
    const fieldId = this._activeFieldId;
    if (newLabel !== originalLabel) {
      const field = this._formFieldRegistry.get(fieldId);
      if (field) {
        this._modeling.editFormField(field, { label: newLabel });
      }
    }
    this._teardown();
  }

  private _teardown(): void {
    const el = this._inputEl;
    // Null fields first so that a synchronous blur event fired by removeChild
    // (which real browsers do) finds this._inputEl === null and bails in _commit.
    this._inputEl = null;
    this._activeFieldId = null;
    this._activeLabelEl = null;
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }
}

export const InlineLabelEditModule = {
  __init__: ['inlineLabelEdit'],
  inlineLabelEdit: ['type', InlineLabelEditService] as const,
};
