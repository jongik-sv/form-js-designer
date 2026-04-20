/**
 * waitForMessage.ts — TSK-02-05
 *
 * extension host 측 메시지/이벤트를 폴링으로 대기하는 헬퍼.
 * editSessionRegistry의 세션 상태를 통해 save-result 등 핵심 결과를 간접 검증한다.
 *
 * 설계 결정 (design.md §2):
 * Custom Editor webview는 별도 iframe 프로세스이므로 메시지를 직접 수신할 수 없다.
 * extension host 측 editSessionRegistry 상태 변화를 폴링하거나,
 * 테스트 환경 전용 글로벌 이벤트 버스를 통해 메시지를 수집한다.
 *
 * @vscode/test-electron 통합 테스트 헬퍼.
 */

import { waitForElement } from './waitForElement';

const DEFAULT_TIMEOUT_MS = 15000;

/**
 * 테스트 환경 전용 메시지 버스.
 * extension host 코드가 FORM_JS_TEST_MODE=1 시 이 버스에 메시지를 emit한다.
 */
export interface TestMessage {
  type: string;
  ok?: boolean;
  error?: string;
  [key: string]: unknown;
}

/** 메시지 수신 대기 결과 matcher */
export type MessageMatcher = Partial<TestMessage>;

const _listeners = new Map<string, Array<(msg: TestMessage) => void>>();

/**
 * 메시지를 테스트 버스에 emit한다.
 * extension host의 save-result 처리 후 이 함수를 호출한다.
 *
 * @param msg 발행할 메시지
 */
export function emitTestMessage(msg: TestMessage): void {
  const handlers = _listeners.get(msg.type) ?? [];
  for (const handler of handlers) {
    try {
      handler(msg);
    } catch {
      // 핸들러 에러 무시
    }
  }
}

/**
 * 특정 type의 메시지가 발행될 때까지 대기한다.
 *
 * @param topic 대기할 메시지 type (예: 'save-result')
 * @param matcher 선택적 필드 매처. 지정된 필드가 모두 일치해야 resolve.
 * @param timeoutMs 최대 대기 시간(ms). 기본 15000ms.
 * @returns 수신된 TestMessage
 * @throws 타임아웃 초과 시 Error
 */
export function waitForMessage(
  topic: string,
  matcher?: MessageMatcher,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<TestMessage> {
  return new Promise<TestMessage>((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const handler = (msg: TestMessage) => {
      if (settled) return;

      // matcher 검사: 지정된 필드가 모두 일치해야 resolve
      if (matcher) {
        for (const [key, val] of Object.entries(matcher)) {
          if (msg[key] !== val) return;
        }
      }

      settled = true;
      if (timer !== undefined) clearTimeout(timer);
      cleanup();
      resolve(msg);
    };

    const cleanup = () => {
      const handlers = _listeners.get(topic);
      if (handlers) {
        const idx = handlers.indexOf(handler);
        if (idx >= 0) handlers.splice(idx, 1);
        if (handlers.length === 0) _listeners.delete(topic);
      }
    };

    // 리스너 등록
    if (!_listeners.has(topic)) {
      _listeners.set(topic, []);
    }
    _listeners.get(topic)!.push(handler);

    timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(
        new Error(
          `waitForMessage: topic="${topic}" 메시지가 ${timeoutMs}ms 내에 수신되지 않았습니다.`
        )
      );
    }, timeoutMs);
  });
}

/**
 * 조건 함수가 truthy를 반환할 때까지 폴링 대기한다.
 * waitForMessage 대신 editSessionRegistry 상태 폴링이 필요한 케이스에서 사용한다.
 *
 * waitForElement를 래핑하여 동일한 폴링 로직을 재사용한다.
 *
 * @param condition truthy 반환 시 resolve
 * @param timeoutMs 최대 대기 시간(ms). 기본 15000ms.
 * @returns condition()의 truthy 반환값
 */
export function waitForCondition<T>(
  condition: () => T | null | undefined | false | Promise<T | null | undefined | false>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  return waitForElement(condition, timeoutMs);
}
