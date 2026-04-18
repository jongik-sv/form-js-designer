import { h } from 'preact';
import type { ComponentType } from 'preact';
import type { ComponentDefinition, FieldSchema, FormJsFieldComponent, PureRenderProps } from './types';
import { assertPureRender } from './assertPureRender';
import { isProductionEnv } from './envUtils';
import { validatePropsSchema } from './panel/validatePropsSchema';

/**
 * Default palette icon — form-js Palette/FieldDragPreview call
 * `h(Icon, { class, width, height, viewBox })` and crash when Icon is
 * undefined. We always attach one so custom components get a visible,
 * draggable tile without requiring each component to ship an SVG.
 */
const DefaultPaletteIcon: ComponentType<{
  class?: string;
  width?: string | number;
  height?: string | number;
  viewBox?: string;
}> = (props) =>
  h(
    'svg',
    {
      class: props.class,
      width: props.width,
      height: props.height,
      viewBox: props.viewBox ?? '0 0 54 54',
      xmlns: 'http://www.w3.org/2000/svg',
    },
    h('rect', {
      x: 8,
      y: 8,
      width: 38,
      height: 38,
      rx: 4,
      ry: 4,
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 2,
    }),
  );

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

    // Dev-only propsSchema meta-schema validation (TSK-03-02)
    // Warns on invalid propsSchema shape — production 무영향 (assertPureRender 동형 패턴)
    const schemaResult = validatePropsSchema(def.propsSchema);
    if (!schemaResult.ok) {
      console.warn(
        `[defineComponent] "${def.type}" propsSchema is invalid:\n` +
        schemaResult.errors.join('\n'),
      );
    }
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

  // Attach static .config so form-js can discover component metadata.
  // `icon` must be a Preact ComponentType — form-js's FieldDragPreview
  // unconditionally renders it, so we fall back to DefaultPaletteIcon
  // when def.icon is omitted.
  (DesignerComponent as unknown as FormJsFieldComponent).config = {
    type: def.type,
    keyed: def.keyed,
    pathed: def.pathed,
    escapeGridRender: def.escapeGridRender,
    name: def.name,
    group: def.group,
    icon: def.icon ?? DefaultPaletteIcon,
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
