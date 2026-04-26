import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mountSpy = vi.fn();
vi.mock('@form-js-designer/designer-editor-host/embedded', () => ({
  mountEmbeddedEditorModal: (...args: unknown[]) => {
    mountSpy(...args);
    return Promise.resolve({
      destroy: vi.fn(),
      getSchema: () => ({ type: 'default', components: [] }),
    });
  },
}));

vi.mock('@bpmn-io/form-js-viewer', () => ({
  Form: class {
    importSchema = vi.fn().mockResolvedValue(undefined);
    destroy = vi.fn();
  },
  FormLayouter: class {},
}));

import { FormJsBlock } from '../node';
import { withDesigner } from '../editor/withDesigner';
import { clearActiveModal, setActiveModal } from '../editor/modalPortal';

describe('withDesigner', () => {
  beforeEach(() => {
    mountSpy.mockClear();
    clearActiveModal();
  });

  afterEach(() => {
    clearActiveModal();
  });

  it('returns a node that retains FormJsBlock metadata (name preserved)', () => {
    const wrapped = withDesigner(FormJsBlock);
    expect(wrapped.name).toBe(FormJsBlock.name);
  });

  it('double-click on NodeView dom triggers mountEmbeddedEditorModal once', async () => {
    const wrapped = withDesigner(FormJsBlock);
    const { dom, fakeContext } = simulateNodeView(wrapped);
    dom.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
    expect(mountSpy).toHaveBeenCalledTimes(1);
    expect(mountSpy.mock.calls[0][0]).toMatchObject({
      initialSchema: fakeContext.node.attrs.schema,
    });
  });

  it('second double-click while modal is active does NOT remount', async () => {
    setActiveModal(
      { destroy: vi.fn(), getSchema: () => ({ type: 'default', components: [] }) },
      document.createElement('div'),
    );
    const wrapped = withDesigner(FormJsBlock);
    const { dom } = simulateNodeView(wrapped);
    dom.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await Promise.resolve();
    expect(mountSpy).not.toHaveBeenCalled();
  });

  it('onSave callback updates node attrs via editor.commands chain', async () => {
    const wrapped = withDesigner(FormJsBlock);
    const { dom, fakeContext } = simulateNodeView(wrapped);
    dom.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
    const onSave = mountSpy.mock.calls[0][0].onSave;
    const newSchema = { type: 'default', components: [{ type: 'textfield', key: 'a' }] };
    onSave(newSchema);
    expect(fakeContext.editor.chain().setNodeSelection).toHaveBeenCalledWith(0);
    expect(fakeContext.editor.chain().updateAttributes).toHaveBeenCalledWith(
      'formJsBlock',
      { schema: newSchema },
    );
    expect(fakeContext.editor.chain().run).toHaveBeenCalled();
  });

  it('getPos() returning null causes onSave to noop without throwing', async () => {
    const wrapped = withDesigner(FormJsBlock);
    const { dom, fakeContext } = simulateNodeView(wrapped, { getPosReturn: null });
    dom.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
    const onSave = mountSpy.mock.calls[0][0].onSave;
    expect(() => onSave({ type: 'default', components: [] })).not.toThrow();
    expect(fakeContext.editor.chain().run).not.toHaveBeenCalled();
  });

  it('NodeView destroy hook calls activeModal.destroy if present', async () => {
    const destroySpy = vi.fn();
    setActiveModal(
      { destroy: destroySpy, getSchema: () => ({ type: 'default', components: [] }) },
      document.createElement('div'),
    );
    const wrapped = withDesigner(FormJsBlock);
    const { destroyHook } = simulateNodeView(wrapped);
    destroyHook();
    expect(destroySpy).toHaveBeenCalledTimes(1);
  });
});

function simulateNodeView(
  nodeExtension: typeof FormJsBlock,
  opts: { getPosReturn?: number | null } = {},
) {
  const chainObj = {
    setNodeSelection: vi.fn().mockReturnThis(),
    updateAttributes: vi.fn().mockReturnThis(),
    run: vi.fn().mockReturnValue(true),
  };
  const fakeNode = {
    attrs: { schema: { type: 'default', components: [] }, formId: 'test' },
    type: { name: 'formJsBlock' },
  };
  const fakeContext = {
    node: fakeNode,
    getPos: () => (opts.getPosReturn === undefined ? 0 : opts.getPosReturn),
    editor: {
      chain: () => chainObj,
      // withDesigner reads the latest node from the live doc on dblclick
      // and on save — provide a minimal stub returning the same fakeNode.
      state: { doc: { nodeAt: () => fakeNode } },
    },
  } as any;

  const config = (nodeExtension as unknown as { config: { addNodeView?: () => unknown } }).config;
  const addNodeViewFn = config.addNodeView;
  if (!addNodeViewFn) throw new Error('addNodeView not configured on extended node');
  const factory = addNodeViewFn() as (ctx: typeof fakeContext) => {
    dom: HTMLElement;
    destroy?: () => void;
  };
  const view = factory(fakeContext);
  return {
    dom: view.dom,
    destroyHook: view.destroy ?? (() => {}),
    fakeContext,
  };
}
