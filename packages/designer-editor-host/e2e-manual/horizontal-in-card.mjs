// Verify horizontal placement INSIDE a Card container
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

const browser = await chromium.launch({ headless: false, slowMo: 30 });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto('http://localhost:5173/');
await page.waitForSelector('.fjs-palette', { timeout: 15000 });
await page.waitForTimeout(400);

// 1. drop a 카드 at root
const rootDrop = await page.evaluate(() => {
  const d = document.querySelector('.fjs-drop-container-vertical');
  const r = d.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + 40 };
});
console.log('[1] drop 카드 at root');
await dragFromPaletteToXY(page, '카드', rootDrop.x, rootDrop.y);

// 2. drop first 버튼 INSIDE card body
const cardBodyPoint = await page.evaluate(() => {
  const body = document.querySelector('.dc-card__body > .fjs-drop-container-vertical, .dc-card__body .fjs-children');
  if (!body) return null;
  const r = body.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
console.log('card body drop point:', cardBodyPoint);
if (!cardBodyPoint) { console.log('[ERR] card body not found'); await browser.close(); process.exit(1); }
console.log('[2] drop 버튼 inside card');
await dragFromPaletteToXY(page, '버튼', cardBodyPoint.x, cardBodyPoint.y);

// snapshot DOM after first drop
const afterDrop1 = await page.evaluate(() => {
  const card = document.querySelector('.dc-card');
  return {
    cardInner: card?.outerHTML?.slice(0, 1500),
    buttons: Array.from(document.querySelectorAll('.fjs-element[data-field-type="button"]')).map((e) => ({
      parentPath: e.closest('.dc-card') ? 'inside-card' : 'outside-card',
      rect: e.getBoundingClientRect().toJSON(),
    })),
  };
});
console.log('after drop 1:', JSON.stringify(afterDrop1, null, 2));

// 3. drop second 버튼 to the RIGHT of first button (inside card)
const firstBtn = await page.evaluate(() => {
  const el = document.querySelector('.dc-card__body .fjs-element[data-field-type="button"]');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.right - 8, y: r.y + r.height / 2 };
});
console.log('first btn inside card:', firstBtn);
console.log('[3] drop second 버튼 to RIGHT edge of first (inside card)');
await dragFromPaletteToXY(page, '버튼', firstBtn.x, firstBtn.y);

// analyze
const analysis = await page.evaluate(() => {
  const cardBody = document.querySelector('.dc-card__body');
  if (!cardBody) return null;
  const rows = Array.from(cardBody.querySelectorAll('.fjs-layout-row'));
  return rows.map((r) => {
    const cols = Array.from(r.querySelectorAll('.cds--col'));
    return {
      colCount: cols.length,
      colWidths: cols.map((c) => Math.round(c.getBoundingClientRect().width)),
      firstColY: cols[0]?.getBoundingClientRect().y,
      lastColY: cols[cols.length - 1]?.getBoundingClientRect().y,
    };
  });
});
console.log('rows inside card:', JSON.stringify(analysis, null, 2));

await page.screenshot({ path: 'e2e-manual/horizontal-in-card.png', fullPage: true });
await page.waitForTimeout(1500);
await browser.close();
