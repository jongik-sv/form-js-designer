# Inline Label Edit (Double-Click) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Double-click a form field's label on the canvas to inline-edit it via an absolute-positioned `<input>` overlay; Enter or blur commits via `modeling.editFormField`, Escape cancels.

**Architecture:** A new form-js editor module (`InlineLabelEditModule`) installs a `document` capture-phase `dblclick` listener and filters events to `.fjs-editor-container [data-id] .fjs-form-field-label`. On match it spawns a `<input>` overlay positioned over the label via `getBoundingClientRect`, prefilled with the current label. Commit calls `modeling.editFormField(field, { label })` (the same path the props panel uses), which triggers form-js to re-render and update the canvas. The overlay is appended to `document.body` so form-js re-renders inside the canvas cannot rip it out mid-edit. The module also tears down the overlay on `commandStack.changed` (external schema change), `selection.changed` (user clicked elsewhere), and `diagram.destroy`.

**Tech Stack:** TypeScript, form-js editor (`@bpmn-io/form-js-editor`), Vitest + happy-dom (unit), Playwright (e2e), Preact (host app).

---

## File Structure

**Created files:**
- `packages/designer-editor-host/src/modules/InlineLabelEditModule.ts` — module + service class with `$inject`, dblclick handler, overlay lifecycle, commit/cancel.
- `packages/designer-editor-host/src/__tests__/InlineLabelEditModule.test.ts` — vitest unit tests for filter/mount/commit/cancel/teardown behavior.
- `packages/designer-editor-host/e2e/editor.inline-label-edit.spec.ts` — Playwright e2e for the golden path (drop textfield → dblclick label → type → Enter → label updated).

**Modified files:**
- `packages/designer-editor-host/src/App.tsx` — register `InlineLabelEditModule` in `additionalModules` array (alongside `OutlineModule`, `MarqueeModule`).
- `packages/designer-editor-host/src/embeddedDesigner.tsx` — same registration in the embedded variant.
- `packages/designer-editor-host/src/app.css` — add `.fjs-inline-label-edit-input` styles for the overlay.

---

## Task 1: Module Skeleton + Failing First Test

**Files:**
- Create: `packages/designer-editor-host/src/modules/InlineLabelEditModule.ts`
- Create: `packages/designer-editor-host/src/__tests__/InlineLabelEditModule.test.ts`

- [ ] **Step 1: Write the failing test for module shape**

Create `packages/designer-editor-host/src/__tests__/InlineLabelEditModule.test.ts`:

