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
  fire: ReturnType<typeof vi.fn>;
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
    fire: vi.fn(),
    emit: (event: string, payload?: unknown) => {
      const cbs = listeners[event] ?? [];
      for (const cb of cbs) cb(payload);
    },
  };
}

function createMockFormFieldRegistry(
  fields: Record<string, { id: string; type: string; label?: string; dateLabel?: string; timeLabel?: string; text?: string }> = {},
) {
  return {
    get: vi.fn((id: string) => fields[id]),
  };
}

function createMockModeling() {
  return { editFormField: vi.fn() };
}

function getServiceClass() {
  const [, ServiceClass] = (InlineLabelEditModule.inlineLabelEdit as unknown) as [
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

  it('mounts overlay on [data-id] dblclick via field-row fallback (Phase 2 broadens Phase 1)', () => {
    // Phase 2: when the dblclick target is the [data-id] row itself (not its label/button/tab
    // descendants), the field-row fallback path activates the overlay as long as field.label
    // is a string. The empty-label scenario is covered separately in the empty-label fallback
    // describe block below.
    const fields = { 'f1': { id: 'f1', type: 'textfield', label: 'Old' } };
    const { service } = createService({ formFieldRegistry: createMockFormFieldRegistry(fields) });
    cleanup.push(() => service.destroy());
    const { fieldEl } = buildCanvasWithField('f1', 'Old');
    dispatchDblclick(fieldEl);
    const input = document.querySelector('.fjs-inline-label-edit-input') as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input!.value).toBe('Old');
    expect(input!.getAttribute('data-field-id')).toBe('f1');
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

  it('mounts overlay with empty value on label dblclick even when field has no label property (guard relaxed)', () => {
    // After the guard relaxation, undefined label → '' starting value.
    // The overlay opens; on blur without typing, no editFormField call is made
    // (value unchanged). This is benign for label-less fields like spacer.
    const fields = { 'f1': { id: 'f1', type: 'spacer' } };
    const { service } = createService({ formFieldRegistry: createMockFormFieldRegistry(fields) });
    cleanup.push(() => service.destroy());
    const { labelEl } = buildCanvasWithField('f1', '');
    dispatchDblclick(labelEl);
    const input = document.querySelector('.fjs-inline-label-edit-input') as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input!.value).toBe('');
  });

  it('appends overlay into closest .fjd-embedded-designer-root for portal stacking', () => {
    // Hosts that render the canvas inside their own portal/modal (e.g. tiptap
    // embedded designer with z-index 2.1B) must receive the input inside that
    // portal so it isn't stacked behind the modal. Plain hosts with no portal
    // ancestor still fall back to document.body — covered by the other tests.
    const fields = { 'f1': { id: 'f1', type: 'textfield', label: 'Old' } };
    const { service } = createService({ formFieldRegistry: createMockFormFieldRegistry(fields) });
    cleanup.push(() => service.destroy());

    const portalRoot = document.createElement('div');
    portalRoot.className = 'fjd-embedded-designer-root';
    const canvas = document.createElement('div');
    canvas.className = 'fjs-editor-container';
    const fieldEl = document.createElement('div');
    fieldEl.setAttribute('data-id', 'f1');
    const labelEl = document.createElement('label');
    labelEl.className = 'fjs-form-field-label';
    labelEl.textContent = 'Old';
    fieldEl.appendChild(labelEl);
    canvas.appendChild(fieldEl);
    portalRoot.appendChild(canvas);
    document.body.appendChild(portalRoot);

    dispatchDblclick(labelEl);
    const input = document.querySelector('.fjs-inline-label-edit-input') as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input!.parentElement).toBe(portalRoot);
  });
});

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

function buildCanvasWithTabTrigger(tabFieldId: string, tabLabelText: string): {
  canvas: HTMLElement;
  triggerEl: HTMLElement;
} {
  const canvas = document.createElement('div');
  canvas.className = 'fjs-editor-container';
  // Outer tabs container has its own [data-id] (the tabPanel/tabs field)
  const tabsContainer = document.createElement('div');
  tabsContainer.setAttribute('data-id', 'tabs-container');
  const triggerEl = document.createElement('button');
  triggerEl.className = 'dc-tabs__trigger';
  triggerEl.setAttribute('data-tab-id', tabFieldId);
  triggerEl.textContent = tabLabelText;
  tabsContainer.appendChild(triggerEl);
  canvas.appendChild(tabsContainer);
  document.body.appendChild(canvas);
  return { canvas, triggerEl };
}

