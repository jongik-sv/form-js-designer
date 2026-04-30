/**
 * openBlockEditorCommand.ts — TSK-02-01
 *
 * `formJs.openBlockEditor` 커맨드 핸들러.
 *
 * command: URI `command:formJs.openBlockEditor?<URI-encoded JSON>` 로부터
 * `{ uri, mdStart, mdEnd, schema }` 인자를 받아 Custom Editor를 연다.
 *
 * 흐름:
 * 1. EditSessionRegistry.getActive(uri) → 이미 세션이 있으면 해당 패널을 reveal하고 종료
 * 2. PendingEditSchema 맵에 schema stash
 * 3. vscode.commands.executeCommand('vscode.openWith', uri, 'form-js.block-editor', ViewColumn.Active)
 *    - Active를 사용하여 preview pane이 split되어 좁아지는 현상을 방지하고, editor가
 *      preview의 column을 인계받아 full-width로 열린다 (preview는 같은 column의 background tab으로 이동).
 * 4. provider가 resolveCustomTextEditor에서 stash를 consume
 */

import * as vscode from 'vscode';
import { editSessionRegistry } from './editSession';
import { formatEditorTitle } from './customEditorProvider';

/** 커맨드 인자 형식 */
export interface OpenBlockEditorArgs {
  /** Markdown 문서 URI 문자열 */
  uri: string;
  /** 펜스 블록 시작 라인 (0-based) */
  mdStart: number;
  /** 펜스 블록 종료 라인 (0-based) */
  mdEnd: number;
  /**
   * 초기 스키마 JSON 문자열.
   *
   * command: URI 링크(markdown preview 펜슬) 호출 시에는 생략되며,
   * 이 경우 extension이 문서를 열어 locateFenceBody로 본문을 추출한다.
   */
  schema?: string;
}

/**
 * provider가 resolveCustomTextEditor 시 consume할 schema 큐.
 * key: document URI 문자열
 */
export const pendingEditSchemas = new Map<string, {
  mdStart: number;
  mdEnd: number;
  schema: string;
}>();

/**
 * `formJs.openBlockEditor` 커맨드 핸들러.
 *
 * @param args - 커맨드 인자. command: URI로부터 JSON-decoded 값이 전달된다.
 */
export async function openBlockEditorCommand(
  args: OpenBlockEditorArgs
): Promise<void> {
  const { uri, mdStart, mdEnd } = args;
  let schema = args.schema;

  // schema 미제공 시 문서를 열어 펜스 본문을 추출한다.
  // (markdown preview 펜슬의 command URI 링크는 URL 길이 제한을 피하기 위해 schema를 싣지 않는다.)
  if (typeof schema !== 'string' || schema.length === 0) {
    try {
      const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(uri));
      const { locateFenceBody } = await import('./blockLocator');
      const range = locateFenceBody(doc, mdStart, mdEnd);
      schema = doc.getText(range);
    } catch {
      // fallback: 빈 스키마로 editor 열기 (사용자에게 오류 표시 없이 열고 나서 edit 가능)
      schema = '{"type":"default","components":[]}';
    }
  }

  // 빈 펜스(```form-js\n```) 본문은 빈 문자열로 추출되며 JSON.parse에서 즉시 실패한다.
  // resolveCustomTextEditor의 `schema ?? default` 는 nullish 체크라 빈 문자열을 통과시키므로
  // 여기서 기본 스키마로 명시 치환하여 webview가 항상 유효한 JSON을 받게 한다.
  if (typeof schema !== 'string' || schema.trim().length === 0) {
    schema = '{"type":"default","components":[]}';
  }

  // single-editor lock: 문서 URI당 패널 1개만 유지.
  //   - 같은 블록 클릭(mdStart/mdEnd 일치): 기존 패널을 reveal만 한다.
  //   - 다른 블록 클릭: 기존 패널을 재사용하여 새 블록 schema로 `edit-opened` 재전송.
  //     (supportsMultipleEditorsPerDocument=false 이므로 패널을 새로 열 수 없다)
  const existing = editSessionRegistry.getActive(uri);
  if (existing) {
    const panel = existing.panel as {
      reveal?: (col?: number) => void;
      webview?: { postMessage(m: unknown): void };
      dispose(): void;
      title?: string;
    };

    const sameBlock = existing.mdStart === mdStart && existing.mdEnd === mdEnd;

    let revealOk = false;
    if (!sameBlock) {
      // 다른 블록: 세션 블록 정보 갱신 + 새 schema로 edit-opened 재전송
      existing.mdStart = mdStart;
      existing.mdEnd = mdEnd;
      try {
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(uri));
        existing.openedDocVersion = doc.version;
        existing.lastKnownDocVersion = doc.version;
        // 탭 타이틀 갱신 (블록 라인 범위 변경 반영)
        try {
          panel.title = formatEditorTitle(doc.uri, mdStart, mdEnd, false);
        } catch {
          // title 설정 실패는 무시
        }
        panel.webview?.postMessage({
          type: 'edit-opened',
          schema,
          uri,
          mdStart,
          mdEnd,
          docVersion: doc.version,
        });
      } catch {
        // postMessage 또는 doc 열기 실패는 무시 — reveal은 시도한다
      }
    }

    try {
      if (typeof panel.reveal === 'function') {
        // column을 지정하지 않으면 현재 column에서 reveal하여 새 탭이 생기지 않는다
        panel.reveal();
        revealOk = true;
      }
    } catch {
      // reveal 실패: stale 세션(이미 dispose된 패널)일 가능성 — 정리 후 새로 연다.
      revealOk = false;
    }

    if (revealOk) return;

    // 안전망: reveal 실패 = 패널이 죽었다고 간주하고 세션 정리 후 새로 여는 흐름으로 폴백.
    editSessionRegistry.endSession(uri);
    editSessionRegistry.unmarkOpening?.(uri);
  }

  // 현재 opening인 경우: 일반적으로 중복 호출을 막는 빠른 경로지만,
  // resolveCustomTextEditor가 호출되지 않은 채 openWith가 종료되는 엣지 케이스에서
  // 영구 잠금이 되지 않도록 finally에서 반드시 unmarkOpening을 호출한다.
  if (editSessionRegistry.isOpeningOrActive(uri)) {
    return;
  }

  // schema stash: provider가 resolveCustomTextEditor에서 consume
  pendingEditSchemas.set(uri, { mdStart, mdEnd, schema });
  editSessionRegistry.markOpening(uri);

  try {
    await vscode.commands.executeCommand(
      'vscode.openWith',
      vscode.Uri.parse(uri),
      'form-js.block-editor',
      vscode.ViewColumn.Active
    );
  } catch (err) {
    // openWith 실패 시 schema 제거 (rollback)
    pendingEditSchemas.delete(uri);
    throw err;
  } finally {
    // 안전망: resolveCustomTextEditor가 어떤 이유로든 clearPendingOpen을 호출하지 못해도
    // openWith 반환 후엔 반드시 opening 잠금을 풀어 stale lock에 의한 무한 무시를 방지한다.
    // (clearPendingOpen이 이미 실행됐다면 idempotent로 no-op)
    editSessionRegistry.unmarkOpening(uri);
  }
}

/**
 * resolveCustomTextEditor에서 호출하여 opening 상태를 해제한다.
 * provider가 세션을 등록한 후 호출되어야 한다.
 * @internal
 */
export function clearPendingOpen(uri: string): void {
  editSessionRegistry.unmarkOpening(uri);
  // pendingEditSchemas는 resolveCustomTextEditor에서 consume했으므로 여기서는 삭제하지 않음
}