```ts
/**
 * InlineLabelEditModule.test.ts — 캔버스 라벨 더블클릭 인라인 편집
 *
 * 테스트 범위:
 *   - dblclick 필터: 캔버스 외부/[data-id] 외부/.fjs-form-field-label 외부 → no-op
 *   - 라벨 더블클릭 → input 오버레이 마운트 (현재 label 값 prefill)
 *   - Enter / blur → modeling.editFormField(field, {label}) 호출
 *   - Escape → modeling 미호출, 오버레이 제거
 *   - commandStack.changed / selection.changed / diagram.destroy → 오버레이 teardown
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InlineLabelEditModule } from '../modules/InlineLabelEditModule';

// ---- helpers ----

interface MockEventBus {
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  emit: (event: string, payload?: unknown) => void;
}

function createMockEventBus(): MockEventBus {
  const listeners: Record<string, Array<(e?: unknown) => void>> = {};
  return {
    on: vi.fn((event: string, cb: (e?: unknown) => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event]!.push(cb);
    }),
    off: vi.fn(),
    emit: (event: string, payload?: unknown) => {
      const cbs = listeners[event] ?? [];
      for (const cb of cbs) cb(payload);
    },
  };
}

function createMockFormFieldRegistry(fields: Record<string, { id: string; type: string; label?: string }> = {}) {
  return {
    get: vi.fn((id: string) => fields[id]),
  };
}

function createMockModeling() {
  return { editFormField: vi.fn() };
}

function getServiceClass() {
  const [, ServiceClass] = InlineLabelEditModule.inlineLabelEdit as [
    string,
    new (...args: unknown[]) => { destroy(): void },
  ];
  return ServiceClass;
}

function createService(overrides?: {
  eventBus?: MockEventBus;
  formFieldRegistry?: ReturnType<typeof createMockFormFieldRegistry>;
  modeling?: ReturnType<typeof createMockModeling>;
}) {
  const eventBus = overrides?.eventBus ?? createMockEventBus();
  const formFieldRegistry = overrides?.formFieldRegistry ?? createMockFormFieldRegistry();
  const modeling = overrides?.modeling ?? createMockModeling();
  const ServiceClass = getServiceClass();
  const service = new ServiceClass(eventBus, formFieldRegistry, modeling) as { destroy(): void };
  return { service, eventBus, formFieldRegistry, modeling };
}

describe('InlineLabelEditModule shape', () => {
  it('exposes inlineLabelEdit service with type wiring', () => {
    expect(InlineLabelEditModule.__init__).toEqual(['inlineLabelEdit']);
    expect(Array.isArray(InlineLabelEditModule.inlineLabelEdit)).toBe(true);
    expect(InlineLabelEditModule.inlineLabelEdit[0]).toBe('type');
    expect(typeof InlineLabelEditModule.inlineLabelEdit[1]).toBe('function');
  });

  it('declares $inject in form-js order', () => {
    const ServiceClass = getServiceClass() as unknown as { $inject?: string[] };
    expect(ServiceClass.$inject).toEqual(['eventBus', 'formFieldRegistry', 'modeling']);
  });

  it('subscribes to diagram.destroy / commandStack.changed / selection.changed', () => {
    const { eventBus } = createService();
    const events = (eventBus.on as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
    expect(events).toContain('diagram.destroy');
    expect(events).toContain('commandStack.changed');
    expect(events).toContain('selection.changed');
  });

  it('destroy() removes document dblclick listener', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { service } = createService();
    service.destroy();
    const dblCalls = removeSpy.mock.calls.filter((c) => c[0] === 'dblclick');
    expect(dblCalls.length).toBeGreaterThan(0);
    removeSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run the test and confirm failure**

Run: `cd packages/designer-editor-host && npm run test:unit -- InlineLabelEditModule`
Expected: FAIL with module-not-found error (`Cannot find module '../modules/InlineLabelEditModule'`).

- [ ] **Step 3: Write minimal module**

Create `packages/designer-editor-host/src/modules/InlineLabelEditModule.ts`:

```ts
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
```

- [ ] **Step 4: Run the test and confirm pass**

Run: `cd packages/designer-editor-host && npm run test:unit -- InlineLabelEditModule`
Expected: PASS — 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/designer-editor-host/src/modules/InlineLabelEditModule.ts \
        packages/designer-editor-host/src/__tests__/InlineLabelEditModule.test.ts
git commit -m "feat(editor-host): scaffold InlineLabelEditModule with $inject + lifecycle"
```

---

## Task 2: dblclick Filtering

**Files:**
- Modify: `packages/designer-editor-host/src/modules/InlineLabelEditModule.ts` (add target filter logic + activation hook)
- Modify: `packages/designer-editor-host/src/__tests__/InlineLabelEditModule.test.ts` (add filter tests)

- [ ] **Step 1: Write the failing tests for filtering**

Append to `packages/designer-editor-host/src/__tests__/InlineLabelEditModule.test.ts` (after the existing `describe`):

