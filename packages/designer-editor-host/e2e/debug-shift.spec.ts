import { test, expect } from '@playwright/test';

async function dropToCanvas(page: any, type: string) {
  const palette = page.locator(`.fjs-palette [data-field-type="${type}"]`).first();
  await palette.waitFor({ state: 'visible', timeout: 5000 });
  const canvas = page.locator('.fjs-editor-container').first();
  await canvas.waitFor({ state: 'visible', timeout: 5000 });
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('canvas not found');
  await palette.dragTo(canvas, {
    targetPosition: { x: canvasBox.width / 2, y: canvasBox.height / 2 },
    force: true,
  });
  await page.waitForTimeout(300);
}

test('debug shift-click delete', async ({ page }) => {
  const consoleLogs: string[] = [];
  page.on('console', msg => consoleLogs.push(msg.text()));

  await page.goto('/');
  await page.waitForSelector('[data-testid="editor-root"]', { timeout: 15000 });
  await page.waitForSelector('.fjs-palette', { timeout: 15000 });

  await dropToCanvas(page, 'button');
  await dropToCanvas(page, 'button');

  const outlineNodes = page.locator('[data-outline-id]:not([data-outline-id="__outline_root__"])');

  const first = outlineNodes.first();
  const second = outlineNodes.nth(1);

  await first.click();
  await page.waitForTimeout(300);
  await second.click({ modifiers: ['Shift'] });
  await page.waitForTimeout(300);

  // Check aria-selected
  const firstAria = await first.getAttribute('aria-selected');
  const secondAria = await second.getAttribute('aria-selected');
  console.log('aria states:', firstAria, secondAria);

  // Check active element
  const activeTag = await page.evaluate(() => document.activeElement?.tagName + ' ' + document.activeElement?.className);
  console.log('Active element before delete:', activeTag);

  // Inject debug code to check multiIds
  const debugResult = await page.evaluate(() => {
    // Try to find the outlinePanel via the global formEditor
    const win = window as any;
    if (win.__formEditor) {
      const outlinePanel = win.__formEditor.get('outlinePanel', false);
      if (outlinePanel) {
        const ids = outlinePanel.getSelectedIds?.();
        return JSON.stringify({ ids, count: ids?.length });
      }
    }
    return 'no formEditor';
  });
  console.log('Selected IDs debug:', debugResult);

  // Add keydown listener to see what happens
  await page.evaluate(() => {
    document.addEventListener('keydown', (e) => {
      console.log('KEYDOWN:', e.key, 'target:', (e.target as HTMLElement)?.tagName, (e.target as HTMLElement)?.className, 'isEditable:', e.target instanceof HTMLInputElement);
    }, { capture: true, once: false });
  });

  await page.keyboard.press('Delete');
  await page.waitForTimeout(500);

  const afterCount = await outlineNodes.count();
  console.log('After delete count:', afterCount);
  
  for (const log of consoleLogs) {
    console.log('[browser]', log);
  }
});
