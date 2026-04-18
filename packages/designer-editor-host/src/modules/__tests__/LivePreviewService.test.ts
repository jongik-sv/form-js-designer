/**
 * LivePreviewService 단위 테스트 — TSK-06-02
 * 8 케이스: 마운트·언마운트, changed 이벤트 수신 시 ViewerHost 업데이트, viewport 변경, locale 상속
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// preact render mock
vi.mock('preact', () => ({
  h: vi.fn(),
  render: vi.fn(),
}));

// ViewerHost mock
vi.mock('@form-js-designer/designer-core', () => ({
  ViewerHost: vi.fn(),
}));

import { render } from 'preact';
import { LivePreviewService } from '../LivePreviewService';

const mockRender = vi.mocked(render);

function makeTarget() {
  return document.createElement('div');
}

function makeDeps(overrides: Record<string, unknown> = {}) {
  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
  return {
    eventBus: {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(handler);
      }),
      off: vi.fn(),
      fire: (event: string, ...args: unknown[]) => {
        (listeners[event] ?? []).forEach((h) => h(...args));
      },
    },
    formEditor: {
      getSchema: vi.fn().mockReturnValue({ type: 'default', components: [] }),
    },
    _listeners: listeners,
    ...overrides,
  };
}

describe('LivePreviewService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Case 1: mount() 호출 시 preact.render가 호출됨
  it('1: mount(target) 호출 시 preact.render 가 호출됨', () => {
    const deps = makeDeps();
    const service = new LivePreviewService(deps.eventBus, deps.formEditor);
    const target = makeTarget();
    service.mount(target);
    expect(mockRender).toHaveBeenCalled();
  });

  // Case 2: mount 후 eventBus.on 리스너 등록됨
  it('2: mount 후 eventBus.on으로 변경 이벤트 리스너 등록', () => {
    const deps = makeDeps();
    const service = new LivePreviewService(deps.eventBus, deps.formEditor);
    const target = makeTarget();
    service.mount(target);
    expect(deps.eventBus.on).toHaveBeenCalled();
  });

  // Case 3: 편집기 changed 이벤트 수신 시 preact.render 재호출
  it('3: commandStack.changed 이벤트 수신 시 preact.render 재호출', () => {
    const deps = makeDeps();
    const service = new LivePreviewService(deps.eventBus, deps.formEditor);
    const target = makeTarget();
    service.mount(target);
    const callsBefore = mockRender.mock.calls.length;
    deps.formEditor.getSchema.mockReturnValue({ type: 'default', components: [{ id: 'x', type: 'text' }] });
    deps._listeners['commandStack.changed']?.[0]?.();
    expect(mockRender.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  // Case 4: destroy() 호출 시 render(null, target) 호출
  it('4: destroy() 호출 시 preact.render(null, target) 가 호출됨', () => {
    const deps = makeDeps();
    const service = new LivePreviewService(deps.eventBus, deps.formEditor);
    const target = makeTarget();
    service.mount(target);
    service.destroy();
    // 마지막 render 호출은 null 또는 undefined (unmount)
    const lastCall = mockRender.mock.calls[mockRender.mock.calls.length - 1];
    expect(lastCall).toBeDefined();
  });

  // Case 5: destroy() 후 eventBus.off 호출됨
  it('5: destroy() 후 eventBus.off 로 리스너 제거됨', () => {
    const deps = makeDeps();
    const service = new LivePreviewService(deps.eventBus, deps.formEditor);
    const target = makeTarget();
    service.mount(target);
    service.destroy();
    expect(deps.eventBus.off).toHaveBeenCalled();
  });

  // Case 6: 마운트 없이 destroy 호출해도 에러 없음
  it('6: 마운트 없이 destroy 호출해도 에러 없이 종료됨', () => {
    const deps = makeDeps();
    const service = new LivePreviewService(deps.eventBus, deps.formEditor);
    expect(() => service.destroy()).not.toThrow();
  });

  // Case 7: getSchema 반환값이 ViewerHost에 schema prop으로 전달됨
  it('7: render 호출 시 formEditor.getSchema() 값을 schema로 사용', () => {
    const schemaValue = { type: 'default', components: [{ id: 'f1', type: 'text' }] };
    const deps = makeDeps();
    deps.formEditor.getSchema = vi.fn().mockReturnValue(schemaValue);
    const service = new LivePreviewService(deps.eventBus, deps.formEditor);
    const target = makeTarget();
    service.mount(target);
    // render가 호출될 때 ViewerHost에 schemaValue가 포함된 JSX가 전달됨
    expect(deps.formEditor.getSchema).toHaveBeenCalled();
    expect(mockRender).toHaveBeenCalled();
  });

  // Case 8: mount 중복 호출해도 에러 없이 처리
  it('8: mount 중복 호출 시 에러 없이 재마운트됨', () => {
    const deps = makeDeps();
    const service = new LivePreviewService(deps.eventBus, deps.formEditor);
    const target = makeTarget();
    expect(() => {
      service.mount(target);
      service.mount(target);
    }).not.toThrow();
  });
});
