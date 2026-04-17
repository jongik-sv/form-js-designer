/**
 * Button golden screenshot spec
 * QA 체크리스트: Button golden — golden baseline과 일치
 *
 * build 단계에서 작성만 완료; 실행은 dev-test 단계에서 수행.
 */
import { test, expect } from '@playwright/test';

test.describe('Button golden screenshot', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/fixtures/button.html');
    await page.waitForSelector('[data-component="button"]', { timeout: 5000 });
  });

  test('viewer button matches golden baseline', async ({ page }) => {
    const viewerBtn = page.locator('#viewer-root [data-component="button"]');
    await expect(viewerBtn).toHaveScreenshot('button-viewer-golden.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('editor button matches golden baseline', async ({ page }) => {
    const editorBtn = page.locator('#editor-root [data-component="button"]');
    await expect(editorBtn).toHaveScreenshot('button-editor-golden.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('primary variant button has text label', async ({ page }) => {
    const btn = page.locator('#viewer-root [data-component="button"]');
    await expect(btn).toContainText('버튼');
  });
});
