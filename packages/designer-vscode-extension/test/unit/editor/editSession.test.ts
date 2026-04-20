import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EditSessionRegistry } from '../../../src/editor/editSession';
import type { EditSession, SessionEvent } from '../../../src/editor/editSession';

function makePanel(): { dispose: ReturnType<typeof vi.fn>; reveal?: ReturnType<typeof vi.fn> } {
  return { dispose: vi.fn(), reveal: vi.fn() };
}

function makeSession(override?: Partial<EditSession>): EditSession {
  return {
    uri: 'file:///test.md',
    mdStart: 0,
    mdEnd: 10,
    panel: makePanel(),
    ...override,
  };
}

describe('EditSessionRegistry', () => {
  let registry: EditSessionRegistry;

  beforeEach(() => {
    registry = new EditSessionRegistry();
  });

  // ── beginSession ──────────────────────────────────

  it('beginSession: 새 세션을 시작하고 true를 반환한다', () => {
    const session = makeSession();
    const result = registry.beginSession(session);
    expect(result).toBe(true);
  });

  it('beginSession: 시작 후 getActive로 조회 가능하다', () => {
    const session = makeSession();
    registry.beginSession(session);
    expect(registry.getActive(session.uri)).toBe(session);
  });

  it('beginSession: 동일 URI에 이미 세션이 있으면 false를 반환한다 (lock 거절)', () => {
    const session1 = makeSession();
    const session2 = makeSession({ panel: makePanel() });
    registry.beginSession(session1);
    const result = registry.beginSession(session2);
    expect(result).toBe(false);
  });

  it('beginSession: lock 거절 시 기존 세션은 유지된다', () => {
    const session1 = makeSession();
    const session2 = makeSession({ panel: makePanel() });
    registry.beginSession(session1);
    registry.beginSession(session2);
    expect(registry.getActive(session1.uri)).toBe(session1);
  });

  it('beginSession: 서로 다른 URI는 독립적으로 세션을 가질 수 있다', () => {
    const s1 = makeSession({ uri: 'file:///a.md' });
    const s2 = makeSession({ uri: 'file:///b.md' });
    expect(registry.beginSession(s1)).toBe(true);
    expect(registry.beginSession(s2)).toBe(true);
    expect(registry.getActive('file:///a.md')).toBe(s1);
    expect(registry.getActive('file:///b.md')).toBe(s2);
  });

  // ── endSession ────────────────────────────────────

  it('endSession: 세션을 종료하고 종료된 세션을 반환한다', () => {
    const session = makeSession();
    registry.beginSession(session);
    const ended = registry.endSession(session.uri);
    expect(ended).toBe(session);
  });

  it('endSession: 종료 후 getActive는 undefined를 반환한다', () => {
    const session = makeSession();
    registry.beginSession(session);
    registry.endSession(session.uri);
    expect(registry.getActive(session.uri)).toBeUndefined();
  });

  it('endSession: 존재하지 않는 URI에 대해 undefined를 반환한다', () => {
    const result = registry.endSession('file:///nonexistent.md');
    expect(result).toBeUndefined();
  });

  it('endSession 후 동일 URI에 새 세션을 시작할 수 있다', () => {
    const session1 = makeSession();
    registry.beginSession(session1);
    registry.endSession(session1.uri);
    const session2 = makeSession({ panel: makePanel() });
    expect(registry.beginSession(session2)).toBe(true);
  });

  // ── getActive / getAllActive ───────────────────────

  it('getActive: 세션이 없으면 undefined를 반환한다', () => {
    expect(registry.getActive('file:///missing.md')).toBeUndefined();
  });

  it('getAllActive: 모든 활성 세션을 배열로 반환한다', () => {
    const s1 = makeSession({ uri: 'file:///a.md' });
    const s2 = makeSession({ uri: 'file:///b.md' });
    registry.beginSession(s1);
    registry.beginSession(s2);
    const all = registry.getAllActive();
    expect(all).toHaveLength(2);
    expect(all).toContain(s1);
    expect(all).toContain(s2);
  });

  it('getAllActive: 세션이 없으면 빈 배열을 반환한다', () => {
    expect(registry.getAllActive()).toEqual([]);
  });

  // ── onSessionChange 이벤트 ────────────────────────

  it('beginSession 시 "began" 이벤트가 발행된다', () => {
    const listener = vi.fn<(event: SessionEvent) => void>();
    registry.onSessionChange(listener);
    const session = makeSession();
    registry.beginSession(session);
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({ type: 'began', session });
  });

  it('endSession 시 "ended" 이벤트가 발행된다', () => {
    const session = makeSession();
    registry.beginSession(session);
    const listener = vi.fn<(event: SessionEvent) => void>();
    registry.onSessionChange(listener);
    registry.endSession(session.uri);
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({ type: 'ended', session });
  });

  it('lock 거절 시 이벤트가 발행되지 않는다', () => {
    const session1 = makeSession();
    registry.beginSession(session1);
    const listener = vi.fn();
    registry.onSessionChange(listener);
    registry.beginSession(makeSession({ panel: makePanel() }));
    expect(listener).not.toHaveBeenCalled();
  });

  it('onSessionChange 반환값(unsubscribe)으로 리스너를 제거할 수 있다', () => {
    const listener = vi.fn();
    const unsubscribe = registry.onSessionChange(listener);
    unsubscribe();
    registry.beginSession(makeSession());
    expect(listener).not.toHaveBeenCalled();
  });

  // ── disposeAll ────────────────────────────────────

  it('disposeAll: 모든 활성 세션을 종료하고 panel.dispose()를 호출한다', () => {
    const panel1 = makePanel();
    const panel2 = makePanel();
    registry.beginSession(makeSession({ uri: 'file:///a.md', panel: panel1 }));
    registry.beginSession(makeSession({ uri: 'file:///b.md', panel: panel2 }));
    registry.disposeAll();
    expect(panel1.dispose).toHaveBeenCalled();
    expect(panel2.dispose).toHaveBeenCalled();
    expect(registry.getAllActive()).toHaveLength(0);
  });

  it('disposeAll 후 새 세션을 시작할 수 있다', () => {
    registry.beginSession(makeSession());
    registry.disposeAll();
    expect(registry.beginSession(makeSession({ panel: makePanel() }))).toBe(true);
  });

  it('disposeAll: panel.dispose()가 에러를 던져도 나머지 세션은 정리된다', () => {
    const badPanel = { dispose: vi.fn(() => { throw new Error('dispose error'); }) };
    const goodPanel = makePanel();
    registry.beginSession(makeSession({ uri: 'file:///a.md', panel: badPanel }));
    registry.beginSession(makeSession({ uri: 'file:///b.md', panel: goodPanel }));
    expect(() => registry.disposeAll()).not.toThrow();
    expect(registry.getAllActive()).toHaveLength(0);
    expect(goodPanel.dispose).toHaveBeenCalled();
  });
});
