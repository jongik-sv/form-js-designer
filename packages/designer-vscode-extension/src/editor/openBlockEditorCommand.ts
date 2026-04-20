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
  /** 초기 스키마 JSON 문자열 */
  schema: string;
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
  const { uri, mdStart, mdEnd, schema } = args;

  // single-editor lock: 이미 활성 세션이 있으면 reveal
  const existing = editSessionRegistry.getActive(uri);
  if (existing) {
    try {
      // panel 객체가 reveal 메서드를 가지고 있으면 호출
      const panel = existing.panel as { reveal?: (col?: number) => void; dispose(): void };
      if (typeof panel.reveal === 'function') {
        panel.reveal(vscode.ViewColumn.Beside);
      }
    } catch {
      // reveal 실패는 무시
    }
    return;
  }

  // 현재 opening이거나 active인 경우: 무시
  if (editSessionRegistry.isOpeningOrActive(uri)) {
    return;
  }

  // tabGroups에서 이미 열린 Custom Editor 탭이 있는지 확인
  // (resolveCustomTextEditor가 호출 중이거나 완료되었지만 beginSession이 아직 호출되지 않은 경우)
  if (vscode.window.tabGroups) {
    for (const group of vscode.window.tabGroups.all) {
      for (const tab of group.tabs) {
        const input = tab.input as { viewType?: string } | undefined;
        if (input?.viewType === 'form-js.block-editor') {
          // 이 URI에 대한 Custom Editor가 이미 열려 있는지 확인
          // CustomEditorInput.uri를 직접 비교하기는 어려우므로, 탭이 있다는 것만으로 충분
          // 같은 문서에 여러 Custom Editor가 열릴 수 없으므로 (supportsMultipleEditorsPerDocument: false)
          // viewType만 확인해도 된다.
          return;
        }
      }
    }
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
