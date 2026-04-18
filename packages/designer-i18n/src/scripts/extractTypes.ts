/**
 * Types for the AST-based i18n key extractor.
 */

/** Where a key was found in source */
export interface KeyOccurrence {
  key: string;
  file: string;
  line: number;
}

/** Kinds of non-extractable t() call arguments */
export type WarningKind =
  | 'template-substitution'  // t(`key.${var}`) — template with substitution
  | 'template-plain'         // t(`key.plain`) — backtick without substitution
  | 'dynamic-identifier'     // t(variableName) — identifier, not a literal
  | 'string-concat';         // t('a' + 'b') — binary expression

export interface Warning {
  kind: WarningKind;
  file: string;
  line: number;
}

export interface ExtractOptions {
  /** Additional callee identifiers to match, beyond default ['t', 'tFn', 'translate'] */
  additionalCallees?: string[];
  /** Glob patterns to exclude (in addition to built-in excludes) */
  extraExcludes?: string[];
}

export interface ExtractResult {
  /** All statically-extractable string literal keys */
  keys: Set<string>;
  /** Occurrences with file + line for each key */
  occurrences: KeyOccurrence[];
  /** Non-extractable calls that generated warnings */
  warnings: Warning[];
  /** Total number of .ts/.tsx files scanned */
  filesScanned: number;
  /** Elapsed milliseconds */
  elapsedMs: number;
}
