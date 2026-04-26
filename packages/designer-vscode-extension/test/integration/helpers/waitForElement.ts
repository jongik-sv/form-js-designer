/**
 * TSK-01-04: waitForElement 폴링 헬퍼
 *
 * 50ms 간격 폴링으로 fn()이 truthy가 될 때까지 최대 timeoutMs 대기한다.
 * 타임아웃 도달 시 TimeoutError를 throw한다.
 *
 * fn()은 동기 또는 비동기 함수 모두 지원한다.
 *
 * 사용 예:
 *   const state = await waitForElement(
 *     () => getMountStateForUri(uri),
 *     15000
 *   );
 */

const POLL_INTERVAL_MS = 50;

/** 폴링 조건 함수의 반환 타입: 동기 또는 비동기 falsy/truthy 값 */
type ConditionFn<T> = () => T | null | undefined | false | Promise<T | null | undefined | false>;

/**
 * fn()이 truthy를 반환할 때까지 폴링 대기한다.
 *
 * @param fn 조건 함수. truthy 반환 시 resolve, falsy 반환 시 계속 폴링.
 *           동기 또는 Promise를 반환하는 비동기 함수 모두 지원.
 * @param timeoutMs 최대 대기 시간(ms). 기본값 15000ms
 * @returns fn()이 처음으로 truthy를 반환한 값
 * @throws 타임아웃 초과 시 `waitForElement timed out after ${timeoutMs}ms`
 */
export function waitForElement<T>(
  fn: ConditionFn<T>,
  timeoutMs: number = 15000
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;

    const settle = (val: T) => {
      if (settled) return;
      settled = true;
      clearInterval(interval);
      clearTimeout(timer);
      resolve(val);
    };

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      clearInterval(interval);
      clearTimeout(timer);
      reject(err);
    };

    const check = async () => {
      try {
        const result = await fn();
        if (result) {
          settle(result as T);
        }
      } catch {
        // fn() 에러는 무시하고 계속 폴링
      }
    };

    // 즉시 한 번 체크
    void check();

    const interval = setInterval(() => {
      void check();
    }, POLL_INTERVAL_MS);

    const timer = setTimeout(() => {
      fail(new Error(`waitForElement timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
}
