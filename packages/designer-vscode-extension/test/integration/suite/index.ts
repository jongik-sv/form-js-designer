/**
 * TSK-01-04: Mocha suite 등록
 *
 * @vscode/test-electron 내장 Mocha runner가 이 파일을 extensionTestsPath로 로드한다.
 * test/integration/suite/*.test.ts 파일을 glob import하여 suite를 등록한다.
 */
import * as path from 'path';
import Mocha = require('mocha');
import { glob } from 'glob';

export async function run(): Promise<void> {
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: 30000, // 개별 테스트 타임아웃 30s
  });

  const testsRoot = path.resolve(__dirname, '.');

  const files = await glob('**/*.test.js', { cwd: testsRoot });

  files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

  return new Promise<void>((resolve, reject) => {
    mocha.run((failures: number) => {
      if (failures > 0) {
        reject(new Error(`${failures} tests failed.`));
      } else {
        resolve();
      }
    });
  });
}
