// Compare: vanilla form-js editor (no custom modules) drag/drop behavior.
import { chromium } from '@playwright/test';

const URL = 'http://localhost:5173/vanilla.html';

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

  page.on('pageerror', (err) => console.log('[pageerror]', err.message));

  await page.goto(URL);
  await page.waitForSelector('.fjs-palette', { timeout: 15000 });
  console.log('> vanilla form-js loaded');

  const beforeDom = await page.evaluate(() => {
    const v = document.querySelector('.fjs-drop-container-vertical');
    const rV = v?.getBoundingClientRect();
    const el = document.querySelector('.fjs-element');
    const rE = el?.getBoundingClientRect();
    const formContainer = document.querySelector('.fjs-form-container');
    const rF = formContainer?.getBoundingClientRect();
    return {
      dropContainer: rV ? { x: rV.x, y: rV.y, w: rV.width, h: rV.height } : null,
      rootElement: rE ? { x: rE.x, y: rE.y, w: rE.width, h: rE.height } : null,
      formContainer: rF ? { x: rF.x, y: rF.y, w: rF.width, h: rF.height } : null,
    };
  });
  console.log('> before drag:', JSON.stringify(beforeDom, null, 2));

  // Pick first palette item
  const palette = page.locator('.fjs-palette-field').first();
  await palette.scrollIntoViewIfNeeded();
  const pb = await palette.boundingBox();
  console.log('> palette box', pb);

  await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
  await page.mouse.down();
  await page.mouse.move(pb.x + 10, pb.y + 10, { steps: 3 });
  await page.waitForTimeout(100);

  // aim at center of form container
  const fb = beforeDom.formContainer;
  await page.mouse.move(fb.x + fb.w / 2, fb.y + 200, { steps: 20 });
  await page.waitForTimeout(300);

  const duringDom = await page.evaluate(() => {
    const v = document.querySelector('.fjs-drop-container-vertical');
    const rV = v?.getBoundingClientRect();
    return {
      dropContainer: rV ? { x: rV.x, y: rV.y, w: rV.width, h: rV.height } : null,
      grabbing: document.body.classList.contains('fjs-cursor-grabbing'),
    };
  });
  console.log('> during drag:', JSON.stringify(duringDom, null, 2));

  // aim deeper
  await page.mouse.move(fb.x + fb.w / 2, fb.y + fb.h / 2, { steps: 10 });
  await page.waitForTimeout(200);
  await page.mouse.up();
  await page.waitForTimeout(500);

  const schema = await page.evaluate(() => {
    const ed = window.__editor;
    return ed?.getSchema ? ed.getSchema() : null;
  });
  console.log('> schema after drop:', JSON.stringify(schema, null, 2));

  await page.screenshot({ path: 'e2e-manual/vanilla.png', fullPage: true });
  console.log('> screenshot saved');

  await page.waitForTimeout(3000);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
