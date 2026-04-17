import type { JSX, ComponentType } from 'preact';

export type ReadonlyDeep<T> = {
  readonly [K in keyof T]: T[K] extends object ? ReadonlyDeep<T[K]> : T[K];
};

export interface FieldSchema {
  id: string;
  type: string;
  [key: string]: unknown;
}

export interface PureRenderProps<F extends FieldSchema = FieldSchema> {
  field: ReadonlyDeep<F>;
  value: unknown;
  domId: string;
  errors?: string[];
  disabled?: boolean;
  readonly?: boolean;
  onChange?: (update: { value: unknown }) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  // NO editing/selection/isPreview/isDesigner.
}

export interface PropsSchema {
  properties: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'enum' | 'spacing' | 'color' | 'expression' | 'i18n';
    label?: string;
    default?: unknown;
    enum?: readonly string[];
    min?: number;
    max?: number;
  }>;
}

export type RenderFn<F extends FieldSchema = FieldSchema> =
  (props: PureRenderProps<F>) => JSX.Element;

export interface ComponentDefinition<F extends FieldSchema = FieldSchema> {
  type: string;
  name: string;
  group: 'container' | 'data' | 'input' | 'presentation' | 'action';
  icon?: ComponentType;
  keyed?: boolean;
  pathed?: boolean;
  escapeGridRender?: boolean;
  propsSchema: PropsSchema;
  create: (options?: Record<string, unknown>) => Partial<F> & { type: string };
  render: RenderFn<F>;
}

export type FormJsFieldComponent = ComponentType<PureRenderProps & { [k: string]: unknown }> & {
  config: {
    type: string;
    keyed?: boolean;
    pathed?: boolean;
    escapeGridRender?: boolean;
    name: string;
    group: string;
    create: (options?: Record<string, unknown>) => Record<string, unknown>;
  };
};
