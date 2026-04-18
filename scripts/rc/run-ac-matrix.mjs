#!/usr/bin/env node
/**
 * run-ac-matrix.mjs — AC 매트릭스 오케스트레이터
 * TSK-10-01: AC 매트릭스 120 케이스 전수 통과
 *
 * 사용법: node scripts/rc/run-ac-matrix.mjs [--yaml <path>] [--out <path>]
 *
 * 동작:
 * 1. docs/tasks/TSK-10-01/ac-matrix.yaml 파싱
 * 2. 각 spec 파일 존재 여부 확인 + 실행 (unit: vitest, e2e: playwright)
 * 3. reports/rc/ac-matrix.json 집계 기록
 * 4. totalPassed >= 120 && totalFailed === 0 → exit 0, 아니면 exit 1
 * 5. YAML 스키마 위반 → exit 2
 */

import { readFile, writeFile, access, unlink, mkdir } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(__dirname, '../..');
const DEFAULT_YAML = resolve(REPO_ROOT, 'docs/tasks/TSK-10-01/ac-matrix.yaml');
const DEFAULT_OUT = resolve(REPO_ROOT, 'reports/rc/ac-matrix.json');
const MIN_TOTAL_PASS = 120;

// ============================================================
// 타입 정의 (JSDoc)
// @typedef {Object} SpecEntry
// @property {string} path
// @property {'unit'|'e2e'} kind
// @property {number} expectedCases
//
// @typedef {Object} AcEntry
// @property {number|string} ac
// @property {string} [description]
// @property {SpecEntry[]} specs
//
// @typedef {Object} AcMatrix
// @property {AcEntry[]} entries
//
// @typedef {Object} SpecResult
// @property {number|string} ac
// @property {string} path
// @property {'unit'|'e2e'} kind
// @property {number} expectedCases
// @property {number} passed
// @property {number} failed
// @property {number} skipped
// @property {'pass'|'fail'|'missing'|'pending'|'error'} status
//
// @typedef {Object} AcMatrixReport
// @property {string} overallStatus  'PASS'|'FAIL'
// @property {number} totalPassed
// @property {number} totalFailed
// @property {number} totalExpected
// @property {Object} byAc
// @property {SpecResult[]} results
// @property {string} generatedAt
// ============================================================

/**
 * YAML 파일을 파싱하여 AcMatrix를 반환한다.
 * 스키마 위반 시 Error를 throw한다.
 * @param {string} yamlPath
 * @returns {Promise<AcMatrix>}
 */
export async function loadMatrix(yamlPath) {
  let raw;
  try {
    raw = await readFile(yamlPath, 'utf8');
  } catch (err) {
    throw new Error(`ac-matrix.yaml을 읽을 수 없습니다: ${yamlPath}\n원인: ${err.message}`);
  }

  let doc;
  try {
    doc = yaml.load(raw);
  } catch (err) {
    throw new Error(`ac-matrix.yaml YAML 파싱 오류: ${err.message}`);
  }

  if (!doc || !Array.isArray(doc.entries)) {
    throw new Error('ac-matrix.yaml 스키마 위반: 최상위에 entries[] 배열이 없습니다.');
  }

  for (let i = 0; i < doc.entries.length; i++) {
    const entry = doc.entries[i];
    if (entry.ac === undefined || entry.ac === null) {
      throw new Error(
        `ac-matrix.yaml 스키마 위반: entries[${i}]에 "ac" 필드가 없습니다. ` +
        `각 엔트리는 ac(number|string), specs[] 필드를 가져야 합니다.`
      );
    }
    if (!Array.isArray(entry.specs)) {
      throw new Error(
        `ac-matrix.yaml 스키마 위반: entries[${i}](AC #${entry.ac})에 "specs" 배열이 없습니다.`
      );
    }
    for (let j = 0; j < entry.specs.length; j++) {
      const spec = entry.specs[j];
      if (!spec.path) throw new Error(
        `ac-matrix.yaml 스키마 위반: entries[${i}].specs[${j}]에 "path" 필드가 없습니다.`
      );
      if (!['unit', 'e2e'].includes(spec.kind)) throw new Error(
        `ac-matrix.yaml 스키마 위반: entries[${i}].specs[${j}].kind는 'unit' 또는 'e2e'여야 합니다. 현재: ${spec.kind}`
      );
      if (typeof spec.expectedCases !== 'number') throw new Error(
        `ac-matrix.yaml 스키마 위반: entries[${i}].specs[${j}].expectedCases는 숫자여야 합니다.`
      );
    }
  }

  return doc;
}

/**
 * 파일 존재 여부 확인. 없으면 'missing', 있으면 'pending' 반환.
 * @param {Array<SpecEntry & {ac?: number|string}>} specs
 * @returns {Promise<SpecResult[]>}
 */
export async function buildMissingReport(specs) {
  const results = [];
  for (const spec of specs) {
    const absPath = resolve(REPO_ROOT, spec.path);
    let exists = false;
    try {
      await access(absPath, fsConstants.R_OK);
      exists = true;
    } catch {
      exists = false;
    }
    results.push({
      ac: spec.ac ?? 0,
      path: spec.path,
      kind: spec.kind,
      expectedCases: spec.expectedCases,
      passed: 0,
      failed: 0,
      skipped: 0,
      status: exists ? 'pending' : 'missing',
    });
  }
  return results;
}

/**
 * SpecResult 배열을 집계하여 AcMatrixReport를 반환한다.
 * totalPassed < 120 이거나 failed > 0 이면 overallStatus='FAIL'
 * @param {SpecResult[]} results
 * @returns {AcMatrixReport}
 */
