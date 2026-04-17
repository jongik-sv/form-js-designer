/**
 * Card computed-style spec
 * QA 체크리스트: Card computed-style — getComputedStyle padding 스냅샷
 *
 * build 단계에서 작성만 완료; 실행은 dev-test 단계에서 수행.
 */
import { test, expect } from '@playwright/test';

test.describe('Card computed-style', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/fixtures/card.html');
    await page.waitForSelector('[data-component="card"]', { timeout: 5000 });
  });

  test('padding:md renders 16px padding', async ({ page }) => {
    const padding = await page.evaluate(() => {
      const card = document.querySelector('#viewer-root [data-component="card"]');
      if (!card) return null;
      const styles = window.getComputedStyle(card);
      return {
        paddingTop: styles.paddingTop,
        paddingRight: styles.paddingRight,
        paddingBottom: styles.paddingBottom,
        paddingLeft: styles.paddingLeft,
      };
    });

    // padding: md = 16px
    expect(padding).not.toBeNull();
    expect(padding?.paddingTop).toBe('16px');
    expect(padding?.paddingRight).toBe('16px');
    expect(padding?.paddingBottom).toBe('16px');
    expect(padding?.paddingLeft).toBe('16px');
  });

  test('elevation:1 renders box-shadow', async ({ page }) => {
    const hasShadow = await page.evaluate(() => {
      const card = document.querySelector('#viewer-root [data-component="card"]');
      if (!card) return false;
      const styles = window.getComputedStyle(card);
      return styles.boxShadow !== 'none' && styles.boxShadow !== '';
    });
    expect(hasShadow).toBe(true);
  });

  test('card root is display:block (not flex/grid)', async ({ page }) => {
    const display = await page.evaluate(() => {
      const card = document.querySelector('#viewer-root [data-component="card"]');
      if (!card) return null;
      return window.getComputedStyle(card).display;
    });
    expect(display).toBe('block');
  });
});
