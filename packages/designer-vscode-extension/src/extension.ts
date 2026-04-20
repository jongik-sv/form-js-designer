/**
 * VSCode extension 진입점.
 *
 * VSCode는 `contributes.markdown.markdownItPlugins: true` 선언 시
 * extendMarkdownIt(md) 를 호출하여 host markdown-it 인스턴스에 플러그인을 주입한다.
 *
 * TSK-01-04: FORM_JS_TEST_MODE=1 환경에서 test bridge를 활성화한다.
 */
import type MarkdownIt from 'markdown-it';
import { formJsMarkdownPlugin } from './markdown/plugin';

/**
 * VSCode markdown-it 플러그인 진입점.
 * VSCode가 이 함수를 호출하여 host markdown-it 인스턴스에 form-js 플러그인을 주입한다.
 */
export function extendMarkdownIt(md: MarkdownIt): MarkdownIt {
  return md.use(formJsMarkdownPlugin);
}

/**
 * Extension activate.
 *
 * FORM_JS_TEST_MODE=1 환경에서 test bridge를 활성화한다:
 * - 'form-js._test.getMountState' 커맨드 등록 (URI별 마운트 상태 반환)
 * - 'form-js._test.clearMountState' 커맨드 등록
 */
export function activate(
  context?: import('vscode').ExtensionContext
): void {
  if (process.env['FORM_JS_TEST_MODE'] !== '1') {
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const vscode = require('vscode') as typeof import('vscode');
    const { getMountStateForUri, clearMountState } = require('./testBridge') as typeof import('./testBridge');

    const getMountStateCmd = vscode.commands.registerCommand(
      'form-js._test.getMountState',
      (uri: string) => getMountStateForUri(uri)
    );

    const clearMountStateCmd = vscode.commands.registerCommand(
      'form-js._test.clearMountState',
      (uri?: string) => clearMountState(uri)
    );

    if (context) {
      context.subscriptions.push(getMountStateCmd, clearMountStateCmd);
    }
  } catch {
    // extension host 환경이 아닌 경우 무시
  }
}

export function deactivate(): void {
  // stub: 후속 task에서 구현
}