```ts
function buildCanvasWithField(fieldId: string, labelText: string): {
  canvas: HTMLElement;
  fieldEl: HTMLElement;
  labelEl: HTMLElement;
  outsideEl: HTMLElement;
} {
  const canvas = document.createElement('div');
  canvas.className = 'fjs-editor-container';
  const fieldEl = document.createElement('div');
  fieldEl.setAttribute('data-id', fieldId);
  fieldEl.className = 'fjs-form-field';
  const labelEl = document.createElement('label');
  labelEl.className = 'fjs-form-field-label';
  labelEl.textContent = labelText;
  fieldEl.appendChild(labelEl);
  canvas.appendChild(fieldEl);
  document.body.appendChild(canvas);

  const outsideEl = document.createElement('div');
  outsideEl.textContent = 'outside';
  document.body.appendChild(outsideEl);

  return { canvas, fieldEl, labelEl, outsideEl };
}

function dispatchDblclick(target: Element): void {
  const ev = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
  target.dispatchEvent(ev);
}

describe('InlineLabelEditModule dblclick filter', () => {
  let cleanup: Array<() => void> = [];
  beforeEach(() => {
    cleanup = [];
  });
  afterEach(() => {
    cleanup.forEach((fn) => fn());
    document.body.innerHTML = '';
  });

  it('ignores dblclick outside .fjs-editor-container', () => {
    const fields = { 'f1': { id: 'f1', type: 'textfield', label: 'Old' } };
    const { service, modeling } = createService({ formFieldRegistry: createMockFormFieldRegistry(fields) });
    cleanup.push(() => service.destroy());
    const { outsideEl } = buildCanvasWithField('f1', 'Old');
    dispatchDblclick(outsideEl);
    expect(document.querySelector('.fjs-inline-label-edit-input')).toBeNull();
    expect(modeling.editFormField).not.toHaveBeenCalled();
  });

  it('ignores dblclick on [data-id] but not on .fjs-form-field-label', () => {
    const fields = { 'f1': { id: 'f1', type: 'textfield', label: 'Old' } };
    const { service } = createService({ formFieldRegistry: createMockFormFieldRegistry(fields) });
    cleanup.push(() => service.destroy());
    const { fieldEl } = buildCanvasWithField('f1', 'Old');
    dispatchDblclick(fieldEl);
    expect(document.querySelector('.fjs-inline-label-edit-input')).toBeNull();
  });

  it('mounts input overlay on label dblclick (prefilled with current label)', () => {
    const fields = { 'f1': { id: 'f1', type: 'textfield', label: 'Old' } };
    const { service, formFieldRegistry } = createService({ formFieldRegistry: createMockFormFieldRegistry(fields) });
    cleanup.push(() => service.destroy());
    const { labelEl } = buildCanvasWithField('f1', 'Old');
    dispatchDblclick(labelEl);
    const input = document.querySelector('.fjs-inline-label-edit-input') as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input!.value).toBe('Old');
    expect(formFieldRegistry.get).toHaveBeenCalledWith('f1');
  });

  it('does not mount overlay when registry returns undefined', () => {
    const { service } = createService({ formFieldRegistry: createMockFormFieldRegistry({}) });
    cleanup.push(() => service.destroy());
    const { labelEl } = buildCanvasWithField('missing', 'Old');
    dispatchDblclick(labelEl);
    expect(document.querySelector('.fjs-inline-label-edit-input')).toBeNull();
  });

  it('does not mount overlay when field has no label property', () => {
    const fields = { 'f1': { id: 'f1', type: 'spacer' } };
    const { service } = createService({ formFieldRegistry: createMockFormFieldRegistry(fields) });
    cleanup.push(() => service.destroy());
    const { labelEl } = buildCanvasWithField('f1', '');
    dispatchDblclick(labelEl);
    expect(document.querySelector('.fjs-inline-label-edit-input')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `cd packages/designer-editor-host && npm run test:unit -- InlineLabelEditModule`
Expected: FAIL — overlay never mounts (current `_onDblclick` is a no-op).

- [ ] **Step 3: Implement filter + activation**

Edit `packages/designer-editor-host/src/modules/InlineLabelEditModule.ts`. Add private state and replace `_onDblclick` body:

Add these instance fields right after `private readonly _modeling: ModelingLike;`:

```ts
  private _activeFieldId: string | null = null;
  private _inputEl: HTMLInputElement | null = null;
  private _activeLabelEl: HTMLElement | null = null;
```

Replace the empty `_onDblclick`:

```ts
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
  }
```

Replace the empty `_teardown`:

```ts
  private _teardown(): void {
    if (this._inputEl && this._inputEl.parentNode) {
      this._inputEl.parentNode.removeChild(this._inputEl);
    }
    this._inputEl = null;
    this._activeFieldId = null;
    this._activeLabelEl = null;
  }
```

- [ ] **Step 4: Run tests and confirm pass**

Run: `cd packages/designer-editor-host && npm run test:unit -- InlineLabelEditModule`
Expected: PASS — all filter and mount tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/designer-editor-host/src/modules/InlineLabelEditModule.ts \
        packages/designer-editor-host/src/__tests__/InlineLabelEditModule.test.ts
git commit -m "feat(editor-host): InlineLabelEdit dblclick filter + input overlay mount"
```

