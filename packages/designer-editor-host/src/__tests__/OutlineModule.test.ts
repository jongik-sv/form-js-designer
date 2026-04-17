/**
 * OutlineModule 단위 테스트
 * TSK-06-01
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
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
    get: vi.fn().mockReturnValue([]),
    select: vi.fn(),
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

  // ----- 2. DI inject 배열 -----
  it('OutlinePanelService has inject: [eventBus, formEditor, selection]', () => {
    const [, Constructor] = OutlineModule.outlinePanel as [string, { inject?: string[] }];
    expect((Constructor as { inject?: string[] }).inject).toEqual(['eventBus', 'formEditor', 'selection']);
  });

  // ----- 3. 이벤트 구독 -----
  describe('event subscriptions', () => {
    let mockEventBus: ReturnType<typeof createMockEventBus>;
    let mockFormEditor: ReturnType<typeof createMockFormEditor>;
    let mockSelection: ReturnType<typeof createMockSelection>;

    beforeEach(() => {
      mockEventBus = createMockEventBus();
      mockFormEditor = createMockFormEditor();
      mockSelection = createMockSelection();
    });

    it('subscribes to import.done on construction', () => {
      const [, Constructor] = OutlineModule.outlinePanel as [string, new (...args: unknown[]) => unknown];
      new Constructor(mockEventBus, mockFormEditor, mockSelection);

      expect(mockEventBus.on).toHaveBeenCalledWith('import.done', expect.any(Function));
    });

    it('subscribes to commandStack.changed on construction', () => {
      const [, Constructor] = OutlineModule.outlinePanel as [string, new (...args: unknown[]) => unknown];
      new Constructor(mockEventBus, mockFormEditor, mockSelection);

      expect(mockEventBus.on).toHaveBeenCalledWith('commandStack.changed', expect.any(Function));
    });

    it('subscribes to selection.changed on construction', () => {
      const [, Constructor] = OutlineModule.outlinePanel as [string, new (...args: unknown[]) => unknown];
      new Constructor(mockEventBus, mockFormEditor, mockSelection);

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

      const [, Constructor] = OutlineModule.outlinePanel as [string, new (...args: unknown[]) => unknown & { _nodes: unknown[] }];
      const instance = new Constructor(mockEventBus, mockFormEditor, mockSelection) as { _nodes: unknown[] };

      // import.done 이벤트 발행
      mockEventBus.emit('import.done');

      // _nodes가 업데이트됨
      expect(mockFormEditor.getSchema).toHaveBeenCalled();
      expect(Array.isArray((instance as { _nodes: unknown[] })._nodes)).toBe(true);
      expect((instance as { _nodes: Array<{ id: string }> })._nodes).toHaveLength(1);
      expect((instance as { _nodes: Array<{ id: string; type: string }> })._nodes[0]).toMatchObject({
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

      const [, Constructor] = OutlineModule.outlinePanel as [string, new (...args: unknown[]) => unknown];
      const instance = new Constructor(mockEventBus, mockFormEditor, mockSelection) as { _nodes: Array<{ id: string; type: string }> };

      mockEventBus.emit('commandStack.changed');

      expect(instance._nodes).toHaveLength(1);
      expect(instance._nodes[0]).toMatchObject({ id: 'btn-1', type: 'button' });
    });

    // ----- 5. selection.changed → 선택 ID 갱신 -----
    it('updates selectedIds on selection.changed event with selection payload', () => {
      const [, Constructor] = OutlineModule.outlinePanel as [string, new (...args: unknown[]) => unknown];
      const instance = new Constructor(mockEventBus, mockFormEditor, mockSelection) as {
        _selectedIds: string[];
      };

      mockEventBus.emit('selection.changed', {
        selection: [{ id: 'card-1' }, { id: 'btn-1' }],
      });

      expect(instance._selectedIds).toEqual(['card-1', 'btn-1']);
    });

    it('handles selection.changed with empty selection payload', () => {
      const [, Constructor] = OutlineModule.outlinePanel as [string, new (...args: unknown[]) => unknown];
      const instance = new Constructor(mockEventBus, mockFormEditor, mockSelection) as {
        _selectedIds: string[];
      };

      mockEventBus.emit('selection.changed', { selection: [] });
      expect(instance._selectedIds).toEqual([]);
    });

    it('falls back to selection.get() when event has no selection payload', () => {
      mockSelection.get.mockReturnValue([{ id: 'sel-1' }]);

      const [, Constructor] = OutlineModule.outlinePanel as [string, new (...args: unknown[]) => unknown];
      const instance = new Constructor(mockEventBus, mockFormEditor, mockSelection) as {
        _selectedIds: string[];
      };

      mockEventBus.emit('selection.changed', undefined);
      expect(instance._selectedIds).toEqual(['sel-1']);
    });

    // ----- 6. mount 메서드 -----
    it('exposes mount(container) method', () => {
      const [, Constructor] = OutlineModule.outlinePanel as [string, new (...args: unknown[]) => unknown];
      const instance = new Constructor(mockEventBus, mockFormEditor, mockSelection) as {
        mount: (c: HTMLElement) => void;
        _container: HTMLElement | null;
      };

      expect(typeof instance.mount).toBe('function');
    });

    it('sets _container on mount', () => {
      const [, Constructor] = OutlineModule.outlinePanel as [string, new (...args: unknown[]) => unknown];
      const instance = new Constructor(mockEventBus, mockFormEditor, mockSelection) as {
        mount: (c: HTMLElement) => void;
        _container: HTMLElement | null;
      };

      const container = document.createElement('div');
      instance.mount(container);
      expect(instance._container).toBe(container);
    });

    // ----- 7. destroy 메서드 -----
    it('exposes destroy() method that unsubscribes events', () => {
      const [, Constructor] = OutlineModule.outlinePanel as [string, new (...args: unknown[]) => unknown];
      const instance = new Constructor(mockEventBus, mockFormEditor, mockSelection) as {
        destroy: () => void;
      };

      instance.destroy();

      expect(mockEventBus.off).toHaveBeenCalledWith('import.done', expect.any(Function));
      expect(mockEventBus.off).toHaveBeenCalledWith('commandStack.changed', expect.any(Function));
      expect(mockEventBus.off).toHaveBeenCalledWith('selection.changed', expect.any(Function));
    });

    // ----- 8. null schema 방어 -----
    it('handles null schema from formEditor.getSchema gracefully', () => {
      mockFormEditor = createMockFormEditor(null);

      const [, Constructor] = OutlineModule.outlinePanel as [string, new (...args: unknown[]) => unknown];
      const instance = new Constructor(mockEventBus, mockFormEditor, mockSelection) as {
        _nodes: unknown[];
      };

      expect(() => mockEventBus.emit('import.done')).not.toThrow();
      expect(instance._nodes).toEqual([]);
    });
  });
});
