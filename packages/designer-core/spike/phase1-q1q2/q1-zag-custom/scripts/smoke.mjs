/**
 * Q1 Zag.js + custom Preact adapter smoke test
 * - Dialog: open, ESC close, backdrop click close, focus return
 * - Tabs: ArrowRight / ArrowLeft navigation, data-selected attr
 * - Popover: outside click close
 * - console.error / pageerror 전수 수집
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5213';
const OUT = 'measurements';
const SCEN = path.join(OUT, 'scenarios');
const BUGS = path.join(OUT, 'bugs');

await fs.mkdir(SCEN, { recursive: true });
await fs.mkdir(BUGS, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

const consoleErrors = [];
const pageErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') {
    consoleErrors.push({ type: msg.type(), text: msg.text(), location: msg.location() });
  }
});
page.on('pageerror', (err) => {
  pageErrors.push({ name: err.name, message: err.message, stack: err.stack });
});

const report = {
  startedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  scenarios: {},
  consoleErrors,
  pageErrors,
};

async function shot(name) {
  await page.screenshot({ path: path.join(SCEN, `${name}.png`), fullPage: false });
}

try {
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForSelector('[data-testid="dialog-trigger"]');
  await shot('00-loaded');

  // ---------- Dialog ----------
  const dialogScenario = { steps: [] };
  await page.locator('[data-testid="dialog-trigger"]').click();
  await page.waitForTimeout(300);
  await shot('01-dialog-open');

  const dialogContentCount = await page.locator('[data-testid="dialog-content"]').count();
  dialogScenario.steps.push({ name: 'open_click', portalRendered: dialogContentCount > 0 });

  const dialogVisible = dialogContentCount > 0
    ? await page.locator('[data-testid="dialog-content"]').isVisible()
    : false;
  dialogScenario.steps.push({ name: 'open_visible', visible: dialogVisible });

  // ESC close
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const dialogAfterEsc = await page.locator('[data-testid="dialog-content"]').count();
  dialogScenario.steps.push({ name: 'esc_close', remainingContent: dialogAfterEsc });
  await shot('02-dialog-after-esc');

  const focusReturned = await page.evaluate(() => {
    const el = document.activeElement;
    return el ? el.getAttribute('data-testid') : null;
  });
  dialogScenario.steps.push({ name: 'focus_return', activeTestId: focusReturned });

  // re-open, close via interact-outside (click on positioner edge, not on content)
  await page.locator('[data-testid="dialog-trigger"]').click();
  await page.waitForTimeout(300);
  // click near viewport top-left — outside centered content but inside positioner overlay
  await page.mouse.click(20, 20);
  await page.waitForTimeout(400);
  const dialogAfterBackdrop = await page.locator('[data-testid="dialog-content"]').count();
  dialogScenario.steps.push({ name: 'interact_outside_close', remainingContent: dialogAfterBackdrop });
  await shot('03-dialog-after-outside-click');

  report.scenarios.dialog = dialogScenario;

  // ---------- Tabs ----------
  const tabsScenario = { steps: [] };
  const tabA = page.locator('[data-testid="tab-a"]');
  await tabA.click();
  await page.waitForTimeout(150);
  await shot('04-tabs-a');

  await tabA.focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  const activeAfterRight = await page.evaluate(() =>
    document.activeElement?.getAttribute('data-testid'),
  );
  const tabBSelected = await page.evaluate(() => {
    const b = document.querySelector('[data-testid="tab-b"]');
    return b ? b.hasAttribute('data-selected') : null;
  });
  tabsScenario.steps.push({
    name: 'arrow_right_from_a',
    activeElement: activeAfterRight,
    tabBSelected,
  });
  await shot('05-tabs-b');

  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  const activeAfterRight2 = await page.evaluate(() =>
    document.activeElement?.getAttribute('data-testid'),
  );
  const tabCSelected = await page.evaluate(() => {
    const c = document.querySelector('[data-testid="tab-c"]');
    return c ? c.hasAttribute('data-selected') : null;
  });
  tabsScenario.steps.push({
    name: 'arrow_right_from_b',
    activeElement: activeAfterRight2,
    tabCSelected,
  });
  await shot('06-tabs-c');

  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(200);
  const activeAfterLeft = await page.evaluate(() =>
    document.activeElement?.getAttribute('data-testid'),
  );
  tabsScenario.steps.push({ name: 'arrow_left_from_c', activeElement: activeAfterLeft });

  report.scenarios.tabs = tabsScenario;

  // ---------- Popover ----------
  const popoverScenario = { steps: [] };
  const popTrigger = page.locator('[data-testid="popover-trigger"]');
  await popTrigger.click();
  await page.waitForTimeout(300);
  const popCount = await page.locator('[data-testid="popover-content"]').count();
  popoverScenario.steps.push({ name: 'open_click', portalRendered: popCount > 0 });
  await shot('07-popover-open');

  // outside click close — click on the body far from popover
  await page.mouse.click(5, 5);
  await page.waitForTimeout(400);
  const popAfter = await page.locator('[data-testid="popover-content"]').count();
  popoverScenario.steps.push({ name: 'outside_click_close', remaining: popAfter });
  await shot('08-popover-closed');

  report.scenarios.popover = popoverScenario;
} catch (e) {
  report.fatalError = { name: e.name, message: e.message, stack: e.stack };
  await shot('FATAL');
  await fs.writeFile(path.join(BUGS, 'fatal-stack.txt'), String(e.stack ?? e.message ?? e));
} finally {
  report.finishedAt = new Date().toISOString();
  if (consoleErrors.length) {
    await fs.writeFile(path.join(BUGS, 'console-errors.json'), JSON.stringify(consoleErrors, null, 2));
  }
  if (pageErrors.length) {
    await fs.writeFile(path.join(BUGS, 'page-errors.json'), JSON.stringify(pageErrors, null, 2));
  }
  await fs.writeFile(path.join(OUT, 'smoke-report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}

console.log('---SMOKE REPORT---');
console.log(JSON.stringify({
  consoleErrors: consoleErrors.length,
  pageErrors: pageErrors.length,
  scenarios: Object.keys(report.scenarios),
  fatal: report.fatalError ? report.fatalError.message : null,
}, null, 2));
