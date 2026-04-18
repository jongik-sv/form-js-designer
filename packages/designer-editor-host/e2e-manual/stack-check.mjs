// Drop a stack then drop a button inside it to verify Stack renders + accepts children.
import { chromium } from '@playwright/test';

async function dragTo(page, paletteText, targetSel) {
  const palette = page.locator('.fjs-palette-field', { hasText: paletteText }).first();
  await palette.scrollIntoViewIfNeeded();
  const pb = await palette.boundingBox();
  const tb = await page.evaluate((s) => {
    const els = Array.from(document.querySelectorAll(s));
    const t = els[els.length - 1];
    if (!t) return null;
    const r = t.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + Math.min(30, r.height / 2 || 10) };
  }, targetSel);
  if (!tb) throw new Error(`no target: ${targetSel}`);
  await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
  await page.mouse.down();
  await page.mouse.move(pb.x + pb.width / 2 + 25, pb.y + pb.height / 2 + 25, { steps: 10 });
  await page.waitForTimeout(150);
  const steps = 30;
  const sx = pb.x + pb.width / 2 + 25;
  const sy = pb.y + pb.height / 2 + 25;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(sx + ((tb.x - sx) * i) / steps, sy + ((tb.y - sy) * i) / steps);
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

  console.log('[1] drop 스택 at root');
  await dragTo(page, '스택', '.fjs-drop-container-vertical');

  console.log('[2] drop 카드 inside stack');
  await dragTo(page, '카드', '[data-component="stack"] .fjs-drop-container-vertical');

  console.log('[3] drop 버튼 inside the nested card');
  await dragTo(page, '버튼', '[data-component="card"] .fjs-drop-container-vertical');

  const schema = await page.evaluate(() => JSON.parse(JSON.stringify(window.__editor?.getSchema?.() ?? {})));
  console.log('schema:', JSON.stringify(schema, null, 2));

  await page.screenshot({ path: 'e2e-manual/stack-check.png', fullPage: true });
  await page.waitForTimeout(2000);
  await browser.close();
}

main().catch(console.error);
