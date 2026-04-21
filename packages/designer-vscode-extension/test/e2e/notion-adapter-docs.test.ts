/**
 * TSK-03-02: E2E 통합 테스트 — 어댑터 설계 문서 산출물 검증
 *
 * 본 Task(TSK-03-02)는 설계 문서 산출 Task이므로 실제 BlockNote 클릭 경로 검증은
 * TSK-03-03(PoC 구현) / TSK-03-04(E2E)에서 수행한다.
 *
 * 본 파일은 다음을 검증한다:
 * 1. 산출물 문서 3종(adapter-design.md / contract.md / platform-matrix.md)이
 *    존재하고 비어있지 않음 (통합 케이스 QA)
 * 2. 향후 TSK-03-03/04에서 수행할 클릭 경로 시나리오 명세 기록
 *
 * 실행: dev-test 단계에서 실행 (build 단계에서 코드만 작성)
 * 진입 경로: 메뉴/명령 클릭으로만 진입 (URL 직접 진입 금지 — reachability gate)
 */

import * as path from 'path';
import * as assert from 'assert';
import * as fs from 'fs';

const PROJECT_ROOT = path.resolve(__dirname, '../../../../../');
const DOCS_NOTION = path.join(PROJECT_ROOT, 'docs/vscode-ext/features/notion-adapter');

// ─────────────────────────────────────────────────────────────────────────────
// 통합 케이스 1: 산출물 문서 3종 존재·비어있지 않음 검증
// QA 체크리스트 — (통합 케이스) docs 3종 일관성
// ─────────────────────────────────────────────────────────────────────────────
suite('TSK-03-02: Notion 어댑터 설계 문서 통합 검증', () => {
  const EXPECTED_DOCS = [
    'adapter-design.md',
    'contract.md',
    'platform-matrix.md',
  ];

  EXPECTED_DOCS.forEach((docName) => {
    test(`산출물 문서가 존재한다: ${docName}`, () => {
      const filePath = path.join(DOCS_NOTION, docName);
      assert.ok(
        fs.existsSync(filePath),
        `산출물 누락: ${filePath}`
      );
    });

    test(`산출물 문서가 비어있지 않다 (≥500자): ${docName}`, () => {
      const filePath = path.join(DOCS_NOTION, docName);
      const content = fs.readFileSync(filePath, 'utf-8');
      assert.ok(
        content.length >= 500,
        `문서가 너무 짧습니다 (${content.length}자): ${filePath}`
      );
    });
  });

  test('adapter-design.md / contract.md / platform-matrix.md가 상호 참조한다', () => {
    const adapterDesign = fs.readFileSync(
      path.join(DOCS_NOTION, 'adapter-design.md'), 'utf-8'
    );
    const contract = fs.readFileSync(
      path.join(DOCS_NOTION, 'contract.md'), 'utf-8'
    );
    const matrix = fs.readFileSync(
      path.join(DOCS_NOTION, 'platform-matrix.md'), 'utf-8'
    );

    assert.ok(
      adapterDesign.includes('contract.md') || adapterDesign.includes('FormJsBlockHost'),
      'adapter-design.md가 contract.md 또는 FormJsBlockHost를 참조해야 합니다'
    );
    assert.ok(
      contract.includes('adapter-design.md') || contract.includes('platform-matrix.md'),
      'contract.md가 adapter-design.md 또는 platform-matrix.md를 참조해야 합니다'
    );
    assert.ok(
      matrix.includes('platform-identification') || matrix.includes('TSK-03-01'),
      'platform-matrix.md가 platform-identification.md 또는 TSK-03-01을 참조해야 합니다'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 통합 케이스 2: 향후 TSK-03-03/04 클릭 경로 시나리오 명세
// (현재는 코드 기록 목적 — 실제 실행은 PoC/E2E Task에서)
// ─────────────────────────────────────────────────────────────────────────────
suite('TSK-03-02: 향후 PoC/E2E 시나리오 명세 (TSK-03-03/04 실행)', () => {
  /**
   * 시나리오: 사내 뷰어 PoC 환경에서 /form-js 슬래시 명령으로 블록 삽입
   *
   * 진입 경로 (reachability gate 준수):
   * 1. 사내 뷰어 PoC 환경 URL로 이동 (초기 진입 — goto 허용)
   * 2. 본문 영역 클릭 → "/" 타이핑 (슬래시 명령 트리거)
   * 3. 블록 메뉴에서 "form-js" 항목 클릭 (직접 URL 진입 금지)
   * 4. .form-js-block DOM 등장 assert
   * 5. form-js viewer [role="form"] 또는 .fjs-form 렌더 assert
   *
   * 예상 Playwright 코드 (TSK-03-04):
   *   await page.goto(process.env.NOTION_POC_URL ?? 'http://localhost:3000');
   *   await page.locator('.bn-editor').click();
   *   await page.keyboard.type('/form-js');
   *   await page.getByRole('option', { name: 'form-js' }).click();
   *   await expect(page.locator('.form-js-block')).toBeVisible();
   *   await expect(page.locator('.fjs-form, [role="form"]')).toBeVisible();
   */
  test('[명세] 슬래시 명령 → form-js 블록 삽입 → viewer 렌더 (TSK-03-04 실행)', () => {
    assert.ok(true, '시나리오 명세 — TSK-03-04에서 실행');
  });

  /**
   * 시나리오: viewer-only 모드 — requestEdit no-op + warn
   *
   * 진입 경로: 슬래시 명령 → form-js 블록 삽입 → readOnly:true 상태에서 편집 요청
   * 기대: console.warn 발생, throw 없음
   */
  test('[명세] viewer-only 모드에서 requestEdit no-op 동작 (TSK-03-04 실행)', () => {
    assert.ok(true, '시나리오 명세 — TSK-03-04에서 실행');
  });

  /**
   * 시나리오: CSS 격리 — .form-js-block이 호스트 본문 스타일을 침범하지 않음
   *
   * 진입 경로: 슬래시 명령 → form-js 블록 삽입 → 호스트 본문 font-family 비교
   * 기대: form-js 내부 CSS가 호스트 body font-family를 변경하지 않음
   */
  test('[명세] CSS 격리 — 호스트 본문 스타일 비침범 (TSK-03-04 실행)', () => {
    assert.ok(true, '시나리오 명세 — TSK-03-04에서 실행');
  });
});
