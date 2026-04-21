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

/** TSK-02-04: sourceWatcher dispose 핸들 */
let _sourceWatcherDispose: (() => void) | null = null;

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
 * 1. form-js.block-editor Custom Editor Provider 등록 (idempotent)
 * 2. formJs.openBlockEditor 커맨드 등록
 * 3. FORM_JS_TEST_MODE=1 환경에서 test bridge 활성화
 */
export function activate(
  context?: import('vscode').ExtensionContext
): {
  extendMarkdownIt: (md: MarkdownIt) => MarkdownIt;
  editSessionRegistry: typeof editSessionRegistry;
  waitForAxeResult: typeof import('./testBridge').waitForAxeResult;
  getAxeResult: typeof import('./testBridge').getAxeResult;
  clearAxeResult: typeof import('./testBridge').clearAxeResult;
  filterCriticalViolations: typeof import('./testBridge').filterCriticalViolations;
  registerAxeResult: typeof import('./testBridge').registerAxeResult;
} {
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

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const vscode = require('vscode') as typeof import('vscode');

    // DIAG: UI 팝업으로 activate 즉시 가시화
    void vscode.window.showInformationMessage('[form-js DIAG] Form.js Designer activate 호출됨');

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

      // TSK-02-04: sourceWatcher 시작 (onDidChangeTextDocument 구독)
      try {
        const { startSourceWatcher } = require('./editor/sourceWatcher') as typeof import('./editor/sourceWatcher');
        const watcher = startSourceWatcher(
          editSessionRegistry,
          (uri, message) => {
            // 해당 URI의 활성 세션 패널 webview로 source-updated 전달
            const session = editSessionRegistry.getActive(uri);
            if (session) {
              try {
                void (session.panel as unknown as { webview?: { postMessage(m: unknown): void } })
                  .webview?.postMessage(message);
              } catch {
                // 패널이 이미 dispose된 경우 무시
              }
            }
          },
          vscode.workspace.onDidChangeTextDocument.bind(vscode.workspace)
        );
        _sourceWatcherDispose = watcher.dispose.bind(watcher);
        if (context) {
          context.subscriptions.push({ dispose: watcher.dispose.bind(watcher) });
        }
      } catch {
        // sourceWatcher 초기화 실패는 무시 (저장 기능 외 동작 유지)
      }

      // TSK-02-04: formJs.saveBlockEditor 커맨드 등록
      // package.json keybinding (Cmd+S when form-js.block-editor active) → 이 커맨드를 호출.
      // webview keydown 캡처와 이중 경로로 환경 호환성을 보장한다.
      try {
        const saveCmd = vscode.commands.registerCommand(
          'formJs.saveBlockEditor',
          () => {
            // 모든 활성 세션 webview에 save-trigger 메시지 전달
            for (const session of editSessionRegistry.getAllActive()) {
              try {
                void (session.panel as unknown as { webview?: { postMessage(m: unknown): void } })
                  .webview?.postMessage({ type: 'save-trigger' });
              } catch {
                // 패널이 이미 dispose된 경우 무시
              }
            }
          }
        );
        if (context) {
          context.subscriptions.push(saveCmd);
        }
      } catch {
        // 무시
      }
    }
  } catch {
    // noop
  }

  // TSK-01-04: test bridge
  if (process.env['FORM_JS_TEST_MODE'] === '1') {
    // TSK-02-05: globalThis에 editSessionRegistry 등록 (ext.exports 타이밍 우회)
    // extension host와 테스트 번들이 동일 Node.js process를 공유하므로 globalThis를 통해 공유 가능
    (globalThis as Record<string, unknown>)['__formJsEditSessionRegistry'] = editSessionRegistry;

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const vscode = require('vscode') as typeof import('vscode');
      const { getMountStateForUri, clearMountState, registerAxeResult } = require('./testBridge') as typeof import('./testBridge');

      // TSK-04-02: webview에서 axe-result를 직접 등록할 수 있도록 globalThis에 testBridge 객체 등록
      // Markdown preview webview는 postMessage 리스너를 설정할 수 없어 직접 함수 호출이 필요하다.
      (globalThis as Record<string, unknown>)['__formJsTestBridge'] = { registerAxeResult };
      // eslint-disable-next-line no-console
      console.log('[form-js testBridge] registered on globalThis, __formJsTestBridge:', typeof (globalThis as Record<string, unknown>)['__formJsTestBridge']);

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
  // TSK-02-05: 동시에 editSessionRegistry 싱글톤도 함께 노출 (테스트 번들 공유).
  // TSK-04-02: testBridge 함수들도 return에 포함하여 테스트 번들이 접근 가능하도록
  const {
    waitForAxeResult,
    getAxeResult,
    clearAxeResult,
    filterCriticalViolations,
    registerAxeResult,
  } = require('./testBridge') as typeof import('./testBridge');

  return {
    extendMarkdownIt,
    editSessionRegistry,
    waitForAxeResult,
    getAxeResult,
    clearAxeResult,
    filterCriticalViolations,
    registerAxeResult,
  };
}

/**
 * TSK-02-05: 통합 테스트에서 extension host의 editSessionRegistry 싱글톤에 접근할 수 있도록
 * re-export한다. 테스트 번들은 별도 인스턴스를 가지므로 ext.exports.editSessionRegistry를
 * 통해 공유 인스턴스에 접근해야 한다.
 *
 * TSK-04-02: testBridge 함수들도 re-export하여 테스트 번들이 extension host의
 * 싱글톤 testBridge state에 접근할 수 있도록 한다.
 */
export { editSessionRegistry };
export {
  registerAxeResult,
  getAxeResult,
  clearAxeResult,
  filterCriticalViolations,
  waitForAxeResult,
} from './testBridge';

export function deactivate(): void {
  // TSK-02-04: sourceWatcher 구독 해제
  try {
    _sourceWatcherDispose?.();
  } catch {
    // 무시
  }
  _sourceWatcherDispose = null;

  // TSK-02-01: 모든 편집 세션 정리
  editSessionRegistry.disposeAll();
  // idempotent 가드 초기화 (재활성화 시 깨끗한 상태)
  _blockEditorRegistered = false;
}
