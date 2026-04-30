/**
 * PropsPanelService — Task 9 Simple/Full mode unit tests.
 *
 * Mirrors host's T4-3..T4-7 + T4-FU2 cases adapted to the extension's DI
 * signature `(propertiesPanel, injector)`.
 */
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@form-js-designer/designer-core', () => ({
  propsSchemaToPanel: vi.fn(() => []),
  createDefaultRegistry: vi.fn(() => ({
    get: vi.fn(),
    has: vi.fn(),
    register: vi.fn(),
    list: vi.fn().mockReturnValue([]),
  })),
  getAllowedEntryIds: vi.fn((type: string) => {
    const map: Record<string, ReadonlySet<string>> = {
      textfield: new Set(['label', 'defaultValue', 'required']),
      group: new Set(['label']),
      select: new Set(['label']),
    };
    return map[type] ?? new Set(['label']);
  }),
  I18nSimpleWidget: { render: vi.fn(), edit: vi.fn(), validate: vi.fn() },
  SIMPLE_MODE_HIDDEN_GROUPS: new Set([
    'condition', 'customProperties', 'group-condition', 'group-customProperties',
  ]),
  SIMPLE_MODE_PASSTHROUGH_GROUPS: new Set([
    'columns', 'layout', 'staticOptions', 'valuesSource',
  ]),
  // panelModeStorage promoted to designer-core. Service constructor reads
  // readStoredPanelMode at boot, so the mock must export it. Replicate the
  // real helper rather than hard-coding a value, because the
  // "seeds currentMode from sessionStorage at construction (full)" test
  // explicitly seeds sessionStorage to verify constructor-time pickup.
  PANEL_MODE_STORAGE_KEY: 'designer.panelMode',
  readStoredPanelMode: vi.fn(() => {
    try {
      if (typeof window === 'undefined') return 'simple';
      return window.sessionStorage.getItem('designer.panelMode') === 'full' ? 'full' : 'simple';
    } catch {
      return 'simple';
    }
  }),
}));

vi.mock('@form-js-designer/designer-runtime/modules', () => ({
  LAYOUT_HEIGHT_TARGET_TYPES: ['textarea', 'card', 'modal'],
}));

import { PropsPanelService } from '../../src/editor/propsPanel/PropsPanelService';

interface ProviderRecord {
  provider: { getGroups: (f: unknown, e?: unknown) => (g: unknown[]) => unknown[] };
  priority: number;
}

function makePropertiesPanel(): {
  registerProvider: (p: unknown, prio?: number) => void;
  _providers: ProviderRecord[];
} {
  const providers: ProviderRecord[] = [];
  return {
    registerProvider: (provider, priority) =>
      providers.push({
        provider: provider as ProviderRecord['provider'],
        priority: priority ?? 0,
      }),
    _providers: providers,
  };
}

/**
 * Mock injector that mirrors form-js's `InjectorLike` contract:
 * `get<T = unknown>(name: string, strict?: boolean): T | undefined`.
 * The generic + `T | undefined` return type is required so the mock is
 * structurally assignable to the service constructor's parameter — a plain
 * `() => unknown` shape fails TS2345 (Type 'unknown' is not assignable to
 * type 'T | undefined').
 *
 * `vi.fn(...)` collapses generic signatures into a non-generic Mock type, so
 * we wrap a plain function here instead of typing `get` directly as
 * `vi.fn(...)`.
 */
function makeInjector(): { get: <T = unknown>(name: string, strict?: boolean) => T | undefined } {
  return {
    get: <T = unknown>(_name: string, _strict?: boolean): T | undefined => undefined,
  };
}

function makeGroups() {
  return [
    { id: 'general', entries: [{ id: 'label' }, { id: 'description' }, { id: 'key' }, { id: 'defaultValue' }] },
    { id: 'condition', entries: [{ id: 'conditional-hide' }] },
    { id: 'customProperties', entries: [{ id: 'properties' }] },
    { id: 'columns', entries: [{ id: 'columns' }] },
    { id: 'validation', entries: [{ id: 'required' }, { id: 'validationType' }] },
  ];
}

