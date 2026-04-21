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

    // .form-js 네이티브 파일: 전체 본문을 스키마로 로드 (markdown fence 경로 우회)
    // mdStart/mdEnd = -1 sentinel로 "whole-file" 모드를 표현한다.
    const isFormJsFile = uri.toLowerCase().endsWith('.form-js');

    let schema: string;
    let mdStart: number;
    let mdEnd: number;

    if (isFormJsFile) {
      // 전체 파일을 JSON 스키마로 간주. 빈 파일이면 기본 스키마.
      const raw = document.getText().trim();
      schema = raw.length > 0 ? raw : '{"type":"default","components":[]}';
      mdStart = -1;
      mdEnd = -1;
      // pending은 .md 경로 전용이므로 혹시 남아있으면 제거
      pendingEditSchemas.delete(uri);
    } else {
      // .md 경로: openBlockEditorCommand가 설정한 스키마를 consume
      const pending = pendingEditSchemas.get(uri);
      pendingEditSchemas.delete(uri);

      schema = pending?.schema ?? '{"type":"default","components":[]}';
      mdStart = pending?.mdStart ?? 0;
      mdEnd = pending?.mdEnd ?? 0;
    }

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

    // CSS 로드 순서 (cascade 중요):
    //   1. form-js-base.css        - form-js 공통 base (drop container h=0 fix)
    //   2. form-js.css             - form-js 공통 스타일
    //   3. form-js-editor-base.css - editor base 레이아웃
    //   4. form-js-editor.css      - editor 메인 (63KB, palette/canvas)
    //   5. properties-panel.css    - 우측 properties panel
    //   6. draggle.css             - drag & drop 시각 효과
    //   7. customEditor.css        - 빌드된 webview 자체 스타일
    //   8. form-js-editor-host.css - #app flex 레이아웃 override (마지막)
    const mediaAsset = (name: string): string =>
      webviewPanel.webview.asWebviewUri(
        vscode.Uri.joinPath(this.extensionUri, 'media', name)
      ).toString();
    const distAsset = (name: string): string =>
      webviewPanel.webview.asWebviewUri(
        vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', name)
      ).toString();

    const styleUri = mediaAsset('form-js-base.css');
    const additionalStyleUris = [
      mediaAsset('form-js.css'),
      mediaAsset('form-js-editor-base.css'),
      mediaAsset('form-js-editor.css'),
      mediaAsset('properties-panel.css'),
      mediaAsset('draggle.css'),
      distAsset('customEditor.css'),
      mediaAsset('form-js-editor-host.css'),
    ];

    const cspSource = webviewPanel.webview.cspSource;

    // HTML 생성 (CSP + nonce)
    webviewPanel.webview.html = buildHtml({
      nonce,
      cspSource,
      scriptUri: scriptUri.toString(),
      styleUri: styleUri.toString(),
      additionalStyleUris,
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

    // webview → extension 메시지 처리 (axe-result + save-schema)
    webviewPanel.webview.onDidReceiveMessage((message: unknown) => {
      const msg = message as {
        type?: string;
        webviewId?: string;
        violations?: unknown[];
        uri?: string;
        mdStart?: number;
        mdEnd?: number;
        schema?: string;
        docVersion?: number;
        persist?: boolean;
      };

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
        return;
      }

      if (msg?.type === 'save-schema') {
        void handleSaveFromWebview(webviewPanel, document, {
          uri: msg.uri ?? uri,
          mdStart: msg.mdStart ?? -1,
          mdEnd: msg.mdEnd ?? -1,
          schema: msg.schema ?? '',
          docVersion: msg.docVersion ?? document.version,
          persist: msg.persist ?? true,
        });
        return;
      }
    });
  }
}

/**
 * webview의 save-schema 메시지를 처리하여 문서에 반영한다.
 *
 * 분기:
 * - mdStart/mdEnd === -1 (whole-file mode, `.form-js` 네이티브 파일):
 *     전체 문서 본문을 포맷된 JSON으로 치환한다.
 * - 그 외 (markdown fence mode):
 *     locateFenceBody + replaceFenceBody로 펜스 본문만 교체한다 (handleSaveSchema 위임).
 *
 * 저장 결과는 webview에 `save-result` 메시지로 회신한다.
 */
