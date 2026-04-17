/**
 * TSK-04-02: Modal parity spec — 열린 상태 viewer↔editor 픽셀 diff ≤ 0.1%, 3 viewport
 *
 * build 단계에서 작성만 완료; 실행은 dev-test 단계에서 수행.
 * 주의: Modal parity는 반드시 열린 상태에서 캡처해야 한다.
 */
import { test, expect } from '@playwright/test';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const PARITY_THRESHOLD = 0.001; // 0.1%

test.describe('Modal parity — 열린 상태 (viewer ↔ editor)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/fixtures/modal.html');
    await page.waitForSelector('[data-testid="open-modal"]', { timeout: 5000 });

    // Open modal — 열린 상태 캡처를 위해 trigger 클릭
    await page.locator('#viewer-root [data-testid="open-modal"]').click();
    // Wait for Radix data-state="open" transition
    await expect(
      page.locator('[role="dialog"]').first(),
    ).toHaveAttribute('data-state', 'open', { timeout: 3000 });
    // Wait for animation to settle
    await page.waitForTimeout(200);
  });

  test('viewer and editor modal (open) render identical pixels', async ({ page }) => {
    const viewerRoot = page.locator('#viewer-root');
    const editorRoot = page.locator('#editor-root');

    const viewerScreenshot = await viewerRoot.screenshot();
    const editorScreenshot = await editorRoot.screenshot();

    const viewerPng = PNG.sync.read(viewerScreenshot);
    const editorPng = PNG.sync.read(editorScreenshot);

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

  test('modal trigger button exists', async ({ page }) => {
    await expect(page.locator('[data-testid="open-modal"]').first()).toBeVisible();
  });

  test('modal dialog is open (data-state=open)', async ({ page }) => {
    await expect(page.locator('[role="dialog"]').first()).toHaveAttribute('data-state', 'open');
  });
});
