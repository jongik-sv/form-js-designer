/**
 * TSK-01-04: @vscode/test-electron runTests() 진입점
 *
 * VSCode를 headless로 다운로드·실행하고 통합 테스트 suite를 등록한다.
 *
 * 실행: FORM_JS_TEST_MODE=1 node dist/test/integration/runTests.js
 */
import { runTests } from '@vscode/test-electron';
import * as path from 'path';

async function main(): Promise<void> {
  // packages/designer-vscode-extension 디렉토리
  const extensionDevelopmentPath = path.resolve(__dirname, '../../..');

  // 컴파일된 suite index.js 경로
  const extensionTestsPath = path.resolve(__dirname, 'suite/index');

  const fixturesWorkspace = path.resolve(__dirname, '../../fixtures');

  try {
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        fixturesWorkspace,
        '--no-sandbox',
        '--disable-gpu',
      ],
    });
  } catch (err) {
    console.error('[TSK-01-04] 통합 테스트 실패:', err);
    process.exit(1);
  }
}

main();
