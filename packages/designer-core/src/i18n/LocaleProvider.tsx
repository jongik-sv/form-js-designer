/**
 * LocaleProvider — TSK-03-03 i18n 계약 인터페이스
 *
 * Preact Context 기반 locale 주입.
 * designer-i18n(WP-07)이 이 Provider에 실 t 함수를 주입한다.
 *
 * 사용:
 *   import { LocaleProvider, useT, useLocale } from '@form-js-designer/designer-core'
 *   <LocaleProvider lang="ko" t={myT}>...</LocaleProvider>
 *   const t = useT();
 *   const { lang } = useLocale();
 */

import { h, createContext } from 'preact';
import { useContext, useMemo } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { createFallbackT } from './fallbackT';
import type { LocaleT, LocaleContextValue } from './localeTypes';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const defaultCtx: LocaleContextValue = {
  lang: 'ko',
  t: createFallbackT(),
};

const LocaleContext = createContext<LocaleContextValue>(defaultCtx);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
interface LocaleProviderProps {
  lang: string;
  t: LocaleT;
  children: ComponentChildren;
}

export function LocaleProvider({ lang, t, children }: LocaleProviderProps) {
  // t가 function이 아닌 경우 dev 경고 + fallback
  let safeT = t;
  if (typeof t !== 'function') {
    if (typeof process === 'undefined' || process.env['NODE_ENV'] !== 'production') {
      console.warn(
        '[designer-i18n] LocaleProvider received a non-function value for "t" prop. ' +
          'Falling back to default t (key as-is).',
      );
    }
    safeT = createFallbackT();
  }

  const value = useMemo<LocaleContextValue>(
    () => ({ lang, t: safeT }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, safeT],
  );

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------
export const useLocale = (): LocaleContextValue => useContext(LocaleContext);
export const useT = (): LocaleT => useContext(LocaleContext).t;

// ---------------------------------------------------------------------------
// Re-exports for convenience
// ---------------------------------------------------------------------------
export { createFallbackT } from './fallbackT';
export type { LocaleT, LocaleContextValue, LocaleKey } from './localeTypes';
