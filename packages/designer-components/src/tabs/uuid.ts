/**
 * tabPanelId() — tabPanel field id 생성 헬퍼
 *
 * 형식: 'tabPanel_<uuid>'
 * crypto.randomUUID() (브라우저 표준 / Node 19+) 를 사용하고,
 * 미지원 환경(구형 브라우저, 일부 jsdom)에서는 Math.random() fallback.
 */
export function tabPanelId(prefix: string = 'tabPanel'): string {
  const uuid = generateUUID();
  return `${prefix}_${uuid}`;
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
