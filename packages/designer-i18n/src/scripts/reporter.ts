/**
 * reporter.ts — Human-readable and JSON output formatters for i18n:check results.
 */

import type { DiffReport } from './diff';
import type { KeyOccurrence } from './extractTypes';

/**
 * Format a single missing key with its file:line occurrences (if any).
 */
function formatMissingKey(key: string, occurrences: KeyOccurrence[]): string[] {
  const occ = occurrences.filter(o => o.key === key);
  if (occ.length > 0) {
    return occ.map(o => `  \u2716 ${key} (${o.file}:${o.line})`);
  }
  return [`  \u2716 ${key}`];
}

/**
 * Format a human-readable report for terminal output.
 * Missing keys are printed with file:line info.
 */
export function formatHuman(report: DiffReport): string {
  const lines: string[] = [];

  if (report.missing.length === 0) {
    lines.push(`[i18n:check] OK — all ${report.used.size} key(s) covered. (${report.filesScanned} files scanned in ${report.elapsedMs}ms)`);
  } else {
    lines.push(`[i18n:check] Missing ${report.missing.length} key(s):`);
    for (const key of report.missing) {
      lines.push(...formatMissingKey(key, report.occurrences));
    }
  }

  if (report.unused.length > 0) {
    lines.push(`[i18n:check] WARN — ${report.unused.length} unused key(s) in ko.json (safe to keep for IDE autocomplete):`);
    for (const key of report.unused.slice(0, 20)) {
      lines.push(`  ~ ${key}`);
    }
    if (report.unused.length > 20) {
      lines.push(`  ... and ${report.unused.length - 20} more`);
    }
  }

  if (report.warnings.length > 0) {
    lines.push(`[i18n:check] WARN — ${report.warnings.length} non-extractable t() call(s) (dynamic/template/concat):`);
    for (const w of report.warnings.slice(0, 10)) {
      lines.push(`  ~ [${w.kind}] ${w.file}:${w.line}`);
    }
    if (report.warnings.length > 10) {
      lines.push(`  ... and ${report.warnings.length - 10} more`);
    }
  }

  return lines.join('\n');
}

export interface JsonReport {
  ok: boolean;
  missing: string[];
  unused: string[];
  warnings: Array<{ kind: string; file: string; line: number }>;
  filesScanned: number;
  elapsedMs: number;
  usedCount: number;
  definedCount: number;
}

/**
 * Format a machine-readable JSON report for CI artifact upload.
 */
export function formatJson(report: DiffReport): string {
  const payload: JsonReport = {
    ok: report.missing.length === 0,
    missing: report.missing,
    unused: report.unused,
    warnings: report.warnings,
    filesScanned: report.filesScanned,
    elapsedMs: report.elapsedMs,
    usedCount: report.used.size,
    definedCount: report.defined.size,
  };
  return JSON.stringify(payload, null, 2);
}
