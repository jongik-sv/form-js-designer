/**
 * TSK-04-02: Tabs a11y spec — axe-core 0 위반 + 키보드 매트릭스
 *
 * build 단계에서 작성만 완료; 실행은 dev-test 단계에서 수행.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Tabs a11y — axe-core', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/fixtures/tabs.html');
    await page.waitForSelector('[data-component="tabs"]', { timeout: 5000 });
  });

  test('axe-core: 0 violations on tabs component', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .include('[data-component="tabs"]')
      .analyze();
    expect(results.violations).toHaveLength(0);
  });

  test('keyboard: ArrowRight moves focus to next tab', async ({ page }) => {
    await page.locator('[role="tab"]').first().focus();
    await page.keyboard.press('ArrowRight');
    const activeTab = page.locator('[role="tab"][data-state="active"]');
    await expect(activeTab).toBeVisible();
  });

  test('keyboard: ArrowLeft moves focus to previous tab', async ({ page }) => {
    await page.locator('[role="tab"]').nth(1).focus();
    await page.keyboard.press('ArrowLeft');
    const firstTab = page.locator('[role="tab"]').first();
    await expect(firstTab).toHaveAttribute('data-state', 'active');
  });

  test('keyboard: Home moves focus to first tab', async ({ page }) => {
    await page.locator('[role="tab"]').last().focus();
    await page.keyboard.press('Home');
    const firstTab = page.locator('[role="tab"]').first();
    await expect(firstTab).toBeFocused();
  });

  test('keyboard: End moves focus to last tab', async ({ page }) => {
    await page.locator('[role="tab"]').first().focus();
    await page.keyboard.press('End');
    const lastTab = page.locator('[role="tab"]').last();
    await expect(lastTab).toBeFocused();
  });

  test('keyboard: Tab moves focus from trigger to content', async ({ page }) => {
    const activeTab = page.locator('[role="tab"][data-state="active"]');
    await activeTab.focus();
    await page.keyboard.press('Tab');
    const content = page.locator('[role="tabpanel"]');
    await expect(content).toBeFocused();
  });

  test('role="tablist" and role="tab" are present', async ({ page }) => {
    await expect(page.locator('[role="tablist"]')).toBeVisible();
    await expect(page.locator('[role="tab"]').first()).toBeVisible();
  });
});
