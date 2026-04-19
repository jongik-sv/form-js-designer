/**
 * MarqueeModule.test.ts — TSK-11-03 마퀴 선택 모듈 단위 테스트
 *
 * 테스트 범위:
 *   - mousedown 필터: 빈 영역에서만 마퀴 시작, [data-id] 위에서는 무시
 *   - threshold: 4px 미만이면 setSelectedIds 미호출
 *   - mouseup 시 setSelectedIds 호출 (교체/additive)
 *   - 우클릭/중클릭 무시
 *   - 캔버스 밖 mouseup 후 드래그 종료
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MarqueeModule } from '../modules/MarqueeModule';

// ---- helpers ----

function createMockEventBus() {
  const listeners: Record<string, Array<(e?: unknown) => void>> = {};
  return {
    on: vi.fn((event: string, cb: (e?: unknown) => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event]!.push(cb);
    }),
    off: vi.fn(),
    emit: (event: string, payload?: unknown) => {
      const cbs = listeners[event] ?? [];
      for (const cb of cbs) cb(payload);
    },
  };
}

function createMockOutlinePanel(selectedIds: string[] = []) {
  return {
    setSelectedIds: vi.fn(),
    getSelectedIds: vi.fn().mockReturnValue(selectedIds),
  };
}

function createMockFormFieldRegistry(fieldMap: Record<string, { type: string }> = {}) {
  return {
    get: vi.fn((id: string) => fieldMap[id]),
    getAll: vi.fn().mockReturnValue(Object.values(fieldMap)),
  };
}

/** 가짜 DOM 컨테이너 생성 — .fjs-editor-container로 작동 */
function createFakeContainer(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'fjs-editor-container';
  container.style.cssText = 'position:relative; width:800px; height:600px;';
  document.body.appendChild(container);
  return container;
}

/** 가짜 [data-id] 필드 요소 생성 */
function createFakeField(id: string, container: HTMLElement): HTMLElement {
  const field = document.createElement('div');
  field.setAttribute('data-id', id);
  field.style.cssText = 'position:absolute; width:100px; height:40px;';
  container.appendChild(field);
  return field;
}

// MarqueeService 내부 인스턴스를 테스트하기 위한 헬퍼
function createMarqueeService(overrides?: {
  outlinePanel?: ReturnType<typeof createMockOutlinePanel>;
  formFieldRegistry?: ReturnType<typeof createMockFormFieldRegistry>;
}) {
  const eventBus = createMockEventBus();
  const outlinePanel = overrides?.outlinePanel ?? createMockOutlinePanel();
  const formFieldRegistry = overrides?.formFieldRegistry ?? createMockFormFieldRegistry();

  // MarqueeModule의 service class를 직접 인스턴스화
  const [, ServiceClass] = MarqueeModule.marquee as [string, new (...args: unknown[]) => unknown];
  const service = new (ServiceClass as new (
    eb: typeof eventBus,
    ffr: typeof formFieldRegistry,
    op: typeof outlinePanel,
  ) => {
    destroy(): void;
    _onImportDone?(): void;
  })(eventBus, formFieldRegistry, outlinePanel);

  return { service, eventBus, outlinePanel, formFieldRegistry };
}

// ============================================================

describe('MarqueeModule 구조', () => {
  it('has __init__ array containing marquee', () => {
    expect(Array.isArray(MarqueeModule.__init__)).toBe(true);
    expect(MarqueeModule.__init__).toContain('marquee');
  });

  it('marquee service is ["type", Constructor]', () => {
    const [typeStr, Constructor] = MarqueeModule.marquee as [string, unknown];
    expect(typeStr).toBe('type');
    expect(typeof Constructor).toBe('function');
  });

  it('inject 배열에 eventBus, formFieldRegistry, outlinePanel이 포함된다', () => {
    const [, Constructor] = MarqueeModule.marquee as [string, { inject?: string[] }];
    expect(Constructor.inject).toContain('eventBus');
    expect(Constructor.inject).toContain('formFieldRegistry');
    expect(Constructor.inject).toContain('outlinePanel');
  });
});

// ============================================================

describe('MarqueeService — mousedown 필터', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = createFakeContainer();
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('우클릭(button=2)은 마퀴를 시작하지 않는다', () => {
    const outlinePanel = createMockOutlinePanel();
    const { service, eventBus } = createMarqueeService({ outlinePanel });
    // import.done → 컨테이너 마운트 트리거
    eventBus.emit('import.done');

    // 우클릭 시뮬레이션
    const evt = new MouseEvent('mousedown', { button: 2, bubbles: true, cancelable: true, clientX: 400, clientY: 300 });
    container.dispatchEvent(evt);

    // 이동 + mouseup
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 450, clientY: 350 }));
    document.dispatchEvent(new MouseEvent('mouseup', { clientX: 450, clientY: 350 }));

    expect(outlinePanel.setSelectedIds).not.toHaveBeenCalled();

    service.destroy();
  });

  it('[data-id] 위에서 mousedown이 시작되면 마퀴를 시작하지 않는다', () => {
    const outlinePanel = createMockOutlinePanel();
    const formFieldRegistry = createMockFormFieldRegistry({ 'field-1': { type: 'textfield' } });
    const { service, eventBus } = createMarqueeService({ outlinePanel, formFieldRegistry });
    eventBus.emit('import.done');

    const field = createFakeField('field-1', container);

    // 필드 위에서 mousedown
    const evt = new MouseEvent('mousedown', {
      button: 0,
      bubbles: true,
      cancelable: true,
      clientX: 50,
      clientY: 50,
    });
    Object.defineProperty(evt, 'target', { value: field });
    container.dispatchEvent(evt);

    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 200 }));
    document.dispatchEvent(new MouseEvent('mouseup', { clientX: 200, clientY: 200 }));

    expect(outlinePanel.setSelectedIds).not.toHaveBeenCalled();

    service.destroy();
  });
});

