/**
 * TSK-04-03: 성능·번들 크기 게이트 — 공유 헬퍼 (단위 테스트 가능)
 *
 * perf-gate.mjs 및 vsix-size-gate.mjs에서 사용하는 순수 함수들을 export한다.
 * Node.js / Vitest 양쪽 환경에서 동작한다.
 */

import * as fs from 'node:fs';

// ---- 타입 ----

export interface PerfGateReport {
  /** ISO 8601 타임스탬프 */
  timestamp: string;
  /** 렌더 p95 (ms). perf 측정 미수행 시 null */
  renderP95Ms: number | null;
  /** 렌더 p50 (ms). perf 측정 미수행 시 null */
  renderP50Ms: number | null;
  /** 5회 측정 원본 샘플 (ms). perf 측정 미수행 시 null */
  renderSamplesMs: number[] | null;
  /** .vsix 파일 바이트 크기. vsix 측정 미수행 시 null */
  vsixBytes: number | null;
  /** .vsix 파일 크기 (MB, 소수점 2자리). vsix 측정 미수행 시 null */
  vsixMB: string | null;
  /** 렌더 p95 ≤ 500ms 게이트 통과 여부. perf 측정 미수행 시 null */
  renderGatePass: boolean | null;
  /** .vsix ≤ 5MB 게이트 통과 여부. vsix 측정 미수행 시 null */
  vsixGatePass: boolean | null;
}

// ---- 순수 함수 ----

/**
 * 정렬된 배열에서 p번째 백분위수 값을 선형 보간으로 계산한다.
 * 원본 배열을 변경하지 않는다 (pure function).
 *
 * @param arr  입력 배열 (비어있지 않아야 함)
 * @param p    백분위수 (0~100)
 * @returns    보간된 백분위수 값 (정수 반환, 소수점 버림)
 */
export function calcPercentile(arr: number[], p: number): number {
  if (arr.length === 0) {
    throw new Error('calcPercentile: 배열이 비어있습니다');
  }
  if (arr.length === 1) {
    return arr[0] as number;
  }

  // 원본 배열을 복사하여 정렬
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sorted[lower] as number;
  }

  const fraction = index - lower;
  const lo = sorted[lower] as number;
  const hi = sorted[upper] as number;
  // 선형 보간 후 소수점 버림
  return Math.floor(lo + fraction * (hi - lo));
}

/**
 * .vsix 파일의 바이트 크기를 반환한다.
 * 파일이 존재하지 않으면 에러를 throw한다.
 *
 * @param vsixPath  .vsix 파일의 절대 경로
 * @returns         바이트 크기
 */
export function measureVsixSize(vsixPath: string): number {
  return fs.statSync(vsixPath).size;
}

/**
 * reports/perf-gate.json에 새 항목을 append한다.
 * 파일이 없으면 []로 초기화한다.
 *
 * @param reportPath  보고서 파일의 절대 경로
 * @param entry       추가할 레코드
 */
export function appendReport(reportPath: string, entry: PerfGateReport): void {
  let records: PerfGateReport[] = [];

  if (fs.existsSync(reportPath)) {
    try {
      const raw = fs.readFileSync(reportPath, 'utf8');
      records = JSON.parse(raw) as PerfGateReport[];
    } catch {
      // 파싱 실패 시 빈 배열로 초기화
      records = [];
    }
  }

  records.push(entry);
  fs.writeFileSync(reportPath, JSON.stringify(records, null, 2) + '\n', 'utf8');
}
