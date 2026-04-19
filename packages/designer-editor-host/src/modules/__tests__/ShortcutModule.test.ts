/**
 * ShortcutModule 단위 테스트 (TSK-11-01)
 * - Ctrl/Meta+A: 루트 children 전체 선택 (input/contenteditable 포커스 시 no-op)
 * - Escape: 선택 해제 (_selectedIds=[], selection.clear/set(null))
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ShortcutModule } from '../ShortcutModule';

function createMockEventBus() {
  const handlers: Record<string, Array<(...args: unknown[]) => void>> = {};
  return {
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      if (!handlers[event]) handlers[event] = [];
      handlers[event]!.push(cb);
    }),
    emit: (event: string, ...args: unknown[]) => {
      (handlers[event] ?? []).forEach((h) => h(...args));
    },
  };
}

function createMockSelection(currentField: { id?: string; _parent?: string } | null = null) {
  return {
    get: vi.fn().mockReturnValue(currentField),
    set: vi.fn(),
    clear: vi.fn(),
  };
}

function createMockRegistry(fieldMap: Record<string, unknown> = {}) {
  return {
    get: vi.fn((id: string) => fieldMap[id]),
  };
}

function createMockModeling() {
  return {
    removeFormField: vi.fn(),
  };
}

function createMockOutlinePanel(overrides: Record<string, unknown> = {}) {
  return {
    duplicateField: vi.fn(),
    deleteSelectedFields: vi.fn(),
    getSelectedIds: vi.fn().mockReturnValue([]),
    setSelectedIds: vi.fn(),
    clearSelection: vi.fn(),
    ...overrides,
  };
}

function createMockFormEditor(schema: unknown = { type: 'default', id: 'root', components: [] }) {
  return {
    getSchema: vi.fn().mockReturnValue(schema),
  };
}

function makeShortcutService(
  eventBus: ReturnType<typeof createMockEventBus>,
  selection: ReturnType<typeof createMockSelection>,
  registry: ReturnType<typeof createMockRegistry>,
  modeling: ReturnType<typeof createMockModeling>,
  outlinePanel: ReturnType<typeof createMockOutlinePanel>,
  formEditor?: ReturnType<typeof createMockFormEditor>,
) {
  const [, Constructor] = ShortcutModule.shortcutService as [string, new (...args: unknown[]) => unknown];
  return new Constructor(eventBus, selection, registry, modeling, outlinePanel, formEditor);
}

function fireKeydown(key: string, opts: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; target?: HTMLElement } = {}) {
  const target = opts.target ?? document.body;
  const event = new KeyboardEvent('keydown', {
    key,
    ctrlKey: opts.ctrlKey ?? false,
    metaKey: opts.metaKey ?? false,
    shiftKey: opts.shiftKey ?? false,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, 'target', { value: target, configurable: true });
  document.dispatchEvent(event);
  return event;
}

describe('ShortcutModule', () => {
  it('has __init__ array containing shortcutService', () => {
    expect(Array.isArray(ShortcutModule.__init__)).toBe(true);
    expect(ShortcutModule.__init__).toContain('shortcutService');
  });

  it('shortcutService is ["type", Constructor]', () => {
    const [typeStr, Constructor] = ShortcutModule.shortcutService as [string, unknown];
    expect(typeStr).toBe('type');
    expect(typeof Constructor).toBe('function');
  });

  describe('Ctrl+A / Meta+A — 전체 선택', () => {
    let eventBus: ReturnType<typeof createMockEventBus>;
    let selection: ReturnType<typeof createMockSelection>;
    let registry: ReturnType<typeof createMockRegistry>;
    let modeling: ReturnType<typeof createMockModeling>;
    let outlinePanel: ReturnType<typeof createMockOutlinePanel>;
    let formEditor: ReturnType<typeof createMockFormEditor>;

    beforeEach(() => {
      eventBus = createMockEventBus();
      selection = createMockSelection();
      registry = createMockRegistry();
      modeling = createMockModeling();
      outlinePanel = createMockOutlinePanel();
      formEditor = createMockFormEditor({
        type: 'default',
        id: 'root',
        components: [
          { id: 'field-a', type: 'textfield' },
          { id: 'field-b', type: 'button' },
        ],
      });
    });

    afterEach(() => {
      // diagram.destroy로 리스너 제거
      eventBus.emit('diagram.destroy');
    });

    it('Ctrl+A calls outlinePanel.setSelectedIds with root children ids', () => {
      makeShortcutService(eventBus, selection, registry, modeling, outlinePanel, formEditor);

      fireKeydown('a', { ctrlKey: true });

      expect(outlinePanel.setSelectedIds).toHaveBeenCalledWith(['field-a', 'field-b']);
    });

    it('Meta+A (Mac) calls outlinePanel.setSelectedIds with root children ids', () => {
      makeShortcutService(eventBus, selection, registry, modeling, outlinePanel, formEditor);

      fireKeydown('a', { metaKey: true });

      expect(outlinePanel.setSelectedIds).toHaveBeenCalledWith(['field-a', 'field-b']);
    });

    it('Ctrl+A is no-op when target is INPUT element', () => {
      makeShortcutService(eventBus, selection, registry, modeling, outlinePanel, formEditor);

      const input = document.createElement('input');
      document.body.appendChild(input);
      fireKeydown('a', { ctrlKey: true, target: input });
      document.body.removeChild(input);

      expect(outlinePanel.setSelectedIds).not.toHaveBeenCalled();
    });

    it('Ctrl+A is no-op when target is TEXTAREA element', () => {
      makeShortcutService(eventBus, selection, registry, modeling, outlinePanel, formEditor);

      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      fireKeydown('a', { ctrlKey: true, target: textarea });
      document.body.removeChild(textarea);

      expect(outlinePanel.setSelectedIds).not.toHaveBeenCalled();
    });

    it('Ctrl+A is no-op when target is contenteditable', () => {
      makeShortcutService(eventBus, selection, registry, modeling, outlinePanel, formEditor);

      const div = document.createElement('div');
      div.contentEditable = 'true';
      document.body.appendChild(div);
      fireKeydown('a', { ctrlKey: true, target: div });
      document.body.removeChild(div);

      expect(outlinePanel.setSelectedIds).not.toHaveBeenCalled();
    });

    it('Ctrl+A with empty schema components calls setSelectedIds with empty array', () => {
      const emptyEditor = createMockFormEditor({
        type: 'default',
        id: 'root',
        components: [],
      });
      makeShortcutService(eventBus, selection, registry, modeling, outlinePanel, emptyEditor);

      fireKeydown('a', { ctrlKey: true });

      expect(outlinePanel.setSelectedIds).toHaveBeenCalledWith([]);
    });
  });

  describe('Escape — 선택 해제', () => {
    let eventBus: ReturnType<typeof createMockEventBus>;
    let selection: ReturnType<typeof createMockSelection>;
    let registry: ReturnType<typeof createMockRegistry>;
    let modeling: ReturnType<typeof createMockModeling>;
    let outlinePanel: ReturnType<typeof createMockOutlinePanel>;
    let formEditor: ReturnType<typeof createMockFormEditor>;

    beforeEach(() => {
      eventBus = createMockEventBus();
      selection = createMockSelection({ id: 'field-a', _parent: 'root' });
      registry = createMockRegistry({ 'field-a': { id: 'field-a', _parent: 'root', components: [] } });
      modeling = createMockModeling();
      outlinePanel = createMockOutlinePanel({
        getSelectedIds: vi.fn().mockReturnValue(['field-a']),
      });
      formEditor = createMockFormEditor({
        type: 'default',
        id: 'root',
        components: [{ id: 'field-a', type: 'textfield' }],
      });
    });

    afterEach(() => {
      eventBus.emit('diagram.destroy');
    });

    it('Escape calls outlinePanel.clearSelection()', () => {
      makeShortcutService(eventBus, selection, registry, modeling, outlinePanel, formEditor);

      fireKeydown('Escape');

      expect(outlinePanel.clearSelection).toHaveBeenCalled();
    });

    it('Escape also calls selection.clear() or selection.set(null) on formJs selection', () => {
      makeShortcutService(eventBus, selection, registry, modeling, outlinePanel, formEditor);

      fireKeydown('Escape');

      const clearCalled = (selection as unknown as { clear?: ReturnType<typeof vi.fn> }).clear?.mock?.calls?.length > 0;
      const setNullCalled = selection.set.mock.calls.some((c) => c[0] === null);
      expect(clearCalled || setNullCalled).toBe(true);
    });

    it('Escape is no-op when target is INPUT', () => {
      makeShortcutService(eventBus, selection, registry, modeling, outlinePanel, formEditor);

      const input = document.createElement('input');
      document.body.appendChild(input);
      fireKeydown('Escape', { target: input });
      document.body.removeChild(input);

      expect(outlinePanel.clearSelection).not.toHaveBeenCalled();
    });
  });
});
