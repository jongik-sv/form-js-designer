/**
 * overlay.parity.spec.ts — TSK-03-01 (ADR-0001 §3 D3 + D6)
 *
 * 3 뷰포트(1024×768 / 1440×900 / 1920×1080) × 2 테스트 = 6 케이스.
 * viewport는 playwright.config.ts의 projects 배열에서 주입받는다.
 *
 * Test 1: Pixel parity — editor(overlay 마스킹) vs viewer diff ≤ 0.1%
 * Test 2: Overlay alignment — selection box가 Card와 tolerance 2px 이내
 *
 * MAX_DIFF_PX = floor(viewport.w × viewport.h × 0.001) 로 뷰포트마다 다름.
 *
 * 선행 조건: spike dev 서버(npm run dev:spike)가 http://localhost:5173 에서 기동 중.
 */

import { test, expect } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyPinkMask } from './fixtures/masks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.resolve(__filename, '..');

const BASE_URL = 'http://localhost:5173';

// Artifacts are saved per test run for post-run diff inspection.
const ARTIFACTS_DIR = path.resolve(__dirname, 'artifacts');
fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Test 1: Pixel parity — ADR-0001 D6
// ---------------------------------------------------------------------------

test('ADR-0001 D6: viewer vs editor pixel parity (overlay masked)', async ({ page, viewport }) => {
  const vw = viewport?.width  ?? 1024;
  const vh = viewport?.height ?? 768;
  const VIEWPORT_PIXELS = vw * vh;
  const MAX_DIFF_PX = Math.floor(VIEWPORT_PIXELS * 0.001);

  // Step 1: Navigate to editor
  await page.goto(`${BASE_URL}/editor.html`);
  await page.waitForSelector('[data-fjs-id="card-1"]');
  await page.waitForSelector('.fjs-powered-by');
  await page.waitForSelector('[data-testid="overlay"] .fjs-designer-overlay-selection');

  // Step 2: Compute overlay rect relative to #form-root
  const overlayRect = await page.evaluate(() => {
    const formRoot = document.querySelector('#form-root') as HTMLElement;
    const sel      = document.querySelector(
      '[data-testid="overlay"] .fjs-designer-overlay-selection',
    ) as HTMLElement | null;

    if (!formRoot || !sel) return { x: 0, y: 0, w: 0, h: 0 };

    const rootRect = formRoot.getBoundingClientRect();
    const selRect  = sel.getBoundingClientRect();
    const EXPAND = 8;
    return {
      x: selRect.left - rootRect.left - EXPAND,
      y: selRect.top  - rootRect.top  - EXPAND,
      w: selRect.width  + EXPAND * 2,
      h: selRect.height + EXPAND * 2,
    };
  });

  // Step 3: Screenshot editor #form-root
  const editorRaw: Buffer = await page.locator('#form-root').screenshot({
    animations: 'disabled',
  });

  // Step 4: Navigate to viewer
  await page.goto(`${BASE_URL}/viewer.html`);
  await page.waitForSelector('[data-fjs-id="card-1"]');
  await page.waitForSelector('.fjs-powered-by');

  // Step 5: Screenshot viewer #viewer-root
  const viewerRaw: Buffer = await page.locator('#viewer-root').screenshot({
    animations: 'disabled',
  });

  // Step 6: Apply pink mask at same rect on both
  const editorBuf = applyPinkMask(editorRaw, overlayRect, '#FF00FF');
  const viewerBuf = applyPinkMask(viewerRaw, overlayRect, '#FF00FF');

  // Step 7: pixelmatch comparison
  const imgViewer = PNG.sync.read(viewerBuf);
  const imgEditor = PNG.sync.read(editorBuf);
  const { width, height } = imgViewer;

  expect(imgEditor.width).toBe(width);
  expect(imgEditor.height).toBe(height);

  const diffPng    = new PNG({ width, height });
  const diffPixels = pixelmatch(
    imgViewer.data,
    imgEditor.data,
    diffPng.data,
    width,
    height,
    { threshold: 0.1, includeAA: false },
  );

  // Step 8: Save artifacts
  const prefix = `${vw}x${vh}`;
  fs.writeFileSync(path.join(ARTIFACTS_DIR, `${prefix}-viewer.png`), viewerBuf);
  fs.writeFileSync(path.join(ARTIFACTS_DIR, `${prefix}-editor.png`), editorBuf);
  fs.writeFileSync(path.join(ARTIFACTS_DIR, `${prefix}-diff.png`),   PNG.sync.write(diffPng));

  console.log(
    `[${prefix}] diff pixels: ${diffPixels} / ${VIEWPORT_PIXELS} (max ${MAX_DIFF_PX})`,
  );

  // Step 9: Assert
  expect(
    diffPixels,
    `[${prefix}] Pixel diff ${diffPixels} exceeds the 0.1% threshold (${MAX_DIFF_PX} px). ` +
    `Inspect e2e/artifacts/${prefix}-diff.png for details.`,
  ).toBeLessThanOrEqual(MAX_DIFF_PX);
});

// ---------------------------------------------------------------------------
// Test 2: Overlay alignment — ADR-0001 D3 좌표 정렬
// ---------------------------------------------------------------------------

test('ADR-0001 D3: overlay selection box aligns with Card within 2px tolerance', async ({ page, viewport }) => {
  const vw = viewport?.width  ?? 1024;
  const vh = viewport?.height ?? 768;
  const prefix = `${vw}x${vh}`;

  await page.goto(`${BASE_URL}/editor.html`);
  await page.waitForSelector('[data-fjs-id="card-1"]');
  await page.waitForSelector('[data-testid="overlay"] .fjs-designer-overlay-selection');

  const { cardRect, selRect } = await page.evaluate(() => {
    const card = document.querySelector('[data-fjs-id="card-1"]') as HTMLElement;
    const sel  = document.querySelector(
      '[data-testid="overlay"] .fjs-designer-overlay-selection',
    ) as HTMLElement;

    const c = card.getBoundingClientRect();
    const s = sel.getBoundingClientRect();

    return {
      cardRect: { left: c.left, top: c.top, width: c.width, height: c.height },
      selRect:  { left: s.left, top: s.top, width: s.width, height: s.height },
    };
  });

  const TOL = 2;
  expect(
    Math.abs(selRect.left   - cardRect.left),
    `[${prefix}] left off by ${selRect.left - cardRect.left}`,
  ).toBeLessThanOrEqual(TOL);
  expect(
    Math.abs(selRect.top    - cardRect.top),
    `[${prefix}] top off by ${selRect.top - cardRect.top}`,
  ).toBeLessThanOrEqual(TOL);
  expect(
    Math.abs(selRect.width  - cardRect.width),
    `[${prefix}] width off by ${selRect.width - cardRect.width}`,
  ).toBeLessThanOrEqual(TOL);
  expect(
    Math.abs(selRect.height - cardRect.height),
    `[${prefix}] height off by ${selRect.height - cardRect.height}`,
  ).toBeLessThanOrEqual(TOL);
});
