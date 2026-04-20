/**
 * TSK-01-03: 오류 배너 렌더 유틸
 *
 * JSON 파싱 실패 또는 viewer 마운트 실패 시 해당 블록에 오류 배너를 표시한다.
 * - `.form-js-block--error` 클래스 적용
 * - `role="alert"` 접근성 보장
 * - textContent 사용으로 XSS 방지
 */

/**
 * 호스트 엘리먼트에 오류 배너를 렌더한다.
 * 기존 배너가 있으면 교체한다.
 *
 * @param host 오류 배너를 삽입할 컨테이너 엘리먼트
 * @param message 오류 메시지 (SyntaxError.message 등)
 */
export function renderErrorBanner(host: HTMLElement, message: string): void {
  // 기존 오류 배너가 있으면 제거 (중복 방지)
  const existing = host.querySelector('.form-js-block--error');
  if (existing) {
    existing.remove();
  }

  const banner = document.createElement('div');
  banner.className = 'form-js-block--error';
  banner.setAttribute('role', 'alert');
  // textContent로 삽입하여 XSS 방지
  banner.textContent = `\u26a0 Invalid form-js schema \u2014 ${message}`;

  host.appendChild(banner);
}
