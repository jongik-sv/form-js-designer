/**
 * TSK-01-04: waitForElement 헬퍼 단위 테스트
 *
 * 50ms 간격 폴링으로 fn()이 truthy가 될 때까지 최대 timeoutMs 대기.
 * 타임아웃 초과 시 TimeoutError를 throw한다.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitForElement } from '../../test/integration/helpers/waitForElement';

describe('waitForElement: 기본 동작', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fn()이 즉시 truthy를 반환하면 바로 resolve된다', async () => {
    const fn = vi.fn().mockReturnValue(true);

    const promise = waitForElement(fn, 1000);
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toBe(true);
    expect(fn).toHaveBeenCalled();
  });

  it('fn()이 처음에는 falsy이다가 나중에 truthy가 되면 resolve된다', async () => {
    let callCount = 0;
    const fn = vi.fn(() => {
      callCount++;
      return callCount >= 3 ? 'ready' : null; // 3번째 호출부터 truthy
    });

    const promise = waitForElement(fn, 5000);
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toBe('ready');
    expect(callCount).toBeGreaterThanOrEqual(3);
  });

  it('타임아웃 초과 시 TimeoutError를 throw한다', async () => {
    const fn = vi.fn().mockReturnValue(false);

    const promise = waitForElement(fn, 500);
    // catch before runAllTimers to avoid unhandled rejection
    const caught = promise.catch((e: unknown) => e);
    await vi.runAllTimersAsync();

    const err = await caught;
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/timed out/i);
  });

  it('TimeoutError 메시지에 타임아웃 값이 포함된다', async () => {
    const fn = vi.fn().mockReturnValue(false);
    const timeoutMs = 500;

    const promise = waitForElement(fn, timeoutMs);
    const caught = promise.catch((e: unknown) => e);
    await vi.runAllTimersAsync();

    const err = await caught;
    expect((err as Error).message).toContain(`${timeoutMs}`);
  });

  it('50ms 간격으로 fn()을 폴링한다', async () => {
    let resolved = false;
    const fn = vi.fn(() => (resolved ? 'done' : null));

    const promise = waitForElement(fn, 5000);

    // 50ms 후 폴링 확인
    await vi.advanceTimersByTimeAsync(50);
    const callsAfter50ms = fn.mock.calls.length;
    expect(callsAfter50ms).toBeGreaterThanOrEqual(1);

    // 추가 50ms 후 더 호출됨
    await vi.advanceTimersByTimeAsync(50);
    expect(fn.mock.calls.length).toBeGreaterThan(callsAfter50ms);

    // resolve 시킴
    resolved = true;
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe('done');
  });
});

describe('waitForElement: 기본 타임아웃', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('timeoutMs 기본값 15000ms 미지정 시 15s 후 타임아웃된다', async () => {
    const fn = vi.fn().mockReturnValue(false);

    const promise = waitForElement(fn);
    const caught = promise.catch((e: unknown) => e);

    // 15001ms 진행 후 reject
    await vi.advanceTimersByTimeAsync(15001);
    const err = await caught;
    expect((err as Error).message).toContain('15000');
  });
});