---

## Task 3: Commit on Enter / Blur

**Files:**
- Modify: `packages/designer-editor-host/src/modules/InlineLabelEditModule.ts`
- Modify: `packages/designer-editor-host/src/__tests__/InlineLabelEditModule.test.ts`

- [ ] **Step 1: Write the failing tests for commit**

Append to `packages/designer-editor-host/src/__tests__/InlineLabelEditModule.test.ts`:

```ts
describe('InlineLabelEditModule commit', () => {
  let cleanup: Array<() => void> = [];
  beforeEach(() => {
    cleanup = [];
  });
  afterEach(() => {
    cleanup.forEach((fn) => fn());
    document.body.innerHTML = '';
  });

  it('commits new label via modeling.editFormField on Enter and removes overlay', () => {
    const fields = { 'f1': { id: 'f1', type: 'textfield', label: 'Old' } };
    const registry = createMockFormFieldRegistry(fields);
    const { service, modeling } = createService({ formFieldRegistry: registry });
    cleanup.push(() => service.destroy());
    const { labelEl } = buildCanvasWithField('f1', 'Old');
    dispatchDblclick(labelEl);

    const input = document.querySelector('.fjs-inline-label-edit-input') as HTMLInputElement;
    input.value = 'New Label';
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    input.dispatchEvent(enter);

    expect(modeling.editFormField).toHaveBeenCalledTimes(1);
    expect(modeling.editFormField).toHaveBeenCalledWith(fields.f1, { label: 'New Label' });
    expect(document.querySelector('.fjs-inline-label-edit-input')).toBeNull();
  });

  it('commits on blur', () => {
    const fields = { 'f1': { id: 'f1', type: 'textfield', label: 'Old' } };
    const { service, modeling } = createService({ formFieldRegistry: createMockFormFieldRegistry(fields) });
    cleanup.push(() => service.destroy());
    const { labelEl } = buildCanvasWithField('f1', 'Old');
    dispatchDblclick(labelEl);

    const input = document.querySelector('.fjs-inline-label-edit-input') as HTMLInputElement;
    input.value = 'Blurred';
    input.dispatchEvent(new FocusEvent('blur'));

    expect(modeling.editFormField).toHaveBeenCalledWith(fields.f1, { label: 'Blurred' });
    expect(document.querySelector('.fjs-inline-label-edit-input')).toBeNull();
  });

  it('does not commit when value is unchanged', () => {
    const fields = { 'f1': { id: 'f1', type: 'textfield', label: 'Old' } };
    const { service, modeling } = createService({ formFieldRegistry: createMockFormFieldRegistry(fields) });
    cleanup.push(() => service.destroy());
    const { labelEl } = buildCanvasWithField('f1', 'Old');
    dispatchDblclick(labelEl);

    const input = document.querySelector('.fjs-inline-label-edit-input') as HTMLInputElement;
    input.dispatchEvent(new FocusEvent('blur'));

    expect(modeling.editFormField).not.toHaveBeenCalled();
    expect(document.querySelector('.fjs-inline-label-edit-input')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `cd packages/designer-editor-host && npm run test:unit -- InlineLabelEditModule`
Expected: FAIL — Enter/blur do nothing yet.

- [ ] **Step 3: Implement commit logic**

Edit `packages/designer-editor-host/src/modules/InlineLabelEditModule.ts`. In `_activate`, after `input.select();`, add listeners and remember the original label:

Replace the existing `_activate` method body (the part after `input.select();`) with:

```ts
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
```

Add a new private method `_commit` right after `_activate`:

```ts
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
```

- [ ] **Step 4: Run tests and confirm pass**

Run: `cd packages/designer-editor-host && npm run test:unit -- InlineLabelEditModule`
Expected: PASS — all commit tests pass; previously passing tests still pass.

- [ ] **Step 5: Commit**

```bash
git add packages/designer-editor-host/src/modules/InlineLabelEditModule.ts \
        packages/designer-editor-host/src/__tests__/InlineLabelEditModule.test.ts
