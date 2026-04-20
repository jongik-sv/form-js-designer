/**
 * sourceWatcher.ts — TSK-02-04
 *
 * `startSourceWatcher(sessionRegistry, broadcast, subscribe)` —
 * `vscode.workspace.onDidChangeTextDocument`(또는 주입된 subscribe 함수)를 구독하여,
 * 활성 편집 세션이 있는 URI의 외부 변경을 감지하고 `source-updated` 메시지를 브로드캐스트한다.
 *
 * self-edit cascade 억제:
 *   - EditSession.pendingSaveTokens(Set<number>)에 등록된 버전은 자체 applyEdit 결과이므로
 *     source-updated를 발송하지 않고 해당 토큰을 Set에서 제거한다.
 *
 * dispose():
 *   - subscribe가 반환한 disposable.dispose()를 호출하여 구독을 해제한다.
 *   - dispose 이후 수신된 이벤트는 무시된다.
 */

import type { EditSessionRegistry } from './editSession';
import type { SourceUpdatedMessage } from '../shared/messages';

/** onDidChangeTextDocument 이벤트 최소 인터페이스 */
interface TextDocumentChangeEvent {
  document: {
    uri: { toString(): string };
    version: number;
  };
}

/** subscribe 함수 타입 — vscode.workspace.onDidChangeTextDocument 시그니처와 호환 */
type SubscribeFn = (
  handler: (e: TextDocumentChangeEvent) => void
) => { dispose(): void };

/** broadcast 함수 타입 — uri별 webview postMessage 라우터 */
type BroadcastFn = (uri: string, message: SourceUpdatedMessage) => void;

/**
 * 외부 변경 감시를 시작하고 dispose 핸들을 반환한다.
 *
 * @param sessionRegistry - 활성 편집 세션 레지스트리
 * @param broadcast - uri + SourceUpdatedMessage를 webview로 전달하는 콜백
 * @param subscribe - onDidChangeTextDocument 구독 함수 (또는 테스트 stub)
 * @returns { dispose } — 구독 해제 핸들
 */
export function startSourceWatcher(
  sessionRegistry: EditSessionRegistry,
  broadcast: BroadcastFn,
  subscribe: SubscribeFn
): { dispose(): void } {
  let disposed = false;

  const disposable = subscribe((event: TextDocumentChangeEvent) => {
    if (disposed) return;

    const uri = event.document.uri.toString();
    const version = event.document.version;

    // 활성 세션 조회
    const session = sessionRegistry.findByUri(uri);

    if (!session) return;

    // self-edit cascade 억제: pendingSaveTokens에 있는 버전이면 무시하고 제거
    if (session.pendingSaveTokens?.has(version)) {
      session.pendingSaveTokens.delete(version);
      return;
    }

    broadcast(uri, {
      type: 'source-updated',
      uri,
      version,
    });
  });

  return {
    dispose() {
      disposed = true;
      disposable.dispose();
    },
  };
}
