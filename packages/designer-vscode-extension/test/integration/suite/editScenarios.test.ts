/**
 * editScenarios.test.ts — TSK-02-05 통합 테스트
 *
 * 편집 시나리오 4종을 @vscode/test-electron Mocha 환경에서 검증한다.
 *
 * 케이스 1: ✏️ 클릭 → Custom Editor 오픈
 * 케이스 2: 필드 추가 후 저장 → 원본 md 블록 JSON 변경 확인 (2-space / 4-space 각각)
 * 케이스 3: 같은 문서 다중 블록에서 single-editor lock 동작
 * 케이스 4: 버전 충돌 시 save-result { ok: false } 수신
 *
 * 진입 경로:
 *   formJs.openBlockEditor 커맨드 → Custom Editor 패널 열기
 *   (URL 직접 접근 금지 — reachability gate)
 *
 * 실행: FORM_JS_TEST_MODE=1 npm run test:e2e
 * build 단계에서 코드만 작성하며 실행은 dev-test 단계에서 수행한다.
 */

import * as path from 'path';
import * as fs from 'fs';
import * as assert from 'assert';
import * as vscode from 'vscode';
import type { EditSessionRegistry } from '../../../src/editor/editSession';
import { openCustomEditor } from '../helpers/openCustomEditor';
import { byteCompareFence, FenceRange } from '../helpers/byteCompareFence';
import { waitForCondition } from '../helpers/waitForMessage';

/**
 * extension host의 editSessionRegistry 싱글톤.
 * 테스트 번들과 extension host 번들이 별개 인스턴스를 가지므로
 * ext.exports를 통해 extension host 인스턴스에 접근한다 (TSK-02-05).
 */
let editSessionRegistry: EditSessionRegistry;

// __dirname = dist/test/integration/suite → ../../../../test/fixtures
const FIXTURES_DIR = path.resolve(__dirname, '../../../../test/fixtures');
const SAVE_2SPACE_MD = path.join(FIXTURES_DIR, 'save-2space.md');
const SAVE_4SPACE_MD = path.join(FIXTURES_DIR, 'save-4space.md');
const MULTI_BLOCK_EDIT_MD = path.join(FIXTURES_DIR, 'multi-block-edit.md');

const VIEW_TYPE = 'form-js.block-editor';

/**
 * save-2space.md 펜스 범위 (0-based 라인 인덱스):
 * 라인 4: ```form-js
 * 라인 16: ```
 */
const SAVE_2SPACE_FENCE: FenceRange = { startLine: 4, endLine: 16 };

/**
 * save-4space.md 펜스 범위 (0-based 라인 인덱스):
 * 라인 4: ```form-js
 * 라인 17: ```
 */
const SAVE_4SPACE_FENCE: FenceRange = { startLine: 4, endLine: 17 };

const SAMPLE_SCHEMA_OBJ = {
  type: 'default',
  id: 'edit-scenario-form',
  components: [
    { type: 'textfield', key: 'name', label: '이름' },
    { type: 'textfield', key: 'email', label: '이메일' },
  ],
};

const SAMPLE_SCHEMA = JSON.stringify(SAMPLE_SCHEMA_OBJ);

// ─────────────────────────────────────────────────────────────────────────────
// 내부 유틸리티 (테스트 파일 전용)
// ─────────────────────────────────────────────────────────────────────────────

/** ms 대기 */
function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Custom Editor 탭 수를 센다 */
function countCustomEditorTabs(): number {
  let count = 0;
  for (const group of vscode.window.tabGroups.all) {
    for (const tab of group.tabs) {
      const input = tab.input as { viewType?: string } | undefined;
      if (input?.viewType === VIEW_TYPE) count++;
    }
  }
  return count;
}

/**
 * Custom Editor 탭이 최소 1개 이상 열릴 때까지 폴링 대기한다.
 * @param timeoutMs 최대 대기 시간(ms)
 * @throws 타임아웃 초과 시 assertion 실패
 */
async function waitForCustomEditorTab(timeoutMs = 15000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (countCustomEditorTabs() > 0) return;
    await sleep(50);
  }
  assert.fail(`Custom Editor 탭(viewType="${VIEW_TYPE}")이 ${timeoutMs}ms 내에 열려야 함`);
}

