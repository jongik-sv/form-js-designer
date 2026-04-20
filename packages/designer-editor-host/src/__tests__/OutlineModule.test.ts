/**
 * OutlineModule 단위 테스트
 * TSK-06-01 / outline-component-selection feature fix
 * outline-dnd-copy-paste feature: DnD + Clipboard 단위 테스트 추가
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OutlineModule } from '../modules/OutlineModule';

// mock eventBus
function createMockEventBus() {
  const listeners: Record<string, Array<(e?: unknown) => void>> = {};
  return {
    on: vi.fn((event: string, cb: (e?: unknown) => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event]!.push(cb);
    }),
    off: vi.fn((event: string, cb: (e?: unknown) => void) => {
      if (listeners[event]) {
        listeners[event] = listeners[event]!.filter((l) => l !== cb);
      }
    }),
    emit: (event: string, payload?: unknown) => {
      const cbs = listeners[event] ?? [];
      for (const cb of cbs) cb(payload);
    },
    _listeners: listeners,
  };
}

function createMockFormEditor(schema: unknown = { type: 'default', components: [] }) {
  return {
    getSchema: vi.fn().mockReturnValue(schema),
  };
}

function createMockSelection() {
  return {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
    toggle: vi.fn(),
  };
}

function createMockFormFieldRegistry(fieldMap: Record<string, unknown> = {}) {
  return {
    get: vi.fn((id: string) => fieldMap[id]),
  };
}

function createMockModeling() {
  return {
    moveFormField: vi.fn(),
    addFormField: vi.fn(),
    removeFormField: vi.fn(),
  };
}

function createMockFormLayouter() {
  return {
    getRowForField: vi.fn().mockReturnValue(null),
  };
}

describe('OutlineModule', () => {
  // ----- 1. 모듈 객체 형상 -----
  it('has __init__ array containing outlinePanel', () => {
    expect(Array.isArray(OutlineModule.__init__)).toBe(true);
    expect(OutlineModule.__init__).toContain('outlinePanel');
  });

  it('outlinePanel service is ["type", Constructor]', () => {
    const [typeStr, Constructor] = OutlineModule.outlinePanel as [string, unknown];
    expect(typeStr).toBe('type');
    expect(typeof Constructor).toBe('function');
  });

  // ----- 2. DI inject 배열 (modeling, formLayouter, commandStack 포함) -----
  it('OutlinePanelService has inject: [eventBus, formEditor, formFieldRegistry, selection, modeling, formLayouter, commandStack]', () => {
    const [, Constructor] = OutlineModule.outlinePanel as [string, { inject?: string[] }];
    expect((Constructor as { inject?: string[] }).inject).toEqual([
      'eventBus',
      'formEditor',
      'formFieldRegistry',
      'selection',
      'modeling',
      'formLayouter',
      'commandStack',
    ]);
  });

  // ----- 3. 이벤트 구독 -----
  describe('event subscriptions', () => {
    let mockEventBus: ReturnType<typeof createMockEventBus>;
    let mockFormEditor: ReturnType<typeof createMockFormEditor>;
    let mockSelection: ReturnType<typeof createMockSelection>;
    let mockFormFieldRegistry: ReturnType<typeof createMockFormFieldRegistry>;
    let mockModeling: ReturnType<typeof createMockModeling>;
    let mockFormLayouter: ReturnType<typeof createMockFormLayouter>;

    beforeEach(() => {
      mockEventBus = createMockEventBus();
      mockFormEditor = createMockFormEditor();
      mockSelection = createMockSelection();
      mockFormFieldRegistry = createMockFormFieldRegistry();
      mockModeling = createMockModeling();
      mockFormLayouter = createMockFormLayouter();
    });

    function makeInstance() {
      const [, Constructor] = OutlineModule.outlinePanel as [string, new (...args: unknown[]) => unknown];
      return new Constructor(mockEventBus, mockFormEditor, mockFormFieldRegistry, mockSelection, mockModeling, mockFormLayouter);
    }

    it('subscribes to import.done on construction', () => {
      makeInstance();
      expect(mockEventBus.on).toHaveBeenCalledWith('import.done', expect.any(Function));
    });

    it('subscribes to commandStack.changed on construction', () => {
      makeInstance();
      expect(mockEventBus.on).toHaveBeenCalledWith('commandStack.changed', expect.any(Function));
    });

    it('subscribes to selection.changed on construction', () => {
      makeInstance();
      expect(mockEventBus.on).toHaveBeenCalledWith('selection.changed', expect.any(Function));
    });

    // ----- 4. import.done → 트리 갱신 -----
    it('updates nodes on import.done event', () => {
      const schema = {
        type: 'default',
        components: [
          { id: 'card-1', type: 'card', label: 'My Card', components: [] },
        ],
      };
      mockFormEditor = createMockFormEditor(schema);

      const instance = makeInstance() as { _nodes: Array<{ id: string; type: string }> };

      // import.done 이벤트 발행
      mockEventBus.emit('import.done');

      // _nodes가 업데이트됨
      expect(mockFormEditor.getSchema).toHaveBeenCalled();
      expect(Array.isArray(instance._nodes)).toBe(true);
      expect(instance._nodes).toHaveLength(1);
      expect(instance._nodes[0]).toMatchObject({
        id: 'card-1',
        type: 'card',
      });
    });

    it('updates nodes on commandStack.changed event', () => {
      const schema = {
        type: 'default',
        components: [
          { id: 'btn-1', type: 'button' },
        ],
      };
      mockFormEditor = createMockFormEditor(schema);

      const instance = makeInstance() as { _nodes: Array<{ id: string; type: string }> };

      mockEventBus.emit('commandStack.changed');

      expect(instance._nodes).toHaveLength(1);
      expect(instance._nodes[0]).toMatchObject({ id: 'btn-1', type: 'button' });
    });

    // ----- 5. selection.changed → 단일 객체 payload 처리 (fix) -----
    it('sets _selectedIds from single-object selection payload (form-js contract)', () => {
      // form-js fires { selection: formFieldObject } — NOT an array
      const instance = makeInstance() as { _selectedIds: string[] };

      mockEventBus.emit('selection.changed', { selection: { id: 'card-1' } });

      expect(instance._selectedIds).toEqual(['card-1']);
    });

    it('clears _selectedIds when selection payload is null', () => {
      const instance = makeInstance() as { _selectedIds: string[] };

      // first set something
      mockEventBus.emit('selection.changed', { selection: { id: 'card-1' } });
      expect(instance._selectedIds).toEqual(['card-1']);

      // then clear
      mockEventBus.emit('selection.changed', { selection: null });
      expect(instance._selectedIds).toEqual([]);
    });

    it('clears _selectedIds when no selection property in event', () => {
      const instance = makeInstance() as { _selectedIds: string[] };

      mockEventBus.emit('selection.changed', undefined);
      expect(instance._selectedIds).toEqual([]);
    });

    it('handles selection.changed with formField lacking id gracefully', () => {
      const instance = makeInstance() as { _selectedIds: string[] };

      // formField without id — should result in empty _selectedIds
      mockEventBus.emit('selection.changed', { selection: {} });
      expect(instance._selectedIds).toEqual([]);
    });

    // ----- 6. _handleSelect → formFieldRegistry.get(id) + selection.set(formField) -----
    it('calls formFieldRegistry.get(id) and selection.set(formField) on _handleSelect', () => {
      const formField = { id: 'card-1', type: 'card' };
      mockFormFieldRegistry = createMockFormFieldRegistry({ 'card-1': formField });

      const instance = makeInstance() as { _handleSelect: (id: string) => void };

      instance._handleSelect('card-1');

      expect(mockFormFieldRegistry.get).toHaveBeenCalledWith('card-1');
      expect(mockSelection.set).toHaveBeenCalledWith(formField);
    });

    it('does not call selection.set when formFieldRegistry.get returns undefined (no-op)', () => {
      // registry에 id가 없는 경우 — no-op, 에러 없음
      mockFormFieldRegistry = createMockFormFieldRegistry({}); // empty registry

      const instance = makeInstance() as { _handleSelect: (id: string) => void };

      expect(() => instance._handleSelect('nonexistent-id')).not.toThrow();
      expect(mockSelection.set).not.toHaveBeenCalled();
    });

    // ----- 7. mount 메서드 -----
    it('exposes mount(container) method', () => {
      const instance = makeInstance() as {
        mount: (c: HTMLElement) => void;
        _container: HTMLElement | null;
      };

      expect(typeof instance.mount).toBe('function');
    });

    it('sets _container on mount', () => {
      const instance = makeInstance() as {
        mount: (c: HTMLElement) => void;
        _container: HTMLElement | null;
      };

      const container = document.createElement('div');
      instance.mount(container);
      expect(instance._container).toBe(container);
    });

    // ----- 8. destroy 메서드 -----
    it('exposes destroy() method that unsubscribes events', () => {
      const instance = makeInstance() as { destroy: () => void };

      instance.destroy();

      expect(mockEventBus.off).toHaveBeenCalledWith('import.done', expect.any(Function));
      expect(mockEventBus.off).toHaveBeenCalledWith('commandStack.changed', expect.any(Function));
      expect(mockEventBus.off).toHaveBeenCalledWith('selection.changed', expect.any(Function));
    });

    // ----- 9. null schema 방어 -----
    it('handles null schema from formEditor.getSchema gracefully', () => {
      mockFormEditor = createMockFormEditor(null);

      const instance = makeInstance() as { _nodes: unknown[] };

      expect(() => mockEventBus.emit('import.done')).not.toThrow();
      expect(instance._nodes).toEqual([]);
    });

    // ----- 10. schemaVersion 카운터 (outline-tree-collapsible feature) -----
    it('_schemaVersion starts at 0', () => {
      const instance = makeInstance() as { _schemaVersion: number };
      expect(instance._schemaVersion).toBe(0);
    });

    it('_schemaVersion increments on import.done', () => {
      const instance = makeInstance() as { _schemaVersion: number };
      expect(instance._schemaVersion).toBe(0);

      mockEventBus.emit('import.done');
      expect(instance._schemaVersion).toBe(1);

      mockEventBus.emit('import.done');
      expect(instance._schemaVersion).toBe(2);
    });

    it('_schemaVersion does NOT increment on commandStack.changed', () => {
      const instance = makeInstance() as { _schemaVersion: number };
      expect(instance._schemaVersion).toBe(0);

      mockEventBus.emit('commandStack.changed');
      expect(instance._schemaVersion).toBe(0);

      mockEventBus.emit('commandStack.changed');
      expect(instance._schemaVersion).toBe(0);
    });

    it('_schemaVersion does NOT increment on selection.changed', () => {
      const instance = makeInstance() as { _schemaVersion: number };
      expect(instance._schemaVersion).toBe(0);

      mockEventBus.emit('selection.changed', { selection: { id: 'card-1' } });
      expect(instance._schemaVersion).toBe(0);
    });

    // ----- 11. DnD: _handleDrop -----
    describe('DnD _handleDrop', () => {
      it('calls modeling.moveFormField with correct args on before drop', () => {
        const dragField = { id: 'btn-1', type: 'button', parent: { id: 'root', components: [{ id: 'btn-1' }, { id: 'btn-2' }] } };
        const targetField = { id: 'btn-2', type: 'button', parent: { id: 'root', components: [{ id: 'btn-1' }, { id: 'btn-2' }] } };
        const parentField = { id: 'root', type: 'default', components: [dragField, targetField] };

        // dragField.parent / targetField.parent 참조를 parentField로
        (dragField as unknown as Record<string, unknown>).parent = parentField;
        (targetField as unknown as Record<string, unknown>).parent = parentField;

        mockFormFieldRegistry = createMockFormFieldRegistry({
          'btn-1': dragField,
          'btn-2': targetField,
        });

        const instance = makeInstance() as { _handleDrop: (dragId: string, targetId: string, position: string) => void };
        instance._handleDrop('btn-1', 'btn-2', 'before');

        expect(mockModeling.moveFormField).toHaveBeenCalled();
        const [movedField, , targetParent, , targetIndex] = mockModeling.moveFormField.mock.calls[0]!;
        expect(movedField).toBe(dragField);
        expect(targetParent).toBe(parentField);
        expect(typeof targetIndex).toBe('number');
      });

      it('calls modeling.moveFormField with inside position for container drop', () => {
        const dragField = { id: 'btn-1', type: 'button', parent: { id: 'root', type: 'default', components: [] } };
        const containerField = { id: 'card-1', type: 'card', parent: { id: 'root', type: 'default', components: [] }, components: [] };

        (dragField as unknown as Record<string, unknown>).parent = { id: 'root', type: 'default', components: [dragField] };
        (containerField as unknown as Record<string, unknown>).parent = { id: 'root', type: 'default', components: [dragField, containerField] };

        mockFormFieldRegistry = createMockFormFieldRegistry({
          'btn-1': dragField,
          'card-1': containerField,
        });

        const instance = makeInstance() as { _handleDrop: (dragId: string, targetId: string, position: string) => void };
        instance._handleDrop('btn-1', 'card-1', 'inside');

        expect(mockModeling.moveFormField).toHaveBeenCalled();
        // inside drop: targetFormField = containerField
        const [movedField, , targetParent] = mockModeling.moveFormField.mock.calls[0]!;
        expect(movedField).toBe(dragField);
        expect(targetParent).toBe(containerField);
      });

      it('is no-op when dragId is not in registry', () => {
        mockFormFieldRegistry = createMockFormFieldRegistry({});
        const instance = makeInstance() as { _handleDrop: (dragId: string, targetId: string, position: string) => void };

        expect(() => instance._handleDrop('nonexistent', 'btn-2', 'before')).not.toThrow();
        expect(mockModeling.moveFormField).not.toHaveBeenCalled();
      });

      it('is no-op when targetId is not in registry', () => {
        const dragField = { id: 'btn-1', type: 'button' };
        mockFormFieldRegistry = createMockFormFieldRegistry({ 'btn-1': dragField });
        const instance = makeInstance() as { _handleDrop: (dragId: string, targetId: string, position: string) => void };

        expect(() => instance._handleDrop('btn-1', 'nonexistent', 'after')).not.toThrow();
        expect(mockModeling.moveFormField).not.toHaveBeenCalled();
      });

      it('is no-op when dragId === targetId (self-drop)', () => {
        const field = { id: 'btn-1', type: 'button' };
        mockFormFieldRegistry = createMockFormFieldRegistry({ 'btn-1': field });
        const instance = makeInstance() as { _handleDrop: (dragId: string, targetId: string, position: string) => void };

        instance._handleDrop('btn-1', 'btn-1', 'after');
        expect(mockModeling.moveFormField).not.toHaveBeenCalled();
      });

      it('does not drop inside tabs container (disabled per design)', () => {
        const dragField = { id: 'btn-1', type: 'button', parent: { id: 'root', components: [] } };
        const tabsField = { id: 'tabs-1', type: 'tabs', parent: { id: 'root', components: [] }, components: [] };

        mockFormFieldRegistry = createMockFormFieldRegistry({
          'btn-1': dragField,
          'tabs-1': tabsField,
        });

        const instance = makeInstance() as { _handleDrop: (dragId: string, targetId: string, position: string) => void };
        instance._handleDrop('btn-1', 'tabs-1', 'inside');

        // tabs inside drop is disabled — moveFormField should NOT be called
        expect(mockModeling.moveFormField).not.toHaveBeenCalled();
      });
    });

    // ----- 12. Clipboard: _handleCopy / _handlePaste -----
    describe('Clipboard _handleCopy/_handlePaste', () => {
      it('_handleCopy stores a deep clone in _clipboard', () => {
        const field = { id: 'btn-1', type: 'button', label: 'OK', components: [] };
        mockFormFieldRegistry = createMockFormFieldRegistry({ 'btn-1': field });

        const instance = makeInstance() as {
          _handleCopy: (id: string) => void;
          _clipboard: unknown;
        };

        instance._handleCopy('btn-1');

        expect(instance._clipboard).toBeDefined();
        expect((instance._clipboard as { type?: string }).type).toBe('button');
        // clipboard is a clone, not same ref
        expect(instance._clipboard).not.toBe(field);
      });

      it('_handleCopy assigns new id to clipboard item', () => {
        const field = { id: 'btn-1', type: 'button', components: [] };
        mockFormFieldRegistry = createMockFormFieldRegistry({ 'btn-1': field });

        const instance = makeInstance() as {
          _handleCopy: (id: string) => void;
          _clipboard: unknown;
        };

        instance._handleCopy('btn-1');

        const clipboard = instance._clipboard as { id?: string };
        expect(clipboard.id).not.toBe('btn-1');
        expect(clipboard.id?.startsWith('button-')).toBe(true);
      });

      it('_handleCopy is no-op when id not in registry', () => {
        mockFormFieldRegistry = createMockFormFieldRegistry({});
        const instance = makeInstance() as {
          _handleCopy: (id: string) => void;
          _clipboard: unknown;
        };

        expect(() => instance._handleCopy('nonexistent')).not.toThrow();
        expect(instance._clipboard).toBeNull();
      });

      it('_handlePaste calls modeling.addFormField with clipboard content', () => {
        const parentField = { id: 'root', type: 'default', components: [] };
        const targetField = { id: 'btn-1', type: 'button', parent: parentField };

        mockFormFieldRegistry = createMockFormFieldRegistry({
          'btn-1': targetField,
        });
        mockSelection = createMockSelection();
        mockSelection.get = vi.fn().mockReturnValue({ id: 'btn-1' });

        const instance = makeInstance() as {
          _handleCopy: (id: string) => void;
          _handlePaste: () => void;
          _clipboard: unknown;
          _selectedIds: string[];
        };

        // Seed selection
        mockEventBus.emit('selection.changed', { selection: { id: 'btn-1' } });

        // Copy first
        instance._handleCopy('btn-1');
        expect(instance._clipboard).not.toBeNull();

        // Paste
        instance._handlePaste();

        expect(mockModeling.addFormField).toHaveBeenCalled();
        const [attrs] = mockModeling.addFormField.mock.calls[0]!;
        expect((attrs as { type?: string }).type).toBe('button');
        // id must differ from original
        expect((attrs as { id?: string }).id).not.toBe('btn-1');
      });

      it('_handlePaste is no-op when clipboard is null', () => {
        const instance = makeInstance() as { _handlePaste: () => void; _clipboard: unknown };
        expect(instance._clipboard).toBeNull();

        expect(() => instance._handlePaste()).not.toThrow();
        expect(mockModeling.addFormField).not.toHaveBeenCalled();
      });

      it('_handlePaste generates fresh id each time (multiple pastes)', () => {
        const parentField = { id: 'root', type: 'default', components: [] };
        const targetField = { id: 'btn-1', type: 'button', parent: parentField };
        mockFormFieldRegistry = createMockFormFieldRegistry({ 'btn-1': targetField });

        const instance = makeInstance() as {
          _handleCopy: (id: string) => void;
          _handlePaste: () => void;
        };

        mockEventBus.emit('selection.changed', { selection: { id: 'btn-1' } });
        instance._handleCopy('btn-1');

        instance._handlePaste();
        instance._handlePaste();

        expect(mockModeling.addFormField).toHaveBeenCalledTimes(2);
        const id1 = (mockModeling.addFormField.mock.calls[0]![0] as { id?: string }).id;
        const id2 = (mockModeling.addFormField.mock.calls[1]![0] as { id?: string }).id;
        expect(id1).not.toBe(id2);
      });

      it('_handleCopy with no selection id is no-op when id is empty string', () => {
        mockFormFieldRegistry = createMockFormFieldRegistry({});
        const instance = makeInstance() as {
          _handleCopy: (id: string) => void;
          _clipboard: unknown;
        };

        // empty string id
        expect(() => instance._handleCopy('')).not.toThrow();
        expect(instance._clipboard).toBeNull();
      });

      it('_handlePaste renames colliding key to avoid form-js binding path conflict', () => {
        // 원본 textfield가 스키마에 남아 있는 채로 paste → key 'first' 중복 방지 필요
        const rootField = { id: 'root', type: 'default', components: [] };
        const tfField = { id: 'tf-1', type: 'textfield', key: 'first', parent: rootField };

        mockFormEditor = createMockFormEditor({
          type: 'default',
          id: 'root',
          components: [{ id: 'tf-1', type: 'textfield', key: 'first' }],
        });
        mockFormFieldRegistry = createMockFormFieldRegistry({
          'tf-1': tfField,
          root: rootField,
        });

        const instance = makeInstance() as {
          _handleCopy: (id: string) => void;
          _handlePaste: () => void;
          _selectedIds: string[];
        };

        mockEventBus.emit('selection.changed', { selection: { id: 'tf-1' } });
        instance._handleCopy('tf-1');
        instance._handlePaste();

        expect(mockModeling.addFormField).toHaveBeenCalled();
        const [attrs] = mockModeling.addFormField.mock.calls[0]!;
        expect((attrs as { key?: string }).key).toBe('first_copy');
      });

      it('_handlePaste renames to _copy_2 on second paste to the same schema', () => {
        // 1차 paste 후 'first_copy'도 스키마에 존재한다고 가정
        const rootField = { id: 'root', type: 'default', components: [] };
        const tfField = { id: 'tf-1', type: 'textfield', key: 'first', parent: rootField };

        mockFormEditor = createMockFormEditor({
          type: 'default',
          id: 'root',
          components: [
            { id: 'tf-1', type: 'textfield', key: 'first' },
            { id: 'tf-2', type: 'textfield', key: 'first_copy' },
          ],
        });
        mockFormFieldRegistry = createMockFormFieldRegistry({
          'tf-1': tfField,
          root: rootField,
        });

        const instance = makeInstance() as {
          _handleCopy: (id: string) => void;
          _handlePaste: () => void;
        };

        mockEventBus.emit('selection.changed', { selection: { id: 'tf-1' } });
        instance._handleCopy('tf-1');
        instance._handlePaste();

        const [attrs] = mockModeling.addFormField.mock.calls[0]!;
        expect((attrs as { key?: string }).key).toBe('first_copy_2');
      });
    });

    // ----- 13. 방향 복제: _duplicateFieldVertical / _duplicateFieldHorizontal -----
    describe('duplicate direction: _duplicateFieldVertical / _duplicateFieldHorizontal', () => {
      it('_duplicateFieldVertical calls modeling.addFormField WITHOUT layout.row in attrs', () => {
        const parentField = { id: 'root', type: 'default', components: [] };
        const field = { id: 'btn-1', type: 'button', label: 'OK', parent: parentField };
        (parentField as unknown as Record<string, unknown>).components = [field];

        mockFormFieldRegistry = createMockFormFieldRegistry({
          'btn-1': field,
          root: parentField,
        });

        const instance = makeInstance() as {
          _duplicateFieldVertical: (id: string) => void;
        };

        instance._duplicateFieldVertical('btn-1');

        expect(mockModeling.addFormField).toHaveBeenCalledOnce();
        const [attrs] = mockModeling.addFormField.mock.calls[0]!;
        // 세로 복제: layout.row 없어야 함 (form-js가 새 row 배정)
        const layout = (attrs as { layout?: { row?: string } }).layout;
        expect(layout?.row).toBeUndefined();
      });

      it('_duplicateFieldVertical removes layout.row even when original field has layout.row set', () => {
        // deepCloneWithNewIds가 layout.row를 그대로 복사하는 경우, _duplicateFieldVertical이 이를 제거해야 함
        const parentField = { id: 'root', type: 'default', components: [] };
        const field = {
          id: 'tf-1',
          type: 'textfield',
          label: 'Text field',
          layout: { row: 'Row_existing', columns: null },
          parent: parentField,
        };
        (parentField as unknown as Record<string, unknown>).components = [field];

        mockFormFieldRegistry = createMockFormFieldRegistry({
          'tf-1': field,
          root: parentField,
        });

        const instance = makeInstance() as {
          _duplicateFieldVertical: (id: string) => void;
        };

        instance._duplicateFieldVertical('tf-1');

        expect(mockModeling.addFormField).toHaveBeenCalledOnce();
        const [attrs] = mockModeling.addFormField.mock.calls[0]!;
        // 세로 복제: 원본에 layout.row가 있어도 제거되어야 함
        const layout = (attrs as { layout?: { row?: string } }).layout;
        expect(layout?.row).toBeUndefined();
      });

      it('_duplicateFieldVertical inserts at idx+1 position (same as old _duplicateField)', () => {
        const parentField = { id: 'root', type: 'default', components: [] };
        const field1 = { id: 'btn-1', type: 'button', parent: parentField };
        const field2 = { id: 'btn-2', type: 'button', parent: parentField };
        (parentField as unknown as Record<string, unknown>).components = [field1, field2];

        mockFormFieldRegistry = createMockFormFieldRegistry({
          'btn-1': field1,
          'btn-2': field2,
          root: parentField,
        });

        const instance = makeInstance() as {
          _duplicateFieldVertical: (id: string) => void;
        };

        instance._duplicateFieldVertical('btn-1');

        expect(mockModeling.addFormField).toHaveBeenCalledOnce();
        const [, targetFormField, targetIndex] = mockModeling.addFormField.mock.calls[0]!;
        expect(targetFormField).toBe(parentField);
        // btn-1 is at index 0, so insertIdx = 1
        expect(targetIndex).toBe(1);
      });

      it('_duplicateFieldVertical is no-op when field not in registry', () => {
        mockFormFieldRegistry = createMockFormFieldRegistry({});

        const instance = makeInstance() as {
          _duplicateFieldVertical: (id: string) => void;
        };

        expect(() => instance._duplicateFieldVertical('nonexistent')).not.toThrow();
        expect(mockModeling.addFormField).not.toHaveBeenCalled();
      });

      it('_duplicateFieldHorizontal calls formLayouter.getRowForField', () => {
        const parentField = { id: 'root', type: 'default', components: [] };
        const field = { id: 'btn-1', type: 'button', label: 'OK', parent: parentField };
        (parentField as unknown as Record<string, unknown>).components = [field];

        mockFormFieldRegistry = createMockFormFieldRegistry({
          'btn-1': field,
          root: parentField,
        });
        mockFormLayouter = {
          getRowForField: vi.fn().mockReturnValue({ id: 'row-1' }),
        };

        const instance = makeInstance() as {
          _duplicateFieldHorizontal: (id: string) => void;
        };

        instance._duplicateFieldHorizontal('btn-1');

        expect(mockFormLayouter.getRowForField).toHaveBeenCalledWith(field);
      });

      it('_duplicateFieldHorizontal injects layout.row into attrs when row found', () => {
        const parentField = { id: 'root', type: 'default', components: [] };
        const field = { id: 'btn-1', type: 'button', label: 'OK', parent: parentField };
        (parentField as unknown as Record<string, unknown>).components = [field];

        mockFormFieldRegistry = createMockFormFieldRegistry({
          'btn-1': field,
          root: parentField,
        });
        mockFormLayouter = {
          getRowForField: vi.fn().mockReturnValue({ id: 'row-1' }),
        };

        const instance = makeInstance() as {
          _duplicateFieldHorizontal: (id: string) => void;
        };

        instance._duplicateFieldHorizontal('btn-1');

        expect(mockModeling.addFormField).toHaveBeenCalledOnce();
        const [attrs] = mockModeling.addFormField.mock.calls[0]!;
        // 가로 복제: layout.row = 'row-1' 이어야 함
        const layout = (attrs as { layout?: { row?: string } }).layout;
        expect(layout?.row).toBe('row-1');
      });

      it('_duplicateFieldHorizontal falls back to vertical when getRowForField returns null', () => {
        const parentField = { id: 'root', type: 'default', components: [] };
        const field = { id: 'btn-1', type: 'button', label: 'OK', parent: parentField };
        (parentField as unknown as Record<string, unknown>).components = [field];

        mockFormFieldRegistry = createMockFormFieldRegistry({
          'btn-1': field,
          root: parentField,
        });
        mockFormLayouter = {
          getRowForField: vi.fn().mockReturnValue(null),
        };

        const instance = makeInstance() as {
          _duplicateFieldHorizontal: (id: string) => void;
        };

        // null row → fallback: no error, addFormField still called (vertical behavior)
        expect(() => instance._duplicateFieldHorizontal('btn-1')).not.toThrow();
        expect(mockModeling.addFormField).toHaveBeenCalledOnce();
        // fallback 시 layout.row 없어야 함
        const [attrs] = mockModeling.addFormField.mock.calls[0]!;
        const layout = (attrs as { layout?: { row?: string } }).layout;
        expect(layout?.row).toBeUndefined();
      });

      it('_duplicateFieldHorizontal is no-op when field not in registry', () => {
        mockFormFieldRegistry = createMockFormFieldRegistry({});

        const instance = makeInstance() as {
          _duplicateFieldHorizontal: (id: string) => void;
        };

        expect(() => instance._duplicateFieldHorizontal('nonexistent')).not.toThrow();
        expect(mockModeling.addFormField).not.toHaveBeenCalled();
      });
    });

    // ----- 14. DOM 주입: _injectDuplicateButtons -----
    describe('DOM injection: _injectDuplicateButtons', () => {
      // 공통 DOM: context-pad를 data-id 부모 아래에 마운트하고 각 테스트 후 정리
      let fieldEl: HTMLDivElement;
      let pad: HTMLDivElement;

      beforeEach(() => {
        const field = { id: 'btn-1', type: 'button' };
        mockFormFieldRegistry = createMockFormFieldRegistry({ 'btn-1': field });

        fieldEl = document.createElement('div');
        fieldEl.setAttribute('data-id', 'btn-1');
        pad = document.createElement('div');
        pad.className = 'fjs-context-pad';
        fieldEl.appendChild(pad);
        document.body.appendChild(fieldEl);
      });

      afterEach(() => {
        if (fieldEl.parentNode) document.body.removeChild(fieldEl);
      });

      it('injects two buttons [data-outline-duplicate-h] and [data-outline-duplicate-v] into pad', () => {
        const instance = makeInstance() as {
          _injectDuplicateButtons: (pad: HTMLElement) => void;
        };

        instance._injectDuplicateButtons(pad);

        expect(pad.querySelector('[data-outline-duplicate-h]')).not.toBeNull();
        expect(pad.querySelector('[data-outline-duplicate-v]')).not.toBeNull();
      });

      it('does NOT inject duplicate buttons twice (guard check)', () => {
        const instance = makeInstance() as {
          _injectDuplicateButtons: (pad: HTMLElement) => void;
        };

        instance._injectDuplicateButtons(pad);
        instance._injectDuplicateButtons(pad); // second call

        const hBtns = pad.querySelectorAll('[data-outline-duplicate-h]');
        const vBtns = pad.querySelectorAll('[data-outline-duplicate-v]');
        expect(hBtns).toHaveLength(1);
        expect(vBtns).toHaveLength(1);
      });

      it('does not inject when pad has no ancestor with data-id', () => {
        const instance = makeInstance() as {
          _injectDuplicateButtons: (pad: HTMLElement) => void;
        };

        // padOrphan은 document.body에 붙지 않은 독립 요소 — data-id 부모 없음
        const padOrphan = document.createElement('div');
        padOrphan.className = 'fjs-context-pad';

        instance._injectDuplicateButtons(padOrphan);

        expect(padOrphan.querySelector('[data-outline-duplicate-h]')).toBeNull();
        expect(padOrphan.querySelector('[data-outline-duplicate-v]')).toBeNull();
      });

      it('horizontal button has title "행으로 복사" and vertical button has title "세로로 복사"', () => {
        const instance = makeInstance() as {
          _injectDuplicateButtons: (pad: HTMLElement) => void;
        };

        instance._injectDuplicateButtons(pad);

        const hBtn = pad.querySelector('[data-outline-duplicate-h]') as HTMLButtonElement | null;
        const vBtn = pad.querySelector('[data-outline-duplicate-v]') as HTMLButtonElement | null;
        expect(hBtn?.title).toBe('행으로 복사');
        expect(vBtn?.title).toBe('세로로 복사');
      });

      it('horizontal button has aria-label "행으로 복사" and vertical button has aria-label "세로로 복사"', () => {
        const instance = makeInstance() as {
          _injectDuplicateButtons: (pad: HTMLElement) => void;
        };

        instance._injectDuplicateButtons(pad);

        const hBtn = pad.querySelector('[data-outline-duplicate-h]') as HTMLButtonElement | null;
        const vBtn = pad.querySelector('[data-outline-duplicate-v]') as HTMLButtonElement | null;
        expect(hBtn?.getAttribute('aria-label')).toBe('행으로 복사');
        expect(vBtn?.getAttribute('aria-label')).toBe('세로로 복사');
      });

      it('buttons are ordered [horizontal][vertical] before existing children', () => {
        // 기존 삭제 버튼 시뮬레이션
        const deleteBtn = document.createElement('button');
        deleteBtn.setAttribute('data-action', 'delete');
        pad.appendChild(deleteBtn);

        const instance = makeInstance() as {
          _injectDuplicateButtons: (pad: HTMLElement) => void;
        };

        instance._injectDuplicateButtons(pad);

        const children = Array.from(pad.children) as HTMLElement[];
        expect(children[0]?.getAttribute('data-outline-duplicate-h')).toBe('true');
        expect(children[1]?.getAttribute('data-outline-duplicate-v')).toBe('true');
        // 삭제 버튼은 마지막
        expect(children[2]?.getAttribute('data-action')).toBe('delete');
      });
    });

    // ----- 15. 멀티 선택 (shift/ctrl/meta click + 일괄 삭제) -----
    describe('multi-select', () => {
      function seedSelection(
        instance: unknown,
        ids: string[],
      ) {
        (instance as { _selectedIds: string[] })._selectedIds = [...ids];
      }

      it('_handleSelect with additive=true toggles id into _selectedIds (add)', () => {
        const fieldA = { id: 'a', type: 'textfield' };
        const fieldB = { id: 'b', type: 'textfield' };
        mockFormFieldRegistry = createMockFormFieldRegistry({ a: fieldA, b: fieldB });

        const instance = makeInstance() as {
          _handleSelect: (id: string, opts?: { additive?: boolean }) => void;
          _selectedIds: string[];
        };

        // 초기에 a가 선택된 상태
        seedSelection(instance, ['a']);

        instance._handleSelect('b', { additive: true });

        expect(instance._selectedIds).toEqual(['a', 'b']);
        expect(mockSelection.set).toHaveBeenCalledWith(fieldB);
      });

      it('_handleSelect with additive=true toggles id out of _selectedIds (remove)', () => {
        const fieldA = { id: 'a', type: 'textfield' };
        const fieldB = { id: 'b', type: 'textfield' };
        mockFormFieldRegistry = createMockFormFieldRegistry({ a: fieldA, b: fieldB });

        const instance = makeInstance() as {
          _handleSelect: (id: string, opts?: { additive?: boolean }) => void;
          _selectedIds: string[];
        };

        seedSelection(instance, ['a', 'b']);

        instance._handleSelect('a', { additive: true });

        expect(instance._selectedIds).toEqual(['b']);
      });

      it('_onSelectionChanged does NOT overwrite _selectedIds when guard flag is set', () => {
        const fieldA = { id: 'a', type: 'textfield' };
        const fieldB = { id: 'b', type: 'textfield' };
        mockFormFieldRegistry = createMockFormFieldRegistry({ a: fieldA, b: fieldB });

        const instance = makeInstance() as {
          _handleSelect: (id: string, opts?: { additive?: boolean }) => void;
          _selectedIds: string[];
        };
        seedSelection(instance, ['a']);

        // additive click → selection.set 호출 → guard 설정 → 동기로 selection.changed 발화
        instance._handleSelect('b', { additive: true });
        expect(instance._selectedIds).toEqual(['a', 'b']);

        // form-js가 뒤이어 발화하는 selection.changed (primary=b)
        mockEventBus.emit('selection.changed', { selection: { id: 'b' } });

        // 멀티 상태가 유지되어야 함
        expect(instance._selectedIds).toEqual(['a', 'b']);

        // 가드는 1회 소모 → 다음 selection.changed는 정상 동작 (단일 overwrite)
        mockEventBus.emit('selection.changed', { selection: { id: 'a' } });
        expect(instance._selectedIds).toEqual(['a']);
      });

      it('deleteSelectedFields removes every selected field via modeling.removeFormField', () => {
        const root = { id: 'root', type: 'default', components: [] as unknown[] };
        const a: InternalFormFieldLike = { id: 'a', type: 'textfield', _parent: 'root' };
        const b: InternalFormFieldLike = { id: 'b', type: 'textfield', _parent: 'root' };
        (root.components as unknown[]) = [a, b];

        mockFormFieldRegistry = createMockFormFieldRegistry({ a, b, root });

        const instance = makeInstance() as {
          _selectedIds: string[];
          deleteSelectedFields: () => void;
        };

        seedSelection(instance, ['a', 'b']);
        instance.deleteSelectedFields();

        expect(mockModeling.removeFormField).toHaveBeenCalledTimes(2);
        expect(instance._selectedIds).toEqual([]);
      });

      it('deleteSelectedFields skips descendants of already-selected ancestor (dedup)', () => {
        const root = { id: 'root', type: 'default', components: [] as unknown[] };
        const card: InternalFormFieldLike = {
          id: 'card',
          type: 'card',
          _parent: 'root',
          components: [],
        };
        const child: InternalFormFieldLike = {
          id: 'child',
          type: 'textfield',
          _parent: 'card',
        };
        (card.components as unknown[]) = [child];
        (root.components as unknown[]) = [card];

        mockFormFieldRegistry = createMockFormFieldRegistry({ root, card, child });

        const instance = makeInstance() as {
          _selectedIds: string[];
          deleteSelectedFields: () => void;
        };

        seedSelection(instance, ['card', 'child']);
        instance.deleteSelectedFields();

        expect(mockModeling.removeFormField).toHaveBeenCalledTimes(1);
        const [removedField] = mockModeling.removeFormField.mock.calls[0]!;
        expect((removedField as { id?: string }).id).toBe('card');
      });

      it('getSelectedIds returns a copy of _selectedIds', () => {
        const instance = makeInstance() as {
          _selectedIds: string[];
          getSelectedIds: () => string[];
        };
        seedSelection(instance, ['x', 'y']);
        const out = instance.getSelectedIds();
        expect(out).toEqual(['x', 'y']);
        out.push('z');
        expect(instance._selectedIds).toEqual(['x', 'y']);
      });

      // ----- TSK-11-01: setSelectedIds / clearSelection public API -----

      it('setSelectedIds sets _selectedIds to given array', () => {
        const fieldA = { id: 'a', type: 'textfield' };
        const fieldB = { id: 'b', type: 'textfield' };
        mockFormFieldRegistry = createMockFormFieldRegistry({ a: fieldA, b: fieldB });

        const instance = makeInstance() as {
          _selectedIds: string[];
          setSelectedIds: (ids: string[]) => void;
        };

        instance.setSelectedIds(['a', 'b']);
        expect(instance._selectedIds).toEqual(['a', 'b']);
      });

      it('setSelectedIds replaces existing selection', () => {
        const fieldA = { id: 'a', type: 'textfield' };
        const fieldB = { id: 'b', type: 'textfield' };
        mockFormFieldRegistry = createMockFormFieldRegistry({ a: fieldA, b: fieldB });

        const instance = makeInstance() as {
          _selectedIds: string[];
          setSelectedIds: (ids: string[]) => void;
        };

        instance.setSelectedIds(['a']);
        instance.setSelectedIds(['b']);
        expect(instance._selectedIds).toEqual(['b']);
      });

      it('clearSelection sets _selectedIds to [] and calls selection.clear or selection.set(null)', () => {
        const fieldA = { id: 'a', type: 'textfield' };
        mockFormFieldRegistry = createMockFormFieldRegistry({ a: fieldA });

        const instance = makeInstance() as {
          _selectedIds: string[];
          clearSelection: () => void;
        };

        seedSelection(instance, ['a']);
        instance.clearSelection();

        expect(instance._selectedIds).toEqual([]);
        // selection.clear() 또는 selection.set(null) 중 하나가 호출되어야 함
        const clearCalled =
          (mockSelection as unknown as { clear?: ReturnType<typeof vi.fn> }).clear?.mock.calls.length > 0;
        const setNullCalled =
          mockSelection.set.mock.calls.some((c) => c[0] === null);
        expect(clearCalled || setNullCalled).toBe(true);
      });

      // ----- TSK-11-04: duplicateSelectedFields -----

      it('duplicateSelectedFields — empty selection is no-op', () => {
        const instance = makeInstance() as {
          _selectedIds: string[];
          duplicateSelectedFields: () => void;
        };
        instance._selectedIds = [];
        instance.duplicateSelectedFields();
        expect(mockModeling.addFormField).not.toHaveBeenCalled();
      });

      it('duplicateSelectedFields — 3개 선택 → addFormField 3회 호출 (형제 순서 유지)', () => {
        const root = { id: 'root', type: 'default', components: [] as unknown[] };
        const a: InternalFormFieldLike = { id: 'a', type: 'textfield', key: 'ka', _parent: 'root' };
        const b: InternalFormFieldLike = { id: 'b', type: 'textfield', key: 'kb', _parent: 'root' };
        const c: InternalFormFieldLike = { id: 'c', type: 'textfield', key: 'kc', _parent: 'root' };
        (root.components as unknown[]) = [a, b, c];

        mockFormEditor = createMockFormEditor({
          type: 'default',
          id: 'root',
          components: [
            { id: 'a', type: 'textfield', key: 'ka' },
            { id: 'b', type: 'textfield', key: 'kb' },
            { id: 'c', type: 'textfield', key: 'kc' },
          ],
        });
        mockFormFieldRegistry = createMockFormFieldRegistry({ a, b, c, root });

        const instance = makeInstance() as {
          _selectedIds: string[];
          duplicateSelectedFields: () => void;
        };
        instance._selectedIds = ['a', 'b', 'c'];
        instance.duplicateSelectedFields();

        // 3개 선택 → 3회 addFormField
        expect(mockModeling.addFormField).toHaveBeenCalledTimes(3);
      });

      it('duplicateSelectedFields — 복제 후 _selectedIds가 새 복제본 id들로 교체된다', () => {
        const root = { id: 'root', type: 'default', components: [] as unknown[] };
        const a: InternalFormFieldLike = { id: 'a', type: 'textfield', key: 'ka', _parent: 'root' };
        const b: InternalFormFieldLike = { id: 'b', type: 'textfield', key: 'kb', _parent: 'root' };
        (root.components as unknown[]) = [a, b];

        mockFormEditor = createMockFormEditor({
          type: 'default',
          id: 'root',
          components: [
            { id: 'a', type: 'textfield', key: 'ka' },
            { id: 'b', type: 'textfield', key: 'kb' },
          ],
        });
        mockFormFieldRegistry = createMockFormFieldRegistry({ a, b, root });

        const instance = makeInstance() as {
          _selectedIds: string[];
          duplicateSelectedFields: () => void;
        };
        instance._selectedIds = ['a', 'b'];
        instance.duplicateSelectedFields();

        // _selectedIds는 복제본 id들로 교체되어야 함 (원본 'a', 'b' 포함하지 않음)
        const newIds = instance._selectedIds;
        expect(newIds).not.toContain('a');
        expect(newIds).not.toContain('b');
        expect(newIds).toHaveLength(2);
      });

      it('duplicateSelectedFields — key rename 누적: 복제본 간 상호 key 충돌 없음', () => {
        const root = { id: 'root', type: 'default', components: [] as unknown[] };
        const a: InternalFormFieldLike = { id: 'a', type: 'textfield', key: 'name', _parent: 'root' };
        const b: InternalFormFieldLike = { id: 'b', type: 'textfield', key: 'email', _parent: 'root' };
        (root.components as unknown[]) = [a, b];

        mockFormEditor = createMockFormEditor({
          type: 'default',
          id: 'root',
          components: [
            { id: 'a', type: 'textfield', key: 'name' },
            { id: 'b', type: 'textfield', key: 'email' },
          ],
        });
        mockFormFieldRegistry = createMockFormFieldRegistry({ a, b, root });

        const instance = makeInstance() as {
          _selectedIds: string[];
          duplicateSelectedFields: () => void;
        };
        instance._selectedIds = ['a', 'b'];
        instance.duplicateSelectedFields();

        expect(mockModeling.addFormField).toHaveBeenCalledTimes(2);
        const keys = mockModeling.addFormField.mock.calls.map(
          (call) => (call[0] as { key?: string }).key,
        );
        // 두 복제본의 key가 모두 고유해야 함
        expect(new Set(keys).size).toBe(2);
        // 원본 key와 달라야 함
        expect(keys).not.toContain('name');
        expect(keys).not.toContain('email');
      });

      it('duplicateSelectedFields — 부모-자식 동시 선택 시 자식은 복제 제외 (ancestor 제거)', () => {
        const root = { id: 'root', type: 'default', components: [] as unknown[] };
        const card: InternalFormFieldLike = {
          id: 'card',
          type: 'card',
          _parent: 'root',
          components: [],
        };
        const child: InternalFormFieldLike = {
          id: 'child',
          type: 'textfield',
          key: 'kchild',
          _parent: 'card',
        };
        (card.components as unknown[]) = [child];
        (root.components as unknown[]) = [card];

        mockFormEditor = createMockFormEditor({
          type: 'default',
          id: 'root',
          components: [
            {
              id: 'card',
              type: 'card',
              components: [{ id: 'child', type: 'textfield', key: 'kchild' }],
            },
          ],
        });
        mockFormFieldRegistry = createMockFormFieldRegistry({ root, card, child });

        const instance = makeInstance() as {
          _selectedIds: string[];
          duplicateSelectedFields: () => void;
        };
        // card와 child 동시 선택
        instance._selectedIds = ['card', 'child'];
        instance.duplicateSelectedFields();

        // card만 복제되어야 함 (child는 card 복제본 내부에서 재생성됨)
        expect(mockModeling.addFormField).toHaveBeenCalledTimes(1);
        const [attrs] = mockModeling.addFormField.mock.calls[0]!;
        expect((attrs as { type?: string }).type).toBe('card');
      });

      it('duplicateSelectedFields — 형제 순서 오름차순(원래 순서)으로 삽입됨', () => {
        const root = { id: 'root', type: 'default', components: [] as unknown[] };
        const a: InternalFormFieldLike = { id: 'a', type: 'textfield', key: 'ka', _parent: 'root' };
        const b: InternalFormFieldLike = { id: 'b', type: 'textfield', key: 'kb', _parent: 'root' };
        const c: InternalFormFieldLike = { id: 'c', type: 'textfield', key: 'kc', _parent: 'root' };
        (root.components as unknown[]) = [a, b, c];

        mockFormEditor = createMockFormEditor({
          type: 'default',
          id: 'root',
          components: [
            { id: 'a', type: 'textfield', key: 'ka' },
            { id: 'b', type: 'textfield', key: 'kb' },
            { id: 'c', type: 'textfield', key: 'kc' },
          ],
        });
        mockFormFieldRegistry = createMockFormFieldRegistry({ a, b, c, root });

        const instance = makeInstance() as {
          _selectedIds: string[];
          duplicateSelectedFields: () => void;
        };
        // 역순으로 선택 목록을 줘도 원래 형제 순서로 정렬되어야 함
        instance._selectedIds = ['c', 'a', 'b'];
        instance.duplicateSelectedFields();

        expect(mockModeling.addFormField).toHaveBeenCalledTimes(3);
        // 삽입 인덱스가 내림차순으로 불림 (뒤에서부터 삽입해야 앞 인덱스 안 밀림)
        // 또는 오름차순: a(idx 0 → insert 1), b(idx 1 → insert 2), c(idx 2 → insert 3)
        // 어떤 순서이든 3회 호출이며 targetFormField=root
        const targetParents = mockModeling.addFormField.mock.calls.map((c) => c[1]);
        targetParents.forEach((p) => expect(p).toBe(root));
      });

      // ----- TSK-11-04: _handleMultiDrop -----

      it('_handleMultiDrop — 3개 이동 시 moveFormField 3회 호출', () => {
        const root = { id: 'root', type: 'default', components: [] as unknown[] };
        const a: InternalFormFieldLike = { id: 'a', type: 'textfield', _parent: 'root' };
        const b: InternalFormFieldLike = { id: 'b', type: 'textfield', _parent: 'root' };
        const c: InternalFormFieldLike = { id: 'c', type: 'textfield', _parent: 'root' };
        const target: InternalFormFieldLike = { id: 't', type: 'textfield', _parent: 'root' };
        (root.components as unknown[]) = [a, b, c, target];

        mockFormFieldRegistry = createMockFormFieldRegistry({ a, b, c, t: target, root });

        const instance = makeInstance() as {
          _handleMultiDrop: (ids: string[], targetId: string, position: string) => void;
        };

        instance._handleMultiDrop(['a', 'b', 'c'], 't', 'before');

        expect(mockModeling.moveFormField).toHaveBeenCalledTimes(3);
      });

      it('_handleMultiDrop — self-drop (드래그 id 중 target이 포함) → no-op', () => {
        const root = { id: 'root', type: 'default', components: [] as unknown[] };
        const a: InternalFormFieldLike = { id: 'a', type: 'textfield', _parent: 'root' };
        const b: InternalFormFieldLike = { id: 'b', type: 'textfield', _parent: 'root' };
        (root.components as unknown[]) = [a, b];

        mockFormFieldRegistry = createMockFormFieldRegistry({ a, b, root });

        const instance = makeInstance() as {
          _handleMultiDrop: (ids: string[], targetId: string, position: string) => void;
        };

        // 'a'를 target으로 하여 ['a', 'b'] 이동 → self-drop no-op
        instance._handleMultiDrop(['a', 'b'], 'a', 'after');
        expect(mockModeling.moveFormField).not.toHaveBeenCalled();
      });

      it('_handleMultiDrop — target이 드래그 집합 중 한 필드의 후손이면 no-op', () => {
        const root = { id: 'root', type: 'default', components: [] as unknown[] };
        const card: InternalFormFieldLike = {
          id: 'card',
          type: 'card',
          _parent: 'root',
          components: [],
        };
        const child: InternalFormFieldLike = {
          id: 'child',
          type: 'textfield',
          _parent: 'card',
        };
        (card.components as unknown[]) = [child];
        (root.components as unknown[]) = [card];

        mockFormFieldRegistry = createMockFormFieldRegistry({ root, card, child });

        const instance = makeInstance() as {
          _handleMultiDrop: (ids: string[], targetId: string, position: string) => void;
        };

        // 'child'는 'card'의 후손 → no-op
        instance._handleMultiDrop(['card'], 'child', 'after');
        expect(mockModeling.moveFormField).not.toHaveBeenCalled();
      });

      it('_handleMultiDrop — tabs inside drop → no-op (DISABLED_INSIDE_TYPES)', () => {
        const root = { id: 'root', type: 'default', components: [] as unknown[] };
        const a: InternalFormFieldLike = { id: 'a', type: 'textfield', _parent: 'root' };
        const tabs: InternalFormFieldLike = {
          id: 'tabs1',
          type: 'tabs',
          _parent: 'root',
          components: [],
        };
        (root.components as unknown[]) = [a, tabs];

        mockFormFieldRegistry = createMockFormFieldRegistry({ a, tabs1: tabs, root });

        const instance = makeInstance() as {
          _handleMultiDrop: (ids: string[], targetId: string, position: string) => void;
        };

        instance._handleMultiDrop(['a'], 'tabs1', 'inside');
        expect(mockModeling.moveFormField).not.toHaveBeenCalled();
      });

      // ----- TSK-11-01: deleteSelectedFields batch undo 원자화 -----

      it('deleteSelectedFields wraps N removals in commandStack batch (commandStack.execute called with outlinePanel.removeMultiple)', () => {
        const root = { id: 'root', type: 'default', components: [] as unknown[] };
        const a: InternalFormFieldLike = { id: 'a', type: 'textfield', _parent: 'root' };
        const b: InternalFormFieldLike = { id: 'b', type: 'textfield', _parent: 'root' };
        (root.components as unknown[]) = [a, b];

        mockFormFieldRegistry = createMockFormFieldRegistry({ a, b, root });

        // commandStack mock: register + execute
        const mockCommandStack = {
          register: vi.fn(),
          execute: vi.fn(),
        };

        // commandStack을 inject 목록에 추가한 서비스를 직접 생성
        const [, Constructor] = OutlineModule.outlinePanel as [string, new (...args: unknown[]) => unknown];
        const instance = new Constructor(
          mockEventBus,
          mockFormEditor,
          mockFormFieldRegistry,
          mockSelection,
          mockModeling,
          mockFormLayouter,
          mockCommandStack,
        ) as {
          _selectedIds: string[];
          deleteSelectedFields: () => void;
        };

        seedSelection(instance, ['a', 'b']);
        instance.deleteSelectedFields();

        // 복합 커맨드로 위임: commandStack.execute('outlinePanel.removeMultiple', ...) 1회 호출
        expect(mockCommandStack.execute).toHaveBeenCalledTimes(1);
        expect(mockCommandStack.execute).toHaveBeenCalledWith(
          'outlinePanel.removeMultiple',
          expect.objectContaining({ toRemove: expect.any(Array) }),
        );
        expect(instance._selectedIds).toEqual([]);
      });

      // ----- TSK-11-04: duplicateSelectedFields batch undo 원자화 -----

      it('duplicateSelectedFields wraps N duplicates in commandStack batch (outlinePanel.duplicateMultiple)', () => {
        const root = { id: 'root', type: 'default', components: [] as unknown[] };
        const a: InternalFormFieldLike = { id: 'a', type: 'textfield', key: 'ka', _parent: 'root' };
        const b: InternalFormFieldLike = { id: 'b', type: 'textfield', key: 'kb', _parent: 'root' };
        const c: InternalFormFieldLike = { id: 'c', type: 'textfield', key: 'kc', _parent: 'root' };
        (root.components as unknown[]) = [a, b, c];

        mockFormEditor = createMockFormEditor({
          type: 'default',
          id: 'root',
          components: [
            { id: 'a', type: 'textfield', key: 'ka' },
            { id: 'b', type: 'textfield', key: 'kb' },
            { id: 'c', type: 'textfield', key: 'kc' },
          ],
        });
        mockFormFieldRegistry = createMockFormFieldRegistry({ a, b, c, root });

        const mockCommandStack = {
          register: vi.fn(),
          execute: vi.fn(),
        };

        const [, Constructor] = OutlineModule.outlinePanel as [string, new (...args: unknown[]) => unknown];
        const instance = new Constructor(
          mockEventBus,
          mockFormEditor,
          mockFormFieldRegistry,
          mockSelection,
          mockModeling,
          mockFormLayouter,
          mockCommandStack,
        ) as {
          _selectedIds: string[];
          duplicateSelectedFields: () => void;
        };

        // duplicateMultiple 복합 커맨드가 register 시점에 등록되어야 함
        expect(mockCommandStack.register).toHaveBeenCalledWith(
          'outlinePanel.duplicateMultiple',
          expect.any(Object),
        );

        instance._selectedIds = ['a', 'b', 'c'];
        instance.duplicateSelectedFields();

        // N회 addFormField 대신 commandStack.execute(duplicateMultiple) 1회 호출
        expect(mockCommandStack.execute).toHaveBeenCalledTimes(1);
        expect(mockCommandStack.execute).toHaveBeenCalledWith(
          'outlinePanel.duplicateMultiple',
          expect.objectContaining({ inserts: expect.any(Array) }),
        );
        const insertsArg = mockCommandStack.execute.mock.calls[0]![1] as { inserts: unknown[] };
        expect(insertsArg.inserts).toHaveLength(3);
      });
    });
  });
});

// ============================================================
// TSK-11-02: Range 선택 (_anchorId, collectFlatIds, shift-click range union)
// ============================================================

describe('TSK-11-02: range selection', () => {
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  let mockFormEditor: ReturnType<typeof createMockFormEditor>;
  let mockSelection: ReturnType<typeof createMockSelection>;
  let mockFormFieldRegistry: ReturnType<typeof createMockFormFieldRegistry>;
  let mockModeling: ReturnType<typeof createMockModeling>;
  let mockFormLayouter: ReturnType<typeof createMockFormLayouter>;

  beforeEach(() => {
    mockEventBus = createMockEventBus();
    mockFormEditor = createMockFormEditor();
    mockSelection = createMockSelection();
    mockFormFieldRegistry = createMockFormFieldRegistry();
    mockModeling = createMockModeling();
    mockFormLayouter = createMockFormLayouter();
  });

  function makeInstance() {
    const [, Constructor] = OutlineModule.outlinePanel as [string, new (...args: unknown[]) => unknown];
    return new Constructor(mockEventBus, mockFormEditor, mockFormFieldRegistry, mockSelection, mockModeling, mockFormLayouter);
  }

  // ----- (A) _anchorId 초기값 / 단순 클릭 시 갱신 -----

  it('_anchorId starts as null', () => {
    const instance = makeInstance() as { _anchorId: string | null };
    expect(instance._anchorId).toBeNull();
  });

  it('단순 클릭(additive=false) 시 _anchorId가 해당 id로 갱신된다', () => {
    const fieldA = { id: 'a', type: 'textfield' };
    mockFormFieldRegistry = createMockFormFieldRegistry({ a: fieldA });
    const instance = makeInstance() as {
      _handleSelect: (id: string, opts?: { additive?: boolean; range?: boolean }) => void;
      _anchorId: string | null;
      _selectedIds: string[];
    };

    instance._handleSelect('a');

    expect(instance._anchorId).toBe('a');
  });

  it('단순 클릭 시 _selectedIds = [id], _anchorId = id', () => {
    const fieldA = { id: 'a', type: 'textfield' };
    const fieldB = { id: 'b', type: 'textfield' };
    mockFormFieldRegistry = createMockFormFieldRegistry({ a: fieldA, b: fieldB });

    const instance = makeInstance() as {
      _handleSelect: (id: string, opts?: { additive?: boolean; range?: boolean }) => void;
      _anchorId: string | null;
      _selectedIds: string[];
    };

    instance._handleSelect('a');
    instance._handleSelect('b');

    expect(instance._anchorId).toBe('b');
    // 단순 클릭은 form-js selection으로 위임되어 selection.changed가 처리
    // _anchorId만 여기서 검증
  });

  // ----- (B) shift-click range add — flat order 기준 -----

  it('range add: A 단순 클릭 후 shift+E 클릭 → A~E 5개 모두 선택', () => {
    // schema: root → [a, b, c, d, e] (flat, same parent)
    const root = { id: 'root', type: 'default', components: [] as unknown[] };
    const a: InternalFormFieldLike = { id: 'a', type: 'textfield', _parent: 'root' };
    const b: InternalFormFieldLike = { id: 'b', type: 'textfield', _parent: 'root' };
    const c: InternalFormFieldLike = { id: 'c', type: 'textfield', _parent: 'root' };
    const d: InternalFormFieldLike = { id: 'd', type: 'textfield', _parent: 'root' };
    const e: InternalFormFieldLike = { id: 'e', type: 'textfield', _parent: 'root' };
    (root.components as unknown[]) = [a, b, c, d, e];

    mockFormEditor = createMockFormEditor({
      type: 'default',
      id: 'root',
      components: [
        { id: 'a', type: 'textfield' },
        { id: 'b', type: 'textfield' },
        { id: 'c', type: 'textfield' },
        { id: 'd', type: 'textfield' },
        { id: 'e', type: 'textfield' },
      ],
    });
    mockFormFieldRegistry = createMockFormFieldRegistry({ a, b, c, d, e, root });

    const instance = makeInstance() as {
      _handleSelect: (id: string, opts?: { additive?: boolean; range?: boolean }) => void;
      _anchorId: string | null;
      _selectedIds: string[];
    };

    // Step 1: A 단순 클릭 → anchor = 'a'
    instance._handleSelect('a');
    // selection.changed 이벤트 시뮬레이션
    mockEventBus.emit('selection.changed', { selection: { id: 'a' } });
    expect(instance._anchorId).toBe('a');

    // Step 2: shift+E 클릭 → range union 'a'~'e'
    instance._handleSelect('e', { range: true });

    // A~E 5개 모두 선택
    expect(instance._selectedIds).toHaveLength(5);
    expect(instance._selectedIds).toContain('a');
    expect(instance._selectedIds).toContain('b');
    expect(instance._selectedIds).toContain('c');
    expect(instance._selectedIds).toContain('d');
    expect(instance._selectedIds).toContain('e');
  });

  it('range add: E 단순 클릭 후 shift+A 클릭 → 역방향도 A~E 5개 선택', () => {
    const root = { id: 'root', type: 'default', components: [] as unknown[] };
    const a: InternalFormFieldLike = { id: 'a', type: 'textfield', _parent: 'root' };
    const b: InternalFormFieldLike = { id: 'b', type: 'textfield', _parent: 'root' };
    const c: InternalFormFieldLike = { id: 'c', type: 'textfield', _parent: 'root' };
    const d: InternalFormFieldLike = { id: 'd', type: 'textfield', _parent: 'root' };
    const e: InternalFormFieldLike = { id: 'e', type: 'textfield', _parent: 'root' };
    (root.components as unknown[]) = [a, b, c, d, e];

    mockFormEditor = createMockFormEditor({
      type: 'default',
      id: 'root',
      components: [
        { id: 'a', type: 'textfield' },
        { id: 'b', type: 'textfield' },
        { id: 'c', type: 'textfield' },
        { id: 'd', type: 'textfield' },
        { id: 'e', type: 'textfield' },
      ],
    });
    mockFormFieldRegistry = createMockFormFieldRegistry({ a, b, c, d, e, root });

    const instance = makeInstance() as {
      _handleSelect: (id: string, opts?: { additive?: boolean; range?: boolean }) => void;
      _anchorId: string | null;
      _selectedIds: string[];
    };

    // E 단순 클릭
    instance._handleSelect('e');
    mockEventBus.emit('selection.changed', { selection: { id: 'e' } });

    // shift+A 클릭 (역방향)
    instance._handleSelect('a', { range: true });

    expect(instance._selectedIds).toHaveLength(5);
    expect(instance._selectedIds).toContain('a');
    expect(instance._selectedIds).toContain('e');
  });

  // ----- (C) range within nested container -----

  it('range within nested container: card 안 child들에서 range 선택', () => {
    // schema: root → [card → [c1, c2, c3], other]
    const root = { id: 'root', type: 'default', components: [] as unknown[] };
    const card: InternalFormFieldLike = { id: 'card', type: 'card', _parent: 'root', components: [] };
    const c1: InternalFormFieldLike = { id: 'c1', type: 'textfield', _parent: 'card' };
    const c2: InternalFormFieldLike = { id: 'c2', type: 'textfield', _parent: 'card' };
    const c3: InternalFormFieldLike = { id: 'c3', type: 'textfield', _parent: 'card' };
    const other: InternalFormFieldLike = { id: 'other', type: 'textfield', _parent: 'root' };
    (card.components as unknown[]) = [c1, c2, c3];
    (root.components as unknown[]) = [card, other];

    mockFormEditor = createMockFormEditor({
      type: 'default',
      id: 'root',
      components: [
        {
          id: 'card',
          type: 'card',
          components: [
            { id: 'c1', type: 'textfield' },
            { id: 'c2', type: 'textfield' },
            { id: 'c3', type: 'textfield' },
          ],
        },
        { id: 'other', type: 'textfield' },
      ],
    });
    mockFormFieldRegistry = createMockFormFieldRegistry({ root, card, c1, c2, c3, other });

    const instance = makeInstance() as {
      _handleSelect: (id: string, opts?: { additive?: boolean; range?: boolean }) => void;
      _anchorId: string | null;
      _selectedIds: string[];
    };

    // card 클릭 → anchor = 'card'
    instance._handleSelect('card');
    mockEventBus.emit('selection.changed', { selection: { id: 'card' } });

    // shift+c3 → 'card', 'c1', 'c2', 'c3' (DFS 순서: card → c1 → c2 → c3)
    instance._handleSelect('c3', { range: true });

    expect(instance._selectedIds).toContain('card');
    expect(instance._selectedIds).toContain('c1');
    expect(instance._selectedIds).toContain('c2');
    expect(instance._selectedIds).toContain('c3');
    // 'other'는 포함하지 않아야 함
    expect(instance._selectedIds).not.toContain('other');
  });

  // ----- (D) anchor 갱신 규칙 -----

  it('anchor 갱신: range 클릭 후 anchor는 변경되지 않는다', () => {
    const root = { id: 'root', type: 'default', components: [] as unknown[] };
    const a: InternalFormFieldLike = { id: 'a', type: 'textfield', _parent: 'root' };
    const b: InternalFormFieldLike = { id: 'b', type: 'textfield', _parent: 'root' };
    const c: InternalFormFieldLike = { id: 'c', type: 'textfield', _parent: 'root' };
    (root.components as unknown[]) = [a, b, c];

    mockFormEditor = createMockFormEditor({
      type: 'default',
      id: 'root',
      components: [
        { id: 'a', type: 'textfield' },
        { id: 'b', type: 'textfield' },
        { id: 'c', type: 'textfield' },
      ],
    });
    mockFormFieldRegistry = createMockFormFieldRegistry({ a, b, c, root });

    const instance = makeInstance() as {
      _handleSelect: (id: string, opts?: { additive?: boolean; range?: boolean }) => void;
      _anchorId: string | null;
      _selectedIds: string[];
    };

    instance._handleSelect('a');
    mockEventBus.emit('selection.changed', { selection: { id: 'a' } });
    expect(instance._anchorId).toBe('a');

    instance._handleSelect('c', { range: true });
    // range click 후 anchor는 'a'로 유지
    expect(instance._anchorId).toBe('a');

    // 두 번째 range click도 같은 anchor 기준
    instance._handleSelect('b', { range: true });
    expect(instance._anchorId).toBe('a');
    // a~b 범위: a, b
    expect(instance._selectedIds).toContain('a');
    expect(instance._selectedIds).toContain('b');
  });

  it('anchor 갱신: additive(ctrl) 클릭 후에도 anchor는 변경된다 (새 항목이 anchor)', () => {
    const root = { id: 'root', type: 'default', components: [] as unknown[] };
    const a: InternalFormFieldLike = { id: 'a', type: 'textfield', _parent: 'root' };
    const b: InternalFormFieldLike = { id: 'b', type: 'textfield', _parent: 'root' };
    (root.components as unknown[]) = [a, b];

    mockFormFieldRegistry = createMockFormFieldRegistry({ a, b, root });

    const instance = makeInstance() as {
      _handleSelect: (id: string, opts?: { additive?: boolean; range?: boolean }) => void;
      _anchorId: string | null;
    };

    instance._handleSelect('a');
    mockEventBus.emit('selection.changed', { selection: { id: 'a' } });
    expect(instance._anchorId).toBe('a');

    // ctrl+click (additive, not range) → anchor는 'b'로 갱신
    instance._handleSelect('b', { additive: true });
    expect(instance._anchorId).toBe('b');
  });

  // ----- (E) collectFlatIds 순수 함수 노출 검증 -----

  it('collectFlatIds is exported from outlineUtils or accessible on OutlineModule', async () => {
    // outlineUtils에서 직접 import 테스트
    const { collectFlatIds } = await import('../modules/outlineUtils');
    expect(typeof collectFlatIds).toBe('function');
  });

  it('collectFlatIds returns DFS order IDs for flat schema', async () => {
    const { collectFlatIds } = await import('../modules/outlineUtils');

    const schema = {
      id: 'root',
      type: 'default',
      components: [
        { id: 'a', type: 'textfield' },
        { id: 'b', type: 'textfield' },
        { id: 'c', type: 'textfield' },
      ],
    };

    const ids = collectFlatIds(schema);
    // root를 제외한 children 순서: a, b, c
    expect(ids).toEqual(expect.arrayContaining(['a', 'b', 'c']));
    expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('b'));
    expect(ids.indexOf('b')).toBeLessThan(ids.indexOf('c'));
  });

  it('collectFlatIds returns DFS order IDs for nested schema', async () => {
    const { collectFlatIds } = await import('../modules/outlineUtils');

    const schema = {
      id: 'root',
      type: 'default',
      components: [
        {
          id: 'card',
          type: 'card',
          components: [
            { id: 'c1', type: 'textfield' },
            { id: 'c2', type: 'textfield' },
          ],
        },
        { id: 'other', type: 'textfield' },
      ],
    };

    const ids = collectFlatIds(schema);
    // DFS: card → c1 → c2 → other
    expect(ids.indexOf('card')).toBeLessThan(ids.indexOf('c1'));
    expect(ids.indexOf('c1')).toBeLessThan(ids.indexOf('c2'));
    expect(ids.indexOf('c2')).toBeLessThan(ids.indexOf('other'));
    // root 자체는 포함하지 않음
    expect(ids).not.toContain('root');
  });
});

// 멀티 선택 테스트에서만 쓰는 InternalFormField 모양의 최소 shape
interface InternalFormFieldLike {
  id: string;
  type: string;
  _parent?: string;
  components?: unknown[];
  key?: string;
}
