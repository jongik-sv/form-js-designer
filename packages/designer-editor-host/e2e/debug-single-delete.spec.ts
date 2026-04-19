import { test, expect } from '@playwright/test';

function paletteItem(page: import('@playwright/test').Page, fieldType: string) {
  return page.locator(`.fjs-palette-field[data-field-type="${fieldType}"]`).first();
}

async function dropToCanvas(page: import('@playwright/test').Page, fieldType: string) {
  const item = paletteItem(page, fieldType);
  await expect(item).toBeVisible({ timeout: 10000 });
  await item.scrollIntoViewIfNeeded();
  const canvas = page.locator('.fjs-empty-editor-card, .fjs-editor-container, .fjs-drop-container-vertical').first();
  await expect(canvas).toBeVisible({ timeout: 10000 });
  const paletteBox = await item.boundingBox();
  const canvasBox = await canvas.boundingBox();
  if (!paletteBox || !canvasBox) throw new Error('boundingBox unavailable');
  const beforeCount = await page.locator('[data-outline-id]:not([data-outline-id="__outline_root__"])').count();
  await page.mouse.move(paletteBox.x + paletteBox.width / 2, paletteBox.y + paletteBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2, { steps: 10 });
  await page.mouse.up();
  await page.waitForFunction(
    (expected: number) => {
      const nodes = document.querySelectorAll('[data-outline-id]:not([data-outline-id="__outline_root__"])');
      return nodes.length > expected;
    },
    beforeCount,
    { timeout: 5000 },
  ).catch(() => page.waitForTimeout(500));
}

test('single delete via outline click then Delete', async ({ page }) => {
  page.on('console', msg => console.log('[browser]', msg.text()));

  await page.goto('/');
  await page.waitForSelector('[data-testid="editor-root"]', { timeout: 15000 });
  await page.waitForSelector('.fjs-palette', { timeout: 15000 });

  await dropToCanvas(page, 'button');
  await dropToCanvas(page, 'button');

  const outlineNodes = page.locator('[data-outline-id]:not([data-outline-id="__outline_root__"])');
  const count = await outlineNodes.count();
  console.log('Node count:', count);

  // Click first node (single select)
  await outlineNodes.first().click();
  await page.waitForTimeout(300);

  // Debug: what's focused and what's selected
  const beforeState = await page.evaluate(() => ({
    selected: Array.from(document.querySelectorAll('[data-outline-id]:not([data-outline-id="__outline_root__"])')).filter(n => (n as HTMLElement).className.includes('selected')).map(n => n.getAttribute('data-outline-id')),
    focused: `${document.activeElement?.tagName}.${document.activeElement?.className}`,
  }));
  console.log('Before single delete:', JSON.stringify(beforeState));

  // Press Delete
  await page.keyboard.press('Delete');
  await page.waitForTimeout(500);

  const afterCount = await outlineNodes.count();
  console.log('After single delete count:', afterCount);

  expect(afterCount).toBeLessThan(count);
});
