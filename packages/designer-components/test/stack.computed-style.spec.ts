/**
 * Stack computed-style spec
 * QA 체크리스트: Stack computed-style — flexDirection prop 반영 스냅샷
 *
 * build 단계에서 작성만 완료; 실행은 dev-test 단계에서 수행.
 */
import { test, expect } from '@playwright/test';

test.describe('Stack computed-style', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/fixtures/stack.html');
    await page.waitForSelector('[data-component="stack"]', { timeout: 5000 });
  });

  test('direction:vertical renders flex-direction:column', async ({ page }) => {
    const flexDirection = await page.evaluate(() => {
      const stack = document.querySelector('#viewer-root [data-component="stack"]');
      if (!stack) return null;
      return window.getComputedStyle(stack).flexDirection;
    });
    expect(flexDirection).toBe('column');
  });

  test('stack is display:flex', async ({ page }) => {
    const display = await page.evaluate(() => {
      const stack = document.querySelector('#viewer-root [data-component="stack"]');
      if (!stack) return null;
      return window.getComputedStyle(stack).display;
    });
    expect(display).toBe('flex');
  });

  test('gap:4 renders 16px gap', async ({ page }) => {
    const gap = await page.evaluate(() => {
      const stack = document.querySelector('#viewer-root [data-component="stack"]');
      if (!stack) return null;
      return window.getComputedStyle(stack).gap;
    });
    // gap: 4 = 16px
    expect(gap).toBe('16px');
  });

  test('align:start renders align-items:flex-start', async ({ page }) => {
    const alignItems = await page.evaluate(() => {
      const stack = document.querySelector('#viewer-root [data-component="stack"]');
      if (!stack) return null;
      return window.getComputedStyle(stack).alignItems;
    });
    expect(alignItems).toBe('flex-start');
  });
});
