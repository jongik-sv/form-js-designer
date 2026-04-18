// Smoke test: drag 3 different components and verify schema grows.
import { chromium } from '@playwright/test';

async function dragOne(page, paletteText) {
  const palette = page.locator('.fjs-palette-field', { hasText: paletteText }).first();
  await palette.scrollIntoViewIfNeeded();
  const pb = await palette.boundingBox();
  const tb = await page.evaluate(() => {
    const d = document.querySelector('.fjs-drop-container-vertical');
    const r = d.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + Math.min(60, r.height / 2) };
  });
  await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
  await page.mouse.down();
  await page.mouse.move(pb.x + pb.width / 2 + 30, pb.y + pb.height / 2 + 30, { steps: 10 });
  await page.waitForTimeout(150);
  const steps = 30;
  const sx = pb.x + pb.width / 2 + 30;
  const sy = pb.y + pb.height / 2 + 30;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(sx + ((tb.x - sx) * i) / steps, sy + ((tb.y - sy) * i) / steps);
    await page.waitForTimeout(10);
  }
  await page.waitForTimeout(200);
  await page.mouse.up();
  await page.waitForTimeout(400);
}

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 60 });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));

  await page.goto('http://localhost:5173/');
  await page.waitForSelector('.fjs-palette', { timeout: 15000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(400);

  const targets = ['카드', '스택', '버튼', '테이블'];
  for (const t of targets) {
    await dragOne(page, t);
  }

  const schema = await page.evaluate(() => window.__editor?.getSchema?.());
  console.log('> final schema components:');
  for (const c of schema?.components || []) {
    console.log(`  - type=${c.type} id=${c.id}`);
  }
  await page.screenshot({ path: 'e2e-manual/smoke-multi.png', fullPage: true });
  await page.waitForTimeout(1500);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
