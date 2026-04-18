// Real-world drag test: initiate drag, verify dragula state, then drop.
import { chromium } from '@playwright/test';

async function main() {
  const url = process.argv[2] || 'http://localhost:5173/';
  const paletteText = process.argv[3] || '카드'; // '카드' for designer app; leave default for vanilla
  const browser = await chromium.launch({ headless: false, slowMo: 80 });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning' || m.type() === 'log') console.log(`[${m.type()}]`, m.text());
  });

  await page.goto(url);
  await page.waitForSelector('.fjs-palette', { timeout: 15000 });
  // ensure HMR / first-render settled
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(500);

  // pick palette item
  let palette;
  if (url.endsWith('vanilla.html')) {
    palette = page.locator('.fjs-palette-field').first();
  } else {
    palette = page.locator('.fjs-palette-field', { hasText: paletteText }).first();
  }
  await palette.scrollIntoViewIfNeeded();
  const pb = await palette.boundingBox();
  console.log('> palette box', pb);

  // mousedown on palette item
  await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
  console.log('> element at pointer:', await page.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x, y);
    return el ? { tag: el.tagName, class: el.className } : null;
  }, [pb.x + pb.width / 2, pb.y + pb.height / 2]));
  await page.mouse.down();
  // slide > threshold
  await page.mouse.move(pb.x + pb.width / 2 + 20, pb.y + pb.height / 2 + 20, { steps: 10 });
  await page.waitForTimeout(200);

  const midState = await page.evaluate(() => ({
    grabbing: document.body.classList.contains('fjs-cursor-grabbing'),
    mirrorCount: document.querySelectorAll('.gu-mirror').length,
  }));
  console.log('> after mousedown + small move:', midState);

  // Now target the form drop container.
  const dropTarget = await page.evaluate(() => {
    const el = document.querySelector('.fjs-element'); // form root element
    const r = el?.getBoundingClientRect();
    return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null;
  });
  console.log('> drop target (fjs-element):', dropTarget);

  // move in small increments toward target center
  const target = { x: dropTarget.x + dropTarget.w / 2, y: dropTarget.y + Math.min(100, dropTarget.h - 10) };
  const N = 30;
  const sx = pb.x + pb.width / 2 + 20;
  const sy = pb.y + pb.height / 2 + 20;
  for (let i = 1; i <= N; i++) {
    await page.mouse.move(sx + ((target.x - sx) * i) / N, sy + ((target.y - sy) * i) / N);
    await page.waitForTimeout(15);
  }
  await page.waitForTimeout(200);

  const midState2 = await page.evaluate(() => {
    const ee = document.querySelector('.fjs-empty-editor');
    const fe = document.querySelector('.fjs-element');
    const dropV = document.querySelector('.fjs-drop-container-vertical');
    return {
      grabbing: document.body.classList.contains('fjs-cursor-grabbing'),
      mirrorClass: document.querySelector('.gu-mirror')?.className,
      dropRect: dropV ? (() => {
        const r = dropV.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      })() : null,
      emptyDisplay: ee ? getComputedStyle(ee).display : null,
      rootElementRect: fe ? (() => {
        const r = fe.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      })() : null,
      transit: document.querySelectorAll('.gu-transit').length,
      // What element is actually under the cursor center?
      elFromPoint: (() => {
        const d = dropV?.getBoundingClientRect();
        if (!d) return null;
        const cx = d.x + d.width / 2;
        const cy = d.y + 100;
        const el = document.elementFromPoint(cx, cy);
        return el ? { tag: el.tagName, class: el.className, cx, cy } : { cx, cy, el: null };
      })(),
    };
  });
  console.log('> after move to target:', JSON.stringify(midState2));

  // drop
  await page.mouse.up();
  await page.waitForTimeout(600);

  // evaluate schema
  const schema = await page.evaluate(() => {
    const ed = window.__editor;
    if (ed?.getSchema) return ed.getSchema();
    const root = document.querySelector('[data-element-id]');
    return root?.dataset?.elementId;
  });
  console.log('> schema/root:', JSON.stringify(schema, null, 2));

  const after = await page.$$eval('.fjs-element', (els) =>
    els.map((e) => e.getAttribute('data-field-type')),
  );
  console.log('> fjs-element data-field-type after drop:', after);

  await page.screenshot({ path: 'e2e-manual/real-drag.png', fullPage: true });
  await page.waitForTimeout(2000);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
