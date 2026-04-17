#!/usr/bin/env node
// ADR-0001 §3 D4 강제: packages/designer-*/ 하위에서 *.module.css 파일 금지.
// Vite/webpack이 *.module.css 접미사를 CSS Modules로 자동 처리하여 클래스명이
// 해시로 재작성되면, JSX의 원본 클래스 문자열과 불일치해 스타일이 조용히
// 실패한다 (ADR-0001 §6.3 이슈 2). 이 lint는 위반 파일을 찾으면 exit 1.

import { readdir, stat } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';

const REPO_ROOT = resolve(new URL('../..', import.meta.url).pathname);
const PACKAGES_DIR = join(REPO_ROOT, 'packages');
const DESIGNER_PREFIX = 'designer-';
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.turbo', '.next', 'coverage']);

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
    } else if (entry.isFile() && entry.name.endsWith('.module.css')) {
      out.push(full);
    }
  }
}

async function main() {
  let packages;
  try {
    packages = await readdir(PACKAGES_DIR, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(`[no-css-modules] packages/ 디렉토리를 찾을 수 없음: ${PACKAGES_DIR}`);
      process.exit(2);
    }
    throw err;
  }

  const designerDirs = packages
    .filter((e) => e.isDirectory() && e.name.startsWith(DESIGNER_PREFIX))
    .map((e) => join(PACKAGES_DIR, e.name));

  if (designerDirs.length === 0) {
    console.log('[no-css-modules] designer-* 패키지 없음 — skip.');
    return;
  }

  const offenders = [];
  for (const dir of designerDirs) {
    await walk(dir, offenders);
  }

  if (offenders.length === 0) {
    console.log(`[no-css-modules] OK — scanned ${designerDirs.length} designer-* package(s), 0 violations.`);
    return;
  }

  console.error('[no-css-modules] ADR-0001 §3 D4 위반: *.module.css 파일이 designer-* 패키지에 존재합니다.');
  console.error('');
  for (const file of offenders) {
    console.error(`  ✖ ${relative(REPO_ROOT, file).split(sep).join('/')}`);
  }
  console.error('');
  console.error('  해결: 파일명을 *.css로 rename하고 JSX의 className 문자열을 그대로 유지하세요.');
  console.error('  (CSS Modules를 의도적으로 쓰려면 별도 ADR 승인 필요 — ADR-0001 §6.3 이슈 2 참조)');
  process.exit(1);
}

main().catch((err) => {
  console.error('[no-css-modules] 예상치 못한 오류:', err);
  process.exit(2);
});
