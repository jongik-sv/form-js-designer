// Check what formLayouter sees about card's children
import { chromium } from '@playwright/test';

async function dragTo(page, paletteText, targetSel) {
  const palette = page.locator('.fjs-palette-field', { hasText: paletteText }).first();
  await palette.scrollIntoViewIfNeeded();
  const pb = await palette.boundingBox();
  const tb = await page.evaluate((s) => {
    const els = Array.from(document.querySelectorAll(s));
    const t = els[els.length - 1];
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

  const data = await page.evaluate(() => {
    const ed = window.__editor;
    if (!ed) return 'no editor';
    const layouter = ed.get('formLayouter');
    const registry = ed.get('formFieldRegistry');

    const schema = ed.getSchema();
    const card = schema.components[0];
    const cardId = card?.id;

    return {
      cardId,
      cardType: card?.type,
      cardComponents: card?.components?.map((c) => ({ id: c.id, type: c.type, layout: c.layout })),
      layouterRowsForCard: layouter.getRows(cardId),
      layouterAllRows: (() => {
        const rows = [];
        const allRowsFn = layouter.getRows;
        // walk tree
        function walk(id) {
          const rs = layouter.getRows(id);
          rs.forEach((r) => rows.push({ parent: id, ...r }));
        }
        walk(schema.id);
        if (cardId) walk(cardId);
        return rows;
      })(),
      registryHasButton: !!registry.get(card?.components?.[0]?.id),
      registryButton: (() => {
        const b = registry.get(card?.components?.[0]?.id);
        return b ? { id: b.id, type: b.type, layout: b.layout, _parent: b._parent } : null;
      })(),
    };
  });
  console.log(JSON.stringify(data, null, 2));

  await browser.close();
}

main().catch(console.error);
