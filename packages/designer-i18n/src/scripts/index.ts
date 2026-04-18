/**
 * scripts barrel — re-exports for CLI and test usage
 */

export { extractKeys, scanPackages } from './extract';
export { diffKeys, flatten, runDiff } from './diff';
export { formatHuman, formatJson } from './reporter';
export type { ExtractOptions, ExtractResult, Warning, KeyOccurrence } from './extractTypes';
export type { DiffInput, DiffResult, DiffReport, RunDiffResult } from './diff';
export type { JsonReport } from './reporter';
