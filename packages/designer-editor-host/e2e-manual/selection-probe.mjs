// Probe selection behavior: drop card, drop button inside card, click each, read properties panel
import { chromium } from '@playwright/test';

async function dragTo(page, paletteText, targetSelectorList) {
  const palette = page.locator('.fjs-palette-field', { hasText: paletteText }).first();
  await palette.scrollIntoViewIfNeeded();
  const pb = await palette.boundingBox();
  const tb = await page.evaluate((sels) => {
    for (const s of sels) {
      const els = Array.from(document.querySelectorAll(s));
      if (els.length === 0) continue;
      const t = els[els.length - 1];
      const r = t.getBoundingClientRect();
      if (r.width > 0 && r.height >= 0) {
        return { x: r.x + r.width / 2, y: r.y + Math.min(30, r.height / 2 || 10), sel: s };
      }
    }
    return null;
  }, targetSelectorList);
  if (!tb) throw new Error('no drop target from: ' + targetSelectorList.join(','));
  console.log(`  drop target (${tb.sel}) at (${tb.x}, ${tb.y})`);
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

async function clickCenter(page, selector) {
  const box = await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, selector);
  if (!box) return null;
  await page.mouse.click(box.x, box.y);
  await page.waitForTimeout(300);
  return box;
}

async function probeSelectedAndPanel(page) {
  return page.evaluate(() => {
    const selected = document.querySelector('.fjs-editor-selected');
    const dataId = selected?.getAttribute('data-id');
    const dataType = selected?.getAttribute('data-field-type');

    // properties panel
    const panel = document.querySelector('.fjs-properties-panel, .bio-properties-panel');
    // header title pattern
    const headerCandidates = [
      '.bio-properties-panel-header-label',
      '.bio-properties-panel-header-type',
      '.bio-properties-panel-header',
      '.fjs-properties-panel-header',
      'h2', 'h3',
    ];
    let headerText = null;
    for (const s of headerCandidates) {
      const el = panel?.querySelector?.(s);
      if (el && el.textContent?.trim()) {
        headerText = `${s}: "${el.textContent.trim().slice(0, 60)}"`;
        break;
      }
    }
    return {
      selectedDataId: dataId,
      selectedFieldType: dataType,
      selectedTag: selected?.tagName,
      headerText,
      panelTitle: panel?.querySelector?.('h1,h2,h3,h4')?.textContent?.trim()?.slice(0, 50),
    };
  });
}

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));

  await page.goto('http://localhost:5173/');
  await page.waitForSelector('.fjs-palette', { timeout: 15000 });
  await page.waitForTimeout(400);

  // drop card
  console.log('\n[1] drop 카드 at root');
  await dragTo(page, '카드', ['.fjs-drop-container-vertical']);

  // click form background to deselect
  await page.mouse.click(900, 800);
  await page.waitForTimeout(200);

  // click card
  console.log('\n[2] click card');
  await clickCenter(page, '[data-component="card"]');
  console.log(await probeSelectedAndPanel(page));

  // click form background to deselect
  await page.mouse.click(900, 800);
  await page.waitForTimeout(200);

  // drop button inside card
  console.log('\n[3] drop 버튼 inside card');
  await dragTo(page, '버튼', [
    '[data-component="card"] .fjs-drop-container-vertical',
    '.fjs-element[data-field-type="card"] .fjs-drop-container-vertical',
  ]);

  // check who is selected after drop
  console.log(await probeSelectedAndPanel(page));

  // click form background
  await page.mouse.click(900, 800);
  await page.waitForTimeout(200);

  // now click the button inside card
  console.log('\n[4] click button inside card');
  await clickCenter(page, '[data-component="card"] [data-field-type="button"], [data-component="card"] button.dc-button, [data-component="card"] .fjs-element[data-field-type="button"]');
  console.log(await probeSelectedAndPanel(page));

  await page.screenshot({ path: 'e2e-manual/selection-probe.png', fullPage: true });
  await page.waitForTimeout(2000);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
