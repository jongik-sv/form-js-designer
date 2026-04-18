/**
 * brw-verify.mjs — visible browser verification for table-form-js-defaults
 * Playwright headed mode: drag table from palette → drop on canvas → screenshot
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

const browser = await chromium.launch({ headless: false, slowMo: 300 });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  console.log('[brw] Navigating to http://localhost:5173/');
  await page.goto('http://localhost:5173/');
  await page.waitForSelector('[data-testid="editor-root"]', { timeout: 20000 });
  await page.waitForSelector('.fjs-palette', { timeout: 15000 });
  console.log('[brw] Editor loaded');

  // Find palette table item
  const tableItem = page.locator('.fjs-palette-field[data-field-type="table"]').first();
  await tableItem.waitFor({ state: 'visible', timeout: 10000 });
  console.log('[brw] Table palette item found');

  // Find canvas drop zone
  const canvas = page
    .locator('.fjs-empty-editor-card, .fjs-editor-container, .fjs-drop-container-vertical')
    .first();
  await canvas.waitFor({ state: 'visible', timeout: 10000 });

  // Drag & drop
  const paletteBox = await tableItem.boundingBox();
  const canvasBox = await canvas.boundingBox();

  if (!paletteBox || !canvasBox) throw new Error('boundingBox unavailable');

  await page.mouse.move(paletteBox.x + paletteBox.width / 2, paletteBox.y + paletteBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2, { steps: 15 });
  await page.mouse.up();
  console.log('[brw] Drag & drop complete');

  // Wait for table to appear
  await page.waitForTimeout(1000);

  // Verify table element
  const tableEl = page.locator('[data-testid="designer-table"]').first();
  await tableEl.waitFor({ state: 'visible', timeout: 8000 });
  console.log('[brw] Table element visible');

  // Screenshot 1: full page after drop
  const shot1 = join(__dir, 'brw-01-after-drop.png');
  await page.screenshot({ path: shot1, fullPage: false });
  console.log('[brw] Screenshot 1 saved:', shot1);

  // Verify headers
  const thead = tableEl.locator('thead');
  const idHeader = thead.locator('th', { hasText: 'ID' }).first();
  const nameHeader = thead.locator('th', { hasText: 'Name' }).first();
  const dateHeader = thead.locator('th', { hasText: 'Date' }).first();

  await idHeader.waitFor({ state: 'visible', timeout: 5000 });
  await nameHeader.waitFor({ state: 'visible', timeout: 5000 });
  await dateHeader.waitFor({ state: 'visible', timeout: 5000 });
  console.log('[brw] Headers ID/Name/Date all visible');

  // Verify tbody rows
  const rows = tableEl.locator('tbody tr');
  await rows.first().waitFor({ state: 'visible', timeout: 5000 });
  const rowCount = await rows.count();
  console.log('[brw] tbody row count:', rowCount);

  // Verify John Doe
  const firstRow = rows.first();
  await firstRow.locator('text=John Doe').waitFor({ state: 'visible', timeout: 5000 });
  console.log('[brw] John Doe visible in first row');

  // Screenshot 2: zoomed on table
  const tableBox = await tableEl.boundingBox();
  const shot2 = join(__dir, 'brw-02-table-detail.png');
  if (tableBox) {
    await page.screenshot({
      path: shot2,
      clip: {
        x: Math.max(0, tableBox.x - 20),
        y: Math.max(0, tableBox.y - 20),
        width: tableBox.width + 40,
        height: Math.min(tableBox.height + 40, 600),
      },
    });
    console.log('[brw] Screenshot 2 saved:', shot2);
  }

  console.log('[brw] PASS — all assertions verified');
} catch (err) {
  console.error('[brw] FAIL:', err.message);
  const shot = join(__dir, 'brw-error.png');
  await page.screenshot({ path: shot });
  console.log('[brw] Error screenshot:', shot);
  process.exit(1);
} finally {
  await browser.close();
}