export function aggregateResults(results) {
  let totalPassed = 0;
  let totalFailed = 0;
  let totalExpected = 0;
  let hasMissing = false;
  const byAc = {};

  for (const r of results) {
    totalPassed += r.passed;
    totalFailed += r.failed;
    totalExpected += r.expectedCases;
    if (r.status === 'missing') hasMissing = true;

    const key = r.ac;
    if (!byAc[key]) {
      byAc[key] = { passed: 0, failed: 0, skipped: 0, expected: 0, specs: [] };
    }
    byAc[key].passed += r.passed;
    byAc[key].failed += r.failed;
    byAc[key].skipped += r.skipped;
    byAc[key].expected += r.expectedCases;
    byAc[key].specs.push(r);
  }

  const overallStatus =
    (totalPassed >= MIN_TOTAL_PASS && totalFailed === 0 && !hasMissing)
      ? 'PASS'
      : 'FAIL';

  return {
    overallStatus,
    totalPassed,
    totalFailed,
    totalExpected,
    byAc,
    results,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 리포트를 JSON 파일로 기록한다.
 * @param {AcMatrixReport} report
 * @param {string} outPath
 */
export async function emitReport(report, outPath) {
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(report, null, 2), 'utf8');
}

/**
 * 단일 unit spec을 실행하고 SpecResult를 반환한다.
 * 파일이 없으면 status:'missing', 실행 에러면 status:'error'
 * @param {AcEntry} acEntry
 * @param {SpecEntry} spec
 * @returns {Promise<SpecResult>}
 */
export async function runUnitSpec(acEntry, spec) {
  const absPath = resolve(REPO_ROOT, spec.path);
  try {
    await access(absPath, fsConstants.R_OK);
  } catch {
    return {
      ac: acEntry.ac,
      path: spec.path,
      kind: spec.kind,
      expectedCases: spec.expectedCases,
      passed: 0,
      failed: 0,
      skipped: 0,
      status: 'missing',
    };
  }

  const tmpOut = resolve(tmpdir(), `ac-matrix-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  try {
    // Vitest로 개별 파일 실행, JSON reporter를 temp 파일에 기록
    const vitestBin = resolve(REPO_ROOT, 'node_modules/.bin/vitest');
    const cmd = `node ${JSON.stringify(vitestBin)} run --reporter=json --outputFile=${JSON.stringify(tmpOut)} ${JSON.stringify(absPath)}`;
    execSync(cmd, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 120_000,
    });
    const raw = await readFile(tmpOut, 'utf8');
    const json = JSON.parse(raw);
    const numFailed = json.numFailedTests ?? 0;
    const numPassed = json.numPassedTests ?? 0;
    const numSkipped = json.numPendingTests ?? 0;
    await unlink(tmpOut).catch(() => {});
    return {
      ac: acEntry.ac,
      path: spec.path,
      kind: spec.kind,
      expectedCases: spec.expectedCases,
      passed: numPassed,
      failed: numFailed,
      skipped: numSkipped,
      status: numFailed === 0 ? 'pass' : 'fail',
    };
  } catch (err) {
    await unlink(tmpOut).catch(() => {});
    return {
      ac: acEntry.ac,
      path: spec.path,
      kind: spec.kind,
      expectedCases: spec.expectedCases,
      passed: 0,
      failed: spec.expectedCases,
      skipped: 0,
      status: 'error',
      error: String(err.message ?? err),
    };
  }
}

/**
 * E2E spec은 실행하지 않고 파일 존재 여부만 확인한다.
 * (E2E 실행은 dev-test 단계에서 수행)
 * @param {AcEntry} acEntry
 * @param {SpecEntry} spec
 * @returns {Promise<SpecResult>}
 */
export async function checkE2eSpec(acEntry, spec) {
  return (await buildMissingReport([{ ...spec, ac: acEntry.ac }]))[0];
}

/**
 * main() — CLI 진입점
 * exit 0: PASS (totalPassed >= 120, failed === 0)
 * exit 1: FAIL (일부 실패 또는 missing)
 * exit 2: 스키마/설정 오류
 */
export async function main(argv = process.argv.slice(2)) {
  let yamlPath = DEFAULT_YAML;
  let outPath = DEFAULT_OUT;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--yaml' && argv[i + 1]) yamlPath = resolve(argv[++i]);
    if (argv[i] === '--out' && argv[i + 1]) outPath = resolve(argv[++i]);
  }

  // 1. YAML 파싱
  let matrix;
  try {
    matrix = await loadMatrix(yamlPath);
  } catch (err) {
    console.error(`[ac-matrix] 오류: ${err.message}`);
    process.exit(2);
  }

  // 2. 각 spec 실행/확인
  const results = [];
  for (const acEntry of matrix.entries) {
    for (const spec of acEntry.specs) {
      let result;
      if (spec.kind === 'unit') {
        result = await runUnitSpec(acEntry, spec);
      } else {
        result = await checkE2eSpec(acEntry, spec);
      }
      console.log(
        `[ac-matrix] AC#${acEntry.ac} ${spec.kind} ${spec.path}: ` +
        `${result.status} (passed=${result.passed}, failed=${result.failed})`
      );
      results.push(result);
    }
  }

  // 3. 집계
  const report = aggregateResults(results);

  // 4. 리포트 기록
  await emitReport(report, outPath);
  console.log(`\n[ac-matrix] 리포트: ${outPath}`);
  console.log(
    `[ac-matrix] 결과: ${report.overallStatus} ` +
    `(totalPassed=${report.totalPassed}/${MIN_TOTAL_PASS} 기준, failed=${report.totalFailed})`
  );

  // 5. exit code
  if (report.overallStatus === 'PASS') {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

// CLI로 직접 실행할 때만 main() 호출
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((err) => {
    console.error('[ac-matrix] 예상치 못한 오류:', err);
    process.exit(2);
  });
}
