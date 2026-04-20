/**
 * VSCode extension 진입점.
 *
 * VSCode는 `contributes.markdown.markdownItPlugins: true` 선언 시
 * extendMarkdownIt(md) 를 호출하여 host markdown-it 인스턴스에 플러그인을 주입한다.
 * VSCode는 이 함수를 최초 1회만 호출하므로 중복 등록 방어 불필요.
 *
 * TSK-01-04: FORM_JS_TEST_MODE=1 환경에서 test bridge를 활성화한다.
 *   - webview postMessage 'test-mount-complete' 수신 → _testMountState 업데이트
 *   - 'form-js._test.getMountState' 커맨드 등록 (테스트 폴링용)
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
 * Extension activate.
 *
 * FORM_JS_TEST_MODE=1 환경에서 test bridge를 활성화한다:
 * - 'form-js._test.getMountState' 커맨드를 등록하여 URI별 마운트 상태를 반환한다.
 * - webview 메시지 'test-mount-complete' 수신 시 _testMountState를 업데이트한다.
 *   (실제 webview 메시지 수신은 패널별 onDidReceiveMessage 핸들러에서 처리하며,
 *    여기서는 커맨드 등록만 수행한다.)
 */
export function activate(
  context?: import('vscode').ExtensionContext
): void {
  if (process.env['FORM_JS_TEST_MODE'] !== '1') {
    return;
  }

  // vscode 모듈은 extension host 런타임에서만 사용 가능
  // Node.js 환경에서 require로 로드
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

/**
 * Extension deactivate — stub.
 */
export function deactivate(): void {
  // stub: 후속 task에서 구현
}
