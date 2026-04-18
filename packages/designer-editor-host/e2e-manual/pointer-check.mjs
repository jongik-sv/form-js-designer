// Probe whether page.mouse.* triggers pointer events that dragula listens for.
import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

  page.on('console', (m) => console.log(`[browser ${m.type()}]`, m.text()));

  await page.goto('http://localhost:5173/vanilla.html');
  await page.waitForSelector('.fjs-palette', { timeout: 15000 });

  // attach listeners
  await page.evaluate(() => {
    window.__events = [];
    const doc = document.documentElement;
    ['pointerdown', 'pointermove', 'pointerup', 'mousedown', 'mousemove', 'mouseup'].forEach((t) => {
      doc.addEventListener(
        t,
        (e) => window.__events.push({ t, x: e.clientX, y: e.clientY, buttons: e.buttons, target: e.target?.className }),
        true,
      );
    });
  });

  const palette = page.locator('.fjs-palette-field').first();
  const pb = await palette.boundingBox();
  console.log('> palette', pb);

  await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
  await page.mouse.down();
  await page.mouse.move(pb.x + pb.width / 2 + 30, pb.y + pb.height / 2 + 30, { steps: 5 });
  await page.mouse.move(pb.x + 500, pb.y + 100, { steps: 20 });
  await page.waitForTimeout(200);

  const events = await page.evaluate(() => window.__events);
  console.log('> events (count):', events.length);
  const byType = events.reduce((a, e) => ({ ...a, [e.t]: (a[e.t] || 0) + 1 }), {});
  console.log('> by type:', byType);
  const grabbing = await page.evaluate(() => document.body.classList.contains('fjs-cursor-grabbing'));
  console.log('> body.fjs-cursor-grabbing:', grabbing);
  const pointerdowns = events.filter((e) => e.t === 'pointerdown');
  console.log('> pointerdown details:', JSON.stringify(pointerdowns, null, 2));

  await page.mouse.up();
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
