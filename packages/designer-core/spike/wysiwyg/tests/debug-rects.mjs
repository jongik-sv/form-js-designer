#!/usr/bin/env node
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const widths = [1024, 1280, 1440, 1600];

for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 800 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173/editor.html', { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-fjs-id="card-1"]');
  await page.waitForSelector('[data-testid="overlay"] .fjs-designer-overlay-selection');

  const info = await page.evaluate(() => {
    const card = document.querySelector('[data-fjs-id="card-1"]');
    const cardParent = card?.parentElement;
    const formRoot = document.querySelector('#form-root');
    const editorShell = document.querySelector('#editor-shell');
    const overlayRoot = document.querySelector('#overlay-root');
    const sel = document.querySelector('[data-testid="overlay"] .fjs-designer-overlay-selection');
    const matches = document.querySelectorAll('[data-fjs-id="card-1"]');
    const toRect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    };
    return {
      viewport: { w: window.innerWidth, h: window.innerHeight },
      matchCount: matches.length,
      cardElem: card ? `${card.tagName}.${card.className}` : null,
      cardParentTag: cardParent ? `${cardParent.tagName}.${cardParent.className}` : null,
      editorShell: toRect(editorShell),
      formRoot: toRect(formRoot),
      overlayRoot: toRect(overlayRoot),
      card: toRect(card),
      selection: toRect(sel),
    };
  });

  console.log(`viewport=${w}`);
  console.log(JSON.stringify(info, null, 2));
  console.log('---');
  await ctx.close();
}
await browser.close();
