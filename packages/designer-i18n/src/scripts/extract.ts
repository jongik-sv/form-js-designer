/**
 * AST-based i18n key extractor for designer-* packages.
 *
 * Uses TypeScript Compiler API to parse .ts/.tsx files and collect
 * all statically-extractable t('key') call expressions.
 *
 * Regex fallback is intentionally PROHIBITED — AST only.
 */

import * as ts from 'typescript';
import { readFileSync, readdirSync, statSync, type Dirent } from 'fs';
import { resolve, join, extname } from 'path';
import type { ExtractOptions, ExtractResult, KeyOccurrence, Warning } from './extractTypes';

/** Default callee identifiers to recognise as t() calls */
const DEFAULT_CALLEES = new Set(['t', 'tFn', 'translate']);

/**
 * Matches paths that should be excluded from scanning:
 * - __tests__/, node_modules/, dist/, spike/ directories
 * - *.test.ts, *.test.tsx, *.spec.ts, *.spec.tsx files
 */
const EXCLUDE_RE = /\/__tests__\/|\/node_modules\/|\/dist\/|\/spike\/|\.(?:test|spec)\.tsx?$/;

function shouldExclude(filePath: string): boolean {
  return EXCLUDE_RE.test(filePath);
}

/**
 * Recursively collect .ts/.tsx files under a directory (Node 20 compatible).
 */
function collectFiles(root: string): string[] {
  const files: string[] = [];
  function walk(dir: string) {
    let entries: Dirent<string>[];
    try {
      entries = readdirSync(dir, { withFileTypes: true, encoding: 'utf8' });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = extname(entry.name);
        if (ext === '.ts' || ext === '.tsx') {
          files.push(fullPath);
        }
      }
    }
  }
  walk(root);
  return files;
}

/**
 * Get 1-based line number for a position in the source file.
 */
function getLine(sf: ts.SourceFile, pos: number): number {
  return sf.getLineAndCharacterOfPosition(pos).line + 1;
}

/**
 * Check if an expression is a valid t() callee:
 *   - Identifier: t, tFn, translate (or custom)
 *   - PropertyAccessExpression where the last part is t/tFn/translate (e.g., ctx.t)
 */
function isTCallee(expr: ts.Expression, allowedCallees: Set<string>): boolean {
  if (ts.isIdentifier(expr)) {
    return allowedCallees.has(expr.text);
  }
  if (ts.isPropertyAccessExpression(expr)) {
    return allowedCallees.has(expr.name.text);
  }
  return false;
}

interface VisitContext {
  sf: ts.SourceFile;
  allowedCallees: Set<string>;
  filePath: string;
  keys: Set<string>;
  occurrences: KeyOccurrence[];
  warnings: Warning[];
}

/**
 * Visit all nodes in a SourceFile and collect t() key occurrences and warnings.
 */
function visitSourceFile(ctx: VisitContext): void {
  const { sf, allowedCallees, filePath, keys, occurrences, warnings } = ctx;

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (isTCallee(callee, allowedCallees)) {
        const args = node.arguments;
        if (args.length >= 1) {
          const firstArg = args[0]!;
          const line = getLine(sf, firstArg.getStart(sf));

          if (ts.isStringLiteral(firstArg)) {
            // Normal case: t('literal.key')
            const key = firstArg.text;
            keys.add(key);
            occurrences.push({ key, file: filePath, line });
          } else if (ts.isTemplateLiteral(firstArg)) {
            // Template literal: t(`key`) or t(`key.${var}`)
            if (ts.isNoSubstitutionTemplateLiteral(firstArg)) {
              warnings.push({ kind: 'template-plain', file: filePath, line });
            } else {
              // TemplateExpression — has substitutions
              warnings.push({ kind: 'template-substitution', file: filePath, line });
            }
          } else if (ts.isBinaryExpression(firstArg)) {
            // String concatenation: t('a' + 'b')
            warnings.push({ kind: 'string-concat', file: filePath, line });
          } else if (ts.isIdentifier(firstArg)) {
            // Dynamic identifier: t(variableName)
            warnings.push({ kind: 'dynamic-identifier', file: filePath, line });
          }
          // Other cases (e.g., conditional expression) — silently skip
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
}

/**
 * extractKeys(filePaths | rootDirs, options?)
 *
 * If `filePaths` contains directory paths, they are recursively scanned.
 * If they are file paths (.ts/.tsx), they are scanned directly.
 *
 * Excludes: __tests__/, node_modules/, dist/, spike/, *.test.ts, *.spec.ts
 */
export function extractKeys(
  filePaths: string[],
  options: ExtractOptions = {},
): ExtractResult {
  const start = Date.now();

  const allowedCallees = new Set([...DEFAULT_CALLEES, ...(options.additionalCallees ?? [])]);

  // Expand directories to file lists
  const resolvedFiles: string[] = [];
  for (const p of filePaths) {
    let stat: ReturnType<typeof statSync> | undefined;
    try {
      stat = statSync(p);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      const children = collectFiles(p);
      for (const f of children) {
        if (!shouldExclude(f)) {
          resolvedFiles.push(f);
        }
      }
    } else if (stat.isFile()) {
      // Direct file path — do NOT apply shouldExclude for explicit file inputs
      // (test fixtures pass explicit paths that happen to be in __tests__)
      resolvedFiles.push(p);
    }
  }

  const keys = new Set<string>();
  const occurrences: KeyOccurrence[] = [];
  const warnings: Warning[] = [];
  let filesScanned = 0;

  for (const filePath of resolvedFiles) {
    let code: string;
    try {
      code = readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }

    const scriptKind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const sf = ts.createSourceFile(
      filePath,
      code,
      ts.ScriptTarget.ES2022,
      /* setParentNodes */ true,
      scriptKind,
    );

    visitSourceFile({ sf, allowedCallees, filePath, keys, occurrences, warnings });
    filesScanned++;
  }

  return {
    keys,
    occurrences,
    warnings,
    filesScanned,
    elapsedMs: Date.now() - start,
  };
}

/**
 * scanPackages(repoRoot)
 *
 * Scan all packages/designer-* source directories in the given repo root.
 * Applies the standard exclude list (node_modules, dist, __tests__, etc.)
 */
export function scanPackages(repoRoot: string): ExtractResult {
  const packagesDir = resolve(repoRoot, 'packages');
  let entries: Dirent<string>[];
  try {
    entries = readdirSync(packagesDir, { withFileTypes: true, encoding: 'utf8' });
  } catch {
    return {
      keys: new Set(),
      occurrences: [],
      warnings: [],
      filesScanned: 0,
      elapsedMs: 0,
    };
  }

  const roots: string[] = [];
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.startsWith('designer-')) {
      roots.push(join(packagesDir, entry.name, 'src'));
      // also scan scripts/ if present
      roots.push(join(packagesDir, entry.name, 'scripts'));
    }
  }

  return extractKeys(roots);
}
