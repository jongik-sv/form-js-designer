import { chromium } from '@playwright/test';

const URL = process.env.URL || 'http://localhost:5173/';

const run = async () => {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', (m) => console.log('[console:' + m.type() + ']', m.text()));

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="outline-panel"]', { timeout: 10000 });

  // Drop a few components to produce a deeper tree
  const drag = async (paletteTestId) => {
    const src = page.locator(`[data-testid="palette-item-${paletteTestId}"]`).first();
    const tgt = page.locator('.fjs-drop-container-horizontal, .fjs-children-container, .fjs-container').first();
    await src.dragTo(tgt);
    await page.waitForTimeout(200);
  };
  try { await drag('textfield'); } catch (e) { console.log('drag textfield skip', e.message); }
  try { await drag('checkbox'); } catch (e) { console.log('drag checkbox skip', e.message); }
  try { await drag('textfield'); } catch (e) { }

  await page.waitForTimeout(400);

  // Measure outline indentation
  const stats = await page.evaluate(() => {
    const panel = document.querySelector('[data-testid="outline-panel"]');
    if (!panel) return { error: 'no panel' };
    const items = Array.from(panel.querySelectorAll('[role="treeitem"]'));
    const rows = items.map((li) => {
      const row = li.querySelector('.outline-node-row');
      const btn = li.querySelector('.outline-node, .outline-node--virtual-root');
      const id = btn?.getAttribute('data-outline-id') || '';
      const label = btn?.textContent?.trim() || '';
      const depth = row?.style?.getPropertyValue('--depth') || '';
      const rect = btn?.getBoundingClientRect() || { left: 0 };
      return { id, label, depth, left: Math.round(rect.left) };
    });
    const panelLeft = panel.getBoundingClientRect().left;
    return {
      panelLeft: Math.round(panelLeft),
      rows,
      count: rows.length,
    };
  });

  console.log('panel.left =', stats.panelLeft);
  for (const r of stats.rows) {
    const offset = r.left - stats.panelLeft;
    console.log(`depth=${r.depth}\tleft=${r.left}\toffset=${offset}px\tid=${r.id}\tlabel=${r.label.slice(0, 40)}`);
  }

  await page.screenshot({ path: '/tmp/outline-indent-check.png', fullPage: false });
  console.log('screenshot /tmp/outline-indent-check.png');

  await page.waitForTimeout(1500);
  await browser.close();
};

run().catch((e) => { console.error(e); process.exit(1); });
