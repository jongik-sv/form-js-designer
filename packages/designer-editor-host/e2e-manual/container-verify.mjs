// Verify container contract fix:
// 1) Card/Stack placed, clickable and highlighted in properties panel
// 2) Can drop a button INSIDE a card (schema card.components[0].type === 'button')
// 3) Two buttons side-by-side => single fjs-layout-row with 2 cds--col
import { chromium } from '@playwright/test';

async function dragFromPaletteToTarget(page, paletteText, targetSelector) {
  const palette = page.locator('.fjs-palette-field', { hasText: paletteText }).first();
  await palette.scrollIntoViewIfNeeded();
  const pb = await palette.boundingBox();

  // Resolve fresh drop target
  const tb = await page.evaluate((sel) => {
    const els = Array.from(document.querySelectorAll(sel));
    const target = els[els.length - 1]; // last = most specific (e.g. inside card)
    if (!target) return null;
    const r = target.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + Math.min(40, r.height / 2 || 20), w: r.width, h: r.height };
  }, targetSelector);
  if (!tb) throw new Error(`drop target not found: ${targetSelector}`);

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
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('[error]', m.text());
  });

  await page.goto('http://localhost:5173/');
  await page.waitForSelector('.fjs-palette', { timeout: 15000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(400);

  // 1) place a Card at root
  console.log('\n## Step 1: drop 카드 at root');
  await dragFromPaletteToTarget(page, '카드', '.fjs-drop-container-vertical');
  let schema = await page.evaluate(() => window.__editor?.getSchema?.());
  console.log('root.components[0].type =', schema?.components?.[0]?.type);

  // 2) click the card to select it
  console.log('\n## Step 2: click the card');
  const cardEl = await page.evaluate(() => {
    const el = document.querySelector('[data-component="card"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + 10, w: r.width, h: r.height };
  });
  console.log('card rect:', cardEl);
  if (cardEl) {
    await page.mouse.click(cardEl.x, cardEl.y);
    await page.waitForTimeout(300);
    const propertiesTitle = await page.evaluate(() => {
      const titleEl = document.querySelector('.fjs-properties-panel .bio-properties-panel-header-type, .bio-properties-panel-header-label');
      return titleEl?.textContent;
    });
    console.log('properties panel header:', propertiesTitle);
  }

  // 3) drop a button INSIDE the card
  console.log('\n## Step 3: drop 버튼 inside the card');
  // target: the .fjs-children INSIDE the card (the most-nested drop zone)
  await dragFromPaletteToTarget(page, '버튼', '[data-component="card"] .fjs-drop-container-vertical');
  schema = await page.evaluate(() => window.__editor?.getSchema?.());
  const card = schema?.components?.find((c) => c.type === 'card');
  console.log('card.components =', JSON.stringify(card?.components, null, 2));

  // 4) drop a second button at root to sit beside the card (horizontal test)
  console.log('\n## Step 4: drop 버튼 next to card (same row)');
  const cardRightEdge = await page.evaluate(() => {
    const el = document.querySelector('[data-component="card"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.right - 5, y: r.y + r.height / 2 };
  });
  // drag button from palette to cardRightEdge
  if (cardRightEdge) {
    const palette = page.locator('.fjs-palette-field', { hasText: '버튼' }).first();
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
      await page.mouse.move(
        sx + ((cardRightEdge.x - sx) * i) / steps,
        sy + ((cardRightEdge.y - sy) * i) / steps,
      );
      await page.waitForTimeout(8);
    }
    await page.waitForTimeout(200);
    await page.mouse.up();
    await page.waitForTimeout(500);
  }
  const rows = await page.evaluate(() => {
    const rootCh = document.querySelector('.fjs-form > .fjs-element > .fjs-drop-container-vertical');
    if (!rootCh) return null;
    const rs = Array.from(rootCh.querySelectorAll(':scope > .fjs-layout-row'));
    return rs.map((r) => ({
      childCount: r.querySelectorAll(':scope > .fjs-layout-column, :scope > [class*="cds--col"], :scope > *').length,
      childClasses: Array.from(r.children).map((c) => c.className).slice(0, 4),
    }));
  });
  console.log('rows after horizontal drop:', JSON.stringify(rows, null, 2));

  schema = await page.evaluate(() => window.__editor?.getSchema?.());
  console.log('\n## Final schema components summary:');
  for (const c of schema?.components || []) {
    console.log(`  - type=${c.type} children=${(c.components || []).map((x) => x.type).join(',') || '(none)'}`);
  }

  await page.screenshot({ path: 'e2e-manual/container-verify.png', fullPage: true });
  await page.waitForTimeout(3000);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
