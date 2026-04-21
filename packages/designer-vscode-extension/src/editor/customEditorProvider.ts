/**
 * customEditorProvider.ts — TSK-02-01
 *
 * FormJsBlockEditorProvider: `form-js.block-editor` viewType의 Custom Text Editor Provider.
 *
 * VSCode가 `vscode.openWith(uri, 'form-js.block-editor', ViewColumn.Beside)` 를 실행할 때
 * `resolveCustomTextEditor`가 호출된다.
 *
 * 책임:
 * - CSP + nonce 적용 HTML 생성 및 webview에 주입
 * - pendingEditSchemas에서 schema를 consume하여 `edit-opened` 메시지 전송
 * - EditSessionRegistry에 lock 등록
 * - dispose 시 lock 해제 + preview webviews에 `edit-closed` 브로드캐스트
 */

import * as vscode from 'vscode';
import { editSessionRegistry } from './editSession';
import { pendingEditSchemas, clearPendingOpen } from './openBlockEditorCommand';
import type { EditOpenedMessage, EditClosedMessage } from '../shared/messages';

/** preview webview panel 참조를 외부에서 주입하기 위한 콜백 타입 */
export type BroadcastFn = (message: EditClosedMessage) => void;

/**
 * FormJsBlockEditorProvider
 *
 * `vscode.window.registerCustomEditorProvider('form-js.block-editor', provider, {
 *   webviewOptions: { retainContextWhenHidden: true },
 *   supportsMultipleEditorsPerDocument: false,
 * })` 로 등록한다.
 */
export class FormJsBlockEditorProvider {
  /**
   * @param extensionUri - ExtensionContext.extensionUri (webview asset URI 생성에 사용)
   * @param broadcastFn - edit-closed를 모든 preview webview에 전파하는 콜백
   */
  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly broadcastFn: BroadcastFn = () => { /* no-op */ }
  ) {}

  /**
   * VSCode가 Custom Editor를 열 때 호출한다.
   * CSP/nonce HTML을 주입하고, pendingEditSchemas에서 schema를 consume하여
   * `edit-opened` 메시지를 송신한다.
   */
  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    const uri = document.uri.toString();

    // schema stash consume (openBlockEditorCommand가 설정한 스키마를 읽고 즉시 제거)
    const pending = pendingEditSchemas.get(uri);
    pendingEditSchemas.delete(uri);

    const schema = pending?.schema ?? '{"type":"default","components":[]}';
    const mdStart = pending?.mdStart ?? 0;
    const mdEnd = pending?.mdEnd ?? 0;

    // webview 옵션 설정
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    // nonce 생성 (CSP용)
    const nonce = generateNonce();

    // webview URI 변환
    const scriptUri = webviewPanel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'customEditor.js')
    );

    const styleUri = webviewPanel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'form-js-editor.css')
    );

    const cspSource = webviewPanel.webview.cspSource;

    // HTML 생성 (CSP + nonce)
    webviewPanel.webview.html = buildHtml({
      nonce,
      cspSource,
      scriptUri: scriptUri.toString(),
      styleUri: styleUri.toString(),
    });

    // EditSessionRegistry lock 등록
    const sessionRegistered = editSessionRegistry.beginSession({
      uri,
      mdStart,
      mdEnd,
      panel: webviewPanel,
    });

    if (!sessionRegistered) {
      // 이미 세션이 있는 경우 (경쟁 상태) — 패널 닫기
      clearPendingOpen(uri);  // opening 상태 해제
      webviewPanel.dispose();
      return;
    }

    // beginSession 성공: sessions 맵에 추가되었으므로 openingURIs에서 즉시 제거한다.
    // 이후 두 번째 커맨드는 getActive(uri) 체크에서 차단된다.
    clearPendingOpen(uri);

    // edit-opened 메시지 송신
    // resolveCustomTextEditor 반환 후 webview HTML이 설정되므로 setImmediate로 지연
    const editOpenedMsg: EditOpenedMessage = {
      type: 'edit-opened',
      schema,
      uri,
      mdStart,
      mdEnd,
      docVersion: document.version,
    };

    setImmediate(() => {
      try {
        void webviewPanel.webview.postMessage(editOpenedMsg);
      } catch {
        // webview 이미 dispose된 경우 무시
      }
    });

    // dispose 훅: lock 해제 + preview broadcast
    webviewPanel.onDidDispose(() => {
      const ended = editSessionRegistry.endSession(uri);
      // opening 상태 해제 (두 번째 openBlockEditorCommand가 이미 opening 상태로 보고 무시했다면 효과 없음)
      // 대신 세션이 끝나면 다시 opening할 수 있도록 정리
      clearPendingOpen(uri);
      if (ended) {
        const editClosedMsg: EditClosedMessage = {
          type: 'edit-closed',
          mdStart: ended.mdStart,
          mdEnd: ended.mdEnd,
        };
        this.broadcastFn(editClosedMsg);
      }
    });

    // TSK-04-02: webview에서 보낸 axe-result 메시지 처리
    webviewPanel.webview.onDidReceiveMessage((message: unknown) => {
      const msg = message as { type?: string; webviewId?: string; violations?: unknown[] };
      if (msg?.type === 'axe-result') {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { registerAxeResult } = require('../testBridge') as typeof import('../testBridge');
          type AxeViolationLike = import('../testBridge').AxeViolation;
          registerAxeResult(msg.webviewId ?? 'custom-editor', {
            violations: (msg.violations ?? []) as AxeViolationLike[],
          });
        } catch {
          // testBridge not available in production mode
        }
      }
    });
  }
}

/** CSP nonce 생성 (32자 alphanumeric) */
export function generateNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

interface HtmlOptions {
  nonce: string;
  cspSource: string;
  scriptUri: string;
  styleUri: string;
}

/** Custom Editor webview HTML 생성 (CSP + nonce 적용, inline script 금지) */
export function buildHtml(opts: HtmlOptions): string {
  const { nonce, cspSource, scriptUri, styleUri } = opts;
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; script-src 'nonce-${nonce}' ${cspSource}; style-src ${cspSource} 'unsafe-inline'; img-src ${cspSource} data:; font-src ${cspSource};">
  <link rel="stylesheet" href="${styleUri}">
  <title>form-js Block Editor</title>
</head>
<body>
  <div id="app"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
