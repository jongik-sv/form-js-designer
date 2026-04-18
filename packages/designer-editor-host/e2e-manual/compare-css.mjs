// Compare computed styles of drop container during drag between upstream and ours.
import { chromium } from '@playwright/test';

async function probe(url, paletteText) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto(url);
  await page.waitForSelector('.fjs-palette', { timeout: 15000 });

  // sample before drag
  const before = await page.evaluate(() => {
    const d = document.querySelector('.fjs-drop-container-vertical');
    const p = d?.parentElement;
    const pp = p?.parentElement;
    const pick = (el) =>
      el
        ? {
            class: el.className,
            rect: el.getBoundingClientRect(),
            style: (() => {
              const s = getComputedStyle(el);
              return {
                display: s.display,
                flex: s.flex,
                flexGrow: s.flexGrow,
                flexDirection: s.flexDirection,
                minHeight: s.minHeight,
                height: s.height,
                alignSelf: s.alignSelf,
                position: s.position,
              };
            })(),
          }
        : null;
    return {
      drop: pick(d),
      parent: pick(p),
      grandparent: pick(pp),
    };
  });

  // start drag
  const palette = page.locator('.fjs-palette-field', { hasText: paletteText }).first();
  await palette.scrollIntoViewIfNeeded();
  const pb = await palette.boundingBox();
  await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
  await page.mouse.down();
  await page.mouse.move(pb.x + pb.width / 2 + 30, pb.y + pb.height / 2 + 30, { steps: 10 });
  await page.waitForTimeout(300);

  const during = await page.evaluate(() => {
    const d = document.querySelector('.fjs-drop-container-vertical');
    const p = d?.parentElement;
    const rect = (el) => el && el.getBoundingClientRect();
    const cs = (el) => {
      if (!el) return null;
      const s = getComputedStyle(el);
      return {
        display: s.display,
        flex: s.flex,
        flexGrow: s.flexGrow,
        flexDirection: s.flexDirection,
        minHeight: s.minHeight,
        height: s.height,
        alignSelf: s.alignSelf,
        position: s.position,
      };
    };
    return {
      grabbing: document.body.classList.contains('fjs-cursor-grabbing'),
      dropRect: rect(d),
      dropStyle: cs(d),
      parentRect: rect(p),
      parentStyle: cs(p),
    };
  });

  await page.mouse.up();
  await browser.close();

  return { before, during };
}

const our = await probe('http://localhost:5173/vanilla.html', 'Text field');
console.log('=== OURS (vanilla.html via our vite) ===');
console.log(JSON.stringify(our, null, 2));

const up = await probe('http://localhost:5174/editor-test.html', 'Text field');
console.log('=== UPSTREAM (editor-test.html via upstream vite) ===');
console.log(JSON.stringify(up, null, 2));
