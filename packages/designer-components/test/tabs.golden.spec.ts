/**
 * TSK-04-02: Tabs golden spec — 기본/disabled/vertical 3컷 절대 기준
 *
 * build 단계에서 작성만 완료; 실행은 dev-test 단계에서 수행.
 */
import { test, expect } from '@playwright/test';

test.describe('Tabs golden (기본/disabled/vertical)', () => {
  test('horizontal tabs — default state golden', async ({ page }) => {
    await page.goto('/test/fixtures/tabs.html');
    await page.waitForSelector('[data-component="tabs"]', { timeout: 5000 });
    const element = page.locator('#viewer-root [data-component="tabs"]');
    await expect(element).toHaveScreenshot('tabs-default.png', {
      maxDiffPixelRatio: 0.001,
    });
  });

  test('tabs with disabled trigger — golden', async ({ page }) => {
    await page.goto('/test/fixtures/tabs-disabled.html');
    await page.waitForSelector('[data-component="tabs"]', { timeout: 5000 });
    const element = page.locator('#viewer-root [data-component="tabs"]');
    await expect(element).toHaveScreenshot('tabs-disabled.png', {
      maxDiffPixelRatio: 0.001,
    });
  });

  test('vertical orientation tabs — golden', async ({ page }) => {
    await page.goto('/test/fixtures/tabs-vertical.html');
    await page.waitForSelector('[data-component="tabs"]', { timeout: 5000 });
    const element = page.locator('#viewer-root [data-component="tabs"]');
    await expect(element).toHaveScreenshot('tabs-vertical.png', {
      maxDiffPixelRatio: 0.001,
    });
  });
});
