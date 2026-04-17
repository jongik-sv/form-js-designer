#!/usr/bin/env node
// Launches `vite preview`, opens headless Chromium, waits for __spikeFpsDone,
// captures screenshots, then writes fps.txt / bundle-size.txt / licenses.json.

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdir, readFile, writeFile, stat, readdir } from 'node:fs/promises';
import { existsSync, createReadStream } from 'node:fs';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MEAS = join(ROOT, 'measurements');
const PREVIEW_URL = 'http://127.0.0.1:5176/';

async function waitForUrl(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await delay(250);
  }
  throw new Error(`timed out waiting for ${url}`);
}

async function gzipFile(src, dst) {
  await pipeline(createReadStream(src), createGzip({ level: 9 }), (await import('node:fs')).createWriteStream(dst));
  const s = await stat(dst);
  return s.size;
}

async function main() {
  await mkdir(MEAS, { recursive: true });

  // Start preview server
  const preview = spawn('npx', ['vite', 'preview', '--port', '5176', '--strictPort'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  preview.stdout.on('data', (d) => process.stderr.write(`[preview] ${d}`));
  preview.stderr.on('data', (d) => process.stderr.write(`[preview:err] ${d}`));

  try {
    await waitForUrl(PREVIEW_URL);

    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
      }
    });
    page.on('pageerror', (err) => {
      consoleErrors.push(`[pageerror] ${err.message}`);
    });

    await page.goto(PREVIEW_URL, { waitUntil: 'commit' });
    // Wait for demo mount (poll — headless sometimes doesn't fire DOMContentLoaded reliably)
    await page.waitForSelector('[data-testid="table-wrap"]', { timeout: 20000, state: 'attached' });

    // Wait for FPS loop to finish (~4s max)
    await page.waitForFunction(() => window.__spikeFpsDone === true, { timeout: 20000 });
    const fps = await page.evaluate(() => window.__spikeFps);
    await writeFile(join(MEAS, 'fps.txt'), `${fps.toFixed(2)}\n`);

    // Multiheader screenshot
    await page.screenshot({ path: join(MEAS, 'multiheader.png'), fullPage: false });

    // Reorder screenshot — programmatically drag first leaf header to 3rd position
    await page.waitForTimeout(300);
    try {
      const handles = await page.$$('.drag-handle');
      if (handles.length >= 3) {
        const srcBox = await handles[0].boundingBox();
        const dstBox = await handles[2].boundingBox();
        if (srcBox && dstBox) {
          await page.mouse.move(srcBox.x + srcBox.width / 2, srcBox.y + srcBox.height / 2);
          await page.mouse.down();
          await page.mouse.move(srcBox.x + srcBox.width / 2 + 10, srcBox.y + srcBox.height / 2, { steps: 5 });
          await page.mouse.move(dstBox.x + dstBox.width / 2, dstBox.y + dstBox.height / 2, { steps: 10 });
          await page.mouse.up();
          await page.waitForTimeout(500);
        }
      }
    } catch (e) {
      consoleErrors.push(`[reorder] ${e.message}`);
    }
    await page.screenshot({ path: join(MEAS, 'reorder.png'), fullPage: false });

    // Console clean screenshot
    await page.screenshot({ path: join(MEAS, 'console-clean.png'), fullPage: false });
    await writeFile(join(MEAS, 'console-log.txt'), consoleErrors.join('\n') + '\n');

    await browser.close();
    console.log(`FPS=${fps.toFixed(2)} consoleIssues=${consoleErrors.length}`);
  } finally {
    preview.kill('SIGTERM');
  }

  // Bundle size — gzip each JS/CSS chunk and sum
  const distAssets = join(ROOT, 'dist', 'assets');
  const lines = [];
  if (existsSync(distAssets)) {
    const files = await readdir(distAssets);
    let totalRaw = 0;
    let totalGz = 0;
    for (const f of files.sort()) {
      if (!/\.(js|css)$/.test(f)) continue;
      const src = join(distAssets, f);
      const gz = src + '.gz';
      const raw = (await stat(src)).size;
      const gzSize = await gzipFile(src, gz);
      totalRaw += raw;
      totalGz += gzSize;
      lines.push(`${f}\traw=${raw}\tgz=${gzSize}`);
    }
    lines.push(`TOTAL\traw=${totalRaw}\tgz=${totalGz}`);
  } else {
    lines.push('dist/assets not found — run `npm run build` first');
  }
  await writeFile(join(MEAS, 'bundle-size.txt'), lines.join('\n') + '\n');

  // Licenses
  const { execSync } = await import('node:child_process');
  const licenses = execSync('npm list --depth=0 --json', { cwd: ROOT, encoding: 'utf8' });
  await writeFile(join(MEAS, 'licenses.json'), licenses);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
