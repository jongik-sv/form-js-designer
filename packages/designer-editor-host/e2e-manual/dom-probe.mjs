// Probe DOM structure after dropping a card to check data-id wrapper
import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));

  await page.goto('http://localhost:5173/');
  await page.waitForSelector('.fjs-palette', { timeout: 15000 });
  await page.waitForTimeout(400);

  // Drop card to root
  const palette = page.locator('.fjs-palette-field', { hasText: '카드' }).first();
  await palette.scrollIntoViewIfNeeded();
  const pb = await palette.boundingBox();
  const tb = await page.evaluate(() => {
    const d = document.querySelector('.fjs-drop-container-vertical');
    const r = d.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + 40 };
  });
  await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
  await page.mouse.down();
  await page.mouse.move(pb.x + pb.width / 2 + 25, pb.y + pb.height / 2 + 25, { steps: 10 });
  await page.waitForTimeout(150);
  const steps = 30;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(pb.x + pb.width / 2 + ((tb.x - pb.x - pb.width / 2) * i) / steps, pb.y + pb.height / 2 + ((tb.y - pb.y - pb.height / 2) * i) / steps);
    await page.waitForTimeout(8);
  }
  await page.waitForTimeout(200);
  await page.mouse.up();
  await page.waitForTimeout(500);

  const dom = await page.evaluate(() => {
    const root = document.querySelector('.fjs-form');
    if (!root) return 'no form';
    function dump(el, depth) {
      if (depth > 10) return '';
      const pad = '  '.repeat(depth);
      const tag = el.tagName?.toLowerCase() || '#text';
      const cls = el.className && typeof el.className === 'string' ? '.' + el.className.split(/\s+/).filter(Boolean).join('.') : '';
      const id = el.getAttribute?.('id') ? '#' + el.id : '';
      const dataId = el.getAttribute?.('data-id') ? ` data-id="${el.dataset.id}"` : '';
      const dataType = el.getAttribute?.('data-field-type') ? ` data-field-type="${el.dataset.fieldType}"` : '';
      const dataCom = el.getAttribute?.('data-component') ? ` data-component="${el.dataset.component}"` : '';
      let out = `${pad}${tag}${cls}${id}${dataId}${dataType}${dataCom}\n`;
      for (const c of el.children || []) out += dump(c, depth + 1);
      return out;
    }
    return dump(root, 0);
  });
  console.log(dom);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