async function handleSaveFromWebview(
  webviewPanel: vscode.WebviewPanel,
  document: vscode.TextDocument,
  payload: {
    uri: string;
    mdStart: number;
    mdEnd: number;
    schema: string;
    docVersion: number;
    persist: boolean;
  }
): Promise<void> {
  const reply = (
    ok: boolean,
    opts: { error?: string; version?: number; persisted?: boolean } = {},
  ): void => {
    try {
      void webviewPanel.webview.postMessage({
        type: 'save-result',
        ok,
        error: opts.error,
        version: opts.version,
        persisted: opts.persisted,
      });
    } catch {
      // panel disposed
    }
  };

  const isWholeFile = payload.mdStart === -1 && payload.mdEnd === -1;

  try {
    if (isWholeFile) {
      // `.form-js` whole-file 치환: 들여쓰기 2칸 고정
      let formatted: string;
      try {
        const parsed: unknown = JSON.parse(payload.schema || '{}');
        formatted = JSON.stringify(parsed, null, 2);
      } catch {
        reply(false, { error: 'invalid JSON' });
        return;
      }

      const fullRange = new vscode.Range(
        new vscode.Position(0, 0),
        document.lineAt(Math.max(0, document.lineCount - 1)).range.end
      );
      const edit = new vscode.WorkspaceEdit();
      edit.replace(document.uri, fullRange, formatted);
      const applied = await vscode.workspace.applyEdit(edit);
      if (!applied) {
        reply(false, { error: 'applyEdit failed' });
        return;
      }

      // 내용이 바뀌지 않았으면 dirty 마크도 생기지 않음 → webview에는 현재 version을 회신
      let persisted = false;
      if (payload.persist) {
        try {
          await document.save();
          persisted = true;
        } catch {
          // save 실패 시에도 applyEdit는 성공 → persisted=false로 회신
        }
      }
      reply(true, { version: document.version, persisted });
      return;
    }

    // markdown fence 경로 (위임)
    const { handleSaveSchema } = await import('./saveSchemaController');
    const { locateFenceBody } = await import('./blockLocator');
    const { replaceFenceBody } = await import('./workspaceEdit');

    await handleSaveSchema(
      {
        type: 'save-schema',
        uri: payload.uri,
        mdStart: payload.mdStart,
        mdEnd: payload.mdEnd,
        schema: payload.schema,
        docVersion: payload.docVersion,
        persist: payload.persist,
      },
      {
        openTextDocument: async (u: string) =>
          (await vscode.workspace.openTextDocument(vscode.Uri.parse(u))) as unknown as {
            version: number;
            lineCount: number;
            lineAt(line: number): { text: string };
            uri: { toString(): string };
            save?(): Promise<boolean>;
          },
        applyEdit: async (e) => vscode.workspace.applyEdit(e as vscode.WorkspaceEdit),
        showWarningMessage: (m, opts, ...items) =>
          Promise.resolve(vscode.window.showWarningMessage(m, opts, ...items)) as Promise<string | undefined>,
        locateFenceBody: (doc, s, e) =>
          locateFenceBody(doc as unknown as vscode.TextDocument, s, e) as unknown as {
            start: { line: number; character: number };
            end: { line: number; character: number };
          },
        replaceFenceBody: async (doc, s, r) =>
          replaceFenceBody(
            doc as unknown as vscode.TextDocument,
            s,
            r as unknown as vscode.Range
          ),
        onResult: (result) =>
          reply(result.ok, { error: result.error, version: result.version, persisted: result.persisted }),
        markSaveInFlight: (u, v) => {
          editSessionRegistry.markSaveInFlight?.(u, v);
        },
        clearSaveInFlight: (u, v) => {
          editSessionRegistry.clearSaveInFlight?.(u, v);
        },
      }
    );
  } catch (err) {
    reply(false, { error: err instanceof Error ? err.message : String(err) });
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
  /** 추가 stylesheet URI (form-js-base.css, form-js.css, dist/webview/customEditor.css 등) */
  additionalStyleUris?: string[];
}

/** Custom Editor webview HTML 생성 (CSP + nonce 적용, inline script 금지) */
export function buildHtml(opts: HtmlOptions): string {
  const { nonce, cspSource, scriptUri, styleUri, additionalStyleUris = [] } = opts;
  const extraLinks = additionalStyleUris
    .map((uri) => `  <link rel="stylesheet" href="${uri}">`)
    .join('\n');
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; script-src 'nonce-${nonce}' ${cspSource}; style-src ${cspSource} 'unsafe-inline'; img-src ${cspSource} data:; font-src ${cspSource};">
  <link rel="stylesheet" href="${styleUri}">
${extraLinks}
  <title>form-js Block Editor</title>
</head>
<body>
  <div id="app"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
