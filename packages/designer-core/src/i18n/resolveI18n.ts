/**
 * Resolves an i18n value to display text.
 *
 * Accepted shapes:
 *   - undefined / null / '' → ''
 *   - string → returned as-is
 *   - { key?, ko? } → returns ko (current locale priority); falls back to key, then ''
 *
 * Used by designer-component renderers to safely consume props that the
 * props-panel stores as `{ key, ko }` objects (Full mode) or as plain
 * strings (legacy / non-i18n widgets). Without this helper, embedding the
 * raw object as a JSX child throws "Objects are not valid as a child of a
 * component".
 *
 * Future: locale parameter for non-Korean (en/ja/...). Currently ko-only.
 */
export type ResolvableI18nValue = string | { key?: string; ko?: string } | null | undefined;

export function resolveI18n(value: ResolvableI18nValue): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const obj = value as { key?: unknown; ko?: unknown };
    if (typeof obj.ko === 'string' && obj.ko !== '') return obj.ko;
    if (typeof obj.key === 'string') return obj.key;
    return '';
  }
  return '';
}
