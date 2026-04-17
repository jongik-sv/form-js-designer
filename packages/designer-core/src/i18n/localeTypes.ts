/**
 * Locale 타입 계약 — TSK-03-03
 *
 * designer-i18n(WP-07)이 이 타입을 import하여 실 구현 t를 주입한다.
 * LocaleKey는 현재 string alias. WP-07 머지 시 literal union으로 좁힐 수 있다.
 */

/**
 * t 함수 시그니처 계약.
 * params는 {{name}} 형식의 placeholder 치환에 사용된다.
 */
export type LocaleT = (key: string, params?: Record<string, string | number>) => string;

/**
 * LocaleContext value 계약.
 */
export interface LocaleContextValue {
  lang: string;
  t: LocaleT;
}

/**
 * i18n 키 타입 별칭.
 * WP-07에서 literal union으로 교체 가능하도록 alias로 유지.
 */
export type LocaleKey = string;
