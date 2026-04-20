/**
 * VSCode extension 진입점.
 *
 * VSCode는 `contributes.markdown.markdownItPlugins: true` 선언 시
 * extendMarkdownIt(md) 를 호출하여 host markdown-it 인스턴스에 플러그인을 주입한다.
 * VSCode는 이 함수를 최초 1회만 호출하므로 중복 등록 방어 불필요.
 *
 * 참고: TSK-01-01 범위에서는 activate/deactivate extension lifecycle은
 *       stub로 유지하고, markdown plugin wiring만 구현한다.
 */
import type MarkdownIt from 'markdown-it';
import { formJsMarkdownPlugin } from './markdown/plugin';

/**
 * VSCode markdown-it 플러그인 진입점.
 * VSCode가 이 함수를 호출하여 host markdown-it 인스턴스에 form-js 플러그인을 주입한다.
 *
 * @param md VSCode가 제공하는 markdown-it 인스턴스
 * @returns 플러그인이 적용된 md 인스턴스 (동일 객체)
 */
export function extendMarkdownIt(md: MarkdownIt): MarkdownIt {
  return md.use(formJsMarkdownPlugin);
}

/**
 * Extension activate — TSK-01-01 범위에서는 stub.
 * 후속 Task(Custom Editor 등)에서 실제 기능 추가 예정.
 */
export function activate(): void {
  // stub: 후속 task에서 구현
}

/**
 * Extension deactivate — stub.
 */
export function deactivate(): void {
  // stub: 후속 task에서 구현
}
