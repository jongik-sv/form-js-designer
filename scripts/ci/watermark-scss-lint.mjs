#!/usr/bin/env node
// PRD §4 AC #6 강제: packages/**/*.scss 에서 .fjs-powered-by 셀렉터 블록 내
// display:none / visibility:hidden / opacity:0 동시 매칭 차단.

import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';

const REPO_ROOT = resolve(new URL('../..', import.meta.url).pathname);
const PACKAGES_DIR = join(REPO_ROOT, 'packages');
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.turbo', '.next', 'coverage']);
const WATERMARK_SELECTOR = '.fjs-powered-by';
const HIDDEN_PATTERNS = [
  /display\s*:\s*none/i,
  /visibility\s*:\s*hidden/i,
  /opacity\s*:\s*0([^.]|$)/,
];

export async function scanScssForWatermark(rootDir) {
  const violations = [];
  const scssFiles = [];
  await walk(rootDir, scssFiles);

  for (const filePath of scssFiles) {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    let depth = 0;
    let inWatermarkBlock = false;
    let blockStartLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Detect selector opening { on this line
      const openIdx = line.indexOf('{');
      if (depth === 0 && openIdx !== -1) {
        const selectorPart = line.slice(0, openIdx).trim();
        if (selectorPart.includes(WATERMARK_SELECTOR)) {
          inWatermarkBlock = true;
          blockStartLine = lineNum;
        }
      }

      // Check for hidden patterns BEFORE closing } to catch single-line rules
      if (inWatermarkBlock) {
        for (const pattern of HIDDEN_PATTERNS) {
          if (pattern.test(line)) {
            violations.push({
              file: filePath,
              line: lineNum,
              content: line.trim(),
              pattern: pattern.toString(),
            });
          }
        }
      }

      // Update depth after pattern check
      for (const ch of line) {
        if (ch === '{') {
          depth++;
        } else if (ch === '}') {
          depth--;
          if (depth === 0) {
            inWatermarkBlock = false;
          }
        }
      }
    }
  }

  return violations;
}

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
    } else if (entry.isFile() && entry.name.endsWith('.scss')) {
      out.push(full);
    }
  }
}

async function main() {
  const rootArg = process.argv.find((a) => a.startsWith('--root='))?.slice(7);
  const scanRoot = rootArg ? resolve(rootArg) : PACKAGES_DIR;

  const scssFiles = [];
  await walk(scanRoot, scssFiles);

  if (scssFiles.length === 0) {
    console.log('[watermark-scss-lint] OK — 0 files scanned.');
    return;
  }

  const violations = await scanScssForWatermark(scanRoot);

  if (violations.length === 0) {
    console.log(`[watermark-scss-lint] OK — scanned ${scssFiles.length} file(s), 0 violations.`);
    return;
  }

  console.error('[watermark-scss-lint] AC #6 위반: .fjs-powered-by 셀렉터에 워터마크 숨김 속성이 감지됨.');
  console.error('');
  for (const v of violations) {
    console.error(`  ✖ ${relative(REPO_ROOT, v.file).split(sep).join('/')}:${v.line}  →  ${v.content}`);
  }
  console.error('');
  console.error('  .fjs-powered-by 블록에서 display:none / visibility:hidden / opacity:0 를 제거하세요.');
  process.exit(1);
}

main().catch((err) => {
  console.error('[watermark-scss-lint] 예상치 못한 오류:', err);
  process.exit(2);
});
