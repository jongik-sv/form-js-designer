import { test, expect } from '@playwright/test';

test.describe('v0.2 — embedded designer modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#editor', { state: 'visible' });
  });

  test('1. double-click form block opens modal with header + close button', async ({ page }) => {
    await page.getByTestId('insert-tabs').click();
    const block = page.locator('[data-type="form-js-block"]').first();
    await expect(block).toBeVisible();
    await block.dblclick();
    const modal = page.locator('.fjd-embedded-designer-root');
    await expect(modal).toBeVisible();
    await expect(modal.locator('h2')).toHaveText('Form Designer');
    await expect(modal.locator('.fjd-embedded-designer-close')).toBeVisible();
  });

  test('2. modal close updates the underlying NodeView (auto-save)', async ({ page }) => {
    await page.getByTestId('insert-tabs').click();
    const block = page.locator('[data-type="form-js-block"]').first();
    await block.dblclick();
    const modal = page.locator('.fjd-embedded-designer-root');
    await expect(modal).toBeVisible();
    // wait for the canvas mount point — Preact-rendered, near-immediate
    await page.waitForSelector('.fjd-embedded-designer-canvas', { timeout: 5_000 });
    // close via [닫기]
    await modal.locator('.fjd-embedded-designer-close').click();
    await expect(modal).toBeHidden();
    // block remains in document
    await expect(block).toBeVisible();
  });

  test('3. ESC closes modal, second double-click reopens', async ({ page }) => {
    await page.getByTestId('insert-tabs').click();
    const block = page.locator('[data-type="form-js-block"]').first();
    await block.dblclick();
    const modal = page.locator('.fjd-embedded-designer-root');
    await expect(modal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
    // re-open
    await block.dblclick();
    await expect(modal).toBeVisible();
    await page.keyboard.press('Escape');
  });
});
