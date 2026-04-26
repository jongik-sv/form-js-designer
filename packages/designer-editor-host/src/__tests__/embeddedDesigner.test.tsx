import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@bpmn-io/form-js-editor', () => ({
  FormEditor: class {
    importSchema = vi.fn().mockResolvedValue(undefined);
    saveSchema = vi.fn().mockResolvedValue({ schema: { type: 'default', components: [] } });
    destroy = vi.fn();
    get = vi.fn();
  },
}));

import { mountEmbeddedEditorModal } from '../embeddedDesigner';

describe('mountEmbeddedEditorModal', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.body.style.overflow = '';
  });

  it('mount returns handle + appends wrapper to container', async () => {
    const handle = await mountEmbeddedEditorModal({
      container,
      initialSchema: { type: 'default', components: [] },
      onSave: () => {},
    });
    expect(handle.destroy).toBeTypeOf('function');
    expect(handle.getSchema).toBeTypeOf('function');
    expect(container.querySelector('.fjd-embedded-designer-root')).toBeTruthy();
    handle.destroy();
  });

  it('destroy removes wrapper, restores prototype.focus, restores body overflow', async () => {
    const native = HTMLElement.prototype.focus;
    const prevOverflow = document.body.style.overflow;
    const handle = await mountEmbeddedEditorModal({
      container,
      initialSchema: { type: 'default', components: [] },
      onSave: () => {},
    });
    expect(HTMLElement.prototype.focus).not.toBe(native);
    expect(document.body.style.overflow).toBe('hidden');
    handle.destroy();
    expect(container.querySelector('.fjd-embedded-designer-root')).toBeNull();
    expect(HTMLElement.prototype.focus).toBe(native);
    expect(document.body.style.overflow).toBe(prevOverflow);
  });

  it('getSchema returns initial schema before any edits', async () => {
    const initial = { type: 'default', components: [{ type: 'textfield', key: 'a' }] };
    const handle = await mountEmbeddedEditorModal({
      container,
      initialSchema: initial,
      onSave: () => {},
    });
    expect(handle.getSchema()).toEqual(initial);
    handle.destroy();
  });

  it('triggerClose path (Esc) — onSave called once with current schema, onClose fires once', async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    await mountEmbeddedEditorModal({
      container,
      initialSchema: { type: 'default', components: [] },
      onSave,
      onClose,
    });
    const wrapper = container.querySelector('.fjd-embedded-designer-root') as HTMLElement;
    wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('destroy path (external force-close) — onSave NOT called, onClose fires once', async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const handle = await mountEmbeddedEditorModal({
      container,
      initialSchema: { type: 'default', components: [] },
      onSave,
      onClose,
    });
    handle.destroy();
    await Promise.resolve();
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
