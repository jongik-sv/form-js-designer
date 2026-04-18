/**
 * Intl 어댑터 — ko-KR 형식 숫자/날짜 포매팅 유틸
 *
 * 순수 유틸 함수. 브라우저/Node 모두에서 동작.
 */

const DEFAULT_LOCALE = 'ko-KR';

type DateStyle = 'full' | 'long' | 'medium' | 'short';
type TimeStyle = 'full' | 'long' | 'medium' | 'short';

interface FormatNumberOptions {
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * formatNumber
 *
 * @param value - 포매팅할 숫자
 * @param options - Intl.NumberFormat 옵션 (선택)
 * @returns ko-KR 형식 문자열
 */
export function formatNumber(value: number, options?: FormatNumberOptions): string {
  const locale = options?.locale ?? DEFAULT_LOCALE;
  const { locale: _locale, ...rest } = options ?? {};
  try {
    return new Intl.NumberFormat(locale, rest).format(value);
  } catch {
    return String(value);
  }
}

interface FormatDateOptions {
  locale?: string;
  dateStyle?: DateStyle;
}

interface FormatDateTimeOptions {
  locale?: string;
  dateStyle?: DateStyle;
  timeStyle?: TimeStyle;
}

/**
 * safeFormatDate — 공통 날짜/시간 포매팅 헬퍼
 *
 * Invalid date 및 Intl 예외를 빈 문자열로 처리.
 */
function safeFormatDate(
  value: Date,
  locale: string,
  dtfOptions: Intl.DateTimeFormatOptions,
): string {
  try {
    if (isNaN(value.getTime())) {
      return '';
    }
    return new Intl.DateTimeFormat(locale, dtfOptions).format(value);
  } catch {
    return '';
  }
}

/**
 * formatDate
 *
 * @param value - 포매팅할 날짜
 * @param options - Intl.DateTimeFormat 옵션 (선택)
 * @returns ko-KR 날짜 형식 문자열 (invalid date면 빈 문자열 반환, throw 없음)
 */
export function formatDate(value: Date, options?: FormatDateOptions): string {
  const locale = options?.locale ?? DEFAULT_LOCALE;
  const dateStyle = options?.dateStyle ?? 'medium';
  return safeFormatDate(value, locale, { dateStyle });
}

/**
 * formatDateTime
 *
 * @param value - 포매팅할 날짜+시간
 * @param options - Intl.DateTimeFormat 옵션 (선택)
 * @returns ko-KR 날짜+시간 형식 문자열 (invalid date면 빈 문자열 반환, throw 없음)
 */
export function formatDateTime(value: Date, options?: FormatDateTimeOptions): string {
  const locale = options?.locale ?? DEFAULT_LOCALE;
  const dateStyle = options?.dateStyle ?? 'medium';
  const timeStyle = options?.timeStyle ?? 'short';
  return safeFormatDate(value, locale, { dateStyle, timeStyle });
}
