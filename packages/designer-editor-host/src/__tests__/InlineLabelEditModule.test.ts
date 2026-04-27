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
