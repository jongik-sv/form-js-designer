/**
 * axe-core 감사: Dialog 열림 / Tabs B 활성 / Popover 열림 3상태.
 * 결과 → measurements/axe-report.json
 */
import { chromium } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import fs from 'node:fs/promises';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5183';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
await page.goto(BASE_URL, { waitUntil: 'networkidle' });

const results = {};

// --- Dialog open ---
await page.locator('[data-testid="dialog-trigger"]').click();
await page.waitForSelector('[data-testid="dialog-content"]');
await page.waitForTimeout(200);
results.dialog = await new AxeBuilder({ page }).analyze();
await page.keyboard.press('Escape');
await page.waitForTimeout(200);

// --- Tabs B active ---
await page.locator('[data-testid="tab-b"]').click();
await page.waitForTimeout(150);
results.tabs = await new AxeBuilder({ page }).analyze();

// --- Popover open ---
await page.locator('[data-testid="popover-trigger"]').click();
await page.waitForSelector('[data-testid="popover-content"]');
await page.waitForTimeout(200);
results.popover = await new AxeBuilder({ page }).analyze();

await browser.close();

function summarize(r) {
  return {
    violations: r.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.length,
    })),
    passes: r.passes.length,
    incomplete: r.incomplete.length,
  };
}

const summary = {
  dialog: summarize(results.dialog),
  tabs: summarize(results.tabs),
  popover: summarize(results.popover),
  totalViolations:
    results.dialog.violations.length +
    results.tabs.violations.length +
    results.popover.violations.length,
};

await fs.writeFile(
  'measurements/axe-report.json',
  JSON.stringify({ summary, full: results }, null, 2),
);

console.log(JSON.stringify(summary, null, 2));
