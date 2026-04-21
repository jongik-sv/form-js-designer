#!/usr/bin/env node
/**
 * TSK-04-03: 초기 렌더 p95 측정 스크립트
 *
 * 10 필드 스키마(textfield × 10)를 포함한 preview HTML을 Playwright로
 * 5회 로드하여 `window.__formJsReady` 이벤트 기준으로 렌더 시간을 측정한다.
 *
 * 기준: p95 ≤ 500ms (Linux headless Chromium 기준)
 * 초과 시: exit(1) + stderr 메시지
 * 성공 시: exit(0) + reports/perf-gate.json append
 *
 * 사용법:
 *   node scripts/perf-gate.mjs [--times <N>] [--gate-ms <ms>]
 */

import { chromium } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');
const reportPath = path.join(pkgRoot, 'reports', 'perf-gate.json');
const previewJsPath = path.join(pkgRoot, 'dist', 'webview', 'preview.js');

// CLI 인자 파싱
const timesArg = process.argv.indexOf('--times');
const TIMES = timesArg !== -1 ? parseInt(process.argv[timesArg + 1] ?? '5', 10) : 5;
const gateArg = process.argv.indexOf('--gate-ms');
const GATE_MS = gateArg !== -1 ? parseInt(process.argv[gateArg + 1] ?? '500', 10) : 500;

// 10 필드 스키마 (textfield × 10)
const SCHEMA_10FIELD = {
  type: 'default',
  components: [
    { type: 'textfield', key: 'field1', label: 'Field 1' },
    { type: 'textfield', key: 'field2', label: 'Field 2' },
    { type: 'textfield', key: 'field3', label: 'Field 3' },
    { type: 'textfield', key: 'field4', label: 'Field 4' },
    { type: 'textfield', key: 'field5', label: 'Field 5' },
    { type: 'textfield', key: 'field6', label: 'Field 6' },
    { type: 'textfield', key: 'field7', label: 'Field 7' },
    { type: 'textfield', key: 'field8', label: 'Field 8' },
    { type: 'textfield', key: 'field9', label: 'Field 9' },
    { type: 'textfield', key: 'field10', label: 'Field 10' },
  ],
};

/**
 * 정렬된 배열에서 p번째 백분위수 값을 선형 보간으로 계산한다.
 * @param {number[]} arr
 * @param {number} p
 * @returns {number}
 */
function calcPercentile(arr, p) {
  if (arr.length === 0) throw new Error('calcPercentile: 배열이 비어있습니다');
  if (arr.length === 1) return arr[0];
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const fraction = index - lower;
  return Math.floor(sorted[lower] + fraction * (sorted[upper] - sorted[lower]));
}

/**
 * reports/perf-gate.json에 새 항목을 append한다.
 * @param {object} entry
 */
