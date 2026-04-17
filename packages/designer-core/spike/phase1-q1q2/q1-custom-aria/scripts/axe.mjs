/**
 * axe-core audit: Dialog-open state only (this candidate implements Dialog only).
 * Writes measurements/axe-report.json.
 */
import { chromium } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import fs from 'node:fs/promises';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5223';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
await page.goto(BASE_URL, { waitUntil: 'networkidle' });

const results = {};

// Dialog open
await page.locator('[data-testid="dialog-trigger"]').click();
await page.waitForSelector('[data-testid="dialog-content"]');
await page.waitForTimeout(200);
results.dialog = await new AxeBuilder({ page }).analyze();

await browser.close();

function summarize(r) {
  return {
    violations: r.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      helpUrl: v.helpUrl,
      nodes: v.nodes.length,
    })),
    passes: r.passes.length,
    incomplete: r.incomplete.length,
  };
}

const summary = {
  dialog: summarize(results.dialog),
  totalViolations: results.dialog.violations.length,
};

await fs.writeFile(
  'measurements/axe-report.json',
  JSON.stringify({ summary, full: results }, null, 2),
);

console.log(JSON.stringify(summary, null, 2));
