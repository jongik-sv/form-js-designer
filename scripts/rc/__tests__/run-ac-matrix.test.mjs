/**
 * run-ac-matrix.test.mjs — AC 매트릭스 오케스트레이터 유닛 테스트
 * TSK-10-01: Vitest Node 환경, fake-exec 기반
 *
 * QA 체크리스트 근거:
 * - (정상) 오케스트레이터가 ac-matrix.yaml 파싱 후 AC별 spec 집계
 * - (정상) failed=0, total≥120, exit 0 반환
 * - (엣지) 누락된 spec 파일은 status:"missing" + exit 1
 * - (에러) ac-matrix.yaml 스키마 위반 시 exit 2 + 명확한 에러 메시지
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as path from 'node:path';
import * as url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const SCRIPTS_ROOT = path.resolve(__dirname, '../..');
const RC_SCRIPT = path.join(SCRIPTS_ROOT, 'rc', 'run-ac-matrix.mjs');

// --- 동적 import를 위한 헬퍼: 모듈을 격리하여 불러오는 방식
// run-ac-matrix.mjs에서 export하는 순수 함수들만 직접 테스트
// (main()은 CLI 호출이므로 순수 함수 단위로 테스트)

let loadMatrix, aggregateResults, buildMissingReport;

beforeEach(async () => {
  // 각 테스트에서 신선한 모듈 불러오기 (캐시 busting)
  const m = await import(RC_SCRIPT + `?t=${Date.now()}`);
  loadMatrix = m.loadMatrix;
  aggregateResults = m.aggregateResults;
  buildMissingReport = m.buildMissingReport;
});

// --- 1. loadMatrix 테스트

describe('loadMatrix()', () => {
  it('유효한 ac-matrix.yaml을 파싱하여 AcMatrix를 반환한다', async () => {
    const yamlPath = path.join(__dirname, '../../../docs/tasks/TSK-10-01/ac-matrix.yaml');
    const matrix = await loadMatrix(yamlPath);
    expect(matrix).toBeDefined();
    expect(Array.isArray(matrix.entries)).toBe(true);
    expect(matrix.entries.length).toBeGreaterThanOrEqual(1);
  });

  it('각 엔트리는 ac, specs 필드를 가진다', async () => {
    const yamlPath = path.join(__dirname, '../../../docs/tasks/TSK-10-01/ac-matrix.yaml');
    const matrix = await loadMatrix(yamlPath);
    for (const entry of matrix.entries) {
      // ac는 number 또는 string(예: "4-1") 모두 허용
      expect(['number', 'string']).toContain(typeof entry.ac);
      expect(entry.ac).toBeDefined();
      expect(Array.isArray(entry.specs)).toBe(true);
    }
  });

  it('각 spec은 path, kind(unit|e2e), expectedCases 필드를 가진다', async () => {
    const yamlPath = path.join(__dirname, '../../../docs/tasks/TSK-10-01/ac-matrix.yaml');
    const matrix = await loadMatrix(yamlPath);
    for (const entry of matrix.entries) {
      for (const spec of entry.specs) {
        expect(typeof spec.path).toBe('string');
        expect(['unit', 'e2e']).toContain(spec.kind);
        expect(typeof spec.expectedCases).toBe('number');
      }
    }
  });

  it('스키마 위반(ac 필드 없는 엔트리) 시 에러를 throw한다', async () => {
    // 임시 fixture: ac 필드 없는 잘못된 YAML
    const fixture = path.join(__dirname, 'fixtures', 'invalid-no-ac.yaml');
    await expect(loadMatrix(fixture)).rejects.toThrow();
  });

  it('파일이 없으면 에러를 throw한다', async () => {
    await expect(loadMatrix('/nonexistent/path.yaml')).rejects.toThrow();
  });
});

// --- 2. aggregateResults 테스트

describe('aggregateResults()', () => {
  it('모든 spec이 통과하면 failed=0, total이 예상케이스 합계 (≥120 케이스)', () => {
    // 120+ 케이스를 시뮬레이션: AC#1(6) + AC#5(1) + 나머지(113)
    const results = [
      { ac: 1, path: 'a.spec.ts', kind: 'e2e', expectedCases: 6, passed: 6, failed: 0, skipped: 0, status: 'pass' },
      { ac: 5, path: 'b.test.ts', kind: 'unit', expectedCases: 1, passed: 1, failed: 0, skipped: 0, status: 'pass' },
      // 나머지 AC를 채워 총 120 이상
      ...Array.from({ length: 113 }, (_, i) => ({
        ac: i + 10,
        path: `spec${i}.ts`,
        kind: 'e2e',
        expectedCases: 1,
        passed: 1,
        failed: 0,
        skipped: 0,
        status: 'pass',
      })),
    ];
    const report = aggregateResults(results);
    expect(report.totalPassed).toBe(120);
    expect(report.totalFailed).toBe(0);
    expect(report.totalExpected).toBe(120);
    expect(report.overallStatus).toBe('PASS');
  });

  it('하나라도 failed>0 이면 overallStatus가 FAIL', () => {
    const results = [
      { ac: 1, path: 'a.spec.ts', kind: 'e2e', expectedCases: 6, passed: 5, failed: 1, skipped: 0, status: 'fail' },
    ];
    const report = aggregateResults(results);
    expect(report.overallStatus).toBe('FAIL');
  });

  it('totalPassed < 120 이면 overallStatus가 FAIL (phase-1-plan §4 요구)', () => {
    // 100개만 통과
    const results = Array.from({ length: 10 }, (_, i) => ({
      ac: i + 1,
      path: `spec${i}.ts`,
      kind: 'e2e',
      expectedCases: 10,
      passed: 10,
      failed: 0,
      skipped: 0,
      status: 'pass',
    }));
    const report = aggregateResults(results);
    expect(report.totalPassed).toBe(100);
    expect(report.overallStatus).toBe('FAIL'); // 120 미달
  });

  it('totalPassed >= 120이고 failed=0이면 PASS', () => {
    const results = Array.from({ length: 12 }, (_, i) => ({
      ac: i + 1,
      path: `spec${i}.ts`,
      kind: 'e2e',
      expectedCases: 10,
      passed: 10,
      failed: 0,
      skipped: 0,
      status: 'pass',
    }));
    const report = aggregateResults(results);
    expect(report.totalPassed).toBe(120);
    expect(report.overallStatus).toBe('PASS');
  });

  it('spec status가 missing이면 overallStatus가 FAIL', () => {
    const results = [
      { ac: 2, path: 'ai-skill.spec.ts', kind: 'e2e', expectedCases: 8, passed: 0, failed: 0, skipped: 0, status: 'missing' },
    ];
    const report = aggregateResults(results);
    expect(report.overallStatus).toBe('FAIL');
  });

  it('결과에 AC별 상세 정보가 포함된다', () => {
    const results = [
      { ac: 1, path: 'a.spec.ts', kind: 'e2e', expectedCases: 6, passed: 6, failed: 0, skipped: 0, status: 'pass' },
      { ac: 1, path: 'b.spec.ts', kind: 'e2e', expectedCases: 36, passed: 36, failed: 0, skipped: 0, status: 'pass' },
    ];
    const report = aggregateResults(results);
    expect(report.byAc).toBeDefined();
    const ac1 = report.byAc[1];
    expect(ac1.passed).toBe(42);
    expect(ac1.failed).toBe(0);
  });
});

// --- 3. buildMissingReport 테스트

describe('buildMissingReport()', () => {
  it('존재하지 않는 spec 파일에 대해 status:missing 엔트리를 반환한다', async () => {
    const specs = [
      { ac: 2, path: '/nonexistent/ai-skill.spec.ts', kind: 'e2e', expectedCases: 8 },
    ];
    const results = await buildMissingReport(specs);
    expect(results[0].status).toBe('missing');
    expect(results[0].passed).toBe(0);
  });

  it('존재하는 spec 파일은 status:pending을 반환한다', async () => {
    // 실제 존재하는 파일 경로 사용
    const existingSpec = path.join(
      __dirname,
      '../../../packages/designer-editor-host/e2e/editor.dragdrop.spec.ts'
    );
    const specs = [{ ac: 1, path: existingSpec, kind: 'e2e', expectedCases: 6 }];
    const results = await buildMissingReport(specs);
    expect(results[0].status).toBe('pending'); // 존재하지만 실행하지 않음
  });
});
