/**
 * InlineLabelEditModule — 캔버스 form 필드 라벨 더블클릭 인라인 편집.
 * dblclick capture-phase 리스너가 .fjs-editor-container 내부에서 우선순위 체인으로
 * 앵커를 해석한다: 탭 트리거(.dc-tabs__trigger[data-tab-id]) → 라벨(.fjs-form-field-label)
 * → 버튼(.fjs-button) → 필드 행([data-id]) 폴백. 편집 대상 라벨 속성은 필드 타입별로
 * 결정한다: 일반 필드는 'label', datetime 필드는 클릭한 sub-label의 for 속성에 따라
 * 'dateLabel' 또는 'timeLabel'. 해당 속성이 string인 경우에만 입력 오버레이를 띄우고
 * Enter/blur 시 modeling.editFormField로 커밋한다.
 */

export interface EventBusLike {
  on(event: string, callback: (event?: unknown) => void): void;
  off(event: string, callback: (event?: unknown) => void): void;
  fire(event: string, context?: unknown): unknown;
}

export interface FormFieldLike {
  id: string;
  type: string;
  label?: string;
  dateLabel?: string;
  timeLabel?: string;
  text?: string;
  header?: string;
}

export interface FormFieldRegistryLike {
  get(id: string): FormFieldLike | undefined;
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
  private _activeLabelKey: string | null = null;
  private _inputEl: HTMLInputElement | null = null;
  private _activeAnchorEl: HTMLElement | null = null;
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
    eventBus.on('commandStack.changed', () => { if (this._inputEl) this._teardown(); });
    eventBus.on('selection.changed', () => { if (this._inputEl) this._teardown(); });
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
    if (!target.closest('.fjs-editor-container')) return;

    const resolved = this._resolveAnchor(target);
    if (!resolved) return;

    const { fieldId, anchor } = resolved;
    const field = this._formFieldRegistry.get(fieldId);
    if (!field) return;

    if (field.type === 'text') {
      e.preventDefault();
      e.stopPropagation();
      this._openTextPopup(field, anchor);
      return;
    }

    const labelKey = this._resolveLabelKey(field, anchor);
    const rawLabel = (field as unknown as Record<string, unknown>)[labelKey];
    // Allow editing when the model has no string yet (e.g. fresh datetime fields
    // where dateLabel/timeLabel are undefined while form-js still draws an i18n
    // default in the DOM, or fresh cards where header is unset). Start with empty.
    const currentLabel = typeof rawLabel === 'string' ? rawLabel : '';

