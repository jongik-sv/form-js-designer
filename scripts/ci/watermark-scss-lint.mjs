#!/usr/bin/env node
/**
 * watermark-scss-lint.mjs — 워터마크 숨김 CSS 룰 감지
 * TSK-10-01: .fjs-powered-by 선택자와 숨김 CSS 속성(display:none, visibility:hidden, opacity:0)이
 * 동일 룰셋에 공존하면 exit 1
 *
 * 정규식 + 블록 경계 파서 기반 (AST 불필요, CI fast path)
 *
 * 사용법: node scripts/ci/watermark-scss-lint.mjs [--dir <path>]
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(__dirname, '../..');

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.turbo', 'coverage', 'e2e-report']);
const CSS_EXTENSIONS = ['.css', '.scss'];

// 워터마크 선택자 패턴 (직접 또는 후손)
const WATERMARK_SELECTOR_PATTERN = /\.fjs-powered-by/;

// 숨김 CSS 속성 패턴
const HIDING_RULES = [
  /display\s*:\s*none/i,
  /visibility\s*:\s*hidden/i,
  /opacity\s*:\s*0(?:[^.])/, // opacity:0 (소수점 아님)
];

/**
 * CSS 문자열에서 .fjs-powered-by 관련 숨김 룰을 탐지한다.
 * 블록 단위로 파싱하여 동일 블록에 선택자와 숨김 속성이 공존하는지 확인.
 * @param {string} cssText
 * @param {string} filePath
 * @returns {string[]} 위반 설명 문자열 배열
 */
export function detectHidingRules(cssText, filePath) {
  if (!cssText || !cssText.trim()) return [];

  const violations = [];

  // 블록 파서: { } 중괄호 기준으로 selector + body 쌍을 추출
  // 간단한 상태 머신: depth 0에서 선택자, depth 1에서 블록 내용
  let i = 0;
  let depth = 0;
  let selectorStart = 0;
  let selectorText = '';
  let blockStart = -1;
  const blocks = [];

  while (i < cssText.length) {
    const ch = cssText[i];
    if (ch === '{') {
      if (depth === 0) {
        selectorText = cssText.slice(selectorStart, i).trim();
        blockStart = i + 1;
      }
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        const blockBody = cssText.slice(blockStart, i);
        blocks.push({ selector: selectorText, body: blockBody });
        selectorStart = i + 1;
      }
    }
    i++;
  }

  for (const block of blocks) {
    const { selector, body } = block;
    // 선택자에 .fjs-powered-by 포함 여부
    if (!WATERMARK_SELECTOR_PATTERN.test(selector)) continue;

    // body에 숨김 속성 포함 여부
    for (const hidingPattern of HIDING_RULES) {
      if (hidingPattern.test(body)) {
        violations.push(
          `${filePath}: 선택자 "${selector.replace(/\n/g, ' ').trim()}" 에서 숨김 CSS 규칙 발견 (${hidingPattern.source})`
        );
        break; // 같은 블록에서 중복 보고 방지
      }
    }
  }

  return violations;
}

/**
 * 디렉토리를 재귀 탐색하여 CSS/SCSS 파일 목록을 반환한다.
 * @param {string} dir
 * @param {string[]} out
 */
async function walk(dir, out) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return;
    throw err;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walk(full, out);
    } else if (entry.isFile()) {
      const ext = entry.name.slice(entry.name.lastIndexOf('.'));
      if (CSS_EXTENSIONS.includes(ext)) out.push(full);
    }
  }
}

/**
 * main() — CLI 진입점
 */
export async function main(argv = process.argv.slice(2)) {
  let scanDir = join(REPO_ROOT, 'packages');
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dir' && argv[i + 1]) scanDir = resolve(argv[++i]);
  }

  const files = [];
  await walk(scanDir, files);

  if (files.length === 0) {
    console.log(`[watermark-scss-lint] CSS/SCSS 파일 없음 — skip.`);
    process.exit(0);
  }

  const allViolations = [];
  for (const file of files) {
    const cssText = await readFile(file, 'utf8');
    const relativePath = relative(REPO_ROOT, file).replace(/\\/g, '/');
    const violations = detectHidingRules(cssText, relativePath);
    allViolations.push(...violations);
  }

  if (allViolations.length === 0) {
    console.log(`[watermark-scss-lint] OK — ${files.length}개 파일 검사 완료. 위반 없음.`);
    process.exit(0);
  }

  console.error('[watermark-scss-lint] 워터마크 숨김 CSS 위반:');
  for (const v of allViolations) {
    console.error(`  ✖ ${v}`);
  }
  console.error('');
  console.error('[watermark-scss-lint] .fjs-powered-by 요소는 display:none/visibility:hidden/opacity:0으로 숨길 수 없습니다.');
  process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((err) => {
    console.error('[watermark-scss-lint] 예상치 못한 오류:', err);
    process.exit(1);
  });
}
