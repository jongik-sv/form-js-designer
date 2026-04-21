/**
 * TSK-04-02: axe bridge 단위 테스트
 *
 * testBridge.ts에 추가되는 axe 결과 bridge 로직 테스트:
 * - registerAxeResult / getAxeResult / clearAxeResult
 * - violation 필터링 (serious/critical만 실패 조건)
 * - timeout 처리 (waitForAxeResult)
 *
 * VSCode API를 사용하지 않으며 순수 로직만 테스트한다.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  registerAxeResult,
  getAxeResult,
  clearAxeResult,
  filterCriticalViolations,
  waitForAxeResult,
} from '../../src/testBridge';
import type { AxeViolation, AxeScanResult } from '../../src/testBridge';

describe('axeBridge: registerAxeResult / getAxeResult', () => {
  beforeEach(() => {
    clearAxeResult();
  });

  it('axe 결과를 webviewId로 저장하고 조회할 수 있다', () => {
    const result: AxeScanResult = {
      violations: [
        { id: 'color-contrast', impact: 'serious', description: '색상 대비 불충분', nodes: [] },
      ],
    };

    registerAxeResult('preview', result);
    const stored = getAxeResult('preview');

    expect(stored).toBeDefined();
    expect(stored!.violations).toHaveLength(1);
  });

  it('존재하지 않는 webviewId 조회 시 undefined를 반환한다', () => {
    expect(getAxeResult('nonexistent')).toBeUndefined();
  });

  it('동일 webviewId에 결과를 두 번 등록하면 최신 값으로 덮어쓴다', () => {
    const result1: AxeScanResult = { violations: [{ id: 'v1', impact: 'critical', description: '', nodes: [] }] };
    const result2: AxeScanResult = { violations: [] };

    registerAxeResult('preview', result1);
    registerAxeResult('preview', result2);

    expect(getAxeResult('preview')!.violations).toHaveLength(0);
  });

  it('여러 webviewId의 결과를 독립적으로 저장한다', () => {
    const r1: AxeScanResult = { violations: [{ id: 'v1', impact: 'serious', description: '', nodes: [] }] };
    const r2: AxeScanResult = { violations: [] };

    registerAxeResult('preview', r1);
    registerAxeResult('custom-editor', r2);

    expect(getAxeResult('preview')!.violations).toHaveLength(1);
    expect(getAxeResult('custom-editor')!.violations).toHaveLength(0);
  });
});

describe('axeBridge: clearAxeResult', () => {
  beforeEach(() => {
    clearAxeResult();
  });

  it('clearAxeResult(id)는 해당 webviewId의 결과만 제거한다', () => {
    registerAxeResult('preview', { violations: [] });
    registerAxeResult('editor', { violations: [] });

    clearAxeResult('preview');

    expect(getAxeResult('preview')).toBeUndefined();
    expect(getAxeResult('editor')).toBeDefined();
  });

  it('clearAxeResult()는 모든 결과를 제거한다', () => {
    registerAxeResult('preview', { violations: [] });
    registerAxeResult('editor', { violations: [] });

    clearAxeResult();

    expect(getAxeResult('preview')).toBeUndefined();
    expect(getAxeResult('editor')).toBeUndefined();
  });
});

describe('filterCriticalViolations', () => {
  it('serious/critical 위반만 반환한다', () => {
    const violations: AxeViolation[] = [
      { id: 'v1', impact: 'critical', description: '', nodes: [] },
      { id: 'v2', impact: 'serious', description: '', nodes: [] },
      { id: 'v3', impact: 'moderate', description: '', nodes: [] },
      { id: 'v4', impact: 'minor', description: '', nodes: [] },
    ];

    const filtered = filterCriticalViolations(violations);

    expect(filtered).toHaveLength(2);
    expect(filtered.map((v) => v.id)).toContain('v1');
    expect(filtered.map((v) => v.id)).toContain('v2');
  });

  it('빈 배열이면 빈 배열을 반환한다', () => {
    expect(filterCriticalViolations([])).toHaveLength(0);
  });

  it('moderate/minor만 있으면 빈 배열을 반환한다 (테스트 통과)', () => {
    const violations: AxeViolation[] = [
      { id: 'v1', impact: 'moderate', description: '', nodes: [] },
      { id: 'v2', impact: 'minor', description: '', nodes: [] },
    ];
    expect(filterCriticalViolations(violations)).toHaveLength(0);
  });
});

describe('waitForAxeResult', () => {
  beforeEach(() => {
    clearAxeResult();
    vi.useFakeTimers();
  });

  it('결과가 이미 등록된 경우 즉시 resolve한다', async () => {
    const result: AxeScanResult = { violations: [] };
    registerAxeResult('preview', result);

    const promise = waitForAxeResult('preview', 15000);
    await vi.runAllTimersAsync();

    const resolved = await promise;
    expect(resolved).toEqual(result);
  });

  it('결과가 없으면 timeout 후 reject한다', async () => {
    vi.useRealTimers();
    await expect(waitForAxeResult('missing', 50)).rejects.toThrow(/timeout/i);
  });

  it('대기 중 결과가 등록되면 resolve한다', async () => {
    vi.useRealTimers();

    const result: AxeScanResult = { violations: [] };
    const promise = waitForAxeResult('delayed', 500);

    // 100ms 후 결과 등록 시뮬레이션
    setTimeout(() => registerAxeResult('delayed', result), 100);

    const resolved = await promise;
    expect(resolved).toEqual(result);
  });
});