describe('InlineLabelEditModule tab trigger anchor', () => {
  let cleanup: Array<() => void> = [];
  beforeEach(() => { cleanup = []; });
  afterEach(() => {
    cleanup.forEach((fn) => fn());
    document.body.innerHTML = '';
  });

  it('mounts overlay on .dc-tabs__trigger dblclick using data-tab-id (not parent [data-id])', () => {
    const fields = {
      'tab-1': { id: 'tab-1', type: 'tabPanel', label: 'My Tab' },
      'tabs-container': { id: 'tabs-container', type: 'tabs', label: 'Tabs' },
    };
    const { service, formFieldRegistry } = createService({
      formFieldRegistry: createMockFormFieldRegistry(fields),
    });
    cleanup.push(() => service.destroy());
    const { triggerEl } = buildCanvasWithTabTrigger('tab-1', 'My Tab');
    dispatchDblclick(triggerEl);

    const input = document.querySelector('.fjs-inline-label-edit-input') as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input!.value).toBe('My Tab');
    expect(input!.getAttribute('data-field-id')).toBe('tab-1');
    // Must lookup the tab id, NOT the parent tabs-container
    expect(formFieldRegistry.get).toHaveBeenCalledWith('tab-1');
  });

  it('does not mount when trigger has no data-tab-id attribute', () => {
    const { service, formFieldRegistry } = createService();
    cleanup.push(() => service.destroy());
    const canvas = document.createElement('div');
    canvas.className = 'fjs-editor-container';
    const trigger = document.createElement('button');
    trigger.className = 'dc-tabs__trigger';
    trigger.textContent = 'Orphan';
    canvas.appendChild(trigger);
    document.body.appendChild(canvas);
    dispatchDblclick(trigger);
    expect(document.querySelector('.fjs-inline-label-edit-input')).toBeNull();
    // Resolver must short-circuit on tab-trigger-without-data-tab-id BEFORE any registry
    // lookup. If get() were called, that would mean the resolver fell through to the
    // [data-id] path — exactly the bug this test guards against.
    expect(formFieldRegistry.get).not.toHaveBeenCalled();
  });
});

describe('InlineLabelEditModule button anchor', () => {
  let cleanup: Array<() => void> = [];
  beforeEach(() => { cleanup = []; });
  afterEach(() => {
    cleanup.forEach((fn) => fn());
    document.body.innerHTML = '';
  });

  it('mounts overlay on .fjs-button dblclick (anchor=button, label=button text)', () => {
    const fields = { 'btn-1': { id: 'btn-1', type: 'button', label: 'Submit' } };
    const { service } = createService({
      formFieldRegistry: createMockFormFieldRegistry(fields),
    });
    cleanup.push(() => service.destroy());

    const canvas = document.createElement('div');
    canvas.className = 'fjs-editor-container';
    const fieldEl = document.createElement('div');
    fieldEl.setAttribute('data-id', 'btn-1');
    const buttonEl = document.createElement('button');
    buttonEl.className = 'fjs-button';
    buttonEl.textContent = 'Submit';
    fieldEl.appendChild(buttonEl);
    canvas.appendChild(fieldEl);
    document.body.appendChild(canvas);

    dispatchDblclick(buttonEl);
    const input = document.querySelector('.fjs-inline-label-edit-input') as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input!.value).toBe('Submit');
    expect(input!.getAttribute('data-field-id')).toBe('btn-1');
  });
});

describe('InlineLabelEditModule empty-label fallback', () => {
  let cleanup: Array<() => void> = [];
  beforeEach(() => { cleanup = []; });
  afterEach(() => {
    cleanup.forEach((fn) => fn());
    document.body.innerHTML = '';
  });

  it('mounts overlay on field row dblclick when label is empty string', () => {
    const fields = { 'f1': { id: 'f1', type: 'textfield', label: '' } };
    const { service } = createService({
      formFieldRegistry: createMockFormFieldRegistry(fields),
    });
    cleanup.push(() => service.destroy());

    const canvas = document.createElement('div');
    canvas.className = 'fjs-editor-container';
    const fieldEl = document.createElement('div');
    fieldEl.setAttribute('data-id', 'f1');
    fieldEl.className = 'fjs-form-field';
    // No label element rendered (or rendered with 0 height); user clicks field body
    const inner = document.createElement('div');
    inner.textContent = 'click here';
    fieldEl.appendChild(inner);
    canvas.appendChild(fieldEl);
    document.body.appendChild(canvas);

    dispatchDblclick(inner);
    const input = document.querySelector('.fjs-inline-label-edit-input') as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input!.value).toBe('');
    expect(input!.getAttribute('data-field-id')).toBe('f1');
  });

  it('mounts overlay with empty value on [data-id] dblclick even when field has no label property (guard relaxed)', () => {
    // After the guard relaxation, undefined label → '' starting value.
    // The overlay opens; on blur without typing, no editFormField call is made.
    const fields = { 'sp1': { id: 'sp1', type: 'spacer' } };
    const { service } = createService({
      formFieldRegistry: createMockFormFieldRegistry(fields),
    });
    cleanup.push(() => service.destroy());

    const canvas = document.createElement('div');
    canvas.className = 'fjs-editor-container';
    const fieldEl = document.createElement('div');
    fieldEl.setAttribute('data-id', 'sp1');
    canvas.appendChild(fieldEl);
    document.body.appendChild(canvas);

    dispatchDblclick(fieldEl);
    const input = document.querySelector('.fjs-inline-label-edit-input') as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input!.value).toBe('');
  });
});

