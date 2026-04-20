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
  // DIAG: 호출 여부 + md 인스턴스 확인
  // eslint-disable-next-line no-console
  console.log('[form-js DIAG] extendMarkdownIt called, md:', typeof md, 'use:', typeof md?.use);
  const result = md.use(formJsMarkdownPlugin);
  // eslint-disable-next-line no-console
  console.log('[form-js DIAG] plugin registered, fence rule type:', typeof result.renderer.rules.fence);
  return result;
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
): { extendMarkdownIt: (md: MarkdownIt) => MarkdownIt } {
  // DIAG: activate 진입 확인 (test mode가 아니어도 로그는 찍도록)
  // eslint-disable-next-line no-console
  console.log('[form-js DIAG] activate called, FORM_JS_TEST_MODE=', process.env['FORM_JS_TEST_MODE']);

  // DIAG: 파일 기반 증거 — 콘솔/Output 파이프에 관계없이 확인 가능
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('node:fs') as typeof import('node:fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const os = require('node:os') as typeof import('node:os');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('node:path') as typeof import('node:path');
    const logPath = path.join(os.tmpdir(), 'form-js-designer-diag.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] activate called\n`);
  } catch {
    // noop
  }

  // DIAG: UI 팝업으로 activate 즉시 가시화
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const vscode = require('vscode') as typeof import('vscode');
    void vscode.window.showInformationMessage('[form-js DIAG] Form.js Designer activate 호출됨');
  } catch {
    // noop
  }

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

  // 최신 VS Code (markdown-language-features)는 extension.exports.extendMarkdownIt을
  // 통해 플러그인을 수집한다. top-level export만으로는 누락되는 경우가 있어
  // activate의 return 값으로도 함께 노출한다.
  return { extendMarkdownIt };
}

export function deactivate(): void {
  // stub: 후속 task에서 구현
}
