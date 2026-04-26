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
    timeout: 60000, // TSK-02-05: 편집 시나리오 통합 테스트 대응 — 60s로 상향
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
