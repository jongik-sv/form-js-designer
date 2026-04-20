/**
 * saveSchemaController.ts — TSK-02-04
 *
 * 저장 트랜잭션 오케스트레이터.
 * `handleSaveSchema(message, deps)` — webview에서 수신한 `save-schema` 메시지를 처리한다.
 *
 * 실행 흐름:
 *   1. openTextDocument(uri) → doc 획득
 *   2. doc.version vs message.docVersion 비교
 *   3. 불일치 시 showWarningMessage(modal) → 덮어쓰기/취소 분기
 *   4. markSaveInFlight(uri, doc.version)
 *   5. locateFenceBody(doc, mdStart, mdEnd) → range
 *   6. replaceFenceBody(doc, schema, range) → edit
 *   7. applyEdit(edit) → boolean
 *   8. clearSaveInFlight(uri, doc.version) [finally]
 *   9. onResult({ ok, error? })
 *
 * 부수 효과는 모두 deps 인터페이스로 주입 — 단위 테스트 가능.
 */

import type { SaveSchemaMessage, SaveResultMessage } from '../shared/messages';
import { showConflictModal } from './conflictModal';

/** TextDocument 최소 인터페이스 */
interface TextDocumentLike {
  version: number;
  lineCount: number;
  lineAt(line: number): { text: string };
  uri: { toString(): string };
}

/** Range 최소 인터페이스 */
interface RangeLike {
  start: { line: number; character: number };
  end: { line: number; character: number };
}

/** WorkspaceEdit 최소 인터페이스 */
type EditLike = unknown;

/** handleSaveSchema에 주입되는 의존성 인터페이스 */
export interface SaveSchemaDeps {
  /** vscode.workspace.openTextDocument */
  openTextDocument(uri: string): Promise<TextDocumentLike>;
  /** vscode.workspace.applyEdit */
  applyEdit(edit: EditLike): Promise<boolean>;
  /** vscode.window.showWarningMessage */
  showWarningMessage(
    message: string,
    options: { modal: boolean; detail?: string },
    ...items: string[]
  ): Promise<string | undefined>;
  /** blockLocator.locateFenceBody */
  locateFenceBody(doc: TextDocumentLike, mdStart: number, mdEnd: number): RangeLike;
  /** workspaceEdit.replaceFenceBody */
  replaceFenceBody(doc: TextDocumentLike, schema: unknown, range: RangeLike): Promise<EditLike>;
  /** save-result 결과를 webview로 전달 */
  onResult(result: Omit<SaveResultMessage, 'type'>): void;
  /** source-updated 브로드캐스트 (확장 여지) */
  onSourceUpdate?: (uri: string, version: number) => void;
  /** in-flight 토큰 등록 */
  markSaveInFlight(uri: string, version: number): void;
  /** in-flight 토큰 해제 */
  clearSaveInFlight(uri: string, version: number): void;
}

/** Error를 문자열로 변환하는 유틸 */
function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * save-schema 메시지를 처리하여 펜스 본문을 교체하고 결과를 회신한다.
 */
export async function handleSaveSchema(
  message: SaveSchemaMessage,
  deps: SaveSchemaDeps
): Promise<void> {
  const { uri, mdStart, mdEnd, schema, docVersion } = message;

  // doc 획득 (버전 불일치 시 사용자 확인 후 재획득)
  let doc: TextDocumentLike;
  try {
    doc = await deps.openTextDocument(uri);
  } catch (err) {
    deps.onResult({ ok: false, error: toErrorMessage(err) });
    return;
  }

  // 버전 비교 — 불일치 시 충돌 모달
  if (doc.version !== docVersion) {
    const choice = await showConflictModal(deps.showWarningMessage);
    if (choice === 'cancel') {
      deps.onResult({ ok: false, error: 'cancelled' });
      return;
    }
    // 덮어쓰기: 최신 doc 재획득
    try {
      doc = await deps.openTextDocument(uri);
    } catch (err) {
      deps.onResult({ ok: false, error: toErrorMessage(err) });
      return;
    }
  }

  // in-flight 토큰 등록 (self-edit cascade 억제용)
  deps.markSaveInFlight(uri, doc.version);

  try {
    // fence 탐색
    let range: RangeLike;
    try {
      range = deps.locateFenceBody(doc, mdStart, mdEnd);
    } catch (err) {
      deps.onResult({ ok: false, error: 'fence not found' });
      return;
    }

    // 편집 생성 및 적용
    let edit: EditLike;
    try {
      edit = await deps.replaceFenceBody(doc, schema, range);
    } catch (err) {
      deps.onResult({ ok: false, error: toErrorMessage(err) });
      return;
    }

    let applied: boolean;
    try {
      applied = await deps.applyEdit(edit);
    } catch (err) {
      deps.onResult({ ok: false, error: toErrorMessage(err) });
      return;
    }

    if (!applied) {
      deps.onResult({ ok: false, error: 'applyEdit failed' });
      return;
    }

    deps.onResult({ ok: true });
  } finally {
    deps.clearSaveInFlight(uri, doc.version);
  }
}
