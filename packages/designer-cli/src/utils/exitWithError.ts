/**
 * exitWithError — stderr 출력 후 exit 1
 */

/**
 * 오류 메시지를 stderr에 출력하고 exit 1로 종료한다.
 * CLI 진입점에서 복구 불가능한 오류 시 호출한다.
 *
 * @param message - 출력할 오류 메시지
 */
export function exitWithError(message: string): never {
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
}
