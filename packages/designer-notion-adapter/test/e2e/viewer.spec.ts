/**
 * TSK-03-03: E2E 테스트 — form-js viewer 마운트 (샘플 페이지)
 *
 * Playwright: sample/index.html에서 "블록 삽입" 버튼 클릭 →
 * viewer 렌더 성공 + 다크/라이트 테마 전환
 *
 * 진입 경로: "블록 삽입" 버튼 클릭 (URL 직접 진입 금지 — reachability gate)
 * 예외: 초기 진입은 정적 file:// URL — design.md "진입점" 섹션에 명시된 허용 예외
 *
 * 실행: dev-test 단계에서 수행 (build 단계에서는 코드 작성만)
 */
import { test, expect } from '@playwright/test';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLE_HTML = resolve(__dirname, '../../sample/index.html');
const SAMPLE_URL = `file://${SAMPLE_HTML}`;

test.describe('form-js Notion Adapter — 샘플 페이지 E2E', () => {
  test.beforeEach(async ({ page }) => {
    // 샘플 페이지 초기 진입 (정적 파일 — file:// 허용, design.md 진입점 섹션 명시)
    await page.goto(SAMPLE_URL);
    await page.waitForSelector('[data-testid="blocks-container"]');
  });

  test('(클릭 경로) "블록 삽입" 버튼을 클릭하면 .form-js-block 요소가 DOM에 나타난다', async ({ page }) => {
    // 초기 자동 마운트 블록 확인
    await expect(page.locator('.form-js-block').first()).toBeVisible({ timeout: 5000 });

    // "블록 삽입" 버튼 클릭 (reachability gate 준수)
    await page.getByTestId('btn-insert-block').click();

    // 두 번째 .form-js-block이 추가됨을 확인
    await expect(page.locator('.form-js-block')).toHaveCount(2, { timeout: 5000 });
  });

  test('(화면 렌더링) .form-js-block 내부에 viewer 컨테이너가 표시된다', async ({ page }) => {
    await expect(page.locator('.form-js-viewer-container').first()).toBeVisible({ timeout: 5000 });
  });

  test('(테마) 라이트 모드에서 theme-light 클래스가 적용된다', async ({ page }) => {
    await page.waitForSelector('.form-js-block.theme-light', { timeout: 5000 });
    await expect(page.locator('.form-js-block.theme-light').first()).toBeVisible();
  });

  test('(테마) "다크 모드" 버튼 클릭 후 theme-dark 클래스가 적용된다', async ({ page }) => {
    await page.waitForSelector('.form-js-block', { timeout: 5000 });

    // 테마 토글 버튼 클릭 (라이트 → 다크)
    await page.getByTestId('btn-toggle-theme').click();

    // MutationObserver 발화 대기
    await page.waitForSelector('.form-js-block.theme-dark', { timeout: 3000 });
    await expect(page.locator('.form-js-block.theme-dark').first()).toBeVisible();
  });

  test('(에러 없음) viewer 렌더 후 .form-js-error-banner가 없다', async ({ page }) => {
    await page.waitForSelector('.form-js-block', { timeout: 5000 });
    await expect(page.locator('.form-js-error-banner')).toHaveCount(0);
  });
});
