/**
 * TSK-04-02: Modal golden spec — sm/md/lg 3 size 절대 기준
 *
 * build 단계에서 작성만 완료; 실행은 dev-test 단계에서 수행.
 */
import { test, expect } from '@playwright/test';

async function openModal(page: import('@playwright/test').Page, fixture: string) {
  await page.goto(`/test/fixtures/${fixture}`);
  await page.waitForSelector('[data-testid="open-modal"]', { timeout: 5000 });
  await page.locator('[data-testid="open-modal"]').first().click();
  await expect(
    page.locator('[role="dialog"]').first(),
  ).toHaveAttribute('data-state', 'open', { timeout: 3000 });
  await page.waitForTimeout(200);
}

test.describe('Modal golden (sm/md/lg sizes)', () => {
  test('modal size=sm — golden', async ({ page }) => {
    await openModal(page, 'modal-sm.html');
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toHaveScreenshot('modal-sm.png', {
      maxDiffPixelRatio: 0.001,
    });
  });

  test('modal size=md — golden', async ({ page }) => {
    await openModal(page, 'modal.html');
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toHaveScreenshot('modal-md.png', {
      maxDiffPixelRatio: 0.001,
    });
  });

  test('modal size=lg — golden', async ({ page }) => {
    await openModal(page, 'modal-lg.html');
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toHaveScreenshot('modal-lg.png', {
      maxDiffPixelRatio: 0.001,
    });
  });
});
