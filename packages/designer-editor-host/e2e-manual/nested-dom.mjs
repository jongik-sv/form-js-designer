// Inspect DOM of button nested inside card
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
  await page.waitForTimeout(200);
  await page.mouse.up();
  await page.waitForTimeout(500);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));

  await page.goto('http://localhost:5173/');
  await page.waitForSelector('.fjs-palette', { timeout: 15000 });
  await page.waitForTimeout(400);

  await dragTo(page, '카드', '.fjs-drop-container-vertical');
  await dragTo(page, '버튼', '[data-component="card"] .fjs-drop-container-vertical');

  const dump = await page.evaluate(() => {
    const card = document.querySelector('[data-component="card"]');
    const root = card?.closest('.fjs-element[data-field-type="card"]') ?? card;
    if (!root) return 'no card';
    function d(el, depth) {
      if (depth > 12) return '';
      const pad = '  '.repeat(depth);
      const tag = el.tagName?.toLowerCase() || '#';
      const cls = el.className && typeof el.className === 'string'
        ? '.' + el.className.split(/\s+/).filter(Boolean).slice(0, 4).join('.')
        : '';
      const attrs = [];
      if (el.getAttribute) {
        for (const a of ['data-id', 'data-field-type', 'data-component']) {
          const v = el.getAttribute(a);
          if (v) attrs.push(`${a}="${v}"`);
        }
      }
      let out = `${pad}${tag}${cls}${attrs.length ? ' ' + attrs.join(' ') : ''}\n`;
      for (const c of el.children || []) out += d(c, depth + 1);
      return out;
    }
    return d(root, 0);
  });
  console.log(dump);

  const schema = await page.evaluate(() => JSON.parse(JSON.stringify(window.__editor?.getSchema?.())));
  console.log('schema:', JSON.stringify(schema, null, 2));

  await browser.close();
}

main().catch(console.error);