git commit -m "feat(editor-host): InlineLabelEdit Enter/blur commit via modeling.editFormField"
```

---

## Task 4: Cancel on Escape + Teardown on External Events

**Files:**
- Modify: `packages/designer-editor-host/src/__tests__/InlineLabelEditModule.test.ts`

- [ ] **Step 1: Write the failing tests for cancel + teardown**

Append to `packages/designer-editor-host/src/__tests__/InlineLabelEditModule.test.ts`:

```ts
describe('InlineLabelEditModule cancel + external teardown', () => {
  let cleanup: Array<() => void> = [];
  beforeEach(() => {
    cleanup = [];
  });
  afterEach(() => {
    cleanup.forEach((fn) => fn());
    document.body.innerHTML = '';
  });

  it('Escape cancels without commit and removes overlay', () => {
    const fields = { 'f1': { id: 'f1', type: 'textfield', label: 'Old' } };
    const { service, modeling } = createService({ formFieldRegistry: createMockFormFieldRegistry(fields) });
    cleanup.push(() => service.destroy());
    const { labelEl } = buildCanvasWithField('f1', 'Old');
    dispatchDblclick(labelEl);

    const input = document.querySelector('.fjs-inline-label-edit-input') as HTMLInputElement;
    input.value = 'Discarded';
    const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    input.dispatchEvent(esc);

    expect(modeling.editFormField).not.toHaveBeenCalled();
    expect(document.querySelector('.fjs-inline-label-edit-input')).toBeNull();
  });

  it('selection.changed tears down overlay (no commit)', () => {
    const fields = { 'f1': { id: 'f1', type: 'textfield', label: 'Old' } };
    const eventBus = createMockEventBus();
    const { service, modeling } = createService({
      eventBus,
      formFieldRegistry: createMockFormFieldRegistry(fields),
    });
    cleanup.push(() => service.destroy());
    const { labelEl } = buildCanvasWithField('f1', 'Old');
    dispatchDblclick(labelEl);
    expect(document.querySelector('.fjs-inline-label-edit-input')).not.toBeNull();

    eventBus.emit('selection.changed');
    expect(document.querySelector('.fjs-inline-label-edit-input')).toBeNull();
    expect(modeling.editFormField).not.toHaveBeenCalled();
  });

  it('commandStack.changed tears down overlay (no commit)', () => {
    const fields = { 'f1': { id: 'f1', type: 'textfield', label: 'Old' } };
    const eventBus = createMockEventBus();
    const { service, modeling } = createService({
      eventBus,
      formFieldRegistry: createMockFormFieldRegistry(fields),
    });
    cleanup.push(() => service.destroy());
    const { labelEl } = buildCanvasWithField('f1', 'Old');
    dispatchDblclick(labelEl);

    eventBus.emit('commandStack.changed');
    expect(document.querySelector('.fjs-inline-label-edit-input')).toBeNull();
    expect(modeling.editFormField).not.toHaveBeenCalled();
  });

  it('diagram.destroy tears down overlay and removes listener', () => {
    const fields = { 'f1': { id: 'f1', type: 'textfield', label: 'Old' } };
    const eventBus = createMockEventBus();
    const { service } = createService({
      eventBus,
      formFieldRegistry: createMockFormFieldRegistry(fields),
    });
    cleanup.push(() => service.destroy());
    const { labelEl } = buildCanvasWithField('f1', 'Old');
    dispatchDblclick(labelEl);

    eventBus.emit('diagram.destroy');
    expect(document.querySelector('.fjs-inline-label-edit-input')).toBeNull();
    // After destroy, further dblclicks must not re-mount overlay
    dispatchDblclick(labelEl);
    expect(document.querySelector('.fjs-inline-label-edit-input')).toBeNull();
  });

  it('second dblclick during edit replaces existing overlay', () => {
    const fields = {
      'f1': { id: 'f1', type: 'textfield', label: 'A' },
      'f2': { id: 'f2', type: 'textfield', label: 'B' },
    };
    const { service } = createService({ formFieldRegistry: createMockFormFieldRegistry(fields) });
    cleanup.push(() => service.destroy());

    const canvas = document.createElement('div');
    canvas.className = 'fjs-editor-container';
    const f1 = document.createElement('div');
    f1.setAttribute('data-id', 'f1');
    const l1 = document.createElement('label');
    l1.className = 'fjs-form-field-label';
    l1.textContent = 'A';
    f1.appendChild(l1);
    const f2 = document.createElement('div');
    f2.setAttribute('data-id', 'f2');
    const l2 = document.createElement('label');
    l2.className = 'fjs-form-field-label';
    l2.textContent = 'B';
    f2.appendChild(l2);
    canvas.appendChild(f1);
    canvas.appendChild(f2);
    document.body.appendChild(canvas);

    dispatchDblclick(l1);
    dispatchDblclick(l2);

    const inputs = document.querySelectorAll('.fjs-inline-label-edit-input');
    expect(inputs.length).toBe(1);
    expect((inputs[0] as HTMLInputElement).value).toBe('B');
  });
});
```

- [ ] **Step 2: Run tests and confirm pass**

Run: `cd packages/designer-editor-host && npm run test:unit -- InlineLabelEditModule`
Expected: PASS — all teardown tests pass. (Cancel/teardown were already implemented in Tasks 1–3 via `_teardown()` and event subscriptions; these tests verify the wiring end-to-end.)

If a test fails, the most likely cause is that `_commit` runs on blur after `_teardown` is called externally. Make `_teardown` clear `_inputEl` first so subsequent blur handler is a no-op — already handled by the early return in `_commit`.

- [ ] **Step 3: Commit**

```bash
git add packages/designer-editor-host/src/__tests__/InlineLabelEditModule.test.ts
git commit -m "test(editor-host): InlineLabelEdit Escape + external teardown coverage"
```

---

## Task 5: Wire Module into App.tsx and embeddedDesigner.tsx

**Files:**
- Modify: `packages/designer-editor-host/src/App.tsx`
- Modify: `packages/designer-editor-host/src/embeddedDesigner.tsx`

- [ ] **Step 1: Read the current additionalModules block in App.tsx**

Run: `grep -n "OutlineModule\|MarqueeModule\|additionalModules" packages/designer-editor-host/src/App.tsx`
Expected output includes lines like:
```
24: import { OutlineModule } from './modules/OutlineModule';
25: import { MarqueeModule } from './modules/MarqueeModule';
131:   OutlineModule,
132:   MarqueeModule,
```

- [ ] **Step 2: Add InlineLabelEditModule import + registration in App.tsx**

In `packages/designer-editor-host/src/App.tsx`, find the line:

```ts
import { MarqueeModule } from './modules/MarqueeModule';
```

Add immediately after:

```ts
import { InlineLabelEditModule } from './modules/InlineLabelEditModule';
```

Then find the lines (around 131–132):

```ts
  OutlineModule,
  MarqueeModule,
