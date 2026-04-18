/**
 * diff.ts — Compare extracted t() keys against ko.json dictionary.
 *
 * missing = used − defined  → build failure (exit 1)
 * unused  = defined − used  → warning only (exit 0)
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { scanPackages } from './extract';
import type { KeyOccurrence } from './extractTypes';

export interface DiffInput {
  used: Set<string>;
  defined: Set<string>;
}

export interface DiffResult {
  missing: string[];
  unused: string[];
}

export interface DiffReport {
  missing: string[];
  unused: string[];
  used: Set<string>;
  defined: Set<string>;
  occurrences: KeyOccurrence[];
  warnings: Array<{ kind: string; file: string; line: number }>;
  filesScanned: number;
  elapsedMs: number;
}

export interface RunDiffResult {
  exitCode: 0 | 1 | 2;
  report: DiffReport;
}

/** Create an empty DiffReport for error cases (ko.json missing or unreadable). */
function makeEmptyReport(): DiffReport {
  return {
    missing: [],
    unused: [],
    used: new Set(),
    defined: new Set(),
    occurrences: [],
    warnings: [],
    filesScanned: 0,
    elapsedMs: 0,
  };
}

/**
 * Pure function: compute missing and unused sets.
 * Returns sorted arrays.
 */
export function diffKeys({ used, defined }: DiffInput): DiffResult {
  const missing: string[] = [];
  const unused: string[] = [];

  for (const key of used) {
    if (!defined.has(key)) {
      missing.push(key);
    }
  }
  for (const key of defined) {
    if (!used.has(key)) {
      unused.push(key);
    }
  }

  return {
    missing: missing.sort(),
    unused: unused.sort(),
  };
}

/**
 * Flatten a nested JSON object into an array of 'a.b.c' dot-separated leaf paths.
 * Array values are not supported (skipped).
 */
export function flatten(
  obj: Record<string, unknown>,
  prefix = '',
): string[] {
  const result: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result.push(fullKey);
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result.push(...flatten(value as Record<string, unknown>, fullKey));
    }
    // Arrays and other types are skipped per design
  }

  return result;
}

/**
 * runDiff(repoRoot)
 *
 * Full pipeline:
 * 1. Scan packages/designer-* source for t('...') calls
 * 2. Read packages/designer-i18n/locales/ko.json
 * 3. Compute missing/unused
 * 4. Return exitCode (0=ok, 1=missing keys, 2=ko.json not found/unreadable)
 */
export function runDiff(repoRoot: string): RunDiffResult {
  const koPath = resolve(repoRoot, 'packages/designer-i18n/locales/ko.json');

  if (!existsSync(koPath)) {
    return { exitCode: 2, report: makeEmptyReport() };
  }

  let koRaw: Record<string, unknown>;
  try {
    const content = readFileSync(koPath, 'utf8');
    koRaw = JSON.parse(content) as Record<string, unknown>;
  } catch {
    return { exitCode: 2, report: makeEmptyReport() };
  }

  const extractResult = scanPackages(repoRoot);
  const definedKeys = new Set(flatten(koRaw));

  const { missing, unused } = diffKeys({
    used: extractResult.keys,
    defined: definedKeys,
  });

  const exitCode: 0 | 1 = missing.length > 0 ? 1 : 0;

  return {
    exitCode,
    report: {
      missing,
      unused,
      used: extractResult.keys,
      defined: definedKeys,
      occurrences: extractResult.occurrences,
      warnings: extractResult.warnings,
      filesScanned: extractResult.filesScanned,
      elapsedMs: extractResult.elapsedMs,
    },
  };
}
