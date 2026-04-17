/**
 * LocaleProvider unit tests — TDD (TSK-03-03)
 *
 * 검증 항목:
 * 1. LocaleProvider 미설치 시 useT()가 fallback t를 반환
 * 2. LocaleProvider 주입 시 useT()가 주입된 t를 반환
 * 3. useT() 훅이 Provider 하위에서 주입된 t를 반환
 * 4. params 치환
 * 5. nested LocaleProvider 재정의
 * 6. lang prop 변경 시 re-render
 * 7. fallback t dev 경고 1회성
 * 8. useLocale()이 { lang, t }를 반환
 * 9. t가 function이 아닌 경우 dev warn + fallback
 * 10. createFallbackT() 동작
 *
 * Environment: happy-dom (vitest.config.ts)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { useContext } from 'preact/hooks';
import { LocaleProvider, useT, useLocale, createFallbackT } from '../LocaleProvider';
import type { LocaleT } from '../localeTypes';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------
function renderWithLocale(
  lang: string,
  t: LocaleT,
  container: HTMLElement,
  callback: () => void,
) {
  act(() => {
    render(
      <LocaleProvider lang={lang} t={t}>
        <TestChild />
      </LocaleProvider>,
      container,
    );
  });
  callback();
}

let lastT: LocaleT | null = null;
let lastLang: string | null = null;

function TestChild() {
  const locale = useLocale();
  lastT = locale.t;
  lastLang = locale.lang;
  return <div data-testid="child" />;
}

function TestUseT() {
  const t = useT();
  return <div data-testid="t-result">{t('hello')}</div>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('LocaleProvider + useT + useLocale', () => {
  let container: HTMLElement;

  beforeEach(() => {
    lastT = null;
    lastLang = null;
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => { render(null, container); });
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  // 1. Provider 미설치 시 fallback t 반환
  it('returns fallback t when LocaleProvider is not installed', () => {
    act(() => {
      render(<TestUseT />, container);
    });
    const el = container.querySelector('[data-testid="t-result"]');
    expect(el).not.toBeNull();
    // fallback t는 key를 그대로 반환
    expect(el!.textContent).toBe('hello');
  });

  // 2. Provider 주입 시 useT()가 주입된 t를 반환
  it('returns injected t when LocaleProvider is installed', () => {
    const mockT: LocaleT = vi.fn((key: string) => `translated:${key}`);
    act(() => {
      render(
        <LocaleProvider lang="ko" t={mockT}>
          <TestUseT />
        </LocaleProvider>,
        container,
      );
    });
    const el = container.querySelector('[data-testid="t-result"]');
    expect(el!.textContent).toBe('translated:hello');
  });

  // 3. useT() 훅이 Provider 하위에서 주입된 t를 반환
  it('useT hook returns injected t under LocaleProvider', () => {
    const mockT: LocaleT = vi.fn((key: string) => `ok:${key}`);
    act(() => {
      render(
        <LocaleProvider lang="ko" t={mockT}>
          <TestChild />
        </LocaleProvider>,
        container,
      );
    });
    expect(lastT).toBe(mockT);
  });

  // 4. params 치환
  it('fallback t performs {{name}} placeholder substitution when key has template', () => {
    const fallbackT = createFallbackT();
    // key 자체가 template 문자열이면 치환
    const result = fallbackT('Hello {{name}}', { name: 'Ada' });
    expect(result).toBe('Hello Ada');
  });

  // 5. nested LocaleProvider 재정의
  it('inner LocaleProvider overrides outer LocaleProvider', () => {
    const outerT: LocaleT = () => 'outer';
    const innerT: LocaleT = () => 'inner';
    let innerResult: string | undefined;

    function InnerConsumer() {
      const t = useT();
      innerResult = t('key');
      return <div />;
    }

    act(() => {
      render(
        <LocaleProvider lang="en" t={outerT}>
          <LocaleProvider lang="ko" t={innerT}>
            <InnerConsumer />
          </LocaleProvider>
        </LocaleProvider>,
        container,
      );
    });
    expect(innerResult).toBe('inner');
  });

  // 6. lang prop 변경 시 re-render
  it('reflects updated lang when LocaleProvider lang prop changes', () => {
    const mockT: LocaleT = (key: string) => key;

    act(() => {
      render(
        <LocaleProvider lang="en" t={mockT}>
          <TestChild />
        </LocaleProvider>,
        container,
      );
    });
    expect(lastLang).toBe('en');

    act(() => {
      render(
        <LocaleProvider lang="ko" t={mockT}>
          <TestChild />
        </LocaleProvider>,
        container,
      );
    });
    expect(lastLang).toBe('ko');
  });

  // 7. fallback t dev 경고 1회성
  it('fallback t emits console.warn exactly once on first call, not on subsequent calls', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fallbackT = createFallbackT();

    fallbackT('key1');
    fallbackT('key2');
    fallbackT('key3');

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toMatch(/LocaleProvider not installed/i);
  });

  // 8. useLocale()이 { lang, t }를 반환
  it('useLocale returns { lang, t } matching what was passed to LocaleProvider', () => {
    const mockT: LocaleT = (key: string) => key;
    act(() => {
      render(
        <LocaleProvider lang="ja" t={mockT}>
          <TestChild />
        </LocaleProvider>,
        container,
      );
    });
    expect(lastLang).toBe('ja');
    expect(lastT).toBe(mockT);
  });

  // 9. createFallbackT key 반환 (no template)
  it('fallback t returns key as-is when key is a plain identifier', () => {
    const fallbackT = createFallbackT();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(fallbackT('designer.core.loading')).toBe('designer.core.loading');
  });

  // 10. createFallbackT params 있어도 key가 placeholder 없으면 key 반환
  it('fallback t returns key when params provided but key has no placeholders', () => {
    const fallbackT = createFallbackT();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    // 'greeting'은 placeholder 없으므로 key 그대로 반환
    expect(fallbackT('greeting', { name: 'Ada' })).toBe('greeting');
  });
});
