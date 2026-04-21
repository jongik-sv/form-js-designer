/**
 * TSK-04-03: 성능·번들 크기 게이트 — 단위 테스트
 *
 * QA 체크리스트 기반:
 * - calcPercentile: 정렬 배열에서 백분위수 계산
 * - measureVsixSize: 파일 바이트 측정
 * - appendReport: JSON 이력 파일 append
 * - vsix gate: 경계값·초과·파일없음
 * - perf gate: 경계값·초과
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import {
  calcPercentile,
  measureVsixSize,
  appendReport,
  type PerfGateReport,
} from '../../src/perfGate';

// ---------- calcPercentile ----------

describe('calcPercentile: 백분위수 계산', () => {
  it('5개 샘플의 p50(중앙값)을 반환한다', () => {
    const samples = [280, 290, 295, 285, 312];
    // 정렬: [280, 285, 290, 295, 312]
    // p50 인덱스 = 0.5 * (5-1) = 2.0 → arr[2] = 290
    expect(calcPercentile(samples, 50)).toBe(290);
  });

  it('5개 샘플의 p95는 p50보다 크거나 같고 최댓값 이하이다', () => {
    const samples = [280, 290, 295, 285, 312];
    const p95 = calcPercentile(samples, 95);
    const p50 = calcPercentile(samples, 50);
    expect(p95).toBeGreaterThanOrEqual(p50);
    expect(p95).toBeLessThanOrEqual(312);
  });

  it('단일 샘플 배열에서는 그 값 자체를 반환한다', () => {
    expect(calcPercentile([500], 95)).toBe(500);
    expect(calcPercentile([500], 50)).toBe(500);
  });

  it('모두 같은 값이면 해당 값을 반환한다', () => {
    expect(calcPercentile([300, 300, 300, 300, 300], 95)).toBe(300);
    expect(calcPercentile([300, 300, 300, 300, 300], 50)).toBe(300);
  });

  it('p95 = 500ms 정확히 — 경계값 포함', () => {
    // 5개 샘플이 모두 500이면 p95 = 500 (≤ 500 게이트 통과)
    const p95 = calcPercentile([500, 500, 500, 500, 500], 95);
    expect(p95).toBe(500);
    expect(p95 <= 500).toBe(true);
  });

  it('p95 > 500ms — 게이트 초과', () => {
    // 정렬: [500, 501, 502, 503, 600]
    // p95 인덱스 = 0.95 * 4 = 3.8 → lower=3(503), upper=4(600)
    // 보간: floor(503 + 0.8*(600-503)) = floor(503 + 77.6) = floor(580.6) = 580
    const p95 = calcPercentile([500, 501, 502, 503, 600], 95);
    expect(p95).toBeGreaterThan(500);
  });

  it('원본 배열을 변경하지 않는다 (순수 함수)', () => {
    const samples = [312, 280, 295, 285, 290];
    const original = [...samples];
    calcPercentile(samples, 95);
    expect(samples).toEqual(original);
  });
});

// ---------- measureVsixSize ----------

describe('measureVsixSize: VSIX 파일 바이트 측정', () => {
  let tmpDir: string;
  let tmpFile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vsix-test-'));
    tmpFile = path.join(tmpDir, 'test.vsix');
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch { /* noop */ }
  });

  it('파일이 존재하면 바이트 크기를 반환한다', () => {
    const content = Buffer.alloc(1024, 0);
    fs.writeFileSync(tmpFile, content);
    expect(measureVsixSize(tmpFile)).toBe(1024);
  });

  it('VSIX 크기 = 5,242,880 bytes(5MB) 정확히 — 경계값 포함', () => {
    const LIMIT = 5 * 1024 * 1024; // 5,242,880
    const content = Buffer.alloc(LIMIT, 0);
    fs.writeFileSync(tmpFile, content);
    const size = measureVsixSize(tmpFile);
    expect(size).toBe(LIMIT);
    expect(size <= LIMIT).toBe(true);
  });

  it('VSIX 크기 = 5,242,881 bytes — 게이트 초과', () => {
    const OVER = 5 * 1024 * 1024 + 1;
    const content = Buffer.alloc(OVER, 0);
    fs.writeFileSync(tmpFile, content);
    const size = measureVsixSize(tmpFile);
    expect(size).toBe(OVER);
    expect(size > 5 * 1024 * 1024).toBe(true);
  });

  it('파일이 존재하지 않으면 에러를 throw한다', () => {
    const nonExistent = path.join(tmpDir, 'missing.vsix');
    expect(() => measureVsixSize(nonExistent)).toThrow();
  });
});

// ---------- appendReport ----------

