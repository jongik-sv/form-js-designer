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

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto('http://localhost:5173/');
await page.waitForSelector('.fjs-palette', { timeout: 15000 });
await page.waitForTimeout(400);

const rootDrop = await page.evaluate(() => {
  const d = document.querySelector('.fjs-drop-container-vertical');
  const r = d.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + 40 };
});
await dragFromPaletteToXY(page, '카드', rootDrop.x, rootDrop.y);

const state = await page.evaluate(() => {
  const card = document.querySelector('.dc-card');
  if (!card) return { err: 'no card' };
  const body = card.querySelector('.dc-card__body');
  const dropZones = Array.from(card.querySelectorAll('.fjs-drop-container-vertical, [class*="fjs-children"]')).map((el) => ({
    classes: el.className,
    bbox: el.getBoundingClientRect().toJSON(),
  }));
  return {
    cardRect: card.getBoundingClientRect().toJSON(),
    bodyExists: !!body,
    bodyClasses: body?.className,
    bodyInner: body?.innerHTML?.slice(0, 500),
    dropZones,
  };
});
console.log(JSON.stringify(state, null, 2));
await page.screenshot({ path: 'e2e-manual/card-probe.png', fullPage: true });
await browser.close();
