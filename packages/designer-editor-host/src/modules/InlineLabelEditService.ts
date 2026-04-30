/**
 * InlineLabelEditService — FU-B
 *
 * Captures dblclick on `.fjs-form-field-label` inside the canvas and mounts
 * a fixed-position `<input>` overlay over the label. The user can:
 *   - Press Enter or blur  → commit (calls modeling.editFormField)
 *   - Press Esc            → cancel (no-op)
 *
 * IME guard: compositionstart/compositionend events are tracked so that Enter
 * keydown events fired during Korean/Japanese/Chinese IME composition are
 * silently ignored (avoiding a premature commit mid-composition).
 *
 * Selector strictness: only clicks whose `event.target` is (or is inside) a
 * `.fjs-form-field-label` element are handled. The nearest `[data-id]` ancestor
 * is used to look up the form field from the registry.
 *
 * Collision prevention: stopPropagation (capture phase) on the dblclick event
 * prevents form-js native handlers from reacting. A single active input is
 * enforced — a second dblclick first tears down any existing input then mounts
 * a fresh one.
 *
 * Cleanup: on `diagram.destroy` the document listener is removed and any open
 * input is torn down.
 */

interface EventBusLike {
  on(event: string, handler: (...args: unknown[]) => void): void;
  off?(event: string, handler: (...args: unknown[]) => void): void;
}

interface ModelingLike {
  editFormField(field: unknown, props: Record<string, unknown>): void;
}

interface FormFieldRegistryLike {
  get(id: string): unknown;
}

export class InlineLabelEditService {
  static $inject = ['eventBus', 'modeling', 'formFieldRegistry'];

  private readonly _eventBus: EventBusLike;
  private readonly _modeling: ModelingLike;
  private readonly _registry: FormFieldRegistryLike;

  /** Currently mounted overlay input element, if any. */
  private _activeInput: HTMLInputElement | null = null;
  /** Field associated with the active input. */
  private _activeField: unknown = null;
  /** IME composition in progress. */
  private _composing = false;

  constructor(
    eventBus: EventBusLike,
    modeling: ModelingLike,
    formFieldRegistry: FormFieldRegistryLike,
  ) {
    this._eventBus = eventBus;
    this._modeling = modeling;
    this._registry = formFieldRegistry;

    this._handleDblclick = this._handleDblclick.bind(this);
    this._handleDestroy = this._handleDestroy.bind(this);

    document.addEventListener('dblclick', this._handleDblclick, true);
    this._eventBus.on('diagram.destroy', this._handleDestroy);
  }

  // ── private ──────────────────────────────────────────────────────────────

  private _handleDblclick(event: Event): void {
    const target = event.target as Element | null;
    if (!target) return;

    // Strict selector: must hit a .fjs-form-field-label or its descendant
    const labelEl = target.closest('.fjs-form-field-label');
    if (!labelEl) return;

    // Prevent form-js native handlers from reacting
    event.preventDefault();
    event.stopPropagation();

    // Extract field id from nearest [data-id] ancestor
    const fieldEl = labelEl.closest('[data-id]');
    const fieldId = fieldEl?.getAttribute('data-id');
    if (!fieldId) return;

    const field = this._registry.get(fieldId);
    if (!field) return;

    // Tear down any existing input first (no duplicate mounts)
    if (this._activeInput) {
      this._teardown(false /* cancel — no commit */);
    }

    // Current label text
    const currentLabel = labelEl.textContent ?? '';

    this._mountInput(labelEl as HTMLElement, field, currentLabel);
  }

  private _mountInput(labelEl: HTMLElement, field: unknown, currentLabel: string): void {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'fjs-inline-label-edit-input';
    input.value = currentLabel;

    // Position the input to cover the label
    const rect = labelEl.getBoundingClientRect();
    input.style.cssText = [
      `position:fixed`,
      `z-index:9999`,
      `left:${rect.left}px`,
      `top:${rect.top}px`,
      `width:${Math.max(rect.width, 80)}px`,
      `height:${rect.height || 24}px`,
    ].join(';');

    // IME guard
    input.addEventListener('compositionstart', () => { this._composing = true; });
    input.addEventListener('compositionend', () => { this._composing = false; });

    input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (this._composing) return; // IME — ignore
        e.preventDefault();
        e.stopPropagation();
        this._teardown(true /* commit */);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this._teardown(false /* cancel */);
      }
    });

    input.addEventListener('blur', () => {
      // Only commit if we haven't already torn down (e.g. Enter/Esc path already ran)
      if (this._activeInput === input) {
        this._teardown(true /* commit */);
      }
    });

    this._activeInput = input;
    this._activeField = field;
    this._composing = false;

    document.body.appendChild(input);
    // Use setTimeout to avoid focus stealing on the same tick as the dblclick
    // In tests (happy-dom) setTimeout runs inline; in the browser it defers.
    try {
      input.focus();
      // Select all text for convenience
      input.select();
    } catch {
      // ignore — jsdom/happy-dom may not support select()
    }
  }

  private _teardown(commit: boolean): void {
    const input = this._activeInput;
    const field = this._activeField;

    // Clear refs before DOM manipulation to prevent re-entrant calls from blur
    this._activeInput = null;
    this._activeField = null;

    if (!input) return;

    if (commit && field != null) {
      const newLabel = input.value;
      this._modeling.editFormField(field, { label: newLabel });
    }

    if (input.parentElement) {
      input.parentElement.removeChild(input);
    }
  }

  private _handleDestroy(): void {
    document.removeEventListener('dblclick', this._handleDblclick, true);
    // Tear down any open input without committing
    this._teardown(false);
  }
}