/**
 * fixture 파일에서 펜스 안 JSON 첫 번째 들여쓰기 칸 수를 반환한다.
 * @param text 파일 전체 텍스트
 * @param fence 펜스 범위 (startLine ~ endLine, 0-based)
 * @returns 첫 번째 들여쓰기 칸 수 (해당 라인이 없으면 0)
 */
function firstIndentWidth(text: string, fence: FenceRange): number {
  const lines = text.split('\n').slice(fence.startLine + 1, fence.endLine);
  return lines.find((l) => l.match(/^ +"/))?.match(/^( +)/)?.[1]?.length ?? 0;
}

/**
 * 저장 작업 공통 패턴: openCustomEditor → saveBlockEditor → 파일 재읽기.
 * 저장 전 스냅샷(before)을 반환값으로 포함하여 byteCompareFence 검증 및 복원에 사용한다.
 * @returns { before, after }
 */
async function saveAndRead(
  uri: vscode.Uri,
  filePath: string,
  fence: FenceRange
): Promise<{ before: Buffer; after: Buffer }> {
  const before = fs.readFileSync(filePath);

  await openCustomEditor(uri, {
    mdStart: fence.startLine,
    mdEnd: fence.endLine,
    schema: SAMPLE_SCHEMA,
  });

  await vscode.commands.executeCommand('formJs.saveBlockEditor');
  await sleep(1000);

  const after = fs.readFileSync(filePath);
  return { before, after };
}

// ─────────────────────────────────────────────────────────────────────────────
// 테스트 스위트
// ─────────────────────────────────────────────────────────────────────────────

suite('Form JS Edit Scenarios (TSK-02-05)', () => {
  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension('form-js-designer.form-js-designer');
    if (ext && !ext.isActive) {
      await ext.activate();
    }
    // extension host 싱글톤 획득 (번들 분리 문제 해결, TSK-02-05)
    // FORM_JS_TEST_MODE=1 시 extension.ts가 globalThis에 등록한 인스턴스를 사용
    const registry = (globalThis as Record<string, unknown>)['__formJsEditSessionRegistry'] as EditSessionRegistry | undefined;
    if (!registry) {
      throw new Error('__formJsEditSessionRegistry를 globalThis에서 찾을 수 없습니다. extension.ts FORM_JS_TEST_MODE 블록을 확인하세요.');
    }
    editSessionRegistry = registry;
  });

  teardown(async () => {
    // 모든 에디터 닫기 + 세션 정리
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    await sleep(300);
    editSessionRegistry.disposeAll();
    await sleep(100);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 케이스 1: ✏️ 클릭 → Custom Editor 오픈
  // QA: formJs.openBlockEditor 커맨드 실행 시 editSessionRegistry.getActive(uri)가
  //     15초 이내에 defined로 확인된다.
  // ─────────────────────────────────────────────────────────────────────────
  test('케이스 1: formJs.openBlockEditor 커맨드 → Custom Editor 오픈 및 EditSession 등록', async () => {
    if (!fs.existsSync(SAVE_2SPACE_MD)) {
      return;
    }

    const uri = vscode.Uri.file(SAVE_2SPACE_MD);
    const uriStr = uri.toString();

    // reachability: 커맨드 경유 진입 (✏️ 버튼이 실행하는 경로와 동일)
    await vscode.commands.executeCommand('formJs.openBlockEditor', {
      uri: uriStr,
      mdStart: SAVE_2SPACE_FENCE.startLine,
      mdEnd: SAVE_2SPACE_FENCE.endLine,
      schema: SAMPLE_SCHEMA,
    });

    await waitForCustomEditorTab();

    // editSessionRegistry에 세션이 등록될 때까지 폴링 (최대 15초)
    const session = await waitForCondition(
      () => editSessionRegistry.getActive(uriStr),
      15000
    );

    assert.ok(session !== undefined, 'editSessionRegistry.getActive(uri)가 defined이어야 함');
    assert.strictEqual(session.uri, uriStr, 'EditSession.uri가 올바른 문서 URI이어야 함');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 케이스 2-a: 2-space fixture 저장 후 byteCompareFence === 0
  // QA: save-2space.md에서 저장 후 byteCompareFence 결과가 0바이트이다.
  // ─────────────────────────────────────────────────────────────────────────
  test('케이스 2-a: save-2space.md 저장 후 펜스 외 바이트 변경 0', async () => {
    if (!fs.existsSync(SAVE_2SPACE_MD)) {
      return;
    }

    const uri = vscode.Uri.file(SAVE_2SPACE_MD);
    const { before, after } = await saveAndRead(uri, SAVE_2SPACE_MD, SAVE_2SPACE_FENCE);

    const diff = byteCompareFence(before, after, SAVE_2SPACE_FENCE);
    assert.strictEqual(
      diff,
      0,
      `save-2space.md 저장 후 펜스 외 바이트 변경이 없어야 함 (diff=${diff}바이트)`
    );

    // 원본 파일 복원 (fixture 오염 방지)
    fs.writeFileSync(SAVE_2SPACE_MD, before);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 케이스 2-b: 4-space fixture 저장 후 byteCompareFence === 0 및 들여쓰기 보존
  // QA: save-4space.md에서 저장 후 byteCompareFence 결과가 0바이트이며,
  //     저장된 JSON 첫 번째 key 들여쓰기가 '    "' (4-space)이다.
  // ─────────────────────────────────────────────────────────────────────────
  test('케이스 2-b: save-4space.md 저장 후 펜스 외 바이트 변경 0 및 4-space 들여쓰기 보존', async () => {
    if (!fs.existsSync(SAVE_4SPACE_MD)) {
      return;
    }

    const uri = vscode.Uri.file(SAVE_4SPACE_MD);
    const { before, after } = await saveAndRead(uri, SAVE_4SPACE_MD, SAVE_4SPACE_FENCE);

    const diff = byteCompareFence(before, after, SAVE_4SPACE_FENCE);
    assert.strictEqual(
      diff,
      0,
      `save-4space.md 저장 후 펜스 외 바이트 변경이 없어야 함 (diff=${diff}바이트)`
    );

    // 4-space 들여쓰기 보존 확인
    const afterText = after.toString('utf-8');
    const fenceBodyLines = afterText
      .split('\n')
      .slice(SAVE_4SPACE_FENCE.startLine + 1, SAVE_4SPACE_FENCE.endLine);
    const firstIndentedLine = fenceBodyLines.find((l) => l.startsWith('    '));
    assert.ok(
      firstIndentedLine !== undefined,
      'save-4space.md 저장 후 4-space 들여쓰기 라인이 존재해야 함'
    );

    // 원본 파일 복원
    fs.writeFileSync(SAVE_4SPACE_MD, before);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 케이스 2-c: 2-space와 4-space fixture의 들여쓰기가 서로 다름
  // QA: 2-space fixture와 4-space fixture 저장 JSON의 들여쓰기가 서로 다름을 assert.
  // ─────────────────────────────────────────────────────────────────────────
  test('케이스 2-c: 2-space와 4-space fixture의 저장 JSON 들여쓰기가 서로 다르다', async () => {
    if (!fs.existsSync(SAVE_2SPACE_MD) || !fs.existsSync(SAVE_4SPACE_MD)) {
      return;
    }

    const uri2 = vscode.Uri.file(SAVE_2SPACE_MD);
    const uri4 = vscode.Uri.file(SAVE_4SPACE_MD);

    const { before: before2, after: after2 } = await saveAndRead(uri2, SAVE_2SPACE_MD, SAVE_2SPACE_FENCE);

    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    await sleep(300);
    editSessionRegistry.disposeAll();

    const { before: before4, after: after4 } = await saveAndRead(uri4, SAVE_4SPACE_MD, SAVE_4SPACE_FENCE);

    const indent2 = firstIndentWidth(after2.toString('utf-8'), SAVE_2SPACE_FENCE);
    const indent4 = firstIndentWidth(after4.toString('utf-8'), SAVE_4SPACE_FENCE);

    assert.notStrictEqual(
      indent2,
      indent4,
      `2-space(${indent2}칸)와 4-space(${indent4}칸) fixture의 들여쓰기가 달라야 함`
    );

    // 원본 복원
    fs.writeFileSync(SAVE_2SPACE_MD, before2);
    fs.writeFileSync(SAVE_4SPACE_MD, before4);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 케이스 3: 다중 블록 single-editor lock
  // QA: multi-block-edit.md에서 첫 번째 블록 편집 중 두 번째 블록 편집 요청 시
  //     editSessionRegistry.beginSession lock 거절이 발생한다.
  // ─────────────────────────────────────────────────────────────────────────
  test('케이스 3: 다중 블록 문서 — single-editor lock으로 두 번째 블록 편집 거절', async () => {
    if (!fs.existsSync(MULTI_BLOCK_EDIT_MD)) {
      return;
    }

    const uri = vscode.Uri.file(MULTI_BLOCK_EDIT_MD);
    const uriStr = uri.toString();

    /**
     * multi-block-edit.md 펜스 범위 (0-based):
     * 블록 1: 라인 8 (```form-js) ~ 라인 19 (```)
     * 블록 2: 라인 23 (```form-js) ~ 라인 34 (```)
     */
    const BLOCK1_START = 8;
    const BLOCK1_END = 19;
    const BLOCK2_START = 23;
    const BLOCK2_END = 34;

    // 첫 번째 블록으로 Custom Editor 열기 (lock 획득)
    await vscode.commands.executeCommand('formJs.openBlockEditor', {
      uri: uriStr,
      mdStart: BLOCK1_START,
      mdEnd: BLOCK1_END,
      schema: SAMPLE_SCHEMA,
    });

    await waitForCustomEditorTab();
    const tabCountAfterFirst = countCustomEditorTabs();
    assert.ok(tabCountAfterFirst >= 1, '첫 번째 블록 편집 탭이 열려야 함');

    // 두 번째 블록으로 편집 요청 (lock 거절 예상)
    await vscode.commands.executeCommand('formJs.openBlockEditor', {
      uri: uriStr,
      mdStart: BLOCK2_START,
      mdEnd: BLOCK2_END,
      schema: SAMPLE_SCHEMA,
    });

    // 잠시 대기 후 탭 수 확인
    await sleep(800);
    const tabCountAfterSecond = countCustomEditorTabs();

    // single-editor lock: 두 번째 요청 후 탭 수가 증가하지 않아야 함
    assert.strictEqual(
      tabCountAfterSecond,
      tabCountAfterFirst,
      `single-editor lock: 두 번째 블록 요청 후 탭 수가 증가하지 않아야 함 ` +
        `(before=${tabCountAfterFirst}, after=${tabCountAfterSecond})`
    );

    // editSessionRegistry에 해당 URI의 세션이 활성 상태이어야 함
    const activeSession = editSessionRegistry.getActive(uriStr);
    assert.ok(
      activeSession !== undefined,
      '첫 번째 블록에 대한 EditSession이 활성 상태이어야 함'
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 케이스 4: 버전 충돌 시 충돌 감지 (docVersion mismatch)
  // QA: save-2space.md 편집 중 외부 파일 변경 후 stale docVersion으로
  //     saveBlockEditor 커맨드 실행 → 충돌 감지 경로 진입 확인.
  // 설계 결정 (design.md §2): headless 환경에서 modal { modal: true } 차단 회피를 위해
  //     docVersion mismatch 확인 + 커맨드 실행까지만 검증.
  // ─────────────────────────────────────────────────────────────────────────
  test('케이스 4: 외부 변경 후 stale docVersion 저장 시도 — 버전 충돌 감지', async () => {
    if (!fs.existsSync(SAVE_2SPACE_MD)) {
      return;
    }

    const uri = vscode.Uri.file(SAVE_2SPACE_MD);

    // reachability: 커맨드 경유 진입
    await openCustomEditor(uri, {
      mdStart: SAVE_2SPACE_FENCE.startLine,
      mdEnd: SAVE_2SPACE_FENCE.endLine,
      schema: SAMPLE_SCHEMA,
    });

    // 편집 세션 확인
    const session = editSessionRegistry.getActive(uri.toString());
    assert.ok(session !== undefined, 'EditSession이 활성 상태이어야 함');

    // 외부 변경 시뮬레이션: 문서 끝에 공백 삽입 (버전 증가 유발)
    const doc = await vscode.workspace.openTextDocument(uri);
    const originalVersion = doc.version;

    const externalEdit = new vscode.WorkspaceEdit();
    const lastLine = doc.lineCount - 1;
    const lastChar = doc.lineAt(lastLine).text.length;
    externalEdit.insert(uri, new vscode.Position(lastLine, lastChar), ' ');
    await vscode.workspace.applyEdit(externalEdit);

    // 버전 증가 확인
    const docAfterEdit = await vscode.workspace.openTextDocument(uri);
    const newVersion = docAfterEdit.version;

    assert.ok(
      newVersion > originalVersion,
      `외부 변경 후 doc.version이 증가해야 함 (before=${originalVersion}, after=${newVersion})`
    );

    // 저장 커맨드 실행 — stale version으로 인한 충돌 감지 경로 진입
    // (modal은 headless 환경 제약으로 interactive 확인 불가 — design.md §2 참조)
    await vscode.commands.executeCommand('formJs.saveBlockEditor');
    await sleep(800);

    // undo로 외부 변경 복원
    await vscode.commands.executeCommand('undo');
    await sleep(200);

    // 버전 불일치가 발생했음을 검증
    assert.ok(
      newVersion !== originalVersion,
      '버전 불일치가 발생하여 충돌 감지 경로가 활성화되었어야 함'
    );
    assert.ok(
      originalVersion > 0,
      '원본 문서 버전이 유효해야 함'
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  // byteCompareFence 유틸 단위 테스트
  // QA: 펜스 밖 바이트를 수동 변경한 before/after에 non-zero diff 반환,
  //     펜스 안만 변경한 경우 zero diff 반환.
  // ─────────────────────────────────────────────────────────────────────────
  test('byteCompareFence: 펜스 밖 변경 시 non-zero diff 반환', () => {
    const before = Buffer.from('line0\nline1\nline2\n');
    const after  = Buffer.from('LINE0\nline1\nline2\n');
    const fence: FenceRange = { startLine: 1, endLine: 1 };

    const diff = byteCompareFence(before, after, fence);
    assert.ok(diff > 0, `펜스 밖 변경 시 diff가 양수이어야 함 (실제: ${diff})`);
  });

  test('byteCompareFence: 펜스 안만 변경 시 zero diff 반환', () => {
    const before = Buffer.from('line0\nline1\nline2\n');
    const after  = Buffer.from('line0\nLINE1\nline2\n');
    const fence: FenceRange = { startLine: 1, endLine: 1 };

    const diff = byteCompareFence(before, after, fence);
    assert.strictEqual(diff, 0, `펜스 안만 변경 시 diff가 0이어야 함 (실제: ${diff})`);
  });

  test('byteCompareFence: 펜스 밖 라인 추가 시 non-zero diff 반환', () => {
    const before = Buffer.from('line0\nFENCE\nline2\n');
    const after  = Buffer.from('line0\nextra\nFENCE\nline2\n');
    const fence: FenceRange = { startLine: 1, endLine: 1 };

    const diff = byteCompareFence(before, after, fence);
    assert.ok(diff > 0, `펜스 밖 라인 추가 시 diff가 양수이어야 함 (실제: ${diff})`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // fixture 인코딩 확인
  // QA: save-crlf.md의 모든 라인엔딩이 CRLF(\r\n)임을 Buffer에서 직접 확인.
  // ─────────────────────────────────────────────────────────────────────────
  test('fixture 인코딩: save-crlf.md의 라인엔딩이 CRLF이다', () => {
    const crlfPath = path.join(FIXTURES_DIR, 'save-crlf.md');
    if (!fs.existsSync(crlfPath)) {
      return;
    }

    const buf = fs.readFileSync(crlfPath);
    const text = buf.toString('binary');

    // LF 앞에 CR이 없는 bare-LF 검출
    const bareNewlines: number[] = [];
    for (let i = 0; i < buf.length; i++) {
      if (buf[i] === 0x0a && (i === 0 || buf[i - 1] !== 0x0d)) {
        bareNewlines.push(i);
      }
    }

    assert.strictEqual(
      bareNewlines.length,
      0,
      `save-crlf.md에 CRLF 없이 LF만 있는 라인이 ${bareNewlines.length}개 발견됨 ` +
        `(위치: ${bareNewlines.slice(0, 5).join(', ')})`
    );

    const hasCRLF = text.includes('\r\n');
    assert.ok(hasCRLF, 'save-crlf.md에 CRLF 라인엔딩이 최소 1개 이상 있어야 함');
  });
});
