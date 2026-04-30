/**
 * InlineLabelEditService 단위 테스트 — FU-B
 *
 * 케이스:
 * 1. dblclick on .fjs-form-field-label → input mount + value=현재라벨 + focus
 * 2. Enter → modeling.editFormField(field, { label: 새값 }) 호출 + input unmount
 * 3. Esc → 호출 없음 + input unmount
 * 4. blur → commit (Enter와 동일 효과)
 * 5. IME composition 중 (compositionstart~compositionend) Enter 무시
 * 6. 비-라벨 영역 dblclick → input mount 안 됨 (selector 엄격화)
 * 7. 동일 라벨에 두 번 dblclick → 첫 input teardown 후 두 번째 mount (중복 mount 금지)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InlineLabelEditService } from '../InlineLabelEditService';

// ── helpers ──────────────────────────────────────────────────────────────────

function createMockEventBus() {
  const handlers: Record<string, Array<(...args: unknown[]) => void>> = {};
  return {
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      if (!handlers[event]) handlers[event] = [];
      handlers[event]!.push(cb);
    }),
    off: vi.fn(),
    emit: (event: string, ...args: unknown[]) => {
      (handlers[event] ?? []).forEach((h) => h(...args));
    },
  };
}

function createMockModeling() {
  return {
    editFormField: vi.fn(),
  };
}

function createMockFormFieldRegistry(fields: Record<string, unknown> = {}) {
  return {
    get: vi.fn((id: string) => fields[id]),
  };
}

/**
 * Create a DOM structure that mirrors form-js canvas:
 *   <div data-id="field-1">
 *     <label class="fjs-form-field-label">My Label</label>
 *   </div>
 *
 * Returns { fieldEl, labelEl }.
 */
function createFieldDOM(labelText = 'My Label', fieldId = 'field-1') {
  const fieldEl = document.createElement('div');
  fieldEl.setAttribute('data-id', fieldId);
  const labelEl = document.createElement('label');
  labelEl.className = 'fjs-form-field-label';
  labelEl.textContent = labelText;
  fieldEl.appendChild(labelEl);
  document.body.appendChild(fieldEl);
  return { fieldEl, labelEl };
}

