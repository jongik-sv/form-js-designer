#!/usr/bin/env node
/**
 * i18n-check CLI — AST 추출기 + diff gate
 *
 * Usage:
 *   node bin/i18n-check.mjs           # human-readable output
 *   node bin/i18n-check.mjs --dump    # dump extracted keys list (i18n:extract)
 *   node bin/i18n-check.mjs --report-json  # JSON output for CI artifact
 *   node bin/i18n-check.mjs --help    # show this help
 *
 * Exit codes:
 *   0 — all used keys found in ko.json
 *   1 — missing keys (build failure)
 *   2 — ko.json not found or unreadable
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
i18n-check — AST-based i18n key extractor + diff gate

Usage:
  node bin/i18n-check.mjs [options]

Options:
  --dump          Dump all extracted keys (stdout) instead of running diff
  --report-json   Output JSON report for CI artifact
  --help, -h      Show this help

Exit codes:
  0  all keys covered
  1  missing keys found (build failure)
  2  ko.json not found or unreadable
`);
  process.exit(0);
}

// Dynamic import of TypeScript source via tsx/ts-node or compiled output
// In this project, vitest / tsx handles TS directly. For production CLI
// we use tsx if available, otherwise require ts-node.
//
// Since this bin is called via `node bin/i18n-check.mjs` and package.json
// has `"type": "module"`, we need a loader. The script should be called as:
//   npx tsx bin/i18n-check.mjs
// or via the package script (which uses tsx).

let runDiff, scanPackages, formatHuman, formatJson;

try {
  ({ runDiff } = await import('../src/scripts/diff.ts'));
  ({ scanPackages } = await import('../src/scripts/extract.ts'));
  ({ formatHuman, formatJson } = await import('../src/scripts/reporter.ts'));
} catch {
  // Fallback: try .js compiled output
  try {
    ({ runDiff } = await import('../src/scripts/diff.js'));
    ({ scanPackages } = await import('../src/scripts/extract.js'));
    ({ formatHuman, formatJson } = await import('../src/scripts/reporter.js'));
  } catch (e) {
    console.error('[i18n-check] Failed to load implementation:', e?.message ?? e);
    console.error('Hint: Run via `npx tsx bin/i18n-check.mjs` or add tsx as a devDependency.');
    process.exit(2);
  }
}

if (args.includes('--dump')) {
  // Dump extracted keys only
  const result = scanPackages(REPO_ROOT);
  const keys = [...result.keys].sort();
  console.log(`[i18n:extract] ${keys.length} key(s) found across designer-* packages:`);
  for (const key of keys) {
    console.log(`  ${key}`);
  }
  if (result.warnings.length > 0) {
    console.error(`[i18n:extract] WARN: ${result.warnings.length} non-extractable call(s) skipped.`);
  }
  process.exit(0);
}

const { exitCode, report } = runDiff(REPO_ROOT);

if (args.includes('--report-json')) {
  console.log(formatJson(report));
} else {
  const output = formatHuman(report);
  if (exitCode === 0) {
    console.log(output);
  } else {
    console.error(output);
  }
}

if (exitCode === 2) {
  console.error('[i18n:check] ko.json not found at packages/designer-i18n/locales/ko.json');
}

process.exit(exitCode);
