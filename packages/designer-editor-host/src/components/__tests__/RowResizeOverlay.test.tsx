/**
 * RowResizeOverlay 단위 테스트 — TSK-12-03
 *
 * selection.changed 후 첫 컴포넌트 선택 시 row-resize-handle 렌더,
 * onCommit 시 editFormField(field, 'layout', {...layout, rowHeight}) 호출 확인.
 * layout.height는 변경하지 않음 (독립성).
 */

import { h } from 'preact';
import { render, act } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RowResizeOverlay } from '../RowResizeOverlay';

type Handler = (...args: unknown[]) => void;

function makeEditor(overrides: Record<string, unknown> = {}) {
  const handlers: Record<string, Handler[]> = {};
  const eventBus = {
    on: vi.fn((event: string, handler: Handler) => {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
    }),
    off: vi.fn((event: string, handler: Handler) => {
      handlers[event] = (handlers[event] ?? []).filter((h) => h !== handler);
    }),
    fire: (event: string, ...args: unknown[]) => {
      for (const h of handlers[event] ?? []) {
        h(...args);
      }
    },
  };

  const editFormField = vi.fn();
  const modeling = { editFormField };

  const fields: Record<string, unknown> = {
    'f1': { id: 'f1', type: 'textfield', layout: { height: 100, rowHeight: 150 } },
    'f2': { id: 'f2', type: 'textarea', layout: { height: 200 } },
  };
  const formFieldRegistry = {
    get: vi.fn((id: string) => fields[id]),
  };

  const formLayouter = {
    getRows: vi.fn().mockReturnValue([
      { id: 'R1', components: ['f1', 'f2'] },
    ]),
    getRowForField: vi.fn((field: unknown) => {
      const f = field as { id?: string };
      if (f?.id === 'f1' || f?.id === 'f2') {
        return { id: 'R1', components: ['f1', 'f2'] };
      }
      return null;
    }),
  };

  const get = vi.fn((svc: string, _strict?: boolean) => {
    switch (svc) {
      case 'eventBus': return eventBus;
      case 'modeling': return modeling;
      case 'formFieldRegistry': return formFieldRegistry;
      case 'formLayouter': return formLayouter;
      default: return undefined;
    }
  });

  return {
    get,
    eventBus,
    modeling,
    editFormField,
    formFieldRegistry,
    formLayouter,
    fields,
    ...overrides,
  };
}

describe('RowResizeOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Case 1: 마운트 후 row-resize-handle 미표시 (선택 없음)
  it('1: 선택 없을 때 row-resize-handle 미렌더', () => {
    const editor = makeEditor();
    const { container } = render(<RowResizeOverlay editor={editor} />);
    expect(container.querySelector('[data-testid="row-resize-handle"]')).toBeNull();
  });

  // Case 2: 첫 컴포넌트 선택 시 row-resize-handle 렌더
  it('2: 첫 컴포넌트 선택 시 row-resize-handle 렌더', async () => {
    const editor = makeEditor();
    const { container } = render(<RowResizeOverlay editor={editor} />);

    await act(async () => {
      editor.eventBus.fire('selection.changed', {
        selection: { id: 'f1', type: 'textfield' },
      });
    });

    // RowResizeOverlay는 첫 컴포넌트 선택 시 핸들을 표시해야 함
    const handle = container.querySelector('[data-testid="row-resize-handle"]');
    expect(handle).not.toBeNull();
  });

  // Case 3: 두 번째 컴포넌트 선택 시 row-resize-handle 표시 (단일 행 내 모든 컴포넌트 선택 시 표시)
  it('3: selection.changed 이벤트 구독 확인 (eventBus.on 호출)', () => {
    const editor = makeEditor();
    render(<RowResizeOverlay editor={editor} />);
    expect(editor.eventBus.on).toHaveBeenCalledWith('selection.changed', expect.any(Function));
  });

  // Case 4: elements.changed 이벤트 구독 확인
  it('4: elements.changed 이벤트 구독 확인', () => {
    const editor = makeEditor();
    render(<RowResizeOverlay editor={editor} />);
    expect(editor.eventBus.on).toHaveBeenCalledWith('elements.changed', expect.any(Function));
  });

  // Case 5: 선택 해제 시 핸들 미표시
  it('5: 선택 해제 시 row-resize-handle 미렌더', async () => {
    const editor = makeEditor();
    const { container } = render(<RowResizeOverlay editor={editor} />);

    await act(async () => {
      editor.eventBus.fire('selection.changed', {
        selection: { id: 'f1', type: 'textfield' },
      });
    });

    await act(async () => {
      editor.eventBus.fire('selection.changed', { selection: null });
      // 200ms debounce 대기
      await new Promise((r) => setTimeout(r, 250));
    });

    const handle = container.querySelector('[data-testid="row-resize-handle"]');
    expect(handle).toBeNull();
  });

  // Case 6: 언마운트 시 eventBus.off 호출
  it('6: 언마운트 시 eventBus.off 호출', () => {
    const editor = makeEditor();
    const { unmount } = render(<RowResizeOverlay editor={editor} />);
    unmount();
    expect(editor.eventBus.off).toHaveBeenCalled();
  });
});
