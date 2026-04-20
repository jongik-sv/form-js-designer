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

import type * as vscodeType from 'vscode';
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
  // 동적 import: extension host 환경에서만 vscode 모듈이 존재한다
  // (단위 테스트에서는 mock으로 대체된다)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const vscode = require('vscode') as typeof vscodeType;

  const { uri, mdStart, mdEnd, schema } = args;

  // single-editor lock: 이미 활성 세션이 있으면 패널 reveal
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

  // schema stash: provider가 resolveCustomTextEditor에서 consume
  pendingEditSchemas.set(uri, { mdStart, mdEnd, schema });

  try {
    await vscode.commands.executeCommand(
      'vscode.openWith',
      vscode.Uri.parse(uri),
      'form-js.block-editor',
      vscode.ViewColumn.Beside
    );
  } catch (err) {
    // openWith 실패 시 stash 제거 (rollback)
    pendingEditSchemas.delete(uri);
    throw err;
  }
}