describe('PropsPanelService — Task 9 Simple/Full', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    try {
      window.sessionStorage.removeItem('designer.panelMode');
    } catch {
      /* noop */
    }
  });

  it('registers TWO providers — custom-props (500) + native filter (400)', () => {
    const pp = makePropertiesPanel();
    new PropsPanelService(pp as unknown as { registerProvider(p: unknown, prio?: number): void }, makeInjector());
    expect(pp._providers).toHaveLength(2);
    expect(pp._providers[0]!.priority).toBe(500);
    expect(pp._providers[1]!.priority).toBe(400);
    expect(typeof pp._providers[1]!.provider.getGroups).toBe('function');
  });

  it('mode=full → native filter updater returns groups unchanged', () => {
    const pp = makePropertiesPanel();
    const svc = new PropsPanelService(
      pp as unknown as { registerProvider(p: unknown, prio?: number): void },
      makeInjector(),
    );
    svc.setMode('full');
    const updater = pp._providers[1]!.provider.getGroups({ type: 'textfield' }) as (g: unknown[]) => unknown[];
    const input = makeGroups();
    expect(updater(input)).toEqual(input);
  });

  it('mode=simple, textfield → whitelist entries flattened into simple-merged; condition/customProperties hidden; columns passthrough', () => {
    const pp = makePropertiesPanel();
    const svc = new PropsPanelService(
      pp as unknown as { registerProvider(p: unknown, prio?: number): void },
      makeInjector(),
    );
    svc.setMode('simple');
    const updater = pp._providers[1]!.provider.getGroups({ type: 'textfield' }) as
      (g: unknown[]) => Array<{ id: string; entries?: Array<{ id: string }> }>;
    const out = updater(makeGroups());
    expect(out.find((g) => g.id === 'condition')).toBeUndefined();
    expect(out.find((g) => g.id === 'customProperties')).toBeUndefined();
    expect(out.find((g) => g.id === 'general')).toBeUndefined();
    expect(out.find((g) => g.id === 'validation')).toBeUndefined();
    const merged = out.find((g) => g.id === 'simple-merged')!;
    expect(merged.entries!.map((e) => e.id)).toEqual(['label', 'defaultValue', 'required']);
    const columns = out.find((g) => g.id === 'columns');
    expect(columns).toBeDefined();
  });

  it('mode=simple, ListGroup-style staticOptions preserved with component/items/add (FU-1 regression parity)', () => {
    const pp = makePropertiesPanel();
    const svc = new PropsPanelService(
      pp as unknown as { registerProvider(p: unknown, prio?: number): void },
      makeInjector(),
    );
    svc.setMode('simple');
    const updater = pp._providers[1]!.provider.getGroups({ type: 'select' }) as
      (g: unknown[]) => Array<{ id: string; entries?: unknown[]; items?: unknown[]; add?: unknown; component?: unknown }>;
    const ListGroup = function ListGroup() { /* component */ };
    const addFn = () => { /* add */ };
    const groupsIn = [
      { id: 'general', entries: [{ id: 'label' }] },
      { id: 'staticOptions', items: [{ id: 'a' }, { id: 'b' }], add: addFn, component: ListGroup },
    ];
    const out = updater(groupsIn);
    const so = out.find((g) => g.id === 'staticOptions');
    expect(so).toBeDefined();
    expect(so!.items).toHaveLength(2);
    expect(so!.add).toBe(addFn);
    expect(so!.component).toBe(ListGroup);
  });

  it('setMode(mode) is a setter — accepts simple/full without throwing', () => {
    const pp = makePropertiesPanel();
    const svc = new PropsPanelService(
      pp as unknown as { registerProvider(p: unknown, prio?: number): void },
      makeInjector(),
    );
    expect(() => svc.setMode('simple')).not.toThrow();
    expect(() => svc.setMode('full')).not.toThrow();
  });

  it('seeds currentMode from sessionStorage at construction (full)', () => {
    try {
      window.sessionStorage.setItem('designer.panelMode', 'full');
    } catch {
      /* noop */
    }
    const pp = makePropertiesPanel();
    new PropsPanelService(
      pp as unknown as { registerProvider(p: unknown, prio?: number): void },
      makeInjector(),
    );
    // With mode=full the native filter updater should not modify groups.
    const updater = pp._providers[1]!.provider.getGroups({ type: 'textfield' }) as
      (g: unknown[]) => unknown[];
    const input = makeGroups();
    expect(updater(input)).toEqual(input);
  });

  it('null propertiesPanel — constructor does not throw and skips registration', () => {
    expect(() => new PropsPanelService(null, makeInjector())).not.toThrow();
  });
});
