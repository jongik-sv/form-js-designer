#!/usr/bin/env node
/**
 * TSK-04-03: .vsix 크기 게이트 스크립트
 *
 * .vsix 파일 바이트 크기를 측정하여 5MB(5,242,880 bytes) 초과 시 exit(1).
 * 성공 시 exit(0) + reports/perf-gate.json append.
 *
 * .vsix 경로 결정 우선순위:
 *   1. CLI 인자: node scripts/vsix-size-gate.mjs <path>
 *   2. 환경 변수: VSIX_PATH
 *   3. 자동 감지: pkgRoot/*.vsix (glob)
 *
 * 사용법:
 *   node scripts/vsix-size-gate.mjs [<vsix-path>] [--gate-mb <mb>]
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');
const reportPath = path.join(pkgRoot, 'reports', 'perf-gate.json');

// CLI 인자 파싱
const gateMbArg = process.argv.indexOf('--gate-mb');
const GATE_MB = gateMbArg !== -1 ? parseFloat(process.argv[gateMbArg + 1] ?? '5') : 5;
const GATE_BYTES = Math.round(GATE_MB * 1024 * 1024);

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
 * .vsix 파일 경로를 결정한다.
 * @returns {string}
 */
function resolveVsixPath() {
  // 1. CLI 인자 (--flag 및 그 값을 제외한 positional 인자)
  const positional = [];
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      i++; // 다음 값(플래그 인자)도 스킵
    } else {
      positional.push(args[i]);
    }
  }
  if (positional.length > 0) {
    return path.resolve(positional[0]);
  }

  // 2. 환경 변수
  if (process.env['VSIX_PATH']) {
    return path.resolve(process.env['VSIX_PATH']);
  }

  // 3. 자동 감지: pkgRoot/*.vsix
  const files = fs.readdirSync(pkgRoot).filter((f) => f.endsWith('.vsix'));
  if (files.length === 1) {
    return path.join(pkgRoot, files[0]);
  }
  if (files.length > 1) {
    // 가장 최근 수정 파일 선택
    const sorted = files
      .map((f) => ({ name: f, mtime: fs.statSync(path.join(pkgRoot, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    return path.join(pkgRoot, sorted[0].name);
  }

  throw new Error(
    '[vsix-size-gate] .vsix 파일을 찾을 수 없습니다.\n' +
    '  CLI 인자, VSIX_PATH 환경 변수, 또는 패키지 루트에 .vsix 파일이 있어야 합니다.\n' +
    '  npm run package를 먼저 실행하세요.'
  );
}

function main() {
  console.log(`[vsix-size-gate] .vsix 크기 게이트 (gate=${GATE_MB}MB = ${GATE_BYTES} bytes)`);

  let vsixPath;
  try {
    vsixPath = resolveVsixPath();
  } catch (err) {
    process.stderr.write(`[vsix-size-gate] ERROR: ${err.message}\n`);
    process.exit(1);
  }

  if (!fs.existsSync(vsixPath)) {
    process.stderr.write(
      `[vsix-size-gate] ERROR: 파일이 존재하지 않습니다: ${vsixPath}\n`
    );
    process.exit(1);
  }

  const bytes = fs.statSync(vsixPath).size;
  const mb = (bytes / 1024 / 1024).toFixed(2);
  const gatePass = bytes <= GATE_BYTES;

  console.log(`[vsix-size-gate] 파일: ${path.basename(vsixPath)}`);
  console.log(`[vsix-size-gate] 크기: ${bytes} bytes (${mb} MB)`);
  console.log(`[vsix-size-gate] 게이트 (≤ ${GATE_BYTES} bytes / ${GATE_MB}MB): ${gatePass ? 'PASS' : 'FAIL'}`);

  const entry = {
    timestamp: new Date().toISOString(),
    renderP95Ms: null,
    renderP50Ms: null,
    renderSamplesMs: null,
    vsixBytes: bytes,
    vsixMB: mb,
    renderGatePass: null,
    vsixGatePass: gatePass,
  };

  appendReport(entry);
  console.log(`[vsix-size-gate] reports/perf-gate.json 기록 완료`);

  if (!gatePass) {
    process.stderr.write(
      `[vsix-size-gate] FAIL: ${bytes} bytes (${mb} MB) > ${GATE_BYTES} bytes (${GATE_MB}MB) 게이트 초과\n`
    );
    process.exit(1);
  }

  console.log('[vsix-size-gate] PASS');
}

main();
