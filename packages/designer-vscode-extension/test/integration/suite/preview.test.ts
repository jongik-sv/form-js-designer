/**
 * TSK-01-04: 통합 테스트 — 미리보기 렌더 경로
 *
 * @vscode/test-electron 기반 통합 테스트.
 * 3개 케이스: 단일 블록, 다중 블록+invalid, reload 재마운트.
 *
 * test bridge 패턴:
 *   preview.ts → postMessage({ type: 'test-mount-complete', blocks })
 *   → extension.ts 수신 → _testMountState 업데이트
 *   → vscode.commands.executeCommand('form-js._test.getMountState', uri)로 조회
 *
 * 실행: FORM_JS_TEST_MODE=1 npm run test:e2e (dev-test 단계)
 */
import * as path from 'path';
import * as assert from 'assert';
import * as vscode from 'vscode';
import { openMarkdownPreview } from '../helpers/openPreview';
import { waitForElement } from '../helpers/waitForElement';
import type { MountState } from '../../../src/testBridge';

const FIXTURES_DIR = path.resolve(__dirname, '../../fixtures');
const TIMEOUT_MS = 15000;

/**
 * getMountState 커맨드로 URI의 마운트 상태를 폴링한다.
 * FORM_JS_TEST_MODE=1이 설정된 경우에만 커맨드가 등록된다.
 */
async function pollMountState(uri: string): Promise<MountState> {
  return waitForElement<MountState>(
    async () => {
      const result = await vscode.commands.executeCommand<MountState | undefined>(
        'form-js._test.getMountState',
        uri
      );
      return result ?? null;
    },
    TIMEOUT_MS
  );
}

suite('Form JS Preview Integration (TSK-01-04)', () => {
  /**
   * Case 1: 단일 블록 렌더 확인
   * - single-block.md 열기 → getMountState 폴링
   * - blocks.length === 1 && !blocks[0].hasError 검증
   */
  test('Case 1: 단일 블록 — blocks.length === 1, hasError === false', async () => {
    const fixtureFile = path.join(FIXTURES_DIR, 'single-block.md');
    const uri = vscode.Uri.file(fixtureFile);

    await openMarkdownPreview(uri);

    const state = await pollMountState(uri.toString());

    assert.ok(state, 'mount state가 존재해야 함');
    assert.strictEqual(state.blocks.length, 1, '블록이 1개여야 함');
    assert.strictEqual(state.blocks[0]!.hasError, false, '블록에 에러가 없어야 함');
  });

  /**
   * Case 2: 다중 블록 + invalid JSON 혼재
   * - multi-block-with-invalid.md 열기
   * - blocks.length === 3 (유효 2 + invalid 1)
   * - 유효 블록 2개 hasError: false, invalid 1개 hasError: true 검증
   */
  test('Case 2: 다중 블록+invalid — 유효 블록 렌더, invalid는 hasError:true', async () => {
    const fixtureFile = path.join(FIXTURES_DIR, 'multi-block-with-invalid.md');
    const uri = vscode.Uri.file(fixtureFile);

    await openMarkdownPreview(uri);

    const state = await pollMountState(uri.toString());

    assert.ok(state, 'mount state가 존재해야 함');
    assert.strictEqual(state.blocks.length, 3, '블록이 3개여야 함');

    const validBlocks = state.blocks.filter((b) => !b.hasError);
    const invalidBlocks = state.blocks.filter((b) => b.hasError);

    assert.strictEqual(validBlocks.length, 2, '유효 블록이 2개여야 함');
    assert.strictEqual(invalidBlocks.length, 1, 'invalid 블록이 1개여야 함');
  });

  /**
   * Case 3: 미리보기 reload 후 viewer 정상 재마운트
   * - reload-test.md 열기 → 마운트 확인
   * - preview close → preview 재열기
   * - 재마운트 확인 (중복 마운트 없음, blocks.length === 1)
   */
  test('Case 3: reload 후 재마운트 — blocks.length === 1, 중복 없음', async () => {
    const fixtureFile = path.join(FIXTURES_DIR, 'reload-test.md');
    const uri = vscode.Uri.file(fixtureFile);

    // 첫 번째 마운트
    await openMarkdownPreview(uri);
    await pollMountState(uri.toString());

    // 미리보기 닫기
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    await new Promise((resolve) => setTimeout(resolve, 300));

    // 두 번째 마운트 (재열기)
    await openMarkdownPreview(uri);

    const state = await pollMountState(uri.toString());

    assert.ok(state, '재마운트 후 mount state가 존재해야 함');
    assert.strictEqual(state.blocks.length, 1, '재마운트 후 블록이 1개여야 함 (중복 없음)');
    assert.strictEqual(state.blocks[0]!.hasError, false, '재마운트 블록에 에러가 없어야 함');
  });
});
