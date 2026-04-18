/**
 * watermark-visibility.spec.ts — TSK-09-03 AC #6
 *
 * 3 뷰포트(1024×768 / 1440×900 / 1920×1080) × 2 호스트(editor.html, viewer.html) = 6 케이스.
 * viewport는 playwright.config.ts의 projects 배열에서 주입받는다.
 *
 * Test 1: [editor] .fjs-powered-by is visible
 * Test 2: [viewer] .fjs-powered-by is visible
 *
 * 선행 조건: spike dev 서버(npm run dev:spike)가 http://localhost:5173 에서 기동 중.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

async function assertWatermarkVisible(page: import('@playwright/test').Page) {
  const el = page.locator('.fjs-powered-by').first();

  await el.waitFor({ state: 'visible', timeout: 10_000 });

  // 1. isVisible
  await expect(el).toBeVisible();

  // 2. bounding box > 0
  const bbox = await el.boundingBox();
  expect(bbox).not.toBeNull();
  expect(bbox!.width).toBeGreaterThan(0);
  expect(bbox!.height).toBeGreaterThan(0);

  // 3. computed style not hidden
  const styles = await el.evaluate((node) => {
    const cs = window.getComputedStyle(node);
    return {
      display: cs.display,
      visibility: cs.visibility,
      opacity: parseFloat(cs.opacity),
    };
  });

  expect(styles.display).not.toBe('none');
  expect(styles.visibility).not.toBe('hidden');
  expect(styles.opacity).toBeGreaterThan(0.1);

  // 4. No opaque overlay fully covering the watermark
  const covered = await el.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const topEl = document.elementFromPoint(cx, cy);
    if (!topEl || topEl === node || node.contains(topEl)) return false;
    const cs = window.getComputedStyle(topEl);
    // pointer-events:none overlays are allowed (they don't block interaction)
    if (cs.pointerEvents === 'none') return false;
    // Check if covering element is opaque
    const bg = cs.backgroundColor;
    const opacity = parseFloat(cs.opacity);
    return opacity > 0.9 && !bg.includes('rgba(0, 0, 0, 0)') && bg !== 'transparent';
  });

  expect(covered).toBe(false);
}

test('[editor] .fjs-powered-by is visible', async ({ page }) => {
  await page.goto(`${BASE_URL}/editor.html`);
  await page.waitForSelector('.fjs-powered-by', { timeout: 15_000 });
  await assertWatermarkVisible(page);
});

test('[viewer] .fjs-powered-by is visible', async ({ page }) => {
  await page.goto(`${BASE_URL}/viewer.html`);
  await page.waitForSelector('.fjs-powered-by', { timeout: 15_000 });
  await assertWatermarkVisible(page);
});
