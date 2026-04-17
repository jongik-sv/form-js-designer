/**
 * Button computed-style spec
 * QA 체크리스트: Button computed-style — backgroundColor primary variant
 *                Button disabled:true → <button disabled>
 *                Button variant:ghost → 배경색 투명
 *
 * build 단계에서 작성만 완료; 실행은 dev-test 단계에서 수행.
 */
import { test, expect } from '@playwright/test';

test.describe('Button computed-style', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/fixtures/button.html');
    await page.waitForSelector('[data-component="button"]', { timeout: 5000 });
  });

  test('primary variant has non-transparent background', async ({ page }) => {
    const bgColor = await page.evaluate(() => {
      const btn = document.querySelector('#viewer-root [data-component="button"]');
      if (!btn) return null;
      return window.getComputedStyle(btn).backgroundColor;
    });
    // primary = #2563eb = rgb(37, 99, 235)
    expect(bgColor).toBe('rgb(37, 99, 235)');
  });

  test('button is display:inline-flex', async ({ page }) => {
    const display = await page.evaluate(() => {
      const btn = document.querySelector('#viewer-root [data-component="button"]');
      if (!btn) return null;
      return window.getComputedStyle(btn).display;
    });
    expect(display).toBe('inline-flex');
  });

  test('button has data-variant attribute "primary"', async ({ page }) => {
    const btn = page.locator('#viewer-root [data-component="button"]');
    await expect(btn).toHaveAttribute('data-variant', 'primary');
  });
});
