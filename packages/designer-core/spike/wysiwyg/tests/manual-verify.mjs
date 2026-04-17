#!/usr/bin/env node
// Ad-hoc browser sanity check. Loads both pages, collects all console
// messages and page errors, waits for the card to render, and writes
// screenshots into tests/artifacts/manual-*.png.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTIFACTS = resolve(__dirname, 'artifacts');
mkdirSync(ARTIFACTS, { recursive: true });

const PAGES = [
  { name: 'viewer', url: 'http://localhost:5173/viewer.html' },
  { name: 'editor', url: 'http://localhost:5173/editor.html' },
];

const summary = [];

const browser = await chromium.launch();
try {
  for (const p of PAGES) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const logs = [];
    const errors = [];
    page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('requestfailed', (r) =>
      errors.push(`requestfailed: ${r.url()} ${r.failure()?.errorText ?? ''}`),
    );

    const resp = await page.goto(p.url, { waitUntil: 'networkidle', timeout: 15000 });
    const status = resp?.status();

    let cardVisible = false;
    let watermark = false;
    let overlayActive = false;
    try {
      await page.waitForSelector('[data-fjs-id="card-1"]', { timeout: 5000 });
      cardVisible = true;
      watermark = await page.locator('.fjs-powered-by').isVisible();
      if (p.name === 'editor') {
        overlayActive = await page
          .locator('[data-testid="overlay"] .fjs-designer-overlay-selection')
          .isVisible();
      }
    } catch (e) {
      errors.push(`waitForSelector failed: ${(e).message}`);
    }

    const title = await page.title();
    const bodyHtmlLen = (await page.locator('body').innerHTML()).length;
    await page.screenshot({ path: resolve(ARTIFACTS, `manual-${p.name}.png`), fullPage: false });

    summary.push({
      page: p.name,
      url: p.url,
      status,
      title,
      bodyHtmlLen,
      cardVisible,
      watermark,
      overlayActive,
      errors,
      logs: logs.slice(0, 30),
    });

    await context.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify(summary, null, 2));
