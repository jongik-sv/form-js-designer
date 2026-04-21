/**
 * themeSync — 호스트의 다크/라이트 테마 속성을 감지하여
 * form-js 컨테이너에 theme-light / theme-dark 클래스를 적용한다.
 *
 * 감지 우선순위:
 *  1. document.body의 data-theme 속성 ("light" | "dark")
 *  2. document.body의 data-color-scheme 속성 ("light" | "dark")
 *  3. document.body의 class에 "dark"/"light" 포함 여부
 *  4. VSCode: data-vscode-theme-kind 속성 (vscode-dark | vscode-high-contrast)
 *
 * MutationObserver로 변경을 지속 감시한다.
 */
export type ThemeStrategy = 'auto';

function detectTheme(): 'light' | 'dark' | null {
  const body = document.body;

  const dataTheme = body.getAttribute('data-theme');
  if (dataTheme === 'dark') return 'dark';
  if (dataTheme === 'light') return 'light';

  const dataColorScheme = body.getAttribute('data-color-scheme');
  if (dataColorScheme === 'dark') return 'dark';
  if (dataColorScheme === 'light') return 'light';

  const vscodeTheme = body.getAttribute('data-vscode-theme-kind');
  if (vscodeTheme === 'vscode-dark' || vscodeTheme === 'vscode-high-contrast') return 'dark';
  if (vscodeTheme === 'vscode-light') return 'light';

  if (body.classList.contains('dark')) return 'dark';
  if (body.classList.contains('light')) return 'light';

  return null;
}

function applyTheme(container: HTMLElement, theme: 'light' | 'dark' | null): void {
  container.classList.remove('theme-light', 'theme-dark');
  if (theme === 'light') container.classList.add('theme-light');
  if (theme === 'dark') container.classList.add('theme-dark');
}

/**
 * 주어진 컨테이너에 현재 테마를 즉시 적용하고,
 * document.body의 속성/클래스 변경을 감시하여 동적으로 갱신한다.
 *
 * @returns disconnect 함수 — 컴포넌트 unmount 시 호출하여 observer 해제
 */
export function themeSync(container: HTMLElement, _strategy: ThemeStrategy = 'auto'): () => void {
  // 초기 적용
  applyTheme(container, detectTheme());

  // MutationObserver로 변경 감지
  const observer = new MutationObserver(() => {
    applyTheme(container, detectTheme());
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['data-theme', 'data-color-scheme', 'data-vscode-theme-kind', 'class'],
  });

  return () => observer.disconnect();
}
