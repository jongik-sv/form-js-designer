/**
 * LayoutHeightModule 단위 테스트 — TSK-12-02
 *
 * DI spy 테스트: eventBus.on 구독 확인, 훅 발화 시 Applier 호출됨.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LayoutHeightService } from '../LayoutHeightModule';
import * as Applier from '../LayoutHeightApplier';

function makeEventBus() {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
  return {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
    }),
    fire: (event: string, ...args: unknown[]) => {
      for (const h of handlers[event] ?? []) {
        h(...args);
      }
    },
  };
}

function makeRegistry(fields: unknown[] = []) {
  return {
    getAll: vi.fn(() => fields),
  };
}

describe('LayoutHeightService', () => {
  let applySpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    applySpy = vi.spyOn(Applier, 'applyLayoutHeight').mockImplementation(() => {});
  });

  // Case 1: import.done 이벤트 구독 확인
  it('1: import.done 이벤트에 구독', () => {
    const eventBus = makeEventBus();
    const registry = makeRegistry();
    new LayoutHeightService(eventBus, registry);
    expect(eventBus.on).toHaveBeenCalledWith('import.done', expect.any(Function));
  });

  // Case 2: formField.add 이벤트 구독 확인
  it('2: formField.add 이벤트에 구독', () => {
    const eventBus = makeEventBus();
    const registry = makeRegistry();
    new LayoutHeightService(eventBus, registry);
    expect(eventBus.on).toHaveBeenCalledWith('formField.add', expect.any(Function));
  });

  // Case 3: elements.changed 이벤트 구독 확인
  it('3: elements.changed 이벤트에 구독', () => {
    const eventBus = makeEventBus();
    const registry = makeRegistry();
    new LayoutHeightService(eventBus, registry);
    expect(eventBus.on).toHaveBeenCalledWith('elements.changed', expect.any(Function));
  });

  // Case 4: commandStack.formField.edit.postExecuted 구독 — 에러 없음
  it('4: commandStack.formField.edit.postExecuted 이벤트에 구독 (editor-only)', () => {
    const eventBus = makeEventBus();
    const registry = makeRegistry();
    new LayoutHeightService(eventBus, registry);
    expect(eventBus.on).toHaveBeenCalledWith(
      'commandStack.formField.edit.postExecuted',
      expect.any(Function),
    );
  });

  // Case 5: import.done 발화 → applyLayoutHeight 호출
  it('5: import.done 발화 시 applyLayoutHeight 호출', () => {
    const eventBus = makeEventBus();
    const fields = [{ id: 'f1', type: 'textarea', layout: { height: 200 } }];
    const registry = makeRegistry(fields);
    new LayoutHeightService(eventBus, registry);

    eventBus.fire('import.done');

    expect(applySpy).toHaveBeenCalled();
    expect(applySpy).toHaveBeenCalledWith(expect.any(Object), fields);
  });

  // Case 6: formField.add 발화 → applyLayoutHeight 호출
  it('6: formField.add 발화 시 applyLayoutHeight 호출 (requestAnimationFrame 후)', async () => {
    vi.useFakeTimers();
    const eventBus = makeEventBus();
    const fields = [{ id: 'f2', type: 'html', layout: { height: 120 } }];
    const registry = makeRegistry(fields);
    new LayoutHeightService(eventBus, registry);

    eventBus.fire('formField.add');

    // requestAnimationFrame 지연
    await vi.runAllTimersAsync();

    expect(applySpy).toHaveBeenCalled();
    vi.useRealTimers();
  });

  // Case 7: commandStack.formField.edit.postExecuted 발화 → applyLayoutHeight 호출
  it('7: commandStack.formField.edit.postExecuted 발화 시 applyLayoutHeight 호출', () => {
    const eventBus = makeEventBus();
    const fields = [{ id: 'f3', type: 'group', layout: { height: 300 } }];
    const registry = makeRegistry(fields);
    new LayoutHeightService(eventBus, registry);

    eventBus.fire('commandStack.formField.edit.postExecuted');

    expect(applySpy).toHaveBeenCalled();
  });

  // Case 8: editor-only 이벤트 없어도 에러 없음 — 단순 구독으로 noop
  it('8: viewer에 commandStack 이벤트 없어도 에러 없음', () => {
    const eventBus = makeEventBus();
    const registry = makeRegistry();
    expect(() => new LayoutHeightService(eventBus, registry)).not.toThrow();
  });
});
