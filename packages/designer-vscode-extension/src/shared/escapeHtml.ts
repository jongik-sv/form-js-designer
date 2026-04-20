/**
 * XSS 방지용 HTML 이스케이프 유틸리티.
 * & < > " ' 5종을 HTML 엔티티로 변환한다.
 * plugin.ts가 hidden <pre> 삽입 전 반드시 통과해야 한다.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
