import { test, expect } from '@playwright/test';

function paletteItem(page: import('@playwright/test').Page, fieldType: string) {
  return page.locator(`.fjs-palette-field[data-field-type="${fieldType}"]`).first();
}

async function dropToCanvas(page: import('@playwright/test').Page, fieldType: string) {
  const item = paletteItem(page, fieldType);
  await expect(item).toBeVisible({ timeout: 10000 });
  const canvas = page.locator('.fjs-empty-editor-card, .fjs-editor-container, .fjs-drop-container-vertical').first();
  await expect(canvas).toBeVisible({ timeout: 10000 });
  const paletteBox = await item.boundingBox();
  const canvasBox = await canvas.boundingBox();
  if (!paletteBox || !canvasBox) throw new Error(`boundingBox unavailable`);
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

test('debug: shift-click selection state check', async ({ page }) => {
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[browser error]', msg.text());
    else console.log('[browser]', msg.text());
  });

  await page.goto('/');
  await page.waitForSelector('[data-testid="editor-root"]', { timeout: 15000 });
  await page.waitForSelector('.fjs-palette', { timeout: 15000 });

  await dropToCanvas(page, 'button');
  await dropToCanvas(page, 'button');

  const outlineNodes = page.locator('[data-outline-id]:not([data-outline-id="__outline_root__"])');
  const count = await outlineNodes.count();
  console.log('Node count after drop:', count);

  // Check what the outline nodes actually are
  const nodeInfo = await page.evaluate(() => {
    const nodes = document.querySelectorAll('[data-outline-id]:not([data-outline-id="__outline_root__"])');
    return Array.from(nodes).map(n => ({
      tagName: n.tagName,
      id: n.getAttribute('data-outline-id'),
      classes: n.className,
    }));
  });
  console.log('Node elements:', JSON.stringify(nodeInfo, null, 2));

  // Click first node
  await outlineNodes.first().click();
  await page.waitForTimeout(200);

  const afterFirstClick = await page.evaluate(() => {
    const nodes = document.querySelectorAll('[data-outline-id]:not([data-outline-id="__outline_root__"])');
    return Array.from(nodes).map(n => ({
      id: n.getAttribute('data-outline-id'),
      classes: n.className,
      multiSelected: n.getAttribute('data-outline-multi-selected'),
    }));
  });
  console.log('After first click:', JSON.stringify(afterFirstClick));

  // Shift-click second node - using click with modifier
  await outlineNodes.nth(1).click({ modifiers: ['Shift'] });
  await page.waitForTimeout(300);

  const afterShiftClick = await page.evaluate(() => {
    const nodes = document.querySelectorAll('[data-outline-id]:not([data-outline-id="__outline_root__"])');
    return Array.from(nodes).map(n => ({
      id: n.getAttribute('data-outline-id'),
      classes: n.className,
      multiSelected: n.getAttribute('data-outline-multi-selected'),
    }));
  });
  console.log('After shift-click:', JSON.stringify(afterShiftClick));

  // Check how many have 'selected' class or multi-selected attribute
  const selectedInOutline = (afterShiftClick as Array<{classes: string}> ).filter(n => n.classes.includes('selected')).length;
  const multiSelectedInCanvas = (afterShiftClick as Array<{multiSelected: string | null}>).filter(n => n.multiSelected === 'true').length;
  console.log('selected in outline:', selectedInOutline, 'multi-selected in canvas:', multiSelectedInCanvas);

  // Press Delete
  await page.keyboard.press('Delete');
  await page.waitForTimeout(500);

  const afterDelete = await page.evaluate(() => {
    const nodes = document.querySelectorAll('[data-outline-id]:not([data-outline-id="__outline_root__"])');
    return nodes.length;
  });
  console.log('Node count after Delete:', afterDelete);

  // Just check that we understand the state
  expect(count).toBeGreaterThan(0);
  console.log('Initial count was:', count, 'after delete:', afterDelete);
});
