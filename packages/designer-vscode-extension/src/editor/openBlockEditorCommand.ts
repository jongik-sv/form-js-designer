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
 * 3. vscode.commands.executeCommand('vscode.openWith', uri, 'form-js.block-editor', ViewColumn.Beside)
 * 4. provider가 resolveCustomTextEditor에서 stash를 consume
 */

import * as vscode from 'vscode';
import { editSessionRegistry } from './editSession';

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

  // single-editor lock: 이미 활성 세션이 있으면 reveal
  const existing = editSessionRegistry.getActive(uri);
  if (existing) {
    try {
      // panel 객체가 reveal 메서드를 가지고 있으면 호출
      const panel = existing.panel as { reveal?: (col?: number) => void; dispose(): void };
      if (typeof panel.reveal === 'function') {
        // column을 지정하지 않으면 현재 column에서 reveal하여 새 탭이 생기지 않는다
        panel.reveal();
      }
    } catch {
      // reveal 실패는 무시
    }
    return;
  }

  // 현재 opening이거나 active인 경우: 무시
  // (supportsMultipleEditorsPerDocument: false 로 등록되어 있어 VSCode도 중복을 차단하지만
  //  openWith 호출 전 단계에서 early return하여 불필요한 openWith 호출을 방지한다)
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
      vscode.ViewColumn.Beside
    );
    // vscode.openWith 반환 후에도 resolveCustomTextEditor가 아직 실행 중일 수 있다.
    // opening 상태는 unmarkOpening에서 정리한다.
  } catch (err) {
    // openWith 실패 시 opening과 schema 제거 (rollback)
    editSessionRegistry.unmarkOpening(uri);
    pendingEditSchemas.delete(uri);
    throw err;
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
