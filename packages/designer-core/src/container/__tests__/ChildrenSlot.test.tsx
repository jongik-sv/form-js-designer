/**
 * ChildrenSlot props-forwarding regression test.
 *
 * Bug fixed: container components (Card/Tabs/Modal/TabPanel) used to render
 * `<ChildrenSlot field={field} />` without forwarding the parent FormField's
 * `onChange/onBlur/onFocus` props. As a result, child fields inside containers
 * received no onChange handler and threw `_onChange is not a function` when
 * the user interacted with a select/datetime/textfield. form-js-viewer's
 * native RowsRenderer spreads `...props` into each child FormField — our
 * ChildrenSlot must do the same.
 *
 * This test asserts that ChildrenSlot forwards parent props to the underlying
 * FormField so the chain is preserved.
 */
import { describe, it, expect, vi } from 'vitest';
import { h } from 'preact';
import { render } from '@testing-library/preact';
import { ChildrenSlot } from '../ChildrenSlot';

// Stub FormContext and FormRenderContext that ChildrenSlot/Rows depend on.
// We use the real form-js-viewer exports — but mock them via a vi.mock so the
// test asserts on the FormField props directly.
vi.mock('@bpmn-io/form-js-viewer', async () => {
  const { createContext, h: hh, Fragment } = await import('preact');

  const FormContext = createContext({
    getService: <T,>(_t: string, _strict?: boolean) => null as unknown as T,
  });
  const FormRenderContext = createContext({
    Children: (p: { class?: string; field: unknown; children?: unknown }) =>
      hh('div', { 'data-children-wrapper': '', class: p.class }, p.children),
    Empty: () => null,
    Row: (p: { row: { id: string }; children?: unknown }) =>
      hh('div', { 'data-row-id': p.row.id }, p.children),
  });

  // Spy FormField — capture props it receives.
  const formFieldSpy = vi.fn();
  const FormField = (props: Record<string, unknown>) => {
    formFieldSpy(props);
    const id = (props.field as { id: string }).id;
    return hh('div', { 'data-form-field-id': id });
  };

  return { FormContext, FormRenderContext, FormField, formFieldSpy, Fragment };
});

void h;

describe('ChildrenSlot — parent props forwarding', () => {
  it('spreads parent props (onChange/onBlur/onFocus) to child FormField', async () => {
    const formjs = await import('@bpmn-io/form-js-viewer');
    const FormContext = (formjs as unknown as { FormContext: ReturnType<typeof import('preact').createContext> }).FormContext;
    const FormRenderContext = (formjs as unknown as { FormRenderContext: ReturnType<typeof import('preact').createContext> }).FormRenderContext;
    const formFieldSpy = (formjs as unknown as { formFieldSpy: ReturnType<typeof vi.fn> }).formFieldSpy;
    formFieldSpy.mockReset();

    const onChange = vi.fn();
    const onBlur = vi.fn();
    const onFocus = vi.fn();

    const containerField = {
      id: 'card-1',
      components: [{ id: 'select-1' }],
    };

    const childField = { id: 'select-1', type: 'select' };

    const formLayouter = {
      getRows: (parentId: string) =>
        parentId === 'card-1' ? [{ id: 'row-1', components: ['select-1'] }] : [],
    };
    const formFieldRegistry = {
      get: (id: string) => (id === 'select-1' ? childField : undefined),
    };

    const App = () =>
      h(
        FormContext.Provider as unknown as (p: { value: unknown; children?: unknown }) => h.JSX.Element,
        {
          value: {
            getService: <T,>(t: string) =>
              (t === 'formLayouter' ? formLayouter : formFieldRegistry) as unknown as T,
          },
        },
        h(
          FormRenderContext.Provider as unknown as (p: { value: unknown; children?: unknown }) => h.JSX.Element,
          {
            value: {
              Children: (p: { class?: string; field: unknown; children?: unknown }) =>
                h('div', { 'data-children-wrapper': '', class: p.class }, p.children as never),
              Empty: () => null,
              Row: (p: { row: { id: string }; children?: unknown }) =>
                h('div', { 'data-row-id': p.row.id }, p.children as never),
            },
          },
          h(ChildrenSlot, {
            field: containerField as never,
            onChange,
            onBlur,
            onFocus,
            disabled: false,
            readonly: false,
          } as never),
        ),
      );

    render(h(App, {}));

    expect(formFieldSpy).toHaveBeenCalledOnce();
    const propsSeen = formFieldSpy.mock.calls[0]![0] as Record<string, unknown>;
    expect(propsSeen.field).toBe(childField);
    expect(propsSeen.onChange).toBe(onChange);
    expect(propsSeen.onBlur).toBe(onBlur);
    expect(propsSeen.onFocus).toBe(onFocus);
    expect(propsSeen.disabled).toBe(false);
    expect(propsSeen.readonly).toBe(false);
  });
});
