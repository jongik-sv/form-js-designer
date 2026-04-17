// axe-core audit for Q1 Ariakit spike.
// Boots dev server, visits initial / dialog-open / tabs / popover states
// and runs AxeBuilder against each. Results → measurements/axe-report.json.

import { chromium } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out = path.join(root, 'measurements/axe-report.json');

const server = await createServer({ configFile: path.join(root, 'vite.config.ts'), root });
await server.listen();
const url = server.resolvedUrls?.local?.[0] ?? 'http://localhost:5203/';

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

const report = { url, runs: [] };

async function audit(label, fn) {
  try {
    await fn();
  } catch (err) {
    report.runs.push({ label, error: err.message, violationCount: -1 });
    console.log(`[axe] ${label}: setup failed — ${err.message}`);
    return;
  }
  const result = await new AxeBuilder({ page }).analyze();
  const trimmed = {
    label,
    violations: result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.length,
    })),
    violationCount: result.violations.length,
    incompleteCount: result.incomplete.length,
    passes: result.passes.length,
  };
  report.runs.push(trimmed);
  console.log(`[axe] ${label}: ${trimmed.violationCount} violations, ${trimmed.passes} passes`);
}

try {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="status"]');

  await audit('initial', async () => {});

  await audit('dialog-open', async () => {
    await page.click('[data-testid="dialog-trigger"]');
    await page.waitForSelector('[data-testid="dialog-panel"]', { state: 'visible' });
  });
  await page.keyboard.press('Escape');
  await page
    .waitForSelector('[data-testid="dialog-panel"]', { state: 'detached' })
    .catch(() => page.waitForSelector('[data-testid="dialog-panel"]', { state: 'hidden' }));

  await audit('tabs-nav-attempt', async () => {
    const tabA = await page.$('[data-testid="tab-탭 A"]');
    await tabA?.focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(150);
  });

  await audit('popover-open-attempt', async () => {
    await page.click('[data-testid="popover-trigger"]');
    // Popover may stay hidden due to floating-ui init breakage; audit regardless
    await page.waitForTimeout(500);
  });
} catch (err) {
  report.error = { name: err.name, message: err.message, stack: err.stack };
  console.error('[axe] ERROR', err.message);
} finally {
  await fs.writeFile(out, JSON.stringify(report, null, 2));
  console.log(`[axe] wrote ${out}`);
  await browser.close();
  await server.close();
}