function buildCanvasWithDatetime(fieldId: string, opts: { dateLabel?: string; timeLabel?: string; whichLabel: 'date' | 'time' }): {
  canvas: HTMLElement;
  labelEl: HTMLElement;
} {
  const canvas = document.createElement('div');
  canvas.className = 'fjs-editor-container';
  const fieldEl = document.createElement('div');
  fieldEl.setAttribute('data-id', fieldId);
  fieldEl.setAttribute('data-field-type', 'datetime');
  fieldEl.className = 'fjs-element';

  // form-js renders sub-pickers each with their own label and a `for` attribute
  // pointing at `${formDomId}-${fieldId}-(date|time)`.
  if (opts.dateLabel !== undefined) {
    const dateLabel = document.createElement('label');
    dateLabel.className = 'fjs-form-field-label';
    dateLabel.setAttribute('for', `fjs-form-test-${fieldId}-date`);
    dateLabel.textContent = opts.dateLabel;
    fieldEl.appendChild(dateLabel);
  }
  if (opts.timeLabel !== undefined) {
    const timeLabel = document.createElement('label');
    timeLabel.className = 'fjs-form-field-label';
    timeLabel.setAttribute('for', `fjs-form-test-${fieldId}-time`);
    timeLabel.textContent = opts.timeLabel;
    fieldEl.appendChild(timeLabel);
  }
  canvas.appendChild(fieldEl);
  document.body.appendChild(canvas);

  const labelEl = fieldEl.querySelector(
    `label[for$="-${opts.whichLabel}"]`,
  ) as HTMLElement;
  return { canvas, labelEl };
}

