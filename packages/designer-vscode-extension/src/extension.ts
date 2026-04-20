/**
 * VSCode extension 진입점.
 *
 * VSCode는 `contributes.markdown.markdownItPlugins: true` 선언 시
 * extendMarkdownIt(md) 를 호출하여 host markdown-it 인스턴스에 플러그인을 주입한다.
 *
 * TSK-01-04: FORM_JS_TEST_MODE=1 환경에서 test bridge를 활성화한다.
 * TSK-02-01: form-js.block-editor Custom Editor Provider + formJs.openBlockEditor 커맨드 등록.
 */
import type MarkdownIt from 'markdown-it';
import { formJsMarkdownPlugin } from './markdown/plugin';
import { editSessionRegistry } from './editor/editSession';

/** idempotent 가드: registerCustomEditorProvider 중복 등록 방지 */
let _blockEditorRegistered = false;

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
 * 1. form-js.block-editor Custom Editor Provider 등록 (idempotent)
 * 2. formJs.openBlockEditor 커맨드 등록
 * 3. FORM_JS_TEST_MODE=1 환경에서 test bridge 활성화
 */
export function activate(
  context?: import('vscode').ExtensionContext
): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const vscode = require('vscode') as typeof import('vscode');

    // TSK-02-01: Custom Editor Provider 등록 (idempotent)
    if (!_blockEditorRegistered) {
      _blockEditorRegistered = true;

      const { FormJsBlockEditorProvider } = require('./editor/customEditorProvider') as typeof import('./editor/customEditorProvider');
      const { openBlockEditorCommand } = require('./editor/openBlockEditorCommand') as typeof import('./editor/openBlockEditorCommand');

      // broadcastFn: TSK-02-03에서 preview webview 참조 연결 예정
      const provider = new FormJsBlockEditorProvider(
        context?.extensionUri ?? vscode.Uri.file(''),
        () => { /* TSK-02-03: preview broadcast 연결 예정 */ }
      );

      const editorRegistration = vscode.window.registerCustomEditorProvider(
        'form-js.block-editor',
        provider,
        {
          webviewOptions: { retainContextWhenHidden: true },
          supportsMultipleEditorsPerDocument: false,
        }
      );

      const commandRegistration = vscode.commands.registerCommand(
        'formJs.openBlockEditor',
        openBlockEditorCommand
      );

      if (context) {
        context.subscriptions.push(editorRegistration, commandRegistration);
      }
    }
  } catch {
    // extension host 환경이 아닌 경우 무시
  }

  // TSK-01-04: test bridge
  if (process.env['FORM_JS_TEST_MODE'] === '1') {
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
}

export function deactivate(): void {
  // TSK-02-01: 모든 편집 세션 정리
  editSessionRegistry.disposeAll();
  // idempotent 가드 초기화 (재활성화 시 깨끗한 상태)
  _blockEditorRegistered = false;
}
