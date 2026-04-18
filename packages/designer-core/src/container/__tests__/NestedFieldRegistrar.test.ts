import { describe, expect, it, vi } from 'vitest';
import { NestedFieldRegistrar } from '../NestedFieldRegistrar';

type AnyField = {
  id: string;
  type: string;
  _parent?: string;
  components?: AnyField[];
};

function createMockRegistry() {
  const fields = new Map<string, AnyField>();
  const ids = new Set<string>();
  return {
    fields,
    ids,
    add: vi.fn((field: AnyField) => {
      if (fields.has(field.id)) throw new Error(`already exists ${field.id}`);
      fields.set(field.id, field);
    }),
    remove: vi.fn((field: AnyField) => {
      fields.delete(field.id);
    }),
    get: vi.fn((id: string) => fields.get(id)),
    _ids: {
      assigned: vi.fn((id: string) => ids.has(id)),
      claim: vi.fn((id: string) => { ids.add(id); }),
      unclaim: vi.fn((id: string) => { ids.delete(id); }),
    },
  };
}

function createMockEventBus() {
  const handlers = new Map<string, Array<(e: unknown) => void>>();
  return {
    handlers,
    on: (event: string, h: (e: unknown) => void) => {
      if (!handlers.has(event)) handlers.set(event, []);
      handlers.get(event)!.push(h);
    },
    fire: (event: string, payload: unknown) => {
      (handlers.get(event) ?? []).forEach((h) => h(payload));
    },
  };
}

describe('NestedFieldRegistrar', () => {
  it('subscribes to commandStack.formField.add postExecuted and reverted', () => {
    const bus = createMockEventBus();
    const reg = createMockRegistry();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new NestedFieldRegistrar(bus as any, reg as any);
    expect(bus.handlers.has('commandStack.formField.add.postExecuted')).toBe(true);
    expect(bus.handlers.has('commandStack.formField.add.reverted')).toBe(true);
  });

  it('registers nested tabPanel children when tabs is added', () => {
    const bus = createMockEventBus();
    const reg = createMockRegistry();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new NestedFieldRegistrar(bus as any, reg as any);

    const tabPanelA: AnyField = { id: 'tabPanel_a', type: 'tabPanel', components: [] };
    const tabPanelB: AnyField = { id: 'tabPanel_b', type: 'tabPanel', components: [] };
    const tabs: AnyField = { id: 'tabs_1', type: 'tabs', components: [tabPanelA, tabPanelB] };
    // tabs itself was already registered by AddFormFieldHandler
    reg.fields.set(tabs.id, tabs);
    reg.ids.add(tabs.id);

    bus.fire('commandStack.formField.add.postExecuted', { context: { formField: tabs } });

    expect(reg.fields.has('tabPanel_a')).toBe(true);
    expect(reg.fields.has('tabPanel_b')).toBe(true);
    expect(reg.ids.has('tabPanel_a')).toBe(true);
    expect(reg.ids.has('tabPanel_b')).toBe(true);
    expect(tabPanelA._parent).toBe('tabs_1');
    expect(tabPanelB._parent).toBe('tabs_1');
  });

  it('registers grandchildren recursively', () => {
    const bus = createMockEventBus();
    const reg = createMockRegistry();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new NestedFieldRegistrar(bus as any, reg as any);

    const textfield: AnyField = { id: 'field_x', type: 'textfield', components: [] };
    const tabPanelA: AnyField = { id: 'tabPanel_a', type: 'tabPanel', components: [textfield] };
    const tabs: AnyField = { id: 'tabs_1', type: 'tabs', components: [tabPanelA] };
    reg.fields.set(tabs.id, tabs);
    reg.ids.add(tabs.id);

    bus.fire('commandStack.formField.add.postExecuted', { context: { formField: tabs } });

    expect(reg.fields.has('tabPanel_a')).toBe(true);
    expect(reg.fields.has('field_x')).toBe(true);
    expect(textfield._parent).toBe('tabPanel_a');
  });

  it('is idempotent — skips already registered children', () => {
    const bus = createMockEventBus();
    const reg = createMockRegistry();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new NestedFieldRegistrar(bus as any, reg as any);

    const tabPanelA: AnyField = { id: 'tabPanel_a', type: 'tabPanel', components: [] };
    const tabs: AnyField = { id: 'tabs_1', type: 'tabs', components: [tabPanelA] };
    reg.fields.set(tabs.id, tabs);
    reg.fields.set(tabPanelA.id, tabPanelA);

    bus.fire('commandStack.formField.add.postExecuted', { context: { formField: tabs } });

    // add called once (not again) for tabPanelA
    expect(reg.add.mock.calls.some(([f]) => f.id === 'tabPanel_a')).toBe(false);
  });

  it('no-op when field has no components', () => {
    const bus = createMockEventBus();
    const reg = createMockRegistry();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new NestedFieldRegistrar(bus as any, reg as any);

    const leaf: AnyField = { id: 'field_x', type: 'textfield' };
    reg.fields.set(leaf.id, leaf);
    bus.fire('commandStack.formField.add.postExecuted', { context: { formField: leaf } });
    expect(reg.add).not.toHaveBeenCalled();
  });

  it('unregisters nested children on revert (undo of add)', () => {
    const bus = createMockEventBus();
    const reg = createMockRegistry();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new NestedFieldRegistrar(bus as any, reg as any);

    const tabPanelA: AnyField = { id: 'tabPanel_a', type: 'tabPanel', components: [] };
    const tabPanelB: AnyField = { id: 'tabPanel_b', type: 'tabPanel', components: [] };
    const tabs: AnyField = { id: 'tabs_1', type: 'tabs', components: [tabPanelA, tabPanelB] };

    // Simulate post-execute add
    reg.fields.set(tabs.id, tabs);
    reg.ids.add(tabs.id);
    bus.fire('commandStack.formField.add.postExecuted', { context: { formField: tabs } });
    expect(reg.fields.has('tabPanel_a')).toBe(true);

    // Simulate revert
    bus.fire('commandStack.formField.add.reverted', { context: { formField: tabs } });
    expect(reg.fields.has('tabPanel_a')).toBe(false);
    expect(reg.fields.has('tabPanel_b')).toBe(false);
    expect(reg.ids.has('tabPanel_a')).toBe(false);
    expect(reg.ids.has('tabPanel_b')).toBe(false);
  });

  it('has $inject metadata for didi', () => {
    expect(
      (NestedFieldRegistrar as unknown as { $inject: string[] }).$inject,
    ).toEqual(['eventBus', 'formFieldRegistry']);
  });
});
