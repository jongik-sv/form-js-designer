/**
 * TSK-04-02: Tabs a11y spec — axe-core 0 위반 + 키보드 매트릭스
 *
 * build 단계에서 작성만 완료; 실행은 dev-test 단계에서 수행.
 * viewer-root 스코프로 locator 제한 (fixture에 viewer+editor 2개 인스턴스 존재)
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
    const viewer = page.locator('#viewer-root');
    await viewer.locator('[role="tab"]').first().focus();
    await page.keyboard.press('ArrowRight');
    const activeTab = viewer.locator('[role="tab"][data-state="active"]');
    await expect(activeTab).toBeVisible();
  });

  test('keyboard: ArrowLeft moves focus to previous tab', async ({ page }) => {
    const viewer = page.locator('#viewer-root');
    await viewer.locator('[role="tab"]').nth(1).focus();
    await page.keyboard.press('ArrowLeft');
    const firstTab = viewer.locator('[role="tab"]').first();
    await expect(firstTab).toHaveAttribute('data-state', 'active');
  });

  test('keyboard: Home moves focus to first tab', async ({ page }) => {
    const viewer = page.locator('#viewer-root');
    await viewer.locator('[role="tab"]').last().focus();
    await page.keyboard.press('Home');
    const firstTab = viewer.locator('[role="tab"]').first();
    await expect(firstTab).toBeFocused();
  });

  test('keyboard: End moves focus to last tab', async ({ page }) => {
    const viewer = page.locator('#viewer-root');
    await viewer.locator('[role="tab"]').first().focus();
    await page.keyboard.press('End');
    const lastTab = viewer.locator('[role="tab"]').last();
    await expect(lastTab).toBeFocused();
  });

  test('keyboard: Tab moves focus from trigger to content', async ({ page }) => {
    const viewer = page.locator('#viewer-root');
    const activeTab = viewer.locator('[role="tab"][data-state="active"]');
    await activeTab.focus();
    await page.keyboard.press('Tab');
    // Active tabpanel receives focus after Tab from trigger
    const content = viewer.locator('[role="tabpanel"][data-state="active"]');
    await expect(content).toBeFocused();
  });

  test('role="tablist" and role="tab" are present', async ({ page }) => {
    const viewer = page.locator('#viewer-root');
    await expect(viewer.locator('[role="tablist"]')).toBeVisible();
    await expect(viewer.locator('[role="tab"]').first()).toBeVisible();
  });
});
