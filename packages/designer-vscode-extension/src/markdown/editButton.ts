/**
 * ✏️ 편집 버튼 오버레이 + single-editor lock 처리.
 *
 * 0.1.4부터는 markdown-it plugin(`renderFormJsBlock`)이 `<a class="fjs-edit-btn" href="command:formJs.openBlockEditor?...">`
 * 링크를 이미 HTML에 포함시키므로 클릭 핸들링은 VSCode command: URI 라우팅에 위임한다.
 *
 * 이 모듈은 lock/unlock 시각 상태 전환만 담당한다.
 * - mountEditButton(host, mdStart, mdEnd): 링크가 HTML에 없는 레거시 블록에만 fallback 버튼 삽입
 * - lockAllButtons(): 모든 .fjs-edit-btn에 aria-disabled + tabindex=-1 적용
 * - unlockAllButtons(): 모든 .fjs-edit-btn 상태 초기화 (재활성화)
 */

/** 문서 내 모든 `.fjs-edit-btn`을 배열로 반환한다 (anchor/button 모두). */
function getAllEditButtons(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('.fjs-edit-btn'));
}

/**
 * `.form-js-block` 우상단에 ✏️ 편집 링크가 없으면 fallback 버튼을 삽입한다.
 *
 * 0.1.4부터 markdown-it 렌더 단계에서 command: URI 앵커가 삽입되므로 보통은 no-op.
 * 구 extension 버전으로 렌더된 HTML 캐시 대응용 최소 fallback만 유지한다.
 *
 * @param host - `.form-js-block` DOM 요소
 * @param _mdStart - 해당 블록의 Markdown 시작 오프셋 (fallback에서는 미사용)
 * @param _mdEnd - 해당 블록의 Markdown 종료 오프셋 (fallback에서는 미사용)
 */
export function mountEditButton(host: HTMLElement, _mdStart: number, _mdEnd: number): void {
  if (host.querySelector('.fjs-edit-btn')) return;
  // fallback: command URI 없이 시각적 placeholder만 렌더 (extension 재설치 유도 차원)
  const btn = document.createElement('button');
  btn.className = 'fjs-edit-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', '편집');
  btn.setAttribute('tabindex', '0');
  btn.textContent = '✏️';
  host.appendChild(btn);
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
