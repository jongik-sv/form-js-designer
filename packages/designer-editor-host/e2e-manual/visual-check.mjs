// Visible browser visual check for drag/drop.
// Usage: node e2e-manual/visual-check.mjs
import { chromium } from '@playwright/test';

const URL = 'http://localhost:5173/';

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

  page.on('console', (msg) => {
    const t = msg.type();
    if (t === 'error' || t === 'warning') {
      console.log(`[browser ${t}] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => console.log('[browser pageerror]', err.message));

  console.log('> goto', URL);
  await page.goto(URL);

  await page.waitForSelector('[data-testid="editor-root"]', { timeout: 15000 });
  await page.waitForSelector('.fjs-palette', { timeout: 15000 });
  console.log('> palette loaded');

  // list palette items
  const items = await page.$$eval('.fjs-palette-field', (els) =>
    els.map((e) => ({
      label: e.textContent?.trim(),
      type: e.getAttribute('data-field-type') || e.getAttribute('data-type'),
    })),
  );
  console.log('> palette items:', JSON.stringify(items, null, 2));

  // before drop — probe DOM
  const before = await page.$$eval('.fjs-element', (els) => els.length);
  console.log('> before drop: fjs-element count =', before);

  // dump DOM tree under editor
  const dom = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="editor-root"]');
    if (!root) return null;
    function dump(el, depth) {
      if (depth > 10) return '';
      const pad = '  '.repeat(depth);
      const tag = el.tagName?.toLowerCase() || '#text';
      const cls = el.className && typeof el.className === 'string' ? '.' + el.className.split(/\s+/).join('.') : '';
      const r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      const box = r ? ` [${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}]` : '';
      let out = `${pad}${tag}${cls}${box}\n`;
      for (const c of el.children || []) out += dump(c, depth + 1);
      return out;
    }
    return dump(root, 0);
  });
  console.log('> editor DOM:\n' + dom);

  const dropInfo = await page.evaluate(() => {
    const verticals = Array.from(document.querySelectorAll('.fjs-drop-container-vertical'));
    const emptyCard = document.querySelector('.fjs-empty-editor-card');
    return {
      verticalCount: verticals.length,
      verticalBoxes: verticals.map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height, cls: el.className };
      }),
      emptyCardBox: emptyCard ? (() => {
        const r = emptyCard.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      })() : null,
    };
  });
  console.log('> drop containers:', JSON.stringify(dropInfo, null, 2));

  // attempt drag: card palette item -> canvas (Korean label)
  const palette = page.locator('.fjs-palette-field', { hasText: '카드' }).first();
  await palette.scrollIntoViewIfNeeded();
  // Prefer the empty-editor-card when the form is empty, since the drop
  // container is 0-height and won't accept drops without a visible target.
  const canvas = page
    .locator('.fjs-empty-editor-card, .fjs-drop-container-vertical, .fjs-editor-container')
    .first();
  const pb = await palette.boundingBox();
  const cb = await canvas.boundingBox();
  console.log('> palette box', pb, 'canvas box', cb);

  if (pb && cb) {
    await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
    await page.mouse.down();
    // tiny wiggle to trigger drag start
    await page.mouse.move(pb.x + pb.width / 2 + 5, pb.y + pb.height / 2 + 5, { steps: 5 });
    await page.waitForTimeout(100);
    // move gradually toward canvas so dragula sees over events
    await page.mouse.move(cb.x + cb.width / 2, cb.y + 200, { steps: 30 });
    await page.waitForTimeout(200);
    // probe drop container during drag
    const duringDrag = await page.evaluate(() => {
      const v = document.querySelector('.fjs-drop-container-vertical');
      const r = v?.getBoundingClientRect();
      return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null;
    });
    console.log('> during drag: drop-container-vertical =', duringDrag);
    // aim for the top edge of the 0-height drop container (empty form case)
    if (duringDrag) {
      await page.mouse.move(
        duringDrag.x + duringDrag.w / 2,
        duringDrag.y + 1,
        { steps: 20 },
      );
    }
    await page.waitForTimeout(300);
    await page.mouse.up();
    await page.waitForTimeout(800);
  }

  const after = await page.$$eval('.fjs-element', (els) =>
    els.map((e) => ({
      type: e.getAttribute('data-field-type') || e.className,
      id: e.getAttribute('data-element-id'),
    })),
  );
  console.log('> after drop: fjs-element =', JSON.stringify(after, null, 2));

  // screenshot
  await page.screenshot({ path: 'e2e-manual/visual-check.png', fullPage: true });
  console.log('> screenshot saved to e2e-manual/visual-check.png');

  // keep open so user can visually verify
  console.log('> Browser stays open 8s — inspect manually…');
  await page.waitForTimeout(8000);

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
