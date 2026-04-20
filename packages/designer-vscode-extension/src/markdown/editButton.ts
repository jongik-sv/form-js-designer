/**
 * TSK-02-03: ✏️ 편집 버튼 오버레이 + single-editor lock + 메시지 송신
 *
 * - mountEditButton(host, mdStart, mdEnd): .fjs-edit-btn 버튼을 host에 삽입
 * - lockAllButtons(): 모든 .fjs-edit-btn에 aria-disabled + tabindex=-1 적용
 * - unlockAllButtons(): 모든 .fjs-edit-btn 상태 초기화 (재활성화)
 *
 * acquireVsCodeApi()는 모듈 최초 임포트 시 한 번만 호출하여 vscodeApi 상수에 저장.
 * 테스트 환경(window.acquireVsCodeApi 없음)에서는 null로 초기화하여 graceful 처리.
 */

type VsCodeApi = {
  postMessage(msg: unknown): void;
};

/** acquireVsCodeApi() 결과를 한 번만 저장 — 중복 호출 금지 (VSCode 계약) */
const vscodeApi: VsCodeApi | null = (() => {
  try {
    const w = window as unknown as { acquireVsCodeApi?: () => VsCodeApi };
    return typeof w.acquireVsCodeApi === 'function' ? w.acquireVsCodeApi() : null;
  } catch {
    return null;
  }
})();

/** 문서 내 모든 `.fjs-edit-btn`을 배열로 반환한다. */
function getAllEditButtons(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('.fjs-edit-btn'));
}

/** ✏️ 편집 버튼 엘리먼트를 생성하고 클릭 핸들러를 바인딩하여 반환한다. */
function createEditButton(mdStart: number, mdEnd: number): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'fjs-edit-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', '편집');
  btn.setAttribute('tabindex', '0');
  btn.textContent = '✏️';

  btn.addEventListener('click', () => {
    if (btn.getAttribute('aria-disabled') === 'true') return;
    lockAllButtons();
    vscodeApi?.postMessage({ type: 'request-edit', mdStart, mdEnd });
  });

  return btn;
}

/**
 * `.form-js-block` 우상단에 ✏️ 편집 버튼을 삽입한다.
 *
 * 이미 `.fjs-edit-btn`이 존재하면 중복 삽입을 방지하고 스킵한다.
 *
 * @param host - `.form-js-block` DOM 요소
 * @param mdStart - 해당 블록의 Markdown 시작 오프셋
 * @param mdEnd - 해당 블록의 Markdown 종료 오프셋
 */
export function mountEditButton(host: HTMLElement, mdStart: number, mdEnd: number): void {
  if (host.querySelector('.fjs-edit-btn')) return;
  host.appendChild(createEditButton(mdStart, mdEnd));
}

/**
 * 문서 내 모든 `.fjs-edit-btn`에 `aria-disabled="true"` + `tabindex="-1"`을 적용한다.
 * single-editor lock 구현 — 한 번에 하나의 블록만 편집 가능.
 */
export function lockAllButtons(): void {
  for (const btn of getAllEditButtons()) {
    btn.setAttribute('aria-disabled', 'true');
    btn.setAttribute('tabindex', '-1');
  }
}

/**
 * 문서 내 모든 `.fjs-edit-btn`의 비활성화 상태를 초기화하고 재활성화한다.
 * `edit-closed` 메시지 수신 시 호출된다.
 */
export function unlockAllButtons(): void {
  for (const btn of getAllEditButtons()) {
    btn.removeAttribute('aria-disabled');
    btn.removeAttribute('aria-pressed');
    btn.setAttribute('tabindex', '0');
  }
}