```

Replace with:

```ts
  OutlineModule,
  MarqueeModule,
  InlineLabelEditModule,
```

- [ ] **Step 3: Add the same wiring in embeddedDesigner.tsx**

In `packages/designer-editor-host/src/embeddedDesigner.tsx`, find:

```ts
import { MarqueeModule } from './modules/MarqueeModule';
```

Add immediately after:

```ts
import { InlineLabelEditModule } from './modules/InlineLabelEditModule';
```

Then find the lines (around 162–163):

```ts
  OutlineModule,
  MarqueeModule,
```

Replace with:

```ts
  OutlineModule,
  MarqueeModule,
  InlineLabelEditModule,
```

- [ ] **Step 4: Run typecheck and unit tests**

Run: `cd packages/designer-editor-host && npm run typecheck && npm run test:unit`
Expected: typecheck passes; all unit tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/designer-editor-host/src/App.tsx \
        packages/designer-editor-host/src/embeddedDesigner.tsx
git commit -m "feat(editor-host): register InlineLabelEditModule in App + embedded designer"
```

---

## Task 6: Add CSS for Input Overlay

**Files:**
- Modify: `packages/designer-editor-host/src/app.css`

- [ ] **Step 1: Inspect current app.css to find a good insertion point**

Run: `grep -n "fjs-editor-container\|fjs-form-field" packages/designer-editor-host/src/app.css | head -10`
Note: this is for orientation. Append the new styles at the end of the file.

- [ ] **Step 2: Append overlay styles to app.css**

