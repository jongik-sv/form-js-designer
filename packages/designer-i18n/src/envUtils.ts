/**
 * envUtils — 환경 감지 유틸리티 (designer-i18n 로컬 복사)
 *
 * designer-core/envUtils와 동일한 로직.
 * import.meta.env.PROD (Vite) → process.env.NODE_ENV → false(기본값) 순서로 검사.
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
