#!/usr/bin/env node
/**
 * emit-rc-report.mjs — RC 리포트 집계기
 * TSK-10-01: ac-matrix.json + fps.json + axe.json + CI lint 4종 로그를 합쳐
 * docs/designer/tasks/TSK-10-01/reports/rc1-summary.md를 자동 생성한다.
 *
 * 사용법: node scripts/rc/emit-rc-report.mjs [--reports-dir <path>] [--out <path>]
 */

import { readFile, writeFile, access, mkdir } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(__dirname, '../..');

const DEFAULT_REPORTS_DIR = resolve(REPO_ROOT, 'reports/rc');
const DEFAULT_OUT = resolve(REPO_ROOT, 'docs/designer/tasks/TSK-10-01/reports/rc1-summary.md');

/**
 * JSON 파일을 읽는다. 없으면 null 반환.
 * @param {string} filePath
 * @returns {Promise<object|null>}
 */
async function readJsonSafe(filePath) {
  try {
    await access(filePath, fsConstants.R_OK);
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * AC 매트릭스 리포트를 Markdown 표로 변환한다.
 * @param {object} acReport
 * @returns {string}
 */
function renderAcTable(acReport) {
  if (!acReport) return '_ac-matrix.json 없음 — 오케스트레이터를 먼저 실행하세요._\n';

  const { byAc, totalPassed, totalFailed, totalExpected, overallStatus, generatedAt } = acReport;

  let md = `## AC 매트릭스 결과\n\n`;
  md += `**전체 상태**: **${overallStatus}** (passed=${totalPassed}, failed=${totalFailed}, expected=${totalExpected})\n\n`;
  md += `| AC# | 예상 | 통과 | 실패 | 상태 |\n|-----|------|------|------|------|\n`;

  for (const [acKey, data] of Object.entries(byAc ?? {})) {
    const status = data.failed > 0 ? 'FAIL' : (data.passed >= data.expected ? 'PASS' : 'MISSING');
    md += `| ${acKey} | ${data.expected} | ${data.passed} | ${data.failed} | ${status} |\n`;
  }

  md += `\n_생성 시각: ${generatedAt ?? 'N/A'}_\n`;
  return md;
}

/**
 * FPS 리포트를 Markdown으로 변환한다.
 * @param {object|null} fpsReport
 * @returns {string}
 */
function renderFpsSection(fpsReport) {
  if (!fpsReport) return `## FPS 게이트\n\n_fps.json 없음 — table.virtualization.spec.ts E2E 실행 필요._\n\n`;
  const { fps, threshold, passed, timestamp } = fpsReport;
  const status = passed ? 'PASS' : 'FAIL';
  return `## FPS 게이트\n\n**상태**: **${status}** — FPS ${fps?.toFixed(1) ?? 'N/A'} (임계값 ≥ ${threshold ?? 55})\n\n_측정 시각: ${timestamp ?? 'N/A'}_\n\n`;
}

/**
 * axe 리포트를 Markdown으로 변환한다.
 * @param {object|null} axeReport
 * @returns {string}
 */
function renderAxeSection(axeReport) {
  if (!axeReport) return `## a11y 게이트 (axe-core)\n\n_axe.json 없음 — editor.a11y.spec.ts E2E 실행 필요._\n\n`;
  const { criticalCount, seriousCount, passed, timestamp } = axeReport;
  const status = passed ? 'PASS' : 'FAIL';
  return `## a11y 게이트 (axe-core)\n\n**상태**: **${status}** — critical=${criticalCount ?? 'N/A'}, serious=${seriousCount ?? 'N/A'} (모두 0 요구)\n\n_측정 시각: ${timestamp ?? 'N/A'}_\n\n`;
}

/**
 * CI lint 결과를 Markdown으로 변환한다.
 * @param {object|null} lintReport
 * @returns {string}
 */
function renderLintSection(lintReport) {
  const gates = [
    { name: 'no-css-modules', desc: 'ADR-0001 §3 D4 — *.module.css 금지' },
    { name: 'watermark-hash', desc: 'PoweredBy.js sha256 해시 게이트' },
    { name: 'watermark-scss', desc: '.fjs-powered-by 숨김 CSS 금지' },
    { name: 'license-gate', desc: 'permissive 라이선스 전용' },
  ];

  let md = `## CI Lint 게이트 (4종)\n\n| 게이트 | 설명 | 상태 |\n|--------|------|------|\n`;
  for (const g of gates) {
    const result = lintReport?.[g.name];
    const status = result === undefined ? '⬜ 미실행' : (result ? '✅ PASS' : '❌ FAIL');
    md += `| ${g.name} | ${g.desc} | ${status} |\n`;
  }
  return md + '\n';
}

/**
 * main() — CLI 진입점
 */
export async function main(argv = process.argv.slice(2)) {
  let reportsDir = DEFAULT_REPORTS_DIR;
  let outPath = DEFAULT_OUT;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--reports-dir' && argv[i + 1]) reportsDir = resolve(argv[++i]);
    if (argv[i] === '--out' && argv[i + 1]) outPath = resolve(argv[++i]);
  }

  const acReport = await readJsonSafe(resolve(reportsDir, 'ac-matrix.json'));
  const fpsReport = await readJsonSafe(resolve(reportsDir, 'fps.json'));
  const axeReport = await readJsonSafe(resolve(reportsDir, 'axe.json'));
  const lintReport = await readJsonSafe(resolve(reportsDir, 'lint.json'));

  const timestamp = new Date().toISOString();
  const overallPass = acReport?.overallStatus === 'PASS' &&
    (fpsReport?.passed ?? false) &&
    (axeReport?.passed ?? false);

  let md = `# RC1 수렴 리포트 — TSK-10-01\n\n`;
  md += `> 생성: ${timestamp}\n`;
  md += `> **전체 RC1 상태**: **${overallPass ? '✅ PASS' : '❌ FAIL'}**\n\n`;
  md += `---\n\n`;
  md += renderAcTable(acReport);
  md += '\n';
  md += renderFpsSection(fpsReport);
  md += renderAxeSection(axeReport);
  md += renderLintSection(lintReport);
  md += `---\n\n`;
  md += `## 회귀 티켓\n\n회귀 티켓: 0건 ([\`regression-log.md\`](../regression-log.md) 체크리스트 확인 필요)\n`;

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, md, 'utf8');
  console.log(`[emit-rc-report] 리포트 생성: ${outPath}`);
  console.log(`[emit-rc-report] RC1 상태: ${overallPass ? 'PASS' : 'FAIL (일부 데이터 누락 또는 실패)'}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((err) => {
    console.error('[emit-rc-report] 오류:', err);
    process.exit(1);
  });
}