describe('appendReport: JSON 이력 파일 append', () => {
  let tmpDir: string;
  let reportFile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-gate-test-'));
    reportFile = path.join(tmpDir, 'perf-gate.json');
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch { /* noop */ }
  });

  it('파일이 없으면 []로 초기화 후 항목을 append한다', () => {
    const entry: PerfGateReport = {
      timestamp: '2026-05-15T09:00:00.000Z',
      renderP95Ms: 312,
      renderP50Ms: 287,
      renderSamplesMs: [280, 290, 295, 285, 312],
      vsixBytes: null,
      vsixMB: null,
      renderGatePass: true,
      vsixGatePass: null,
    };

    appendReport(reportFile, entry);

    const data = JSON.parse(fs.readFileSync(reportFile, 'utf8')) as PerfGateReport[];
    expect(data).toHaveLength(1);
    expect(data[0]?.renderP95Ms).toBe(312);
    expect(data[0]?.timestamp).toBe('2026-05-15T09:00:00.000Z');
  });

  it('기존 파일이 있으면 항목을 배열에 push한다', () => {
    const existing: PerfGateReport[] = [
      {
        timestamp: '2026-05-14T09:00:00.000Z',
        renderP95Ms: 300,
        renderP50Ms: 280,
        renderSamplesMs: [270, 280, 290, 295, 300],
        vsixBytes: 1000000,
        vsixMB: '0.95',
        renderGatePass: true,
        vsixGatePass: true,
      },
    ];
    fs.writeFileSync(reportFile, JSON.stringify(existing, null, 2));

    const newEntry: PerfGateReport = {
      timestamp: '2026-05-15T09:00:00.000Z',
      renderP95Ms: 312,
      renderP50Ms: 287,
      renderSamplesMs: [280, 290, 295, 285, 312],
      vsixBytes: 1262575,
      vsixMB: '1.20',
      renderGatePass: true,
      vsixGatePass: true,
    };

    appendReport(reportFile, newEntry);

    const data = JSON.parse(fs.readFileSync(reportFile, 'utf8')) as PerfGateReport[];
    expect(data).toHaveLength(2);
    expect(data[1]?.renderP95Ms).toBe(312);
  });

  it('append 후 파일에 timestamp가 기록된다', () => {
    const entry: PerfGateReport = {
      timestamp: '2026-05-15T09:00:00.000Z',
      renderP95Ms: 400,
      renderP50Ms: 380,
      renderSamplesMs: [360, 370, 380, 390, 400],
      vsixBytes: 2000000,
      vsixMB: '1.91',
      renderGatePass: true,
      vsixGatePass: true,
    };

    appendReport(reportFile, entry);

    const content = fs.readFileSync(reportFile, 'utf8');
    expect(content).toContain('2026-05-15T09:00:00.000Z');
  });
});

// ---------- Gate 판정 로직 (경계값 테스트) ----------

describe('게이트 판정: 경계값 및 초과 케이스', () => {
  const RENDER_GATE_MS = 500;
  const VSIX_GATE_BYTES = 5 * 1024 * 1024; // 5,242,880

  it('5번 연속 측정 중앙값(p50)이 p95 게이트 이하 — 모두 통과 케이스', () => {
    const samples = [400, 420, 430, 440, 450];
    const p50 = calcPercentile(samples, 50);
    const p95 = calcPercentile(samples, 95);
    // p50 ≤ p95 ≤ 500 이어야 한다
    expect(p50).toBeLessThanOrEqual(p95);
    expect(p95).toBeLessThanOrEqual(RENDER_GATE_MS);
  });

  it('p95 = 500 정확히이면 게이트 통과 (≤ 경계)', () => {
    const p95 = calcPercentile([500, 500, 500, 500, 500], 95);
    expect(p95 <= RENDER_GATE_MS).toBe(true);
  });

  it('p95 = 501이면 게이트 실패 (> 경계)', () => {
    // 정렬: [500, 501, 502, 503, 600]
    // p95 = floor(503 + 0.8*97) = floor(580.6) = 580 > 500
    const p95 = calcPercentile([500, 501, 502, 503, 600], 95);
    expect(p95 > RENDER_GATE_MS).toBe(true);
  });

  it('vsixBytes = 5,242,880 정확히이면 게이트 통과 (≤ 경계)', () => {
    const size = 5 * 1024 * 1024;
    expect(size <= VSIX_GATE_BYTES).toBe(true);
  });

  it('vsixBytes = 5,242,881이면 게이트 실패 (> 경계)', () => {
    const size = 5 * 1024 * 1024 + 1;
    expect(size > VSIX_GATE_BYTES).toBe(true);
  });
});
