import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/preact';
import type { JSX } from 'preact';
import type { PureRenderProps, ComponentDefinition, FieldSchema } from '../types';

import { defineComponent } from '../defineComponent';

// ---------------------------------------------------------------------------
// Shared minimal def
// ---------------------------------------------------------------------------
interface CardField extends FieldSchema {
  id: string;
  type: string;
  label?: string;
}

const INJECTED_FORM_JS_PROPS: PureRenderProps<CardField> & Record<string, unknown> = {
  field: { id: 'f1', type: 'card', label: 'My Card' },
  value: null,
  domId: 'dom-f1',
  errors: [],
  onChange: vi.fn(),
  onBlur: vi.fn(),
  onFocus: vi.fn(),
  disabled: false,
  readonly: false,
  // form-js designer-only injection (must NOT reach render)
  fieldInstance: { some: 'instance' },
  indexes: { row: 0, col: 0 },
};

const PURE_KEYS: Array<keyof PureRenderProps> = [
  'field', 'value', 'domId', 'errors', 'onChange', 'onBlur', 'onFocus',
  'disabled', 'readonly',
];

function makeMinimalDef(
  renderSpy?: ReturnType<typeof vi.fn>,
): ComponentDefinition<CardField> {
  const renderFn = renderSpy ?? vi.fn((): JSX.Element => <div data-testid="x" />);
  return {
    type: 'card',
    name: 'Card',
    group: 'container',
    keyed: false,
    pathed: false,
    escapeGridRender: true,
    propsSchema: { properties: {} },
    create: (options = {}) => ({ type: 'card', ...options }),
    render: renderFn as unknown as ComponentDefinition<CardField>['render'],
  };
}