function appendReport(entry) {
  const dir = path.dirname(reportPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let records = [];
  if (fs.existsSync(reportPath)) {
    try {
      records = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    } catch {
      records = [];
    }
  }
  records.push(entry);
  fs.writeFileSync(reportPath, JSON.stringify(records, null, 2) + '\n', 'utf8');
}

/**
 * preview.js를 포함한 임시 HTML을 생성한다.
 * @returns {{ htmlPath: string, tmpDir: string }}
 */
function createTempHtml() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-gate-'));
  const schemaJson = JSON.stringify(SCHEMA_10FIELD);

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>perf-gate preview</title>
  <style>
    .form-js-block { min-height: 400px; }
    pre.form-js-source { display: none; }
  </style>
</head>
<body data-vscode-theme-kind="vscode-light">
  <div class="form-js-block" data-schema-id="perf-test-10field">
    <pre class="form-js-source">${schemaJson.replace(/</g, '\\u003c')}</pre>
  </div>
  <script>
    // acquireVsCodeApi mock (웹뷰 외부 실행 시)
    window.acquireVsCodeApi = function() {
      return { postMessage: function() {} };
    };
  </script>
  <script src="${previewJsPath}"></script>
</body>
</html>`;

  const htmlPath = path.join(tmpDir, 'index.html');
  fs.writeFileSync(htmlPath, html, 'utf8');
  return { htmlPath, tmpDir };
}

/**
 * Playwright page에서 preview HTML을 로드하고 렌더 완료 시간(ms)을 측정한다.
 * `window.__formJsReady` 이벤트 - navigationStart 기준.
 *
 * @param {import('playwright').Page} page
 * @param {string} htmlPath
 * @returns {Promise<number>}
 */
async function measureRenderTime(page, htmlPath) {
  const fileUrl = `file://${htmlPath}`;

  // HTML 파일에 이벤트 리스너를 포함시키고 window 변수에 기록
  await page.addInitScript(() => {
    window.__formJsReady_startTime = performance.now();
    window.__formJsReady_navigationStart = performance.getEntriesByType('navigation')[0]?.startTime ?? 0;

    window.addEventListener('__formJsReady', (ev) => {
      const eventTime = (ev instanceof CustomEvent && typeof ev.detail?.timestamp === 'number')
        ? ev.detail.timestamp
        : performance.now();
      window.__formJsReady_ms = Math.round(eventTime - window.__formJsReady_navigationStart);
      window.__formJsReady_fired = true;
    }, { once: true });
  });

  // 페이지 로드
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

  // __formJsReady_fired 플래그가 설정될 때까지 대기
  try {
    await page.waitForFunction(() => window.__formJsReady_fired, { timeout: 5000 });
    return await page.evaluate(() => window.__formJsReady_ms);
  } catch {
    throw new Error('__formJsReady 이벤트 타임아웃 (5000ms)');
  }
}

/**
 * TIMES회 렌더 측정을 수행한다.
 * @returns {Promise<number[]>}
 */
async function runPerf() {
  if (!fs.existsSync(previewJsPath)) {
    console.error(`[perf-gate] ERROR: ${previewJsPath} 가 존재하지 않습니다.`);
    console.error('[perf-gate] npm run build를 먼저 실행하세요.');
    process.exit(1);
  }

  const { htmlPath, tmpDir } = createTempHtml();
  const browser = await chromium.launch({ headless: true });

  try {
    const samples = [];
    for (let i = 0; i < TIMES; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      try {
        const ms = await measureRenderTime(page, htmlPath);
        samples.push(ms);
        console.log(`[perf-gate] 측정 ${i + 1}/${TIMES}: ${ms}ms`);
      } finally {
        await context.close();
      }
    }
    return samples;
  } finally {
    await browser.close();
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* noop */ }
  }
}

async function main() {
  console.log(`[perf-gate] 렌더 시간 측정 시작 (${TIMES}회, gate=${GATE_MS}ms)`);

  let samples;
  try {
    samples = await runPerf();
  } catch (err) {
    console.error('[perf-gate] 측정 실패:', err.message ?? err);
    process.exit(1);
  }

  const p95 = calcPercentile(samples, 95);
  const p50 = calcPercentile(samples, 50);
  const gatePass = p95 <= GATE_MS;

  console.log(`[perf-gate] 결과:`);
  console.log(`  샘플: [${samples.join(', ')}]ms`);
  console.log(`  p50 = ${p50}ms`);
  console.log(`  p95 = ${p95}ms`);
  console.log(`  게이트 (p95 ≤ ${GATE_MS}ms): ${gatePass ? 'PASS' : 'FAIL'}`);

  const entry = {
    timestamp: new Date().toISOString(),
    renderP95Ms: p95,
    renderP50Ms: p50,
    renderSamplesMs: samples,
    vsixBytes: null,
    vsixMB: null,
    renderGatePass: gatePass,
    vsixGatePass: null,
  };

  appendReport(entry);
  console.log(`[perf-gate] reports/perf-gate.json 기록 완료`);

  if (!gatePass) {
    process.stderr.write(
      `[perf-gate] FAIL: p95=${p95}ms > ${GATE_MS}ms (게이트 초과)\n`
    );
    process.exit(1);
  }

  console.log('[perf-gate] PASS');
}

main().catch((err) => {
  console.error('[perf-gate] 치명적 오류:', err.message ?? err);
  process.exit(1);
});