function fireDblclick(target: Element) {
  const event = new MouseEvent('dblclick', {
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
}

function makeService(
  eventBus = createMockEventBus(),
  modeling = createMockModeling(),
  registry = createMockFormFieldRegistry({ 'field-1': { id: 'field-1', label: 'My Label' } }),
) {
  return new InlineLabelEditService(eventBus, modeling, registry);
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('InlineLabelEditService', () => {
  beforeEach(() => {
    // Clean up body DOM between tests
    document.body.innerHTML = '';
  });

  afterEach(() => {
    // Remove any lingering inline-edit inputs
    document.querySelectorAll('.fjs-inline-label-edit-input').forEach((el) => el.remove());
  });

  // ── Case 1: dblclick on label → input mounted ─────────────────────────────
  it('dblclick on .fjs-form-field-label mounts fixed input with current label value', () => {
    makeService();
    const { labelEl } = createFieldDOM('Hello Label');

    fireDblclick(labelEl);

    const input = document.querySelector<HTMLInputElement>('.fjs-inline-label-edit-input');
    expect(input).not.toBeNull();
    expect(input!.value).toBe('Hello Label');
  });

  // ── Case 2: Enter commits ─────────────────────────────────────────────────
  it('Enter key commits label via modeling.editFormField and unmounts input', () => {
    const modeling = createMockModeling();
    const registry = createMockFormFieldRegistry({ 'field-1': { id: 'field-1', label: 'Old' } });
    makeService(createMockEventBus(), modeling, registry);
    const { labelEl } = createFieldDOM('Old');

    fireDblclick(labelEl);

    const input = document.querySelector<HTMLInputElement>('.fjs-inline-label-edit-input');
    expect(input).not.toBeNull();
    input!.value = 'New Value';

    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    input!.dispatchEvent(enterEvent);

    expect(modeling.editFormField).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'field-1' }),
      { label: 'New Value' },
    );
    // Input should be removed from DOM
    expect(document.querySelector('.fjs-inline-label-edit-input')).toBeNull();
  });

  // ── Case 3: Esc cancels ───────────────────────────────────────────────────
  it('Esc key cancels without calling modeling.editFormField and unmounts input', () => {
    const modeling = createMockModeling();
    makeService(createMockEventBus(), modeling);
    const { labelEl } = createFieldDOM('Keep Me');

    fireDblclick(labelEl);

    const input = document.querySelector<HTMLInputElement>('.fjs-inline-label-edit-input');
    expect(input).not.toBeNull();
    input!.value = 'Should Not Save';

    const escEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    input!.dispatchEvent(escEvent);

    expect(modeling.editFormField).not.toHaveBeenCalled();
    expect(document.querySelector('.fjs-inline-label-edit-input')).toBeNull();
  });

  // ── Case 4: blur commits ──────────────────────────────────────────────────
  it('blur commits label (same effect as Enter)', () => {
    const modeling = createMockModeling();
    const registry = createMockFormFieldRegistry({ 'field-1': { id: 'field-1', label: 'Blur Me' } });
    makeService(createMockEventBus(), modeling, registry);
    const { labelEl } = createFieldDOM('Blur Me');

    fireDblclick(labelEl);

    const input = document.querySelector<HTMLInputElement>('.fjs-inline-label-edit-input');
    expect(input).not.toBeNull();
    input!.value = 'After Blur';

    const blurEvent = new FocusEvent('blur', { bubbles: false });
    input!.dispatchEvent(blurEvent);

    expect(modeling.editFormField).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'field-1' }),
      { label: 'After Blur' },
    );
    expect(document.querySelector('.fjs-inline-label-edit-input')).toBeNull();
  });

  // ── Case 5: IME composition — Enter during composition is ignored ─────────
  it('Enter during IME composition does not commit', () => {
    const modeling = createMockModeling();
    makeService(createMockEventBus(), modeling);
    const { labelEl } = createFieldDOM('IME Test');

    fireDblclick(labelEl);

    const input = document.querySelector<HTMLInputElement>('.fjs-inline-label-edit-input');
    expect(input).not.toBeNull();
    input!.value = '한글';

    // Simulate IME: compositionstart → Enter → compositionend
    input!.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));

    const enterDuringIME = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    input!.dispatchEvent(enterDuringIME);

    // Should NOT have committed and input still present
    expect(modeling.editFormField).not.toHaveBeenCalled();
    expect(document.querySelector('.fjs-inline-label-edit-input')).not.toBeNull();

    // End composition — now Enter should work
    input!.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));

    const enterAfterIME = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    input!.dispatchEvent(enterAfterIME);

    expect(modeling.editFormField).toHaveBeenCalled();
    expect(document.querySelector('.fjs-inline-label-edit-input')).toBeNull();
  });

  // ── Case 6: Non-label dblclick → no input mounted ─────────────────────────
  it('dblclick on non-label element does not mount input', () => {
    makeService();

    const div = document.createElement('div');
    div.textContent = 'Not a label';
    document.body.appendChild(div);

    fireDblclick(div);

    expect(document.querySelector('.fjs-inline-label-edit-input')).toBeNull();
  });

  // ── Case 7: Double dblclick on same label → only one input mounted ────────
  it('second dblclick on same label tears down first input and mounts a fresh one', () => {
    makeService();
    const { labelEl } = createFieldDOM('Double Click');

    // First dblclick
    fireDblclick(labelEl);
    const firstInput = document.querySelector<HTMLInputElement>('.fjs-inline-label-edit-input');
    expect(firstInput).not.toBeNull();

    // Second dblclick without dismissing first
    fireDblclick(labelEl);

    const inputs = document.querySelectorAll('.fjs-inline-label-edit-input');
    // Must have exactly one input (first torn down, second mounted)
    expect(inputs.length).toBe(1);
    // It should be a different element than the first (or same, but no duplicates)
    expect(inputs[0]).not.toBe(firstInput);
  });

  // ── Bonus: diagram.destroy cleanup ───────────────────────────────────────
  it('listens to diagram.destroy for teardown cleanup', () => {
    const eventBus = createMockEventBus();
    makeService(eventBus);

    expect(eventBus.on).toHaveBeenCalledWith('diagram.destroy', expect.any(Function));
  });
});
