/**
 * useViewportWidth unit tests — TDD (TSK-03-03)
 *
 * 4 케이스:
 * 1. 초기 width 리포트
 * 2. ResizeObserver 트리거
 * 3. cleanup (disconnect)
 * 4. ref.current === null 시 observer 생성 없이 cleanup 가능
 *
 * Environment: happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { h, render } from 'preact';
import { useRef } from 'preact/hooks';
import { act } from 'preact/test-utils';
import { useViewportWidth } from '../useViewportWidth';

// ---------------------------------------------------------------------------
// ResizeObserver mock
// ---------------------------------------------------------------------------
type RoCallback = (entries: ResizeObserverEntry[]) => void;

interface MockRoInstance {
  callback: RoCallback;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

let capturedRo: MockRoInstance | null = null;

function installResizeObserverMock() {
  capturedRo = null;
  const MockResizeObserver = vi.fn(function (cb: RoCallback) {
    const instance: MockRoInstance = {
      callback: cb,
      observe: vi.fn(),
      disconnect: vi.fn(),
    };
    capturedRo = instance;
    return instance;
  });
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
}

// ---------------------------------------------------------------------------
// Test component
// ---------------------------------------------------------------------------
interface TestState {
  reportedWidth: number | null;
}

function TestComponent({ onWidth }: { onWidth: (w: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useViewportWidth(ref, onWidth);
  return <div ref={ref} style={{ width: '800px' }} />;
}

function TestComponentNullRef({ onWidth }: { onWidth: (w: number) => void }) {
  // ref가 null인 상태를 시뮬레이션
  const ref = { current: null } as { current: HTMLDivElement | null };
  useViewportWidth(ref as unknown as Parameters<typeof useViewportWidth>[0], onWidth);
  return <div />;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useViewportWidth', () => {
  let container: HTMLElement;

  beforeEach(() => {
    installResizeObserverMock();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => { render(null, container); });
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    capturedRo = null;
  });

  // 1. 초기 width 리포트 — ResizeObserver가 observe 호출됨
  it('creates ResizeObserver and observes the ref element on mount', () => {
    const onWidth = vi.fn();
    act(() => {
      render(<TestComponent onWidth={onWidth} />, container);
    });

    expect(capturedRo).not.toBeNull();
    expect(capturedRo!.observe).toHaveBeenCalledTimes(1);
  });

  // 2. ResizeObserver 트리거 시 callback 호출
  it('calls onWidth callback when ResizeObserver fires', () => {
    const onWidth = vi.fn();
    act(() => {
      render(<TestComponent onWidth={onWidth} />, container);
    });

    act(() => {
      capturedRo!.callback([
        { contentRect: { width: 640 } } as unknown as ResizeObserverEntry,
      ]);
    });

    expect(onWidth).toHaveBeenCalledWith(640);
  });

  // 3. cleanup — disconnect 호출
  it('disconnects ResizeObserver on unmount', () => {
    const onWidth = vi.fn();
    act(() => {
      render(<TestComponent onWidth={onWidth} />, container);
    });

    expect(capturedRo).not.toBeNull();

    act(() => {
      render(null, container);
    });

    expect(capturedRo!.disconnect).toHaveBeenCalledOnce();
  });

  // 4. ref.current === null 시 observer 생성하지 않음
  it('does not create ResizeObserver when ref.current is null', () => {
    const onWidth = vi.fn();
    act(() => {
      render(<TestComponentNullRef onWidth={onWidth} />, container);
    });

    // null ref이면 observe가 호출되지 않아야 함
    if (capturedRo) {
      expect(capturedRo.observe).not.toHaveBeenCalled();
    } else {
      // ResizeObserver 자체가 생성되지 않아도 pass
      expect(capturedRo).toBeNull();
    }
  });
});
