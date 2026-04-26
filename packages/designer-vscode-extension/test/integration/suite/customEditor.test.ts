/**
 * TSK-02-01: 통합 테스트 — Custom Editor Provider
 *
 * @vscode/test-electron 환경에서 formJs.openBlockEditor 커맨드를 실행하여
 * Custom Editor 패널이 ViewColumn.Beside에 열리는지 검증한다.
 *
 * 진입 경로: formJs.openBlockEditor 커맨드 (preview ✏️ 버튼의 command: URI 대응)
 * reachability gate: URL/직접 오픈 금지 — 커맨드를 통한 진입
 *
 * 실행: FORM_JS_TEST_MODE=1 npm run test:e2e
 * build 단계에서 코드만 작성하며 실행은 dev-test 단계에서 수행한다.
 */

import * as path from 'path';
import * as assert from 'assert';
import * as vscode from 'vscode';
import { waitForCustomEditor } from '../helpers/waitForCustomEditor';

const FIXTURES_DIR = path.resolve(__dirname, '../../../../test/fixtures');
const EDIT_SINGLE_MD = path.join(FIXTURES_DIR, 'edit-single.md');
const VIEW_TYPE = 'form-js.block-editor';

const SAMPLE_ARGS = {
  mdStart: 4,
  mdEnd: 13,
  schema: JSON.stringify({
    type: 'default',
    id: 'edit-test-form',
    components: [
      { type: 'textfield', key: 'name', label: '이름' },
      { type: 'textfield', key: 'email', label: '이메일' },
    ],
  }),
};

suite('Form JS Custom Editor Integration (TSK-02-01)', () => {
  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension('form-js-designer.form-js-designer');
    if (ext && !ext.isActive) {
      await ext.activate();
    }
  });

  teardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
  });

  /**
   * Case 1: ✏️ 버튼 클릭 경로 (커맨드 경유) → Custom Editor 패널 오픈
   *
   * QA 체크리스트: (정상 케이스) ✏️ 버튼 클릭 → 200ms 이내 ViewColumn.Beside에 패널 열림
   * reachability: formJs.openBlockEditor 커맨드 호출 (command: URI의 실제 실행 경로)
   */
  test('Case 1: formJs.openBlockEditor 커맨드 → Custom Editor 패널이 열린다', async () => {
    const uri = vscode.Uri.file(EDIT_SINGLE_MD);

    // reachability gate: 커맨드를 통한 진입
    await vscode.commands.executeCommand('formJs.openBlockEditor', {
      uri: uri.toString(),
      ...SAMPLE_ARGS,
    });

    await waitForCustomEditor({ viewType: VIEW_TYPE, timeout: 15000 });

    let found = false;
    for (const group of vscode.window.tabGroups.all) {
      for (const tab of group.tabs) {
        const input = tab.input as { viewType?: string } | undefined;
        if (input?.viewType === VIEW_TYPE) {
          found = true;
          break;
        }
      }
    }

    assert.ok(found, `Custom Editor 탭(viewType="${VIEW_TYPE}")이 열려 있어야 함`);
  });

  /**
   * Case 2: single-editor lock — 동일 문서 두 번째 커맨드는 새 패널을 열지 않음
   *
   * QA 체크리스트: (엣지 케이스) 같은 문서 여러 블록 — 한 번에 하나만 편집
   */
  test('Case 2: 동일 문서에 두 번 커맨드 실행 시 탭 수가 증가하지 않는다', async () => {
    const uri = vscode.Uri.file(EDIT_SINGLE_MD);
    const args = { uri: uri.toString(), ...SAMPLE_ARGS };

    await vscode.commands.executeCommand('formJs.openBlockEditor', args);
    await waitForCustomEditor({ viewType: VIEW_TYPE, timeout: 15000 });

    let countBefore = 0;
    for (const group of vscode.window.tabGroups.all) {
      for (const tab of group.tabs) {
        const input = tab.input as { viewType?: string } | undefined;
        if (input?.viewType === VIEW_TYPE) countBefore++;
      }
    }

    await vscode.commands.executeCommand('formJs.openBlockEditor', args);
    await new Promise<void>((resolve) => setTimeout(resolve, 500));

    let countAfter = 0;
    for (const group of vscode.window.tabGroups.all) {
      for (const tab of group.tabs) {
        const input = tab.input as { viewType?: string } | undefined;
        if (input?.viewType === VIEW_TYPE) countAfter++;
      }
    }

    assert.strictEqual(
      countAfter,
      countBefore,
      `single-editor lock: 두 번째 커맨드 후 탭 수 증가 없어야 함 (before=${countBefore}, after=${countAfter})`
    );
  });

  /**
   * Case 3: dispose 후 clean state
   *
   * QA 체크리스트: (통합 케이스) Custom Editor 패널 닫기 → onDidDispose 호출 → lock 해제
   */
  test('Case 3: Custom Editor 패널 닫기 후 탭이 제거된다', async () => {
    const uri = vscode.Uri.file(EDIT_SINGLE_MD);

    await vscode.commands.executeCommand('formJs.openBlockEditor', {
      uri: uri.toString(),
      ...SAMPLE_ARGS,
    });

    await waitForCustomEditor({ viewType: VIEW_TYPE, timeout: 15000 });
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    await new Promise<void>((resolve) => setTimeout(resolve, 500));

    let found = false;
    for (const group of vscode.window.tabGroups.all) {
      for (const tab of group.tabs) {
        const input = tab.input as { viewType?: string } | undefined;
        if (input?.viewType === VIEW_TYPE) {
          found = true;
          break;
        }
      }
    }

    assert.ok(!found, 'Custom Editor 패널 닫힌 후 해당 탭이 없어야 함');
  });
});
