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
      id: 'designer-custom-props',
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

    expect(service.getGroups).toHaveBeenCalledWith({ id: 'f1', type: 'text' }, { mode: 'full' });
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

describe('PropsPanelContainer mode prop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Case 6: mode=simple 시 selection.changed 핸들러가 getGroups(field, { mode: 'simple' }) 호출
  it('6: mode=simple, getGroups receives { mode: "simple" } on selection.changed', () => {
    const eventBus = makeEventBus();
    const service = makePropsPanelService(makeGroups());
    act(() => {
      render(
        h(PropsPanelContainer, { propsPanelService: service, eventBus, mode: 'simple' }),
        container,
      );
    });

    act(() => {
      eventBus.fire('selection.changed', { selection: [{ id: 'C1', type: 'card' }] });
    });

    expect(service.getGroups).toHaveBeenLastCalledWith(
      { id: 'C1', type: 'card' },
      { mode: 'simple' },
    );
  });

  // Case 7: mode 변경 시 현재 selection으로 재계산
  it('7: mode 변경 시 현재 selection으로 재계산', () => {
    const eventBus = makeEventBus();
    const service = makePropsPanelService(makeGroups());

    act(() => {
      render(
        h(PropsPanelContainer, { propsPanelService: service, eventBus, mode: 'simple' }),
        container,
      );
    });

    act(() => {
      eventBus.fire('selection.changed', { selection: [{ id: 'f1', type: 'text' }] });
    });

    service.getGroups.mockClear();

    act(() => {
      render(
        h(PropsPanelContainer, { propsPanelService: service, eventBus, mode: 'full' }),
        container,
      );
    });

    expect(service.getGroups).toHaveBeenLastCalledWith(
      { id: 'f1', type: 'text' },
      { mode: 'full' },
    );
  });
});

// FU-D: PropsPanelContainer에는 collapse toggle이 없음을 보장하는 negative test
describe('PropsPanelContainer FU-D: no collapse UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Case 8: 필드 선택 후 aria-expanded 속성 없음 (collapse toggle 부재)
  it('8: 필드 선택 후 aria-expanded 속성 없음 (항상 펼침)', () => {
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

    // collapse 토글이 없으므로 aria-expanded 속성은 DOM에 존재하지 않아야 한다
    expect(container.querySelector('[aria-expanded]')).toBeNull();
  });

  // Case 9: mode=simple 일 때도 aria-expanded 없음
  it('9: mode=simple 일 때도 aria-expanded 없음', () => {
    const eventBus = makeEventBus();
    const service = makePropsPanelService(makeGroups());
    act(() => {
      render(
        h(PropsPanelContainer, { propsPanelService: service, eventBus, mode: 'simple' }),
        container,
      );
    });

    act(() => {
      eventBus.fire('selection.changed', { selection: [{ id: 'C1', type: 'card' }] });
    });

    expect(container.querySelector('[aria-expanded]')).toBeNull();
  });
});