describe('InlineLabelEditModule datetime field (dateLabel/timeLabel)', () => {
  let cleanup: Array<() => void> = [];
  beforeEach(() => { cleanup = []; });
  afterEach(() => {
    cleanup.forEach((fn) => fn());
    document.body.innerHTML = '';
  });

  it('mounts overlay on date sub-label dblclick (subtype=date) reading dateLabel', () => {
    const fields = {
      'dt1': { id: 'dt1', type: 'datetime', dateLabel: 'My Date' },
    };
    const { service, formFieldRegistry } = createService({
      formFieldRegistry: createMockFormFieldRegistry(fields),
    });
    cleanup.push(() => service.destroy());
    const { labelEl } = buildCanvasWithDatetime('dt1', { dateLabel: 'My Date', whichLabel: 'date' });
    dispatchDblclick(labelEl);

    const input = document.querySelector('.fjs-inline-label-edit-input') as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input!.value).toBe('My Date');
    expect(input!.getAttribute('data-field-id')).toBe('dt1');
    expect(formFieldRegistry.get).toHaveBeenCalledWith('dt1');
  });

  it('mounts overlay on time sub-label dblclick (subtype=time) reading timeLabel', () => {
    const fields = {
      'dt2': { id: 'dt2', type: 'datetime', timeLabel: 'My Time' },
    };
    const { service } = createService({
      formFieldRegistry: createMockFormFieldRegistry(fields),
    });
    cleanup.push(() => service.destroy());
    const { labelEl } = buildCanvasWithDatetime('dt2', { timeLabel: 'My Time', whichLabel: 'time' });
    dispatchDblclick(labelEl);

    const input = document.querySelector('.fjs-inline-label-edit-input') as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input!.value).toBe('My Time');
  });

  it('Enter on dateLabel input commits to dateLabel (not label)', () => {
    const fields = {
      'dt3': { id: 'dt3', type: 'datetime', dateLabel: 'Old' },
    };
    const { service, modeling } = createService({
      formFieldRegistry: createMockFormFieldRegistry(fields),
    });
    cleanup.push(() => service.destroy());
    const { labelEl } = buildCanvasWithDatetime('dt3', { dateLabel: 'Old', whichLabel: 'date' });
    dispatchDblclick(labelEl);

    const input = document.querySelector('.fjs-inline-label-edit-input') as HTMLInputElement;
    input.value = 'New Date';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(modeling.editFormField).toHaveBeenCalledTimes(1);
    expect(modeling.editFormField).toHaveBeenCalledWith(fields.dt3, { dateLabel: 'New Date' });
    expect(document.querySelector('.fjs-inline-label-edit-input')).toBeNull();
  });

  it('Enter on timeLabel input commits to timeLabel (not label)', () => {
    const fields = {
      'dt4': { id: 'dt4', type: 'datetime', timeLabel: 'Old Time' },
    };
    const { service, modeling } = createService({
      formFieldRegistry: createMockFormFieldRegistry(fields),
    });
    cleanup.push(() => service.destroy());
    const { labelEl } = buildCanvasWithDatetime('dt4', { timeLabel: 'Old Time', whichLabel: 'time' });
    dispatchDblclick(labelEl);

    const input = document.querySelector('.fjs-inline-label-edit-input') as HTMLInputElement;
    input.value = 'New Time';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(modeling.editFormField).toHaveBeenCalledWith(fields.dt4, { timeLabel: 'New Time' });
  });

  it('mounts overlay with empty value when datetime field has undefined dateLabel (relaxed guard)', () => {
    // After the guard relaxation (undefined → ''), fresh datetime fields where the
    // model has no dateLabel yet should still be editable — the overlay opens with
    // an empty string so the user can type the first value.
    const fields = {
      'dt5': { id: 'dt5', type: 'datetime' },  // no labels in model
    };
    const { service } = createService({
      formFieldRegistry: createMockFormFieldRegistry(fields),
    });
    cleanup.push(() => service.destroy());
    // DOM renders a date sub-label (form-js still shows an i18n default in the DOM
    // even when the model property is absent).
    const { labelEl } = buildCanvasWithDatetime('dt5', { dateLabel: '', whichLabel: 'date' });
    dispatchDblclick(labelEl);
    const input = document.querySelector('.fjs-inline-label-edit-input') as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input!.value).toBe('');
    expect(input!.getAttribute('data-field-id')).toBe('dt5');
  });

  it('datetime, dateLabel undefined — Enter commits dateLabel with typed value', () => {
    const fields = {
      'dt-new': { id: 'dt-new', type: 'datetime' },  // no dateLabel in model
    };
    const { service, modeling } = createService({
      formFieldRegistry: createMockFormFieldRegistry(fields),
    });
    cleanup.push(() => service.destroy());
    const { labelEl } = buildCanvasWithDatetime('dt-new', { dateLabel: '', whichLabel: 'date' });
    dispatchDblclick(labelEl);

    const input = document.querySelector('.fjs-inline-label-edit-input') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe('');

    input.value = 'Start Date';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(modeling.editFormField).toHaveBeenCalledTimes(1);
    expect(modeling.editFormField).toHaveBeenCalledWith(fields['dt-new'], { dateLabel: 'Start Date' });
    expect(document.querySelector('.fjs-inline-label-edit-input')).toBeNull();
  });
});

