import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('1. insert simple → input rendered inside form-js-block', async ({ page }) => {
  await page.getByTestId('insert-simple').click();
  const block = page.locator('[data-type="form-js-block"]').first();
  await expect(block).toBeVisible();
  await expect(block.locator('input').first()).toBeVisible();
});

test('2. insert tabs → designer Tabs + Card components render', async ({ page }) => {
  await page.getByTestId('insert-tabs').click();
  const block = page.locator('[data-type="form-js-block"]').first();
  await expect(block.locator('.dc-tabs [role="tab"]')).toHaveCount(2);
  await block.locator('.dc-tabs [role="tab"]').nth(1).click();
  await expect(block.locator('.dc-card')).toBeVisible();
});

test('3. round-trip: HTML serialize → setContent → identical components', async ({ page }) => {
  await page.getByTestId('insert-tabs').click();
  await page.getByTestId('dump-html').click();
  const dump = await page.getByTestId('dump-output').textContent();
  expect(dump).toContain('data-type="form-js-block"');
  expect(dump).toContain('data-form-schema');

  await page.getByTestId('reload-from-html').click();
  await expect(page.locator('.dc-tabs [role="tab"]')).toHaveCount(2);
});

test('4. event isolation: form-js input does not fire ProseMirror transaction', async ({ page }) => {
  await page.getByTestId('insert-simple').click();
  const beforeTx = await page.evaluate(() => (window as { __txCount?: number }).__txCount ?? 0);
  await page.locator('[data-type="form-js-block"] input').first().fill('hello world');
  await page.waitForTimeout(100);
  const afterTx = await page.evaluate(() => (window as { __txCount?: number }).__txCount ?? 0);
  expect(afterTx - beforeTx).toBeLessThanOrEqual(1);
});

test('5. multi-block isolation: input in block A does not appear in block B', async ({ page }) => {
  await page.getByTestId('insert-simple').click();
  await page.getByTestId('insert-simple').click();
  const blocks = page.locator('[data-type="form-js-block"]');
  await expect(blocks).toHaveCount(2);

  // Use click+type instead of fill because form-js uses controlled components
  await blocks.nth(0).locator('input').first().click();
  await page.keyboard.type('A-value');
  await blocks.nth(1).locator('input').first().click();
  await page.keyboard.type('B-value');
  await expect(blocks.nth(0).locator('input').first()).toHaveValue('A-value');
  await expect(blocks.nth(1).locator('input').first()).toHaveValue('B-value');
});

test('6. a11y axe scan on tabs schema → no violations', async ({ page }) => {
  await page.getByTestId('insert-tabs').click();
  await page.locator('[data-type="form-js-block"] .dc-tabs').waitFor({ state: 'visible' });
  const results = await new AxeBuilder({ page })
    .include('[data-type="form-js-block"]')
    .analyze();
  expect(results.violations).toEqual([]);
});
