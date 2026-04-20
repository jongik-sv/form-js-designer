/**
 * TSK-05-01: 통합 테스트 — customComponentsModule 주입 검증
 *
 * @vscode/test-electron으로 VS Code 인스턴스에서 실행된다.
 * markdown-it 플러그인으로 fixture를 렌더링하여 빈 스키마 + 모듈 주입 상태에서
 * form-js-block이 에러 없이 마운트되는지 검증한다.
 *
 * WP-01 M1 fixture 3종 회귀 검증도 포함 (기존 preview.test.ts와 동일 케이스).
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

function countMatches(html: string, pattern: RegExp): number {
  return (html.match(pattern) ?? []).length;
}

suite('Form JS Custom Components Module Integration (TSK-05-01)', () => {
  const BLOCK_PATTERN = /class="form-js-block"/g;
  const ERROR_PATTERN = /form-js-block--error/g;

  // ── 빈 스키마 + 모듈 주입 ───────────────────────────────
  test('빈 스키마(components:[]) + 모듈 주입 — form-js-block 1개, 에러 없음', () => {
    const html = renderFixture('empty-schema-with-module.md');

    const blockCount = countMatches(html, BLOCK_PATTERN);
    const errorCount = countMatches(html, ERROR_PATTERN);

    assert.strictEqual(
      blockCount,
      1,
      `form-js-block 1개여야 함 (실제: ${blockCount})\nHTML:\n${html.slice(0, 400)}`,
    );
    assert.strictEqual(errorCount, 0, `에러 블록 없어야 함 (실제: ${errorCount})`);
  });

  // ── WP-01 M1 fixture 3종 회귀 ───────────────────────────
  test('WP-01 회귀: single-block.md — form-js-block 1개, 에러 없음', () => {
    const html = renderFixture('single-block.md');

    const blockCount = countMatches(html, BLOCK_PATTERN);
    const errorCount = countMatches(html, ERROR_PATTERN);

    assert.strictEqual(blockCount, 1, `form-js-block 1개여야 함 (실제: ${blockCount})`);
    assert.strictEqual(errorCount, 0, `에러 블록 없어야 함 (실제: ${errorCount})`);
  });

  test('WP-01 회귀: multi-block-with-invalid.md — 유효 블록 2개, error 블록 1개', () => {
    const html = renderFixture('multi-block-with-invalid.md');

    const blockCount = countMatches(html, BLOCK_PATTERN);
    const errorCount = countMatches(html, ERROR_PATTERN);

    assert.strictEqual(blockCount, 2, `유효 블록 2개여야 함 (실제: ${blockCount})`);
    assert.strictEqual(errorCount, 1, `invalid 블록 1개여야 함 (실제: ${errorCount})`);
  });

  test('WP-01 회귀: reload-test.md — 동일 마크다운 재렌더 시 블록 수 일관성', () => {
    const html1 = renderFixture('reload-test.md');
    const html2 = renderFixture('reload-test.md');

    const blockCount1 = countMatches(html1, BLOCK_PATTERN);
    const blockCount2 = countMatches(html2, BLOCK_PATTERN);

    assert.strictEqual(blockCount1, 1, `첫 번째 렌더: form-js-block 1개여야 함 (실제: ${blockCount1})`);
    assert.strictEqual(blockCount2, 1, `두 번째 렌더: form-js-block 1개여야 함 (실제: ${blockCount2})`);
    assert.strictEqual(blockCount1, blockCount2, '재렌더 시 블록 수 일관성');
  });
});
