/**
 * sourceWatcher.test.ts — TSK-02-04
 *
 * startSourceWatcher(sessionRegistry, dispatch, subscribe) — 외부 변경 감지 단위 테스트.
 * 6+ 케이스:
 *   1. 활성 세션이 있는 URI 변경 → source-updated 브로드캐스트
 *   2. 활성 세션이 없는 URI 변경 → 브로드캐스트 없음
 *   3. pendingSaveTokens에 있는 버전 → self-edit 억제
 *   4. pendingSaveTokens에 없는 버전 → 브로드캐스트 발생
 *   5. dispose() 호출 후 변경 이벤트 무시
 *   6. broadcast에 올바른 uri, version 전달
 *   7. self-edit 억제 후 pendingSaveTokens에서 버전 제거
 */
import { describe, it, expect, vi } from 'vitest';
import { startSourceWatcher } from '../../../src/editor/sourceWatcher';
import type { EditSessionRegistry } from '../../../src/editor/editSession';

/** 최소 EditSession mock (TSK-02-04 확장 필드 포함) */
function makeSession(uri: string, pendingSaveTokens: Set<number> = new Set()) {
  return {
    uri,
    mdStart: 0,
    mdEnd: 10,
    panel: { dispose: vi.fn() },
    openedDocVersion: 1,
    lastKnownDocVersion: 1,
    pendingSaveTokens,
  };
}

/** onDidChangeTextDocument 구독 헬퍼 */
function makeSubscribe() {
  type Handler = (e: { document: { uri: { toString(): string }; version: number } }) => void;
  let handler: Handler | null = null;
  const disposable = { dispose: vi.fn() };
  const subscribe = vi.fn((cb: Handler) => {
    handler = cb;
    return disposable;
  });
  const fire = (uri: string, version: number) => {
    handler?.({ document: { uri: { toString: () => uri }, version } });
  };
  return { subscribe, fire, disposable };
}

/** 최소 EditSessionRegistry mock */
function makeRegistry(sessions: ReturnType<typeof makeSession>[]): EditSessionRegistry {
  const map = new Map(sessions.map(s => [s.uri, s]));
  return {
    getActive: vi.fn((uri: string) => map.get(uri)),
    findByUri: vi.fn((uri: string) => map.get(uri)),
  } as unknown as EditSessionRegistry;
}

describe('startSourceWatcher', () => {
  it('활성 세션이 있는 URI 변경 시 broadcast가 호출된다', () => {
    const session = makeSession('file:///a.md');
    const registry = makeRegistry([session]);
    const { subscribe, fire } = makeSubscribe();
    const broadcast = vi.fn();

    startSourceWatcher(registry, broadcast, subscribe);
    fire('file:///a.md', 4);

    expect(broadcast).toHaveBeenCalledOnce();
    expect(broadcast).toHaveBeenCalledWith('file:///a.md', {
      type: 'source-updated',
      uri: 'file:///a.md',
      version: 4,
    });
  });

  it('활성 세션이 없는 URI 변경 시 broadcast가 호출되지 않는다', () => {
    const registry = makeRegistry([]);
    const { subscribe, fire } = makeSubscribe();
    const broadcast = vi.fn();

    startSourceWatcher(registry, broadcast, subscribe);
    fire('file:///no-session.md', 2);

    expect(broadcast).not.toHaveBeenCalled();
  });

  it('pendingSaveTokens에 해당 버전이 있으면 self-edit로 간주하고 broadcast를 억제한다', () => {
    const pendingTokens = new Set([5]);
    const session = makeSession('file:///b.md', pendingTokens);
    const registry = makeRegistry([session]);
    const { subscribe, fire } = makeSubscribe();
    const broadcast = vi.fn();

    startSourceWatcher(registry, broadcast, subscribe);
    fire('file:///b.md', 5);

    expect(broadcast).not.toHaveBeenCalled();
  });

  it('pendingSaveTokens에 없는 버전은 외부 변경으로 간주하고 broadcast가 발생한다', () => {
    const pendingTokens = new Set([5]);
    const session = makeSession('file:///b.md', pendingTokens);
    const registry = makeRegistry([session]);
    const { subscribe, fire } = makeSubscribe();
    const broadcast = vi.fn();

    startSourceWatcher(registry, broadcast, subscribe);
    fire('file:///b.md', 7);

    expect(broadcast).toHaveBeenCalledOnce();
  });

  it('dispose() 호출 후에는 변경 이벤트가 무시된다', () => {
    const session = makeSession('file:///c.md');
    const registry = makeRegistry([session]);
    const { subscribe, fire } = makeSubscribe();
    const broadcast = vi.fn();

    const { dispose } = startSourceWatcher(registry, broadcast, subscribe);
    dispose();
    fire('file:///c.md', 8);

    expect(broadcast).not.toHaveBeenCalled();
  });

  it('broadcast에 올바른 uri와 version이 전달된다', () => {
    const session = makeSession('file:///d.md');
    const registry = makeRegistry([session]);
    const { subscribe, fire } = makeSubscribe();
    const broadcast = vi.fn();

    startSourceWatcher(registry, broadcast, subscribe);
    fire('file:///d.md', 99);

    const [uri, msg] = broadcast.mock.calls[0] as [string, { type: string; uri: string; version: number }];
    expect(uri).toBe('file:///d.md');
    expect(msg.type).toBe('source-updated');
    expect(msg.uri).toBe('file:///d.md');
    expect(msg.version).toBe(99);
  });

  it('self-edit 억제 후 pendingSaveTokens에서 해당 버전이 제거된다', () => {
    const pendingTokens = new Set([3]);
    const session = makeSession('file:///e.md', pendingTokens);
    const registry = makeRegistry([session]);
    const { subscribe, fire } = makeSubscribe();
    const broadcast = vi.fn();

    startSourceWatcher(registry, broadcast, subscribe);
    fire('file:///e.md', 3);

    expect(pendingTokens.has(3)).toBe(false);
  });
});
