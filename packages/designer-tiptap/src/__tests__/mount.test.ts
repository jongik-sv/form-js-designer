import { describe, it, expect, vi } from 'vitest';

const { importSchema, destroy, FormCtor } = vi.hoisted(() => {
  const importSchema = vi.fn(async () => {});
  const destroy = vi.fn();
  const FormCtor = vi.fn().mockImplementation(() => ({ importSchema, destroy }));
  return { importSchema, destroy, FormCtor };
});

vi.mock('@bpmn-io/form-js-viewer', () => ({ Form: FormCtor }));
vi.mock('@form-js-designer/designer-core', () => ({ DesignerContainerModule: { __id: 'container' } }));
vi.mock('@form-js-designer/designer-components', () => ({
  DesignerComponentsModule: { __id: 'components' },
  migrateLegacyTabsSchema: (s: unknown) => s,
}));
vi.mock('@form-js-designer/designer-runtime', () => ({
  LayoutHeightModule: { __id: 'layout-height' },
}));

import { mountFormJs } from '../mount/mountFormJs';

describe('mountFormJs', () => {
  it('constructs Form with designer modules and imports schema', async () => {
    const container = document.createElement('div');
    const schema = { type: 'default', components: [] };
    const handle = await mountFormJs({ container, schema });

    expect(FormCtor).toHaveBeenCalledTimes(1);
    const opts = FormCtor.mock.calls[0][0];
    expect(opts.container).toBe(container);
    expect(opts.additionalModules).toEqual([
      { __id: 'container' },
      { __id: 'components' },
      { __id: 'layout-height' },
    ]);
    expect(importSchema).toHaveBeenCalledWith(schema);
    expect(typeof handle.update).toBe('function');
    expect(typeof handle.destroy).toBe('function');
  });

  it('handle.update calls importSchema again', async () => {
    importSchema.mockClear();
    const handle = await mountFormJs({
      container: document.createElement('div'),
      schema: { type: 'default', components: [] },
    });
    await handle.update({ type: 'default', components: [{ type: 'textfield', key: 'x' }] });
    expect(importSchema).toHaveBeenCalledTimes(2);
  });

  it('handle.destroy calls form destroy', async () => {
    destroy.mockClear();
    const handle = await mountFormJs({
      container: document.createElement('div'),
      schema: { type: 'default', components: [] },
    });
    handle.destroy();
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
