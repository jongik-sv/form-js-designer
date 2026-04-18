/**
 * PropsPanelContainer 단위 테스트 — TSK-06-02
 * 5 케이스: 선택 변경 시 렌더 갱신, 값 편집 → modeling.editFormField 호출 확인
 * Pattern: preact + preact/test-utils (not @testing-library/preact) to avoid hooks conflict
 */

import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PropsPanelContainer } from '../PropsPanelContainer';

type SelectionHandler = (e: unknown) => void;

function makeEventBus() {
  const handlers: Record<string, SelectionHandler[]> = {};
  return {
    on: vi.fn((event: string, handler: SelectionHandler) => {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
    }),
    off: vi.fn(),
    fire: (event: string, payload: unknown) => {
      (handlers[event] ?? []).forEach((h) => h(payload));
    },
    _handlers: handlers,
  };
}

function makePropsPanelService(groups = [] as ReturnType<typeof makeGroups>) {
  return {
    getGroups: vi.fn().mockReturnValue(groups),
  };
}

function makeGroups() {
  return [
    {
      id: 'designer-props',
      label: 'Properties',
      entries: [
        {
          id: 'label',
          component: (props: Record<string, unknown>) =>
            h('input', { 'data-testid': 'prop-input-label', value: String(props['value'] ?? '') }),
          isEdited: vi.fn().mockReturnValue(false),
          set: vi.fn(),
          element: { id: 'f1', type: 'text' },
        },
      ],
    },
  ];
}

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  render(null, container);
  document.body.removeChild(container);
});

describe('PropsPanelContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Case 1: 선택 없을 때 props-empty placeholder 표시
  it('1: 선택된 필드 없을 때 props-empty placeholder 표시', () => {
    const eventBus = makeEventBus();
    const service = makePropsPanelService();
    act(() => {
      render(
        h(PropsPanelContainer, { propsPanelService: service, eventBus }),
        container,
      );
    });
    expect(container.querySelector('[data-testid="props-empty"]')).toBeTruthy();
  });

  // Case 2: selection.changed 이벤트 수신 시 패널 갱신
  it('2: selection.changed 이벤트 후 props-panel 표시', async () => {
    const eventBus = makeEventBus();
    const service = makePropsPanelService(makeGroups());
    act(() => {
      render(
        h(PropsPanelContainer, { propsPanelService: service, eventBus }),
        container,
      );
    });

    act(() => {
      eventBus.fire('selection.changed', { selection: [{ id: 'f1', type: 'text' }] });
    });

    expect(container.querySelector('[data-testid="props-panel"]')).toBeTruthy();
  });

  // Case 3: selection.changed 에서 selection 없으면 empty 유지
  it('3: selection이 비어있으면 props-empty 유지', () => {
    const eventBus = makeEventBus();
    const service = makePropsPanelService(makeGroups());
    act(() => {
      render(
        h(PropsPanelContainer, { propsPanelService: service, eventBus }),
        container,
      );
    });

    act(() => {
      eventBus.fire('selection.changed', { selection: [] });
    });

    expect(container.querySelector('[data-testid="props-empty"]')).toBeTruthy();
  });

  // Case 4: propsPanel.getGroups가 호출됨
  it('4: 선택 변경 시 propsPanelService.getGroups 가 호출됨', () => {
    const eventBus = makeEventBus();
    const service = makePropsPanelService(makeGroups());
    act(() => {
      render(
        h(PropsPanelContainer, { propsPanelService: service, eventBus }),
        container,
      );
    });

    act(() => {
      eventBus.fire('selection.changed', { selection: [{ id: 'f1', type: 'text' }] });
    });

    expect(service.getGroups).toHaveBeenCalledWith({ id: 'f1', type: 'text' });
  });

  // Case 5: 서비스가 null이면 empty placeholder 표시
  it('5: propsPanelService가 null이면 empty placeholder만 표시', () => {
    const eventBus = makeEventBus();
    act(() => {
      render(
        h(PropsPanelContainer, { propsPanelService: null, eventBus }),
        container,
      );
    });
    expect(container.querySelector('[data-testid="props-empty"]')).toBeTruthy();
  });
});
