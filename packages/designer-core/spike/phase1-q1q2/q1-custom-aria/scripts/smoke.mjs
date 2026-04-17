/**
 * Q1 Custom ARIA smoke test — Dialog only.
 * - open via trigger click
 * - initial focus on first focusable inside content
 * - Tab focus trap (stays inside content)
 * - ESC close
 * - overlay click close
 * - focus returns to trigger
 * - console.error / pageerror collection
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5223';
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
  ariaChecks: {},
  consoleErrors,
  pageErrors,
};

async function shot(name) {
  await page.screenshot({ path: path.join(SCEN, `dialog-${name}.png`), fullPage: false });
}
function check(name, ok, detail) {
  report.ariaChecks[name] = { ok, detail };
}

try {
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
  await shot('00-loaded');

  const trigger = page.locator('[data-testid="dialog-trigger"]');
  await trigger.waitFor({ state: 'visible', timeout: 5000 });

  const dialogSteps = [];

  // 1. Open
  await trigger.click();
  await page.waitForTimeout(150);
  await shot('01-open');
  const contentCount = await page.locator('[data-testid="dialog-content"]').count();
  dialogSteps.push({ name: 'open_click', contentFound: contentCount > 0 });
  check('ContentRendered', contentCount > 0, contentCount > 0 ? 'Dialog.Content rendered' : 'Dialog.Content missing');

  // 2. ARIA attributes
  const aria = await page.evaluate(() => {
    const c = document.querySelector('[data-testid="dialog-content"]');
    if (!c) return null;
    return {
      role: c.getAttribute('role'),
      ariaModal: c.getAttribute('aria-modal'),
      ariaLabelledby: c.getAttribute('aria-labelledby'),
      ariaDescribedby: c.getAttribute('aria-describedby'),
      labelledbyResolves: c.getAttribute('aria-labelledby')
        ? !!document.getElementById(c.getAttribute('aria-labelledby'))
        : false,
      describedbyResolves: c.getAttribute('aria-describedby')
        ? !!document.getElementById(c.getAttribute('aria-describedby'))
        : false,
    };
  });
  dialogSteps.push({ name: 'aria_attrs', aria });
  check(
    'AriaAttrs',
    aria && aria.role === 'dialog' && aria.ariaModal === 'true' && aria.labelledbyResolves,
    JSON.stringify(aria),
  );

  // 3. Initial focus
  const initialFocus = await page.evaluate(() => {
    const el = document.activeElement;
    return { testId: el?.getAttribute('data-testid'), tag: el?.tagName };
  });
  dialogSteps.push({ name: 'initial_focus', initialFocus });
  check(
    'InitialFocus',
    initialFocus.testId === 'dialog-input',
    `focused: ${JSON.stringify(initialFocus)}`,
  );

  // 4. Scroll lock
  const scrollLock = await page.evaluate(() => document.body.style.overflow);
  dialogSteps.push({ name: 'scroll_lock', overflow: scrollLock });
  check('ScrollLock', scrollLock === 'hidden', `body.overflow = ${scrollLock}`);

  // 5. Tab focus trap
  await page.keyboard.press('Tab');
  await page.waitForTimeout(50);
  const afterTab = await page.evaluate(() => {
    const el = document.activeElement;
    return { testId: el?.getAttribute('data-testid'), tag: el?.tagName };
  });
  dialogSteps.push({ name: 'tab_once', after: afterTab });
  // second Tab should wrap to first
  await page.keyboard.press('Tab');
  await page.waitForTimeout(50);
  const afterTabWrap = await page.evaluate(() => {
    const el = document.activeElement;
    return { testId: el?.getAttribute('data-testid'), tag: el?.tagName };
  });
  dialogSteps.push({ name: 'tab_wrap', after: afterTabWrap });
  check(
    'TabTrap',
    afterTabWrap.testId === 'dialog-input',
    `after wrap: ${JSON.stringify(afterTabWrap)}`,
  );

  // 6. Shift+Tab backwards trap
  await page.keyboard.press('Shift+Tab');
  await page.waitForTimeout(50);
  const afterShiftTab = await page.evaluate(() => {
    const el = document.activeElement;
    return { testId: el?.getAttribute('data-testid'), tag: el?.tagName };
  });
  dialogSteps.push({ name: 'shift_tab', after: afterShiftTab });
  check(
    'ShiftTabTrap',
    afterShiftTab.testId === 'dialog-close',
    `after shift-tab: ${JSON.stringify(afterShiftTab)}`,
  );

  // 7. ESC close
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  const afterEsc = await page.locator('[data-testid="dialog-content"]').count();
  dialogSteps.push({ name: 'esc_close', remaining: afterEsc });
  check('EscClose', afterEsc === 0, `remaining content after ESC: ${afterEsc}`);
  await shot('02-after-esc');

  // 8. Focus return after ESC
  const afterEscFocus = await page.evaluate(() => {
    const el = document.activeElement;
    return { testId: el?.getAttribute('data-testid'), tag: el?.tagName };
  });
  dialogSteps.push({ name: 'focus_return_esc', after: afterEscFocus });
  check(
    'FocusReturnEsc',
    afterEscFocus.testId === 'dialog-trigger',
    `focused after ESC: ${JSON.stringify(afterEscFocus)}`,
  );

  // 9. Scroll lock released
  const scrollReleased = await page.evaluate(() => document.body.style.overflow);
  dialogSteps.push({ name: 'scroll_release', overflow: scrollReleased });
  check('ScrollRelease', scrollReleased !== 'hidden', `body.overflow = ${scrollReleased}`);

  // 10. Re-open and overlay click close
  await page.locator('[data-testid="dialog-trigger"]').click();
  await page.waitForTimeout(150);
  const reopened = await page.locator('[data-testid="dialog-content"]').count();
  dialogSteps.push({ name: 'reopen', contentFound: reopened > 0 });
  await shot('03-reopened');

  const overlay = page.locator('[data-testid="dialog-overlay"]');
  if ((await overlay.count()) > 0) {
    // click near corner (away from content)
    await overlay.click({ position: { x: 5, y: 5 } });
    await page.waitForTimeout(150);
  }
  const afterOverlay = await page.locator('[data-testid="dialog-content"]').count();
  dialogSteps.push({ name: 'overlay_close', remaining: afterOverlay });
  check('OverlayClose', afterOverlay === 0, `remaining content after overlay: ${afterOverlay}`);
  await shot('04-after-overlay');

  // 11. Focus return after overlay close
  const afterOverlayFocus = await page.evaluate(() => {
    const el = document.activeElement;
    return { testId: el?.getAttribute('data-testid'), tag: el?.tagName };
  });
  dialogSteps.push({ name: 'focus_return_overlay', after: afterOverlayFocus });
  check(
    'FocusReturnOverlay',
    afterOverlayFocus.testId === 'dialog-trigger',
    `focused after overlay close: ${JSON.stringify(afterOverlayFocus)}`,
  );

  report.scenarios.dialog = { steps: dialogSteps };
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
console.log(
  JSON.stringify(
    {
      consoleErrors: consoleErrors.length,
      pageErrors: pageErrors.length,
      ariaChecks: report.ariaChecks,
      fatal: report.fatalError ? report.fatalError.message : null,
    },
    null,
    2,
  ),
);
