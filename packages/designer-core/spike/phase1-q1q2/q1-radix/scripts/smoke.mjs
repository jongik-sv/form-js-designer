/**
 * Q1 Radix + preact/compat smoke test
 * - Dialog open/close (ESC + Overlay click + focus return)
 * - Tabs arrow-key navigation
 * - Popover open/outside-click close
 * - console.error / pageerror 전수 수집
 * - 사전 조사 버그 재현 여부 기록
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5183';
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
  bugReproductionChecks: {},
  consoleErrors,
  pageErrors,
};

function bug(name, ok, detail) {
  report.bugReproductionChecks[name] = { reproduced: !ok, detail };
}

async function shot(name) {
  await page.screenshot({ path: path.join(SCEN, `${name}.png`), fullPage: false });
}

try {
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
  await shot('00-loaded');

  // ---------- Dialog ----------
  const dialogScenario = { steps: [] };
  const dialogTrigger = page.locator('[data-testid="dialog-trigger"]');
  await dialogTrigger.waitFor({ state: 'visible', timeout: 5000 });
  await dialogTrigger.click();
  await page.waitForTimeout(200);
  await shot('01-dialog-open');

  const dialogContentCount = await page
    .locator('[data-testid="dialog-content"]')
    .count();
  dialogScenario.steps.push({ name: 'open_click', portalFound: dialogContentCount > 0 });
  bug(
    'PortalElementMissing',
    dialogContentCount > 0,
    dialogContentCount > 0
      ? 'Dialog.Portal rendered Dialog.Content under body'
      : 'Dialog.Content missing after trigger — Radix portal failed under preact/compat',
  );

  const dialogVisible = dialogContentCount > 0
    ? await page.locator('[data-testid="dialog-content"]').isVisible()
    : false;
  dialogScenario.steps.push({ name: 'open_visible', visible: dialogVisible });

  // ESC close
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const dialogAfterEsc = await page
    .locator('[data-testid="dialog-content"]')
    .count();
  dialogScenario.steps.push({ name: 'esc_close', remainingContent: dialogAfterEsc });
  bug(
    'DialogStuck_Esc',
    dialogAfterEsc === 0,
    dialogAfterEsc === 0
      ? 'Dialog closed on ESC'
      : 'Dialog remained open after ESC — known preact #3297 stuck bug',
  );
  await shot('02-dialog-after-esc');

  // focus return
  const focusReturned = await page.evaluate(() => {
    const el = document.activeElement;
    return el ? el.getAttribute('data-testid') : null;
  });
  dialogScenario.steps.push({ name: 'focus_return', activeTestId: focusReturned });

  // re-open for overlay click
  await page.locator('[data-testid="dialog-trigger"]').click();
  await page.waitForTimeout(200);
  const overlay = page.locator('.dialog-overlay');
  const overlayCount = await overlay.count();
  if (overlayCount > 0) {
    await overlay.click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(200);
  }
  const dialogAfterOverlay = await page
    .locator('[data-testid="dialog-content"]')
    .count();
  dialogScenario.steps.push({ name: 'overlay_close', remainingContent: dialogAfterOverlay });
  bug(
    'DialogStuck_Overlay',
    dialogAfterOverlay === 0,
    dialogAfterOverlay === 0
      ? 'Dialog closed on Overlay click'
      : 'Dialog remained open after overlay click',
  );
  await shot('03-dialog-after-overlay');

  report.scenarios.dialog = dialogScenario;

  // ---------- Tabs ----------
  const tabsScenario = { steps: [] };
  const tabA = page.locator('[data-testid="tab-a"]');
  await tabA.click();
  await page.waitForTimeout(100);
  await shot('04-tabs-a');

  await tabA.focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(150);
  const activeAfterRight = await page.evaluate(() =>
    document.activeElement?.getAttribute('data-testid'),
  );
  const activeBState = await page.evaluate(() => {
    const b = document.querySelector('[data-testid="tab-b"]');
    return b ? b.getAttribute('data-state') : null;
  });
  tabsScenario.steps.push({
    name: 'arrow_right_from_a',
    activeElement: activeAfterRight,
    tabBState: activeBState,
  });
  await shot('05-tabs-b');

  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(150);
  const activeAfterRight2 = await page.evaluate(() =>
    document.activeElement?.getAttribute('data-testid'),
  );
  const activeCState = await page.evaluate(() => {
    const c = document.querySelector('[data-testid="tab-c"]');
    return c ? c.getAttribute('data-state') : null;
  });
  tabsScenario.steps.push({
    name: 'arrow_right_from_b',
    activeElement: activeAfterRight2,
    tabCState: activeCState,
  });
  await shot('06-tabs-c');

  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(150);
  const activeAfterLeft = await page.evaluate(() =>
    document.activeElement?.getAttribute('data-testid'),
  );
  tabsScenario.steps.push({ name: 'arrow_left_from_c', activeElement: activeAfterLeft });

  report.scenarios.tabs = tabsScenario;

  // ---------- Popover ----------
  const popoverScenario = { steps: [] };
  const popTrigger = page.locator('[data-testid="popover-trigger"]');
  await popTrigger.click();
  await page.waitForTimeout(200);
  const popCount = await page.locator('[data-testid="popover-content"]').count();
  popoverScenario.steps.push({ name: 'open_click', portalFound: popCount > 0 });
  bug(
    'PopoverPortalMissing',
    popCount > 0,
    popCount > 0 ? 'Popover content rendered' : 'Popover.Portal did not render content',
  );
  await shot('07-popover-open');

  // outside click close
  await page.mouse.click(5, 5);
  await page.waitForTimeout(200);
  const popAfter = await page.locator('[data-testid="popover-content"]').count();
  popoverScenario.steps.push({ name: 'outside_click_close', remaining: popAfter });
  bug(
    'PopoverStuck',
    popAfter === 0,
    popAfter === 0 ? 'Popover closed on outside click' : 'Popover remained open after outside click',
  );
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
  bugChecks: report.bugReproductionChecks,
  fatal: report.fatalError ? report.fatalError.message : null,
}, null, 2));