Append the following block to the end of `packages/designer-editor-host/src/app.css`:

```css
/* Inline label edit overlay — Task: dblclick label to edit */
.fjs-inline-label-edit-input {
  font: inherit;
  padding: 2px 4px;
  border: 1px solid #2563eb;
  border-radius: 3px;
  background: #ffffff;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
  outline: none;
  box-sizing: border-box;
}

.fjs-inline-label-edit-input:focus {
  border-color: #1d4ed8;
}
```

- [ ] **Step 3: Verify dev server still compiles**

Run: `cd packages/designer-editor-host && npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/designer-editor-host/src/app.css
git commit -m "style(editor-host): add .fjs-inline-label-edit-input overlay styles"
```

---

## Task 7: Playwright E2E Golden Path

**Files:**
- Create: `packages/designer-editor-host/e2e/editor.inline-label-edit.spec.ts`

- [ ] **Step 1: Write the failing e2e spec**

Create `packages/designer-editor-host/e2e/editor.inline-label-edit.spec.ts`:

```ts
/**
 * editor.inline-label-edit.spec.ts — 캔버스 라벨 더블클릭 인라인 편집 E2E
 *
 * 골든 패스:
 *   1) textfield 컴포넌트 드롭
 *   2) 캔버스에 렌더된 .fjs-form-field-label 더블클릭
 *   3) 인라인 input 등장 → 새 텍스트 입력 → Enter
 *   4) 라벨이 새 텍스트로 갱신됨
 */

import { test, expect } from '@playwright/test';

test.describe('Inline label edit (dblclick)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="editor-root"]', { timeout: 15000 });
    await page.waitForSelector('.fjs-palette', { timeout: 15000 });
  });

  test('dblclick label → input → Enter → label updates', async ({ page }) => {
    // textfield 드롭
    const paletteItem = page.locator('.fjs-palette-field', { hasText: /text\s*field|텍스트\s*필드/i }).first();
    await expect(paletteItem).toBeVisible({ timeout: 10000 });

    const canvas = page.locator('.fjs-empty-editor-card, .fjs-editor-container, .fjs-drop-container-vertical').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    const paletteBox = await paletteItem.boundingBox();
    const canvasBox = await canvas.boundingBox();
    if (!paletteBox || !canvasBox) {
      throw new Error('[inline-label-edit] boundingBox unavailable');
    }
    await page.mouse.move(paletteBox.x + paletteBox.width / 2, paletteBox.y + paletteBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2, { steps: 10 });
    await page.mouse.up();

    // 캔버스에 렌더된 라벨
    const label = page.locator('.fjs-editor-container .fjs-form-field-label').first();
    await expect(label).toBeVisible({ timeout: 5000 });

    // 더블클릭 → 인라인 input 등장
    await label.dblclick();
    const input = page.locator('[data-testid="inline-label-edit-input"]');
    await expect(input).toBeVisible({ timeout: 2000 });

    // 새 라벨 입력 → Enter
    await input.fill('Updated Label');
    await input.press('Enter');

    // input 사라지고, 라벨 텍스트 갱신
    await expect(input).toHaveCount(0, { timeout: 2000 });
    await expect(page.locator('.fjs-editor-container .fjs-form-field-label', { hasText: 'Updated Label' })).toBeVisible({ timeout: 3000 });
  });

  test('Escape cancels and keeps original label', async ({ page }) => {
    const paletteItem = page.locator('.fjs-palette-field', { hasText: /text\s*field|텍스트\s*필드/i }).first();
    await expect(paletteItem).toBeVisible({ timeout: 10000 });

    const canvas = page.locator('.fjs-empty-editor-card, .fjs-editor-container, .fjs-drop-container-vertical').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    const paletteBox = await paletteItem.boundingBox();
    const canvasBox = await canvas.boundingBox();
    if (!paletteBox || !canvasBox) {
      throw new Error('[inline-label-edit] boundingBox unavailable');
    }
    await page.mouse.move(paletteBox.x + paletteBox.width / 2, paletteBox.y + paletteBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2, { steps: 10 });
    await page.mouse.up();

    const label = page.locator('.fjs-editor-container .fjs-form-field-label').first();
    await expect(label).toBeVisible({ timeout: 5000 });
    const originalText = (await label.textContent())?.trim() ?? '';

    await label.dblclick();
    const input = page.locator('[data-testid="inline-label-edit-input"]');
    await expect(input).toBeVisible({ timeout: 2000 });

    await input.fill('Discarded');
    await input.press('Escape');

    await expect(input).toHaveCount(0, { timeout: 2000 });
    await expect(page.locator('.fjs-editor-container .fjs-form-field-label').first()).toHaveText(originalText);
  });
});
```

