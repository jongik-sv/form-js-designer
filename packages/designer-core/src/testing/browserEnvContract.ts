/**
 * browser-env contract helpers
 *
 * ADR-0001 §3 D7 회귀 방지용 공용 테스트 헬퍼. `designer-*` 패키지가
 * "vanilla browser" (Vite dev 서버처럼 번들러 `DefinePlugin` 치환 없이
 * ESM을 브라우저에 그대로 전달하는 환경) 에서도 평가 시점에
 * `ReferenceError: process is not defined` 로 터지지 않음을 검증한다.
 *
 * 배경: Phase 0 spike 에서 `defineComponent` 모듈이 최상위에서
 * `process.env.NODE_ENV`를 참조하여 Vite dev 로드 시 크래시했다.
 * `isProductionEnv()` 이중 가드로 해결했고 (§6.3 이슈 1), 모든 신규
 * designer-* 코드가 동일 함정에 빠지지 않도록 이 헬퍼로 공통 검증한다.
 *
 * 사용 예 (Vitest 등):
 *
 *   import { assertBrowserEnvContract } from '@form-js-designer/designer-core/testing/browserEnvContract';
 *
 *   it('survives vanilla browser (no process global)', () => {
 *     assertBrowserEnvContract(() => defineComponent(makeMinimalDef()));
 *   });
 */

type GlobalWithProcess = { process?: unknown };

/**
 * Temporarily removes `globalThis.process` for the duration of `fn` and
 * restores the original descriptor afterward (safe on throw).
 *
 * This is a lower-level primitive — prefer `assertBrowserEnvContract` for
 * assertions since it translates `ReferenceError` into an actionable message.
 */
export function withoutProcessGlobal<T>(fn: () => T): T {
  const globals = globalThis as unknown as GlobalWithProcess;
  const hadOwn = Object.prototype.hasOwnProperty.call(globals, 'process');
  const saved = globals.process;
  try {
    delete globals.process;
    return fn();
  } finally {
    if (hadOwn) {
      globals.process = saved;
    } else {
      delete globals.process;
    }
  }
}

/**
 * Asynchronous variant of `withoutProcessGlobal`. Use when the callback
 * dynamically imports a module or otherwise returns a Promise.
 */
export async function withoutProcessGlobalAsync<T>(fn: () => Promise<T> | T): Promise<T> {
  const globals = globalThis as unknown as GlobalWithProcess;
  const hadOwn = Object.prototype.hasOwnProperty.call(globals, 'process');
  const saved = globals.process;
  try {
    delete globals.process;
    return await fn();
  } finally {
    if (hadOwn) {
      globals.process = saved;
    } else {
      delete globals.process;
    }
  }
}

/**
 * Thrown when `subject` references `process` directly at evaluation time.
 * Distinct class so tests can assert on the contract violation type.
 */
export class BrowserEnvContractViolation extends Error {
  override readonly name = 'BrowserEnvContractViolation';
  override readonly cause: Error;
  constructor(cause: Error, message: string) {
    super(message);
    this.cause = cause;
  }
}

const PROCESS_REFERENCE_PATTERNS: readonly RegExp[] = [
  /process is not defined/i,
  /can't find variable:\s*process/i,
];

function isProcessReferenceError(err: unknown): err is ReferenceError {
  if (!(err instanceof ReferenceError)) return false;
  return PROCESS_REFERENCE_PATTERNS.some((re) => re.test(err.message));
}

/**
 * Runs `subject` with `globalThis.process` removed. If the subject throws a
 * ReferenceError specifically about `process`, re-throws as
 * `BrowserEnvContractViolation` with an actionable remediation message.
 *
 * Unrelated errors are re-thrown verbatim so they still surface in the test
 * report (test should fail, but for the right reason).
 */
export function assertBrowserEnvContract(subject: () => unknown): void {
  withoutProcessGlobal(() => {
    try {
      subject();
    } catch (err) {
      if (isProcessReferenceError(err)) {
        throw new BrowserEnvContractViolation(
          err,
          'ADR-0001 §3 D7 violation: module or function references `process` directly. ' +
            'Vite dev serves ESM to the browser without replacing `process.env.*`, so ' +
            'top-level `process` reads throw ReferenceError. Use an isProductionEnv()-' +
            'style dual guard (import.meta.env → typeof process fallback). ' +
            `Original: ${err.message}`,
        );
      }
      throw err;
    }
  });
}

/** Async variant — awaits the subject inside the process-less scope. */
export async function assertBrowserEnvContractAsync(
  subject: () => Promise<unknown> | unknown,
): Promise<void> {
  await withoutProcessGlobalAsync(async () => {
    try {
      await subject();
    } catch (err) {
      if (isProcessReferenceError(err)) {
        throw new BrowserEnvContractViolation(
          err,
          'ADR-0001 §3 D7 violation: module or function references `process` directly ' +
            '(async path). Use an isProductionEnv()-style dual guard. ' +
            `Original: ${err.message}`,
        );
      }
      throw err;
    }
  });
}
