/**
 * envUtils — 환경 감지 유틸리티
 *
 * Detect whether we're running in a production-like environment without
 * assuming `process` exists. `process.env.NODE_ENV` works in Node and is
 * replaced at build time by webpack/Rollup/Vite, but a vanilla browser
 * load (or any bundler that does NOT replace it) throws ReferenceError
 * when this module is evaluated.
 *
 * Priority:
 *  1. Vite (`import.meta.env.PROD` boolean — always defined under Vite)
 *  2. Node / Jest / bundler-replaced builds (`process.env.NODE_ENV`)
 *  3. Fallback: treat as non-production (safer default in unknown envs)
 */
export function isProductionEnv(): boolean {
  const meta = (import.meta as { env?: { PROD?: boolean } }).env;
  if (meta !== undefined) {
    return meta.PROD === true;
  }
  if (typeof process !== 'undefined' && process.env != null) {
    return process.env['NODE_ENV'] === 'production';
  }
  return false;
}