- [ ] **Step 2: Run e2e and verify pass (with dev server)**

The Playwright config (`playwright.config.ts`) starts the Vite dev server automatically (`webServer` block). Run:

`cd packages/designer-editor-host && npm run test:e2e -- editor.inline-label-edit.spec.ts`

Expected: both tests PASS.

If a test fails because the textfield palette label uses different wording in the local build, run `npm run dev` in another terminal, open the app, and check the actual palette label, then adjust the regex in the spec.

- [ ] **Step 3: Commit**

```bash
git add packages/designer-editor-host/e2e/editor.inline-label-edit.spec.ts
git commit -m "test(editor-host): e2e for inline label edit (Enter commit + Escape cancel)"
```

---

## Task 8: Real-Browser Verification (Manual)

**Memory rule:** "headless 측정만으로 완료 보고 금지, 실제 브라우저·visible Playwright 병행". This task is non-skippable before declaring done.

- [ ] **Step 1: Start dev server**

Run: `cd packages/designer-editor-host && npm run dev`
Expected: Vite serves at `http://localhost:5173` (or similar — note the actual port).

- [ ] **Step 2: Verify in real browser**

Open the dev URL in the user's actual browser. Manually:

1. Drop a textfield onto the canvas.
2. Dblclick the rendered label — input overlay must appear, focused, with the existing label preselected.
3. Type a new label, press Enter — label updates on the canvas.
4. Dblclick again, type, press Escape — original label preserved.
5. Dblclick, click outside (blur) — value commits.
6. Dblclick a label, then click another field's label — only the second overlay remains.

Report any visual glitches (overlay misaligned, z-index issues, font mismatch). If the overlay is not aligned with the label rectangle, capture a screenshot and adjust `_activate` positioning logic in a follow-up commit.

- [ ] **Step 3: (Optional) Visible Playwright check**

If headless e2e passed but you want visual confirmation:
`cd packages/designer-editor-host && PWDEBUG=1 npm run test:e2e -- editor.inline-label-edit.spec.ts`
Expected: Playwright Inspector opens; step through to visually confirm the input overlay matches the label area.

- [ ] **Step 4: No commit needed; report status to user**

Summarize: "Inline label edit shipped. Unit + e2e green; manual verification on textfield passed; tabPanel/modal/card not yet covered (label rendering differs)."

---

## Self-Review

**1. Spec coverage:** Goal is dblclick label → inline edit → commit/cancel. Mapped: Task 1 (skeleton), Task 2 (dblclick filter + mount), Task 3 (Enter/blur commit), Task 4 (Escape cancel + external teardown), Task 5 (wire into both apps), Task 6 (styling), Task 7 (e2e), Task 8 (manual verification). ✓

**2. Placeholder scan:** All test code is concrete; all method signatures defined; commit messages explicit. ✓

**3. Type consistency:**
- `EventBusLike`, `FormFieldRegistryLike`, `ModelingLike` — exported from module, used identically in tests via `MockEventBus` etc.
- `_activeFieldId: string | null`, `_inputEl: HTMLInputElement | null`, `_activeLabelEl: HTMLElement | null` — declared once, used consistently across `_activate`, `_commit`, `_teardown`.
- `_commit(originalLabel: string)` signature matches `_activate` callsite (`this._commit(currentLabel)`).
- `modeling.editFormField(field, { label: newLabel })` — uses the multi-prop signature defined in `ModelingLike`. Matches existing `PropsPanelService.ts:147` pattern (which uses the `(field, key, value)` overload — both are valid per the interface). ✓

---

## Execution Handoff

Per project memory ("superpowers 기본 실행은 subagent-driven"), proceed with **subagent-driven-development**: dispatch a fresh subagent per task, review between tasks, fast iteration.