    e.preventDefault();
    e.stopPropagation();
    this._activate(fieldId, anchor, currentLabel, labelKey);
  }

  /**
   * Determines which property on the field model holds the user-visible label
   * for the clicked anchor. Most fields use 'label'. The datetime field is
   * special: it has no 'label' property; instead it stores 'dateLabel' and
   * 'timeLabel' for its two sub-pickers, each rendered with its own
   * .fjs-form-field-label element. We read the anchor's `for` attribute (set
   * by form-js as `<formId>-<fieldId>-date` / `-time`) to pick the right one.
   */
  private _resolveLabelKey(field: FormFieldLike, anchor: HTMLElement): string {
    if (field.type === 'datetime') {
      const forAttr = anchor.getAttribute('for') ?? '';
      if (forAttr.endsWith('-time')) return 'timeLabel';
      return 'dateLabel';
    }
    if (field.type === 'card') return 'header';
    return 'label';
  }

  private _openTextPopup(field: FormFieldLike, sourceEl: HTMLElement): void {
    const currentValue = field.text ?? '';
    this._eventBus.fire('propertiesPanel.openPopup', {
      element: field,
      entryId: `${field.id}-text`,
      hostLanguage: 'markdown',
      label: 'Text',
      onInput: (value: string) => {
        this._modeling.editFormField(field, { text: value });
      },
      singleLine: false,
      sourceElement: sourceEl,
      tooltipContainer: document.body,
      type: 'feelers',
      value: currentValue,
      // TODO: wire real variables from variable resolver service for FEEL auto-complete
      variables: [],
      feelLanguageContext: null,
    });

    // FeelPopup renders synchronously into document.body. In the embedded
    // designer (tiptap modal at z-index 2.1B), that container sits as a sibling
    // of the modal and gets covered. Reparent the popup container into the
    // portal root so it inherits the modal's stacking context.
    const portalRoot = sourceEl.closest('.fjd-embedded-designer-root') as HTMLElement | null;
    if (portalRoot) {
      const popupContainer = document.body.querySelector(':scope > .bio-properties-panel-popup-container') as HTMLElement | null;
      if (popupContainer && popupContainer.parentElement !== portalRoot) {
        portalRoot.appendChild(popupContainer);
      }
    }
  }

  /**
   * Priority chain for finding the (fieldId, anchor) pair from a dblclick target.
   * - Tab triggers sit OUTSIDE their tab's [data-id] wrapper, so we read data-tab-id.
   * - Buttons render their label as their own text node; anchor is the button itself.
   * - Standard labels follow the original closest-label/closest-data-id pattern.
   * - Field-row fallback handles empty labels (label DOM may be 0-height).
   */
  private _resolveAnchor(target: HTMLElement): { fieldId: string; anchor: HTMLElement } | null {
    const tabTrigger = target.closest('.dc-tabs__trigger') as HTMLElement | null;
    if (tabTrigger) {
      const tabId = tabTrigger.getAttribute('data-tab-id');
      if (tabId) return { fieldId: tabId, anchor: tabTrigger };
      return null;
    }

    const cardHeaderEl = target.closest('.dc-card__header') as HTMLElement | null;
    if (cardHeaderEl) {
      const fieldEl = cardHeaderEl.closest('[data-id]') as HTMLElement | null;
      const fieldId = fieldEl?.getAttribute('data-id');
      if (fieldId) return { fieldId, anchor: cardHeaderEl };
      return null;
    }

    const labelEl = target.closest('.fjs-form-field-label') as HTMLElement | null;
    if (labelEl) {
      const fieldEl = labelEl.closest('[data-id]') as HTMLElement | null;
      const fieldId = fieldEl?.getAttribute('data-id');
      if (fieldId) return { fieldId, anchor: labelEl };
      return null;
    }

    const buttonEl = target.closest('.fjs-button') as HTMLElement | null;
    if (buttonEl) {
      const fieldEl = buttonEl.closest('[data-id]') as HTMLElement | null;
      const fieldId = fieldEl?.getAttribute('data-id');
      if (fieldId) return { fieldId, anchor: buttonEl };
      return null;
    }

    const fieldEl = target.closest('[data-id]') as HTMLElement | null;
    if (fieldEl) {
      const fieldId = fieldEl.getAttribute('data-id');
      if (fieldId) return { fieldId, anchor: fieldEl };
    }
    return null;
  }

  private _activate(fieldId: string, anchorEl: HTMLElement, currentLabel: string, labelKey: string): void {
    this._teardown();
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'fjs-inline-label-edit-input';
    input.value = currentLabel;
    input.setAttribute('data-testid', 'inline-label-edit-input');
    input.setAttribute('data-field-id', fieldId);

    const rect = anchorEl.getBoundingClientRect();
    input.style.position = 'fixed';
    input.style.left = `${rect.left}px`;
    input.style.top = `${rect.top}px`;
    input.style.width = `${Math.max(rect.width, 80)}px`;
    input.style.height = `${rect.height}px`;
    input.style.zIndex = '9999';

    // Append into the nearest portal/stacking context so we don't get hidden
    // beneath modal hosts (e.g. tiptap embedded designer uses z-index 2.1B on
    // its root). Falls back to body for plain hosts (vscode custom editor).
    const portalRoot =
      (anchorEl.closest('.fjd-embedded-designer-root') as HTMLElement | null) ??
      document.body;
    portalRoot.appendChild(input);
    input.focus();
    input.select();

    this._activeFieldId = fieldId;
    this._activeLabelKey = labelKey;
    this._inputEl = input;
    this._activeAnchorEl = anchorEl;

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
    const labelKey = this._activeLabelKey ?? 'label';
    if (newLabel !== originalLabel) {
      const field = this._formFieldRegistry.get(fieldId);
      if (field) {
        this._modeling.editFormField(field, { [labelKey]: newLabel });
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
    this._activeLabelKey = null;
    this._activeAnchorEl = null;
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }
}

export const InlineLabelEditModule = {
  __init__: ['inlineLabelEdit'],
  inlineLabelEdit: ['type', InlineLabelEditService] as const,
};
