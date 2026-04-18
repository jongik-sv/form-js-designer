// Probe: verify which Carbon grid CSS rules apply at viewport 1600
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto('http://localhost:5173/');
await page.waitForSelector('.fjs-palette', { timeout: 15000 });

const probe = await page.evaluate(() => {
  // Create a test DOM: two cds--col siblings inside cds--grid cds--row
  const host = document.createElement('div');
  host.className = 'fjs-container';
  host.style.cssText = 'width: 1000px; position:fixed;top:-9999px;';
  host.innerHTML = `
    <div class="cds--grid cds--grid--condensed">
      <div class="cds--row">
        <div class="cds--col cds--col-sm-16 cds--col-md-16" id="c1">A</div>
        <div class="cds--col cds--col-sm-16 cds--col-md-16" id="c2">B</div>
      </div>
    </div>
  `;
  document.body.appendChild(host);
  const c1 = document.getElementById('c1');
  const c2 = document.getElementById('c2');
  const r1 = c1.getBoundingClientRect();
  const r2 = c2.getBoundingClientRect();
  const s1 = getComputedStyle(c1);
  const s2 = getComputedStyle(c2);
  const hasColSm16Rule = Array.from(document.styleSheets).some((ss) => {
    try {
      return Array.from(ss.cssRules || []).some((r) => r.selectorText === '.cds--col-sm-16');
    } catch { return false; }
  });
  const hasLg66remMedia = Array.from(document.styleSheets).some((ss) => {
    try {
      return Array.from(ss.cssRules || []).some((r) => r.cssText && r.cssText.includes('min-width: 66rem'));
    } catch { return false; }
  });
  return {
    c1: { x: r1.x, y: r1.y, w: r1.width, flex: s1.flex, inlineSize: s1.inlineSize },
    c2: { x: r2.x, y: r2.y, w: r2.width, flex: s2.flex, inlineSize: s2.inlineSize },
    sideBySide: Math.abs(r1.y - r2.y) < 5,
    hasColSm16Rule,
    hasLg66remMedia,
  };
});

console.log(JSON.stringify(probe, null, 2));
await browser.close();
