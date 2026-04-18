// Verify horizontal (side-by-side) placement of two components in a single row.
import { chromium } from '@playwright/test';

async function dragFromPaletteToXY(page, paletteText, x, y) {
  const palette = page.locator('.fjs-palette-field', { hasText: paletteText }).first();
  await palette.scrollIntoViewIfNeeded();
  const pb = await palette.boundingBox();
  await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
  await page.mouse.down();
  await page.mouse.move(pb.x + pb.width / 2 + 25, pb.y + pb.height / 2 + 25, { steps: 10 });
  await page.waitForTimeout(150);
  const steps = 30;
  const sx = pb.x + pb.width / 2 + 25;
  const sy = pb.y + pb.height / 2 + 25;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(sx + ((x - sx) * i) / steps, sy + ((y - sy) * i) / steps);
    await page.waitForTimeout(8);
  }
  await page.waitForTimeout(300);
  await page.mouse.up();
  await page.waitForTimeout(500);
}

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 40 });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));

  await page.goto('http://localhost:5173/');
  await page.waitForSelector('.fjs-palette', { timeout: 15000 });
  await page.waitForTimeout(400);

  // drop first button at root
  console.log('[1] drop first 버튼 at root center');
  const rootDrop = await page.evaluate(() => {
    const d = document.querySelector('.fjs-drop-container-vertical');
    const r = d.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + 40 };
  });
  await dragFromPaletteToXY(page, '버튼', rootDrop.x, rootDrop.y);

  // now drop a SECOND button TO THE RIGHT of the first button (targeting the horizontal drop zone)
  console.log('[2] drop second 버튼 to the RIGHT edge of first');
  const firstBtn = await page.evaluate(() => {
    const el = document.querySelector('.fjs-element[data-field-type="button"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.right - 10, y: r.y + r.height / 2, w: r.width, h: r.height };
  });
  console.log('first button rect end:', firstBtn);
  if (firstBtn) {
    await dragFromPaletteToXY(page, '버튼', firstBtn.x, firstBtn.y);
  }

  // check rows
  const analysis = await page.evaluate(() => {
    const rootCh = document.querySelector('.fjs-form > .fjs-element > .fjs-drop-container-vertical');
    if (!rootCh) return null;
    const rows = Array.from(rootCh.querySelectorAll(':scope > div.fjs-drag-row-move, :scope > .fjs-layout-row'));
    return rows.map((r) => {
      const cols = Array.from(r.querySelectorAll('.cds--col'));
      return {
        outerClass: r.className,
        colCount: cols.length,
        colClasses: cols.map((c) => c.className.split(/\s+/).filter((x) => x.startsWith('cds--col')).join(' ')),
        inside: Array.from(r.querySelectorAll('[data-field-type]')).map((e) => e.dataset.fieldType),
      };
    });
  });
  console.log('row analysis:', JSON.stringify(analysis, null, 2));

  await page.screenshot({ path: 'e2e-manual/horizontal.png', fullPage: true });
  await page.waitForTimeout(2000);
  await browser.close();
}

main().catch(console.error);