describe('InlineLabelEditModule text type → feelers popup', () => {
  let cleanup: Array<() => void> = [];
  beforeEach(() => { cleanup = []; });
  afterEach(() => {
    cleanup.forEach((fn) => fn());
    document.body.innerHTML = '';
  });

  it('text 타입 더블클릭 → propertiesPanel.openPopup 발화, 인라인 input 미생성', () => {
    const fields = { 'f1': { id: 'f1', type: 'text', text: '## Hello World' } };
    const { service, eventBus } = createService({ formFieldRegistry: createMockFormFieldRegistry(fields) });
    cleanup.push(() => service.destroy());

    // DOM 셋업: .fjs-editor-container > [data-id="f1"] > div
    const container = document.createElement('div');
    container.className = 'fjs-editor-container';
    const fieldEl = document.createElement('div');
    fieldEl.setAttribute('data-id', 'f1');
    const inner = document.createElement('div');
    fieldEl.appendChild(inner);
    container.appendChild(fieldEl);
    document.body.appendChild(container);

    // 더블클릭
    const dblclickEvt = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
    inner.dispatchEvent(dblclickEvt);

    // fire 호출 확인
    expect((eventBus as any).fire).toHaveBeenCalledWith(
      'propertiesPanel.openPopup',
      expect.objectContaining({
        type: 'feelers',
        hostLanguage: 'markdown',
        value: '## Hello World',
      }),
    );

    // 인라인 input 미생성 확인
    expect(document.querySelector('.fjs-inline-label-edit-input')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Card field — header property + .dc-card__header anchor
// ---------------------------------------------------------------------------

function buildCanvasWithCard(cardId: string, opts: { header?: string } = {}): {
  canvas: HTMLElement;
  cardContainerEl: HTMLElement;
  cardHeaderEl: HTMLElement | null;
} {
  const canvas = document.createElement('div');
  canvas.className = 'fjs-editor-container';

  // The card field row carries data-id (form-js convention)
  const cardContainerEl = document.createElement('div');
  cardContainerEl.setAttribute('data-id', cardId);
  cardContainerEl.className = 'dc-card';

  let cardHeaderEl: HTMLElement | null = null;
  if ('header' in opts) {
    // When header is set (even empty string), form-js renders the header element
    cardHeaderEl = document.createElement('h3');
    cardHeaderEl.className = 'dc-card__header';
    cardHeaderEl.textContent = opts.header ?? '';
    cardContainerEl.appendChild(cardHeaderEl);
  }

  const body = document.createElement('div');
  body.className = 'dc-card__body';
  cardContainerEl.appendChild(body);

  canvas.appendChild(cardContainerEl);
  document.body.appendChild(canvas);

  return { canvas, cardContainerEl, cardHeaderEl };
}

describe('InlineLabelEditModule card field (header property)', () => {
  let cleanup: Array<() => void> = [];
  beforeEach(() => { cleanup = []; });
  afterEach(() => {
    cleanup.forEach((fn) => fn());
    document.body.innerHTML = '';
  });

  it('card, header undefined, click on .dc-card__header — mounts overlay with empty value', () => {
    // Registry has a card field with NO header set (fresh card).
    // The DOM still renders .dc-card__header (e.g., form-js shows a placeholder).
    // Dblclick on it must open the overlay with empty string.
    const cardId = 'c1';
    const fields = { [cardId]: { id: cardId, type: 'card' } };
    const { service } = createService({
      formFieldRegistry: createMockFormFieldRegistry(fields),
    });
    cleanup.push(() => service.destroy());
    const { cardHeaderEl } = buildCanvasWithCard(cardId, { header: '' });
    expect(cardHeaderEl).not.toBeNull();

    dispatchDblclick(cardHeaderEl!);

    const input = document.querySelector('.fjs-inline-label-edit-input') as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input!.value).toBe('');
    expect(input!.getAttribute('data-field-id')).toBe(cardId);
  });

  it('card, header undefined, click on .dc-card__header — Enter commits header with typed value', () => {
    const cardId = 'c2';
    const fields = { [cardId]: { id: cardId, type: 'card' } };
    const { service, modeling } = createService({
      formFieldRegistry: createMockFormFieldRegistry(fields),
    });
    cleanup.push(() => service.destroy());
    const { cardHeaderEl } = buildCanvasWithCard(cardId, { header: '' });

    dispatchDblclick(cardHeaderEl!);

    const input = document.querySelector('.fjs-inline-label-edit-input') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe('');

    input.value = 'Project Overview';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(modeling.editFormField).toHaveBeenCalledTimes(1);
    expect(modeling.editFormField).toHaveBeenCalledWith(fields[cardId], { header: 'Project Overview' });
    expect(document.querySelector('.fjs-inline-label-edit-input')).toBeNull();
  });

  it('card, header undefined, click on [data-id] fallback — mounts overlay with empty value', () => {
    // When no .dc-card__header element exists (card has no header set and form-js
    // renders nothing), the [data-id] fallback resolves the anchor. _resolveLabelKey
    // must return 'header' for type=card, and the relaxed guard must allow undefined.
    const cardId = 'c3';
    const fields = { [cardId]: { id: cardId, type: 'card' } };
    const { service, modeling } = createService({
      formFieldRegistry: createMockFormFieldRegistry(fields),
    });
    cleanup.push(() => service.destroy());
    // Build card WITHOUT header element (no header option passed)
    const { cardContainerEl } = buildCanvasWithCard(cardId);
    expect(cardContainerEl.querySelector('.dc-card__header')).toBeNull();

    // Click on the card body (falls through to [data-id] fallback)
    const body = cardContainerEl.querySelector('.dc-card__body') as HTMLElement;
    dispatchDblclick(body);

    const input = document.querySelector('.fjs-inline-label-edit-input') as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input!.value).toBe('');
    expect(input!.getAttribute('data-field-id')).toBe(cardId);

    // Confirm it commits to 'header' key, not 'label'
    input!.value = 'My Card Title';
    input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(modeling.editFormField).toHaveBeenCalledWith(fields[cardId], { header: 'My Card Title' });
  });
});
