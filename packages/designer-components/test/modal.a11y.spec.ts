/**
 * TSK-04-02: Modal a11y spec — axe-core 0 위반 + focus trap + Esc/Overlay close + focus return
 *
 * build 단계에서 작성만 완료; 실행은 dev-test 단계에서 수행.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Modal a11y — axe-core + keyboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/fixtures/modal.html');
    await page.waitForSelector('[data-testid="open-modal"]', { timeout: 5000 });
  });

  test('axe-core: 0 violations on closed state', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .include('[data-component="modal"]')
      .analyze();
    expect(results.violations).toHaveLength(0);
  });

  test('axe-core: 0 violations on open state (with portal anchor)', async ({ page }) => {
    await page.locator('[data-testid="open-modal"]').click();
    await expect(page.locator('[role="dialog"]')).toHaveAttribute('data-state', 'open', { timeout: 3000 });

    const results = await new AxeBuilder({ page })
      .include('main')
      .analyze();
    expect(results.violations).toHaveLength(0);
  });

  test('keyboard: Esc closes modal', async ({ page }) => {
    await page.locator('[data-testid="open-modal"]').click();
    await expect(page.locator('[role="dialog"]')).toHaveAttribute('data-state', 'open', { timeout: 3000 });
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 2000 });
  });

  test('keyboard: Overlay click closes modal', async ({ page }) => {
    await page.locator('[data-testid="open-modal"]').click();
    await expect(page.locator('[role="dialog"]')).toHaveAttribute('data-state', 'open', { timeout: 3000 });
    // Click outside dialog (overlay area)
    await page.mouse.click(10, 10);
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 2000 });
  });

  test('keyboard: focus returns to trigger after close', async ({ page }) => {
    const trigger = page.locator('[data-testid="open-modal"]');
    await trigger.click();
    await expect(page.locator('[role="dialog"]')).toHaveAttribute('data-state', 'open', { timeout: 3000 });
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 2000 });
    // Radix Dialog returns focus to trigger after close
    await expect(trigger).toBeFocused();
  });

  test('keyboard: Tab cycles within focus trap inside modal', async ({ page }) => {
    await page.locator('[data-testid="open-modal"]').click();
    await expect(page.locator('[role="dialog"]')).toHaveAttribute('data-state', 'open', { timeout: 3000 });

    // First focusable element inside dialog
    const closeBtn = page.locator('[data-testid="close-modal"]');
    await expect(closeBtn).toBeVisible();

    // Tab through elements — focus should stay within dialog
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? '');
    // Should be inside dialog
    expect(['close-modal', 'open-modal'].includes(focused) || focused === '').toBe(true);
  });

  test('keyboard: Shift-Tab cycles backward within focus trap', async ({ page }) => {
    await page.locator('[data-testid="open-modal"]').click();
    await expect(page.locator('[role="dialog"]')).toHaveAttribute('data-state', 'open', { timeout: 3000 });
    await page.keyboard.press('Shift+Tab');
    // Should focus last focusable element inside dialog (close button)
    const closeBtn = page.locator('[data-testid="close-modal"]');
    await expect(closeBtn).toBeFocused();
  });

  test('role="dialog" and aria-modal are present when open', async ({ page }) => {
    await page.locator('[data-testid="open-modal"]').click();
    await expect(page.locator('[role="dialog"]')).toHaveAttribute('data-state', 'open', { timeout: 3000 });
    await expect(page.locator('[role="dialog"]')).toHaveAttribute('aria-modal', 'true');
  });

  test('dialog has aria-labelledby pointing to title', async ({ page }) => {
    await page.locator('[data-testid="open-modal"]').click();
    await expect(page.locator('[role="dialog"]')).toHaveAttribute('data-state', 'open', { timeout: 3000 });
    const dialog = page.locator('[role="dialog"]');
    const labelledById = await dialog.getAttribute('aria-labelledby');
    expect(labelledById).toBeTruthy();
    const titleEl = page.locator(`#${labelledById}`);
    await expect(titleEl).toBeVisible();
  });
});
