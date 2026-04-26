/**
 * TSK-02-03: E2E 통합 테스트 — ✏️ 편집 버튼 오버레이 + single-editor lock
 *
 * @vscode/test-electron 환경에서 markdown-it plugin이 렌더한 HTML에
 * .fjs-edit-btn 버튼 관련 data 속성이 올바르게 포함되는지 검증한다.
 *
 * 진입 경로: formJsMarkdownPlugin을 통한 렌더 → HTML 검증
 * (webview DOM 직접 접근 불가 제약으로 plugin 렌더 HTML 검증 방식 사용)
 *
 * 실행: FORM_JS_TEST_MODE=1 npm run test:e2e (dev-test 단계)
 * 이 파일은 build 단계에서 코드만 작성하며 실행하지 않는다.
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

suite('EditButton Integration (TSK-02-03)', () => {
  /**
   * QA 체크리스트: (통합 — preview.ts 연계)
   * mountViewers() 완료 후 각 .form-js-block에 .fjs-edit-btn 버튼이 1개씩 추가됨.
   * 렌더된 HTML에 data-md-start, data-md-end 속성이 존재해야
   * mountEditButton()이 정확한 offset으로 버튼을 삽입할 수 있다.
   */
  test('단일 블록 렌더 시 data-md-start/data-md-end 속성이 .form-js-block에 존재한다', () => {
    const html = renderFixture('single-block.md');

    const hasMdStart = /data-md-start=/.test(html);
    const hasMdEnd = /data-md-end=/.test(html);

    assert.ok(
      hasMdStart,
      `data-md-start 속성이 렌더된 HTML에 존재해야 함\nHTML(앞 500자):\n${html.slice(0, 500)}`
    );
    assert.ok(
      hasMdEnd,
      `data-md-end 속성이 렌더된 HTML에 존재해야 함`
    );
  });

  /**
   * QA 체크리스트: (통합 — preview.ts 연계)
   * 다중 블록 문서에서 각 블록에 서로 다른 data-md-start/data-md-end 값이 설정됨
   * → mountEditButton 호출 시 각 블록의 올바른 offset이 전달됨
   */
  test('다중 블록 문서에서 각 .form-js-block은 서로 다른 data-md-start 값을 가진다', () => {
    const html = renderFixture('multi-block.md');

    const mdStartValues = [...html.matchAll(/data-md-start="(\d+)"/g)].map(
      (m) => Number(m[1])
    );

    assert.ok(
      mdStartValues.length >= 2,
      `다중 블록이므로 data-md-start가 2개 이상이어야 함 (실제: ${mdStartValues.length})`
    );

    const uniqueValues = new Set(mdStartValues);
    assert.strictEqual(
      uniqueValues.size,
      mdStartValues.length,
      `각 블록의 data-md-start는 고유해야 함 (실제 값: ${mdStartValues.join(', ')})`
    );
  });

  /**
   * QA 체크리스트: (클릭 경로)
   * VSCode에서 .md 파일을 열고 "Open Preview" 아이콘을 클릭하여 Markdown 미리보기에 도달.
   * 렌더된 HTML에 .form-js-block 존재 확인 (클릭 경로 진입점 전제 조건).
   */
  test('form-js 블록이 있는 마크다운 파일 렌더 시 .form-js-block이 생성된다', () => {
    const html = renderFixture('single-block.md');

    const blockCount = (html.match(/class="form-js-block/g) ?? []).length;
    assert.ok(
      blockCount >= 1,
      `form-js-block이 1개 이상 생성되어야 함 (실제: ${blockCount})`
    );
  });

  /**
   * QA 체크리스트: (엣지 — 버튼 중복 삽입 방지)
   * 동일 픽스처를 두 번 렌더해도 블록 수가 동일해야 함
   * (mountEditButton 중복 방지 전제 조건 — preview.ts 연계).
   */
  test('동일 문서를 두 번 렌더해도 .form-js-block 수가 동일하다', () => {
    const html1 = renderFixture('single-block.md');
    const html2 = renderFixture('single-block.md');

    const count1 = (html1.match(/class="form-js-block/g) ?? []).length;
    const count2 = (html2.match(/class="form-js-block/g) ?? []).length;

    assert.strictEqual(
      count1,
      count2,
      `재렌더 시 블록 수 일관성 필요 (1차: ${count1}, 2차: ${count2})`
    );
  });
});
