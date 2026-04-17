import { h } from 'preact';
import type { ComponentDefinition, FieldSchema, FormJsFieldComponent, PureRenderProps } from './types';
import { assertPureRender } from './assertPureRender';
import { isProductionEnv } from './envUtils';

/**
 * The exact set of keys that constitute PureRenderProps.
 * Any other key arriving from form-js host (fieldInstance, indexes, editing, etc.) is stripped.
 */
const PURE_RENDER_KEYS = new Set<string>([
  'field',
  'value',
  'domId',
  'errors',
  'disabled',
  'readonly',
  'onChange',
  'onBlur',
  'onFocus',
]);

/**
 * defineComponent wraps a ComponentDefinition into the shape form-js needs:
 *  - Returns { ...def, component } where component is a Preact ComponentType
 *    with a static .config.
 *  - The Preact component sanitizes incoming props to only forward PureRenderProps
 *    to def.render, stripping designer-only keys like fieldInstance, indexes,
 *    editing, selection, isPreview, isDesigner.
 *  - In non-production environments, calls assertPureRender(def.render) to emit
 *    warnings if the render function accesses forbidden designer patterns.
 */
export function defineComponent<F extends FieldSchema = FieldSchema>(
  def: ComponentDefinition<F>,
): typeof def & { component: FormJsFieldComponent } {
  // Dev-only purity check — never runs in production, safe in vanilla browsers
  if (!isProductionEnv()) {
    assertPureRender(def.render as unknown as (...args: unknown[]) => unknown);
  }

  // Build the Preact component that sanitizes props before forwarding to def.render
  function DesignerComponent(allProps: PureRenderProps<F> & Record<string, unknown>) {
    // Extract only PureRenderProps keys
    const pureProps = {} as Record<string, unknown>;
    for (const key of PURE_RENDER_KEYS) {
      if (key in allProps) {
        pureProps[key] = allProps[key];
      }
    }

    return def.render(pureProps as unknown as PureRenderProps<F>);
  }

  // Attach static .config so form-js can discover component metadata
  (DesignerComponent as unknown as FormJsFieldComponent).config = {
    type: def.type,
    keyed: def.keyed,
    pathed: def.pathed,
    escapeGridRender: def.escapeGridRender,
    name: def.name,
    group: def.group,
    create: def.create as (options?: Record<string, unknown>) => Record<string, unknown>,
  };

  const component = DesignerComponent as unknown as FormJsFieldComponent;

  return {
    ...def,
    component,
  };
}

// Ensure h is available for JSX transforms in case tsconfig uses explicit h
void h;
