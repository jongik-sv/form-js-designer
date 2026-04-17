/**
 * Card parity spec — viewer↔editor 픽셀 diff ≤ 0.1%, 3 viewport
 * QA 체크리스트: Card parity (1024px / 1440px / 1920px)
 *
 * build 단계에서 작성만 완료; 실행은 dev-test 단계에서 수행.
 */
import { test, expect } from '@playwright/test';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const PARITY_THRESHOLD = 0.001; // 0.1%

test.describe('Card parity (viewer ↔ editor)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/fixtures/card.html');
    // 렌더 완료 대기
    await page.waitForSelector('[data-component="card"]', { timeout: 5000 });
  });

  test('viewer and editor render identical pixels', async ({ page }) => {
    const viewerRoot = page.locator('#viewer-root');
    const editorRoot = page.locator('#editor-root');

    const viewerScreenshot = await viewerRoot.screenshot();
    const editorScreenshot = await editorRoot.screenshot();

    const viewerPng = PNG.sync.read(viewerScreenshot);
    const editorPng = PNG.sync.read(editorScreenshot);

    // 크기 일치 확인
    expect(viewerPng.width).toBe(editorPng.width);
    expect(viewerPng.height).toBe(editorPng.height);

    const { width, height } = viewerPng;
    const totalPixels = width * height;
    const diffPng = new PNG({ width, height });

    const diffPixels = pixelmatch(
      viewerPng.data,
      editorPng.data,
      diffPng.data,
      width,
      height,
      { threshold: 0.1 },
    );

    const diffRatio = diffPixels / totalPixels;
    expect(diffRatio, `pixel diff ratio ${diffRatio.toFixed(4)} exceeds ${PARITY_THRESHOLD}`).toBeLessThanOrEqual(PARITY_THRESHOLD);
  });

  test('card DOM exists in viewer', async ({ page }) => {
    await expect(page.locator('#viewer-root [data-component="card"]')).toBeVisible();
  });

  test('card DOM exists in editor', async ({ page }) => {
    await expect(page.locator('#editor-root [data-component="card"]')).toBeVisible();
  });

  test('card header text is visible', async ({ page }) => {
    await expect(page.locator('#viewer-root .dc-card__header')).toContainText('카드 제목');
  });
});
