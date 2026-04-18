#!/usr/bin/env node
// PRD §4 AC #6 강제: @bpmn-io/form-js-viewer dist 번들 내 PoweredBy/Link 함수 블록의
// sha256 해시를 .watermark-hash 기준값과 비교. 불일치 시 exit 1.
// 사용: node scripts/ci/watermark-hash.mjs [--write] [--dist=경로]

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(new URL('../..', import.meta.url).pathname);
const DEFAULT_DIST = join(REPO_ROOT, 'node_modules/@bpmn-io/form-js-viewer/dist/index.es.js');
const BASELINE_FILE = join(REPO_ROOT, '.watermark-hash');

const WATERMARK_PATTERNS = [
  /fjs-powered-by/,
  /PoweredBy/,
  /Link\b.*fjs-powered-by/,
];

export function extractWatermarkLines(content) {
  const lines = content.split('\n');
  const extracted = [];
  let inPoweredByFn = false;
  let inLinkFn = false;
  let braceDepth = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect PoweredBy or Link function start
    const isPoweredByStart = /^function PoweredBy\s*\(/.test(trimmed);
    const isLinkStart = /^function Link\s*\(/.test(trimmed);

    if (isPoweredByStart) {
      inPoweredByFn = true;
      braceDepth = 0;
    }
    if (isLinkStart) {
      inLinkFn = true;
      braceDepth = 0;
    }

    if (inPoweredByFn || inLinkFn) {
      extracted.push(trimmed);
      for (const ch of trimmed) {
        if (ch === '{') braceDepth++;
        else if (ch === '}') {
          braceDepth--;
          if (braceDepth <= 0) {
            inPoweredByFn = false;
            inLinkFn = false;
            braceDepth = 0;
          }
        }
      }
      continue;
    }

    // Also capture lines with fjs-powered-by string outside functions
    if (WATERMARK_PATTERNS[0].test(trimmed)) {
      extracted.push(trimmed);
    }
  }

  return extracted;
}

export function hashPoweredBy(distPath) {
  const content = readFileSync(distPath, 'utf-8');
  const lines = extractWatermarkLines(content);
  if (lines.length === 0) {
    throw new Error(`[watermark-hash] PoweredBy/fjs-powered-by 블록을 찾을 수 없습니다: ${distPath}`);
  }
  const normalized = lines.join('\n').replace(/\r/g, '').trim();
  return createHash('sha256').update(normalized).digest('hex');
}

async function hashPoweredByAsync(distPath) {
  const content = await readFile(distPath, 'utf-8');
  const lines = extractWatermarkLines(content);
  if (lines.length === 0) {
    throw new Error(`[watermark-hash] PoweredBy/fjs-powered-by 블록을 찾을 수 없습니다: ${distPath}`);
  }
  const normalized = lines.join('\n').replace(/\r/g, '').trim();
  return createHash('sha256').update(normalized).digest('hex');
}

async function main() {
  const writeMode = process.argv.includes('--write');
  const distArg = process.argv.find((a) => a.startsWith('--dist='))?.slice(7);
  const distPath = distArg ? resolve(distArg) : DEFAULT_DIST;
  const baselineArg = process.argv.find((a) => a.startsWith('--baseline='))?.slice(11);
  const baselinePath = baselineArg ? resolve(baselineArg) : BASELINE_FILE;

  if (!existsSync(distPath)) {
    console.error(`[watermark-hash] dist 파일을 찾을 수 없습니다: ${distPath}`);
    process.exit(2);
  }

  const currentHash = await hashPoweredByAsync(distPath);

  if (writeMode) {
    await writeFile(baselinePath, currentHash + '\n', 'utf-8');
    console.log(`[watermark-hash] .watermark-hash 기록 완료: ${currentHash}`);
    return;
  }

  if (!existsSync(baselinePath)) {
    console.error('[watermark-hash] .watermark-hash 기준값 파일이 없습니다. --write 옵션으로 초기화하세요.');
    process.exit(1);
  }

  const baseline = (await readFile(baselinePath, 'utf-8')).trim();

  if (currentHash === baseline) {
    console.log(`[watermark-hash] OK: watermark hash matches (${currentHash.slice(0, 12)}…)`);
  } else {
    console.error('[watermark-hash] 워터마크 해시 불일치!');
    console.error(`  기준값: ${baseline}`);
    console.error(`  현재값: ${currentHash}`);
    console.error('  form-js-viewer 업그레이드 시 --write 옵션으로 기준값을 갱신하고 ADR을 기록하세요.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[watermark-hash] 예상치 못한 오류:', err);
  process.exit(2);
});
