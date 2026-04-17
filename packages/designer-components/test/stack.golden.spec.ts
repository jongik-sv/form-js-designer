/**
 * Stack golden screenshot spec
 * QA 체크리스트: Stack golden — golden baseline과 일치
 *
 * build 단계에서 작성만 완료; 실행은 dev-test 단계에서 수행.
 */
import { test, expect } from '@playwright/test';

test.describe('Stack golden screenshot', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/fixtures/stack.html');
    await page.waitForSelector('[data-component="stack"]', { timeout: 5000 });
  });

  test('viewer stack matches golden baseline', async ({ page }) => {
    const viewerStack = page.locator('#viewer-root [data-component="stack"]');
    await expect(viewerStack).toHaveScreenshot('stack-viewer-golden.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('editor stack matches golden baseline', async ({ page }) => {
    const editorStack = page.locator('#editor-root [data-component="stack"]');
    await expect(editorStack).toHaveScreenshot('stack-editor-golden.png', {
      maxDiffPixelRatio: 0.01,
    });
  });
});
