/**
 * TSK-01-04: 통합 테스트 — 미리보기 렌더 경로
 *
 * @vscode/test-electron으로 VS Code 인스턴스를 띄운 뒤,
 * formJsMarkdownPlugin을 직접 인스턴스화하여 픽스처 마크다운 렌더링 결과를 검증한다.
 *
 * 3개 케이스:
 *   Case 1: 단일 블록 → form-js-block 1개, 에러 없음
 *   Case 2: 다중 블록+invalid → 유효 블록 2개, error 블록 1개
 *   Case 3: 동일 문서 재렌더 → 결과 일관성 (reload 시뮬레이션)
 *
 * 실행: FORM_JS_TEST_MODE=1 npm run test:e2e
 */
import * as path from 'path';
import * as assert from 'assert';
import * as fs from 'fs';
import MarkdownIt from 'markdown-it';
import { formJsMarkdownPlugin } from '../../../src/markdown/plugin';

// __dirname = dist/test/integration/suite → ../../../../test/fixtures
const FIXTURES_DIR = path.resolve(__dirname, '../../../../test/fixtures');

/** 우리 플러그인이 적용된 markdown-it 인스턴스 */
const md = new MarkdownIt().use(formJsMarkdownPlugin);

function renderFixture(filename: string): string {
  const content = fs.readFileSync(path.join(FIXTURES_DIR, filename), 'utf-8');
  return md.render(content);
}

/** HTML에서 특정 패턴 출현 횟수를 반환한다 */
function countMatches(html: string, pattern: RegExp): number {
  return (html.match(pattern) ?? []).length;
}

suite('Form JS Preview Integration (TSK-01-04)', () => {
  const BLOCK_PATTERN = /class="form-js-block"/g;
  const ERROR_PATTERN = /form-js-block--error/g;

  test('Case 1: 단일 블록 — form-js-block 1개 생성, 에러 없음', () => {
    const html = renderFixture('single-block.md');

    const blockCount = countMatches(html, BLOCK_PATTERN);
    const errorCount = countMatches(html, ERROR_PATTERN);

    assert.strictEqual(blockCount, 1, `form-js-block 1개여야 함 (실제: ${blockCount})\nHTML:\n${html.slice(0, 400)}`);
    assert.strictEqual(errorCount, 0, `에러 블록 없어야 함 (실제: ${errorCount})`);
  });

  test('Case 2: 다중 블록+invalid — 유효 블록 2개, form-js-block--error 1개', () => {
    const html = renderFixture('multi-block-with-invalid.md');

    const blockCount = countMatches(html, BLOCK_PATTERN);
    const errorCount = countMatches(html, ERROR_PATTERN);

    assert.strictEqual(blockCount, 2, `유효 블록 2개여야 함 (실제: ${blockCount})`);
    assert.strictEqual(errorCount, 1, `invalid 블록 1개여야 함 (실제: ${errorCount})`);
  });

  test('Case 3: reload 후 재마운트 — 동일 마크다운 재렌더 시 블록 수 일관성', () => {
    const html1 = renderFixture('reload-test.md');
    const html2 = renderFixture('reload-test.md');

    const blockCount1 = countMatches(html1, BLOCK_PATTERN);
    const blockCount2 = countMatches(html2, BLOCK_PATTERN);

    assert.strictEqual(blockCount1, 1, `첫 번째 렌더: form-js-block 1개여야 함 (실제: ${blockCount1})`);
    assert.strictEqual(blockCount2, 1, `두 번째 렌더: form-js-block 1개여야 함 (실제: ${blockCount2})`);
    assert.strictEqual(blockCount1, blockCount2, '재렌더 시 블록 수 일관성 확인');
  });
});