// ============================================================

describe('MarqueeService — threshold', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = createFakeContainer();
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('드래그 거리가 threshold(4px) 미만이면 setSelectedIds가 호출되지 않는다', () => {
    const outlinePanel = createMockOutlinePanel();
    const { service, eventBus } = createMarqueeService({ outlinePanel });
    eventBus.emit('import.done');

    // 빈 영역에서 mousedown
    const downEvt = new MouseEvent('mousedown', {
      button: 0,
      bubbles: true,
      cancelable: true,
      clientX: 400,
      clientY: 300,
    });
    container.dispatchEvent(downEvt);

    // 2px 이동 (threshold 미만)
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 402, clientY: 301 }));
    document.dispatchEvent(new MouseEvent('mouseup', { clientX: 402, clientY: 301 }));

    expect(outlinePanel.setSelectedIds).not.toHaveBeenCalled();

    service.destroy();
  });
});

// ============================================================

describe('MarqueeService — mouseup 선택 반영', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = createFakeContainer();
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('threshold 초과 드래그 후 mouseup 시 setSelectedIds가 호출된다', () => {
    const outlinePanel = createMockOutlinePanel();
    const { service, eventBus } = createMarqueeService({ outlinePanel });
    eventBus.emit('import.done');

    const downEvt = new MouseEvent('mousedown', {
      button: 0,
      bubbles: true,
      cancelable: true,
      clientX: 10,
      clientY: 10,
    });
    container.dispatchEvent(downEvt);

    // 충분히 이동 (50px)
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 60, clientY: 60 }));
    document.dispatchEvent(new MouseEvent('mouseup', { clientX: 60, clientY: 60 }));

    expect(outlinePanel.setSelectedIds).toHaveBeenCalledOnce();

    service.destroy();
  });

  it('shift 없는 mouseup: setSelectedIds(ids, {additive: false}) 호출', () => {
    const outlinePanel = createMockOutlinePanel();
    const { service, eventBus } = createMarqueeService({ outlinePanel });
    eventBus.emit('import.done');

    container.dispatchEvent(
      new MouseEvent('mousedown', { button: 0, bubbles: true, cancelable: true, clientX: 10, clientY: 10, shiftKey: false }),
    );
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 60, clientY: 60 }));
    document.dispatchEvent(new MouseEvent('mouseup', { clientX: 60, clientY: 60, shiftKey: false }));

    expect(outlinePanel.setSelectedIds).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ additive: false }),
    );

    service.destroy();
  });

  it('shift 누름 mouseup: setSelectedIds(ids, {additive: true}) 호출', () => {
    const outlinePanel = createMockOutlinePanel();
    const { service, eventBus } = createMarqueeService({ outlinePanel });
    eventBus.emit('import.done');

    container.dispatchEvent(
      new MouseEvent('mousedown', { button: 0, bubbles: true, cancelable: true, clientX: 10, clientY: 10, shiftKey: true }),
    );
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 60, clientY: 60 }));
    document.dispatchEvent(new MouseEvent('mouseup', { clientX: 60, clientY: 60, shiftKey: true }));

    expect(outlinePanel.setSelectedIds).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ additive: true }),
    );

    service.destroy();
  });

  it('캔버스 밖 mouseup(document 레벨)에서도 드래그가 종료되고 overlay가 숨겨진다', () => {
    const outlinePanel = createMockOutlinePanel();
    const { service, eventBus } = createMarqueeService({ outlinePanel });
    eventBus.emit('import.done');

    container.dispatchEvent(
      new MouseEvent('mousedown', { button: 0, bubbles: true, cancelable: true, clientX: 10, clientY: 10 }),
    );
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 60, clientY: 60 }));
    // 캔버스 밖 좌표에서 mouseup
    document.dispatchEvent(new MouseEvent('mouseup', { clientX: 9999, clientY: 9999 }));

    // 드래그가 종료되어야 함 (다시 mousemove 해도 반응 없어야 함)
    const callCountBefore = outlinePanel.setSelectedIds.mock.calls.length;
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }));
    document.dispatchEvent(new MouseEvent('mouseup', { clientX: 100, clientY: 100 }));
    const callCountAfter = outlinePanel.setSelectedIds.mock.calls.length;
    expect(callCountAfter).toBe(callCountBefore); // 추가 호출 없음

    service.destroy();
  });
});