// Helper: render via the component function directly with all props
function renderComponent(
  Component: (props: Record<string, unknown>) => JSX.Element | null,
  props: Record<string, unknown>,
) {
  const Wrapper = (): JSX.Element => Component(props) ?? <div />;
  return render(<Wrapper />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('defineComponent', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ----- 1. Return shape -----
  it('returns an object that is a spread of def PLUS a .component field', () => {
    const def = makeMinimalDef();
    const result = defineComponent(def);

    // All original def keys are present
    expect(result.type).toBe(def.type);
    expect(result.name).toBe(def.name);
    expect(result.group).toBe(def.group);
    expect(result.keyed).toBe(def.keyed);
    expect(result.pathed).toBe(def.pathed);
    expect(result.escapeGridRender).toBe(def.escapeGridRender);
    expect(result.propsSchema).toBe(def.propsSchema);
    expect(result.create).toBe(def.create);
    expect(result.render).toBe(def.render);

    // Plus .component
    expect(result.component).toBeDefined();
    expect(typeof result.component).toBe('function');
  });

  // ----- 2. Static .config on component -----
  it('attaches a static .config with the expected keys and values', () => {
    const def = makeMinimalDef();
    const { component } = defineComponent(def);

    expect(component.config).toBeDefined();
    expect(component.config.type).toBe('card');
    expect(component.config.keyed).toBe(false);
    expect(component.config.pathed).toBe(false);
    expect(component.config.escapeGridRender).toBe(true);
    expect(component.config.name).toBe('Card');
    expect(component.config.group).toBe('container');
    expect(typeof component.config.create).toBe('function');
  });

  it('.config.create forwards to def.create', () => {
    const def = makeMinimalDef();
    const { component } = defineComponent(def);
    const result = component.config.create({ label: 'Custom' });
    expect(result).toMatchObject({ type: 'card', label: 'Custom' });
  });

  // ----- 3. Props sanitization — def.render receives only PureRenderProps subset -----
  it('invokes def.render with only PureRenderProps keys (fieldInstance and indexes stripped)', () => {
    const renderSpy = vi.fn((): JSX.Element => <div />);
    const def = makeMinimalDef(renderSpy);
    const { component } = defineComponent(def);

    // Suppress assertPureRender warnings
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    renderComponent(
      component as unknown as (props: Record<string, unknown>) => JSX.Element | null,
      INJECTED_FORM_JS_PROPS,
    );

    expect(renderSpy).toHaveBeenCalledTimes(1);

    const firstCall = renderSpy.mock.calls[0];
    expect(firstCall).toBeDefined();
    const receivedProps = (firstCall as unknown as [Record<string, unknown>])[0];

    // PureRenderProps keys MUST be present
    for (const key of PURE_KEYS) {
      expect(receivedProps).toHaveProperty(key);
    }

    // Designer-only keys must NOT appear
    expect(receivedProps).not.toHaveProperty('fieldInstance');
    expect(receivedProps).not.toHaveProperty('indexes');
  });

  it('does not expose designer-only keys editing, selection, isPreview if injected', () => {
    const renderSpy = vi.fn((): JSX.Element => <div />);
    const def = makeMinimalDef(renderSpy);
    const { component } = defineComponent(def);

    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const withDesignerKeys = {
      ...INJECTED_FORM_JS_PROPS,
      editing: true,
      selection: { id: 'f1' },
      isPreview: false,
    };

    renderComponent(
      component as unknown as (props: Record<string, unknown>) => JSX.Element | null,
      withDesignerKeys,
    );

    const firstCall = renderSpy.mock.calls[0];
    expect(firstCall).toBeDefined();
    const receivedProps = (firstCall as unknown as [Record<string, unknown>])[0];
    expect(receivedProps).not.toHaveProperty('editing');
    expect(receivedProps).not.toHaveProperty('selection');
    expect(receivedProps).not.toHaveProperty('isPreview');
  });

  // ----- 4. Render output snapshot -----
  it('renders the output of def.render for a trivial component returning <div data-testid="x"/>', () => {
    const def = makeMinimalDef();
    const { component } = defineComponent(def);

    vi.spyOn(console, 'warn').mockImplementation(() => {});

    renderComponent(
      component as unknown as (props: Record<string, unknown>) => JSX.Element | null,
      INJECTED_FORM_JS_PROPS,
    );

    const el = screen.getByTestId('x');
    expect(el).toBeDefined();
    expect(el.tagName.toLowerCase()).toBe('div');
  });

  it('render output is stable: two renders with identical props produce equivalent HTML', () => {
    const def: ComponentDefinition<CardField> = {
      ...makeMinimalDef(),
      render: ({ field, domId }): JSX.Element =>
        <div id={domId} data-fjs-id={(field as CardField).id} />,
    };
    const { component } = defineComponent(def);

    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const CompFn = component as unknown as (props: Record<string, unknown>) => JSX.Element | null;


    const { container: c1 } = renderComponent(CompFn, INJECTED_FORM_JS_PROPS);
    const { container: c2 } = renderComponent(CompFn, INJECTED_FORM_JS_PROPS);

    expect(c1.innerHTML).toBe(c2.innerHTML);
  });

  // ----- 5. assertPureRender integration -----
  it('calls console.warn via assertPureRender in non-production env when render accesses editing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // eslint-disable-next-line no-new-func
    const badRender = new Function('return function render() { var editing = true; return null; }')() as ComponentDefinition<CardField>['render'];

    const def: ComponentDefinition<CardField> = {
      ...makeMinimalDef(),
      render: badRender,
    };

    defineComponent(def);
    expect(warnSpy).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Runtime-compatibility regression: defineComponent must not reference
  // `process` directly in module scope. A vanilla browser evaluation (no
  // bundler replace of `process.env.NODE_ENV`) would otherwise throw
  // ReferenceError at import time.
  //
  // See `isProductionEnv()` in defineComponent.ts for the fix.
  // -------------------------------------------------------------------------
  it('does not throw when `process` is undefined (vanilla browser simulation)', () => {
    const globals = globalThis as unknown as { process?: unknown };
    const savedProcess = globals.process;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      delete globals.process;
      expect(() => defineComponent(makeMinimalDef())).not.toThrow();
    } finally {
      globals.process = savedProcess;
      warnSpy.mockRestore();
    }
  });
});
