/**
 * editSession.ts — TSK-02-01
 *
 * EditSessionRegistry: 문서 URI별 현재 편집 세션 1건 lock.
 * extension host 전역 싱글톤으로 사용한다.
 *
 * single-editor lock 보장:
 * - beginSession: 새 세션 시작. 이미 세션이 있으면 false 반환(lock 거절).
 * - endSession: 세션 종료. 잠금 해제 후 이벤트 발행.
 * - getActive: 현재 활성 세션 조회.
 */

/** 하나의 편집 세션을 나타내는 데이터 구조 */
export interface EditSession {
  /** Markdown 문서 URI 문자열 */
  uri: string;
  /** 펜스 블록 시작 라인 (0-based) */
  mdStart: number;
  /** 펜스 블록 종료 라인 (0-based) */
  mdEnd: number;
  /** 편집 webview 패널 (dispose 가능 객체) */
  panel: { dispose(): void };
}

/** 세션 lock 상태 변화 이벤트 */
export interface SessionEvent {
  type: 'began' | 'ended';
  session: EditSession;
}

type SessionListener = (event: SessionEvent) => void;

/**
 * EditSessionRegistry — 문서 URI별 편집 세션 1건 lock 관리.
 *
 * @example
 * const registry = new EditSessionRegistry();
 * const ok = registry.beginSession({ uri, mdStart, mdEnd, panel });
 * if (!ok) { ... } // lock 거절
 * registry.endSession(uri);
 */
export class EditSessionRegistry {
  private readonly sessions = new Map<string, EditSession>();
  private readonly listeners: SessionListener[] = [];
  /** openWith 호출 중인 URI들 (resolveCustomTextEditor가 호출될 때까지) */
  private readonly openingURIs = new Set<string>();

  /**
   * 새 편집 세션을 시작한다.
   * @returns true: 성공, false: 이미 활성 세션이 있어 거절됨
   */
  beginSession(session: EditSession): boolean {
    if (this.sessions.has(session.uri)) {
      return false;
    }
    this.sessions.set(session.uri, session);
    this.emit({ type: 'began', session });
    return true;
  }

  /**
   * 편집 세션을 종료한다.
   * @returns 종료된 세션, 없으면 undefined
   */
  endSession(uri: string): EditSession | undefined {
    const session = this.sessions.get(uri);
    if (!session) {
      return undefined;
    }
    this.sessions.delete(uri);
    this.emit({ type: 'ended', session });
    return session;
  }

  /**
   * 특정 URI의 활성 세션을 반환한다.
   */
  getActive(uri: string): EditSession | undefined {
    return this.sessions.get(uri);
  }

  /**
   * 모든 활성 세션을 반환한다.
   */
  getAllActive(): EditSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * 세션 이벤트 리스너를 등록한다.
   * @returns unsubscribe 함수
   */
  onSessionChange(listener: SessionListener): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx >= 0) {
        this.listeners.splice(idx, 1);
      }
    };
  }

  /**
   * 모든 활성 세션을 강제 종료하고 리스너를 제거한다.
   * deactivate() 에서 호출.
   */
  disposeAll(): void {
    for (const session of this.sessions.values()) {
      try {
        session.panel.dispose();
      } catch {
        // dispose 실패는 무시
      }
      this.emit({ type: 'ended', session });
    }
    this.sessions.clear();
    this.listeners.length = 0;
    this.openingURIs.clear();
  }

  /**
   * openBlockEditorCommand에서 vscode.openWith 호출 시 opening 상태를 등록한다.
   * @internal
   */
  markOpening(uri: string): void {
    this.openingURIs.add(uri);
  }

  /**
   * 이미 opening 또는 active 상태인지 확인한다.
   * @internal
   */
  isOpeningOrActive(uri: string): boolean {
    return this.openingURIs.has(uri) || this.sessions.has(uri);
  }

  /**
   * resolveCustomTextEditor에서 beginSession 후 opening 상태를 해제한다.
   * @internal
   */
  unmarkOpening(uri: string): void {
    this.openingURIs.delete(uri);
  }

  private emit(event: SessionEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // 리스너 에러는 무시
      }
    }
  }
}

/** extension host 전역 싱글톤 */
export const editSessionRegistry = new EditSessionRegistry();
