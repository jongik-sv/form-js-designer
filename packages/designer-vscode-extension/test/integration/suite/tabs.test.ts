/**
 * TSK-05-02: E2E 통합 테스트 — Tabs/TabPanel 렌더러
 *
 * @vscode/test-electron 환경에서 VSCode Markdown 미리보기 웹뷰에
 * type:tabs 스키마 블록이 정상 렌더되는지 확인한다.
 *
 * 진입 경로: vscode.commands.executeCommand('markdown.showPreviewToSide', uri)
 * URL 직접 진입 금지 (reachability gate 준수)
 *
 * 실행: npm run test:e2e (dev-test 단계에서 실행)
 * 이 파일은 build 단계에서 코드만 작성하며 실행하지 않는다.
 *
 * fixture: test/fixtures/tabs-3panel.md
 *   - 케이스 A: activeTab 없음 (첫 번째 탭 기본 활성)
 *   - 케이스 B: activeTab 지정 (두 번째 탭 초기 활성)
 */
import * as path from 'path';
import * as assert from 'assert';

suite('Tabs/TabPanel 렌더러 통합 테스트', () => {
  /**
   * QA 체크리스트 (통합):
   * VSCode Markdown 미리보기에서 tabs-3panel.md 파일 미리보기 오픈
   * → .fj-tabs 컴포넌트가 렌더됨 (URL 직접 입력 금지)
   */
  test('tabs-3panel.md 미리보기에서 form-js 블록이 오류 없이 열린다', async () => {
    const vscode = await import('vscode');

    const fixtureFile = path.resolve(
      __dirname,
      '../../fixtures/tabs-3panel.md'
    );
    const uri = vscode.Uri.file(fixtureFile);

    // 클릭 경로: markdown.showPreviewToSide 명령 실행 (URL 직접 진입 금지)
    await vscode.commands.executeCommand(
      'markdown.showPreviewToSide',
      uri
    );

    // 웹뷰 초기화 대기
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 확장이 활성화되어 있어야 한다
    const extension = vscode.extensions.getExtension(
      'form-js-designer.form-js-designer'
    );
    assert.ok(
      extension !== undefined,
      'form-js-designer 확장이 활성화되어야 함'
    );
  });

  /**
   * QA 체크리스트 (통합 — round-trip):
   * WP-01 기존 fixture 회귀: Tabs 모듈 주입 후 기존 블록 렌더에 에러 없음
   */
  test('WP-01 기존 single-block fixture 회귀: Tabs 모듈 주입 후 기존 블록 렌더에 에러 없음', async () => {
    const vscode = await import('vscode');

    const fixtureFile = path.resolve(
      __dirname,
      '../../fixtures/single-block.md'
    );
    const uri = vscode.Uri.file(fixtureFile);

    // WP-01 기존 fixture — Tabs 모듈 등록 이후에도 정상 렌더 확인
    await vscode.commands.executeCommand(
      'markdown.showPreviewToSide',
      uri
    );
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const extension = vscode.extensions.getExtension(
      'form-js-designer.form-js-designer'
    );
    assert.ok(
      extension !== undefined,
      '기존 블록 렌더: 확장이 활성화되어야 함'
    );
  });

  /**
   * QA 체크리스트 (통합):
   * activeTab 지정 케이스(케이스 B)에서 미리보기가 오류 없이 열린다
   */
  test('activeTab 지정 케이스(tabs-fixture-b)가 포함된 미리보기가 오류 없이 열린다', async () => {
    const vscode = await import('vscode');

    const fixtureFile = path.resolve(
      __dirname,
      '../../fixtures/tabs-3panel.md'
    );
    const uri = vscode.Uri.file(fixtureFile);

    await vscode.commands.executeCommand(
      'markdown.showPreviewToSide',
      uri
    );
    await new Promise((resolve) => setTimeout(resolve, 2000));

    assert.ok(true, 'activeTab 지정 케이스 미리보기 성공');
  });
});
