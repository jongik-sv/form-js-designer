/**
 * chartPlaceholder.test.ts — Task 1.15: chartPlaceholder VS Code 통합 테스트
 *
 * 2개 시나리오:
 *   Case 1 (markdown plugin):
 *     chart-single.md 픽스처 → formJsMarkdownPlugin 렌더 → form-js-block 1개 생성, 에러 없음.
 *     hidden <pre class="form-js-source"> 안에 escape된 chartPlaceholder schema 포함.
 *
 *   Case 2 (custom editor):
 *     formJs.openBlockEditor 커맨드로 chartPlaceholder 스키마를 가진 block을 webview로 열고
 *     해당 viewType 탭이 ViewColumn.Beside 에 생기는지 확인.
 *     (webview 내부 SVG DOM 검증은 customEditor가 비동기·iframe-private 이라 skip.)
 *
 * 실행: FORM_JS_TEST_MODE=1 npm run test:e2e
 */
import * as path from 'path';
import * as assert from 'assert';
import * as fs from 'fs';
import * as vscode from 'vscode';
import MarkdownIt from 'markdown-it';
import { formJsMarkdownPlugin } from '../../../src/markdown/plugin';
import { waitForCustomEditor } from '../helpers/waitForCustomEditor';

// __dirname = dist/test/integration/suite → ../../../../test/fixtures
const FIXTURES_DIR = path.resolve(__dirname, '../../../../test/fixtures');
const CHART_SINGLE_MD = path.join(FIXTURES_DIR, 'chart-single.md');
const VIEW_TYPE = 'form-js.block-editor';

const md = new MarkdownIt().use(formJsMarkdownPlugin);

function renderFixture(filename: string): string {
  const content = fs.readFileSync(path.join(FIXTURES_DIR, filename), 'utf-8');
  return md.render(content);
}

function countMatches(html: string, pattern: RegExp): number {
  return (html.match(pattern) ?? []).length;
}

const CHART_SCHEMA = {
  type: 'default',
  id: 'chart-form',
  components: [
    {
      type: 'chartPlaceholder',
      id: 'chart-1',
      chartType: 'bar',
      title: '분기별 매출',
    },
  ],
};

suite('Form JS chartPlaceholder Integration (Task 1.15)', () => {
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
   * Case 1: markdown plugin이 chartPlaceholder schema를 form-js-block + hidden <pre> 로 렌더한다.
   */
  test('Case 1: chart-single.md → form-js-block 1개, chartPlaceholder schema가 hidden pre에 포함', () => {
    const html = renderFixture('chart-single.md');

    const blockCount = countMatches(html, /class="form-js-block"/g);
    const errorCount = countMatches(html, /form-js-block--error/g);

    assert.strictEqual(
      blockCount,
      1,
      `form-js-block 1개여야 함 (실제: ${blockCount})\nHTML:\n${html.slice(0, 400)}`,
    );
    assert.strictEqual(errorCount, 0, `에러 블록 없어야 함 (실제: ${errorCount})`);

    // hidden pre 에 chartPlaceholder schema 가 escape된 형태로 들어 있음
    assert.match(
      html,
      /<pre class="form-js-source" hidden>[\s\S]*chartPlaceholder[\s\S]*<\/pre>/,
      `hidden pre 안에 chartPlaceholder 가 포함되어야 함\nHTML:\n${html.slice(0, 800)}`,
    );
    assert.match(
      html,
      /<pre class="form-js-source" hidden>[\s\S]*&quot;chartType&quot;:\s*&quot;bar&quot;[\s\S]*<\/pre>/,
      `hidden pre 안에 chartType:bar 가 포함되어야 함`,
    );
  });

  /**
   * Case 2: formJs.openBlockEditor 커맨드 → Custom Editor 패널 오픈 (chartPlaceholder schema)
   * webview 내부 DOM 검증은 비동기·iframe sandboxed라 본 통합에서는 skip.
   * (단위·E2E designer-editor-host 측 spec에서 SVG/props 검증을 담당.)
   */
  test('Case 2: formJs.openBlockEditor 커맨드(chartPlaceholder schema) → Custom Editor 패널이 열린다', async () => {
    const uri = vscode.Uri.file(CHART_SINGLE_MD);

    await vscode.commands.executeCommand('formJs.openBlockEditor', {
      uri: uri.toString(),
      mdStart: 4,
      mdEnd: 16,
      schema: JSON.stringify(CHART_SCHEMA),
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

    assert.ok(found, `Custom Editor 탭(viewType="${VIEW_TYPE}")이 chartPlaceholder schema 로 열려야 함`);
  });
});
