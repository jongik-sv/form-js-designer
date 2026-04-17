// Headless smoke test for Q1 Headless UI + preact/compat spike.
// - boots Vite preview (over the built bundle)
// - walks Dialog / Tabs / Popover scenarios
// - captures console.error + pageerror
// - writes per-scenario screenshots to measurements/scenarios/

import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const outDir = path.join(root, 'measurements/scenarios');
const logFile = path.join(root, 'measurements/smoke.log');
const errorFile = path.join(root, 'measurements/smoke-errors.json');

await fs.mkdir(outDir, { recursive: true });

const server = await createServer({ configFile: path.join(root, 'vite.config.ts'), root });
await server.listen();
const url = server.resolvedUrls?.local?.[0] ?? 'http://localhost:5183/';
const logLines = [];
const log = (m) => {
  logLines.push(m);
  console.log(m);
};
log(`[smoke] dev server: ${url}`);

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

const consoleErrors = [];
const pageErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') {
    consoleErrors.push({ text: msg.text(), location: msg.location() });
  }
});
page.on('pageerror', (err) => {
  pageErrors.push({ name: err.name, message: err.message, stack: err.stack });
});

async function ss(name) {
  const p = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: p, fullPage: false });
  log(`[smoke] screenshot -> ${path.relative(root, p)}`);
}

try {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="status"]');
  await ss('00-initial');

  // --- Dialog ---
  log('[smoke] Dialog: open');
  await page.click('[data-testid="dialog-trigger"]');
  await page.waitForSelector('[data-testid="dialog-panel"]', { state: 'visible' });
  await ss('01-dialog-open');

  log('[smoke] Dialog: fill input');
  await page.fill('[data-testid="dialog-input"]', 'hello');
  await ss('02-dialog-input');

  log('[smoke] Dialog: close via ESC');
  await page.keyboard.press('Escape');
  await page.waitForSelector('[data-testid="dialog-panel"]', { state: 'detached' }).catch(async () => {
    // fallback
    await page.waitForSelector('[data-testid="dialog-panel"]', { state: 'hidden' });
  });
  await ss('03-dialog-esc-closed');

  log('[smoke] Dialog: re-open and overlay click');
  await page.click('[data-testid="dialog-trigger"]');
  await page.waitForSelector('[data-testid="dialog-panel"]', { state: 'visible' });
  // Overlay click: click at an outer corner that is definitely overlay
  await page.mouse.click(5, 5);
  await page.waitForTimeout(200);
  const stillOpen = await page.$('[data-testid="dialog-panel"]');
  log(`[smoke] Dialog after overlay click: ${stillOpen ? 'STILL OPEN' : 'closed'}`);
  await ss('04-dialog-after-overlay-click');
  if (stillOpen) await page.keyboard.press('Escape');

  // --- Tabs ---
  log('[smoke] Tabs: initial');
  await ss('05-tabs-initial');
  const tabA = await page.$('[data-testid="tab-탭 A"]');
  await tabA?.focus();
  log('[smoke] Tabs: arrow right');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(100);
  await ss('06-tabs-arrow-right');
  log('[smoke] Tabs: arrow right again');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(100);
  await ss('07-tabs-arrow-right-2');
  const activeTab = await page.getAttribute('[role="tab"][aria-selected="true"]', 'data-testid');
  log(`[smoke] Tabs: active after 2x arrow-right = ${activeTab}`);

  // --- Popover ---
  log('[smoke] Popover: open');
  await page.click('[data-testid="popover-trigger"]');
  await page.waitForSelector('[data-testid="popover-panel"]', { state: 'visible' });
  await ss('08-popover-open');
  log('[smoke] Popover: click outside to close');
  await page.mouse.click(5, 5);
  await page.waitForTimeout(200);
  const popStillOpen = await page.$('[data-testid="popover-panel"]');
  log(`[smoke] Popover after outside click: ${popStillOpen ? 'STILL OPEN' : 'closed'}`);
  await ss('09-popover-after-outside-click');

  log('[smoke] done');
} catch (err) {
  log(`[smoke] ERROR ${err.message}`);
  consoleErrors.push({ text: `smoke-exception: ${err.message}`, stack: err.stack });
} finally {
  await fs.writeFile(
    errorFile,
    JSON.stringify({ consoleErrors, pageErrors }, null, 2),
  );
  await fs.writeFile(logFile, logLines.join('\n'));
  log(`[smoke] console.error count: ${consoleErrors.length}`);
  log(`[smoke] pageerror count: ${pageErrors.length}`);
  await browser.close();
  await server.close();
}
