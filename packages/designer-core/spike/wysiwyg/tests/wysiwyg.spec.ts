/**
 * wysiwyg.spec.ts
 *
 * ADR-0001 E2E tests: Single Render Pipeline & Designer Overlay
 *
 * Deliverables validated:
 *   D1 — DOM snapshot equality of form-root
 *   D3 — OverlayLayer does not mutate Card DOM
 *   D6 — Viewer vs editor pixel parity (overlay masked)
 *
 * Viewport: 1024 × 768 = 786 432 px.  Pass threshold: ≤ 786 mismatched pixels (0.1 %).
 */

import { test, expect } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyPinkMask, normalizeFormHtml } from './fixtures/masks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.resolve(__filename, '..');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL        = 'http://localhost:5173';
const VIEWPORT_PIXELS = 1024 * 768;           // 786 432
const MAX_DIFF_PX     = Math.floor(VIEWPORT_PIXELS * 0.001); // 786

const ARTIFACTS_DIR = path.resolve(
  __dirname,
  'artifacts',
);

// Ensure artifact dir exists for every run.
fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Runtime note: defineComponent no longer references `process` unconditionally
// (see isProductionEnv() in src/defineComponent.ts). The earlier process-shim
// workaround has been removed — pages now boot cleanly in a vanilla browser.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Test 1: ADR-0001 D6 — pixel parity
// ---------------------------------------------------------------------------

test('ADR-0001 D6: viewer vs editor pixel parity (overlay masked)', async ({ page }) => {
  // ------------------------------------------------------------------
  // Step 1: Navigate to editor first to compute the selection rect.
  //
  // Architecture note: #overlay-root is a SIBLING of #form-root inside
  // #editor-shell, both positioned at the same page coordinates.  When
  // Playwright screenshots #form-root the overlaid selection outline IS
  // visible (the overlay elements paint into the same page-coordinate
  // region).  We therefore cannot use Playwright's `mask` option on
  // #overlay-root because it fills the entire screenshot area pink.
  //
  // Correct strategy:
  //   (a) Compute the selection box rect relative to #form-root.
  //   (b) Screenshot #form-root without any Playwright mask.
  //   (c) Apply applyPinkMask at that rect on the editor screenshot
  //       to blot out the overlay blue outline.
  //   (d) Screenshot #viewer-root; apply applyPinkMask at the same
  //       rect so the two masked images can be compared pixel-for-pixel.
  // ------------------------------------------------------------------

  await page.goto(`${BASE_URL}/editor.html`);
  await page.waitForSelector('[data-fjs-id="card-1"]');
  await page.waitForSelector('.fjs-powered-by');
  await page.waitForSelector('[data-testid="overlay"] .fjs-designer-overlay-selection');

  // ------------------------------------------------------------------
  // Step 2: Compute overlayRect relative to #form-root
  //
  // The rect includes a small expansion to cover the outline-offset and
  // resize handles (handles extend 4 px outside the card bounding box,
  // outline-offset is -1 px so the stroke is inset; we expand by 8 px
  // on each side to capture handles safely).
  // ------------------------------------------------------------------
  const overlayRect = await page.evaluate(() => {
    const formRoot = document.querySelector('#form-root') as HTMLElement;
    const sel      = document.querySelector(
      '[data-testid="overlay"] .fjs-designer-overlay-selection',
    ) as HTMLElement | null;

    if (!formRoot || !sel) {
      return { x: 0, y: 0, w: 0, h: 0 };
    }

    const rootRect = formRoot.getBoundingClientRect();
    const selRect  = sel.getBoundingClientRect();

    // Expand 8 px on every side to cover resize handles (which are 8×8 px
    // centred on the corner/midpoint and extend 4 px outside the selection).
    const EXPAND = 8;
    return {
      x: selRect.left - rootRect.left - EXPAND,
      y: selRect.top  - rootRect.top  - EXPAND,
      w: selRect.width  + EXPAND * 2,
      h: selRect.height + EXPAND * 2,
    };
  });

  // ------------------------------------------------------------------
  // Step 3: Screenshot #form-root (overlay outline IS composited here)
  // ------------------------------------------------------------------
  const editorRaw: Buffer = await page.locator('#form-root').screenshot({
    animations: 'disabled',
  });

  // ------------------------------------------------------------------
  // Step 4: Navigate to viewer, wait for render
  // ------------------------------------------------------------------
  await page.goto(`${BASE_URL}/viewer.html`);
  await page.waitForSelector('[data-fjs-id="card-1"]');
  await page.waitForSelector('.fjs-powered-by');

  // ------------------------------------------------------------------
  // Step 5: Screenshot #viewer-root
  // ------------------------------------------------------------------
  const viewerRaw: Buffer = await page.locator('#viewer-root').screenshot({
    animations: 'disabled',
  });

  // ------------------------------------------------------------------
  // Step 6: Apply the same pink mask to BOTH screenshots at overlayRect.
  //
  // This blots out:
  //  - editor: the blue selection outline + resize handles
  //  - viewer: the equivalent region (should be pure white card content,
  //    but we mask it anyway for a fair apples-to-apples comparison)
  // ------------------------------------------------------------------
  const editorBuf  = applyPinkMask(editorRaw,  overlayRect, '#FF00FF');
  const viewerBuf  = applyPinkMask(viewerRaw,  overlayRect, '#FF00FF');

  // ------------------------------------------------------------------
  // Step 7: pixelmatch comparison
  // ------------------------------------------------------------------
  const imgViewer = PNG.sync.read(viewerBuf);
  const imgEditor = PNG.sync.read(editorBuf);

  const { width, height } = imgViewer;

  // Guard: images must be same size (both screenshots of same-sized element)
  expect(imgEditor.width).toBe(width);
  expect(imgEditor.height).toBe(height);

  const diffPng  = new PNG({ width, height });
  const diffPixels = pixelmatch(
    imgViewer.data,
    imgEditor.data,
    diffPng.data,
    width,
    height,
    { threshold: 0.1, includeAA: false },
  );

  // ------------------------------------------------------------------
  // Step 8: Save artifacts
  // ------------------------------------------------------------------
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'viewer.png'), viewerBuf);
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'editor.png'), editorBuf);
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'diff.png'),   PNG.sync.write(diffPng));

  console.log(
    `diff pixels: ${diffPixels} / ${VIEWPORT_PIXELS} (max ${MAX_DIFF_PX})`,
  );

  // ------------------------------------------------------------------
  // Step 9: Assert
  // ------------------------------------------------------------------
  expect(
    diffPixels,
    `Pixel diff ${diffPixels} exceeds the 0.1 % threshold (${MAX_DIFF_PX} px). ` +
    `Inspect tests/artifacts/diff.png for details.`,
  ).toBeLessThanOrEqual(MAX_DIFF_PX);
});

// ---------------------------------------------------------------------------
// Test 2: ADR-0001 D1 — DOM snapshot equality
// ---------------------------------------------------------------------------

test('ADR-0001 D1: DOM snapshot equality of form-root', async ({ page }) => {
  // --- viewer ---
  await page.goto(`${BASE_URL}/viewer.html`);
  await page.waitForSelector('[data-fjs-id="card-1"]');
  await page.waitForSelector('.fjs-powered-by');

  const viewerHtml = await page.locator('#viewer-root').innerHTML();

  // --- editor ---
  await page.goto(`${BASE_URL}/editor.html`);
  await page.waitForSelector('[data-fjs-id="card-1"]');
  await page.waitForSelector('.fjs-powered-by');
  await page.waitForSelector('[data-testid="overlay"] .fjs-designer-overlay-selection');

  const editorHtml = await page.locator('#form-root').innerHTML();

  // --- compare ---
  const viewerNorm = normalizeFormHtml(viewerHtml);
  const editorNorm = normalizeFormHtml(editorHtml);

  expect(editorNorm).toBe(viewerNorm);
});

// ---------------------------------------------------------------------------
// Test 3: ADR-0001 D3 — OverlayLayer does not mutate Card DOM
// ---------------------------------------------------------------------------

test('ADR-0001 D3: OverlayLayer does not mutate Card DOM', async ({ page }) => {
  await page.goto(`${BASE_URL}/editor.html`);
  await page.waitForSelector('[data-fjs-id="card-1"]');
  await page.waitForSelector('.fjs-powered-by');
  await page.waitForSelector('[data-testid="overlay"] .fjs-designer-overlay-selection');

  // Capture #form-root innerHTML immediately after render
  const htmlBefore = normalizeFormHtml(
    await page.locator('#form-root').innerHTML(),
  );

  // Wait 500 ms for any late mutations
  await page.waitForTimeout(500);

  // Re-capture
  const htmlAfter = normalizeFormHtml(
    await page.locator('#form-root').innerHTML(),
  );

  // form-root must be stable
  expect(htmlAfter).toBe(htmlBefore);

  // Overlay must actually be active — otherwise "no mutation" is trivially true
  await expect(
    page.locator('[data-testid="overlay"] .fjs-designer-overlay-selection'),
  ).toBeVisible();

  // No element inside #form-root may carry a fjs-designer-* class
  const leakedClasses = await page.evaluate(() => {
    const root = document.querySelector('#form-root');
    if (!root) return [];
    const all = Array.from(root.querySelectorAll('*'));
    const leaked: string[] = [];
    for (const el of all) {
      for (const cls of el.classList) {
        if (cls.startsWith('fjs-designer-')) {
          leaked.push(`${el.tagName.toLowerCase()}[class="${el.className}"]`);
        }
      }
    }
    return leaked;
  });

  expect(
    leakedClasses,
    `Overlay classes leaked into #form-root: ${leakedClasses.join(', ')}`,
  ).toHaveLength(0);
});

// ---------------------------------------------------------------------------
// Test 4: Overlay alignment at a wider-than-form viewport
//
// Regression: when the user's viewport is wider than the form (1024 px),
// the overlay used to cover the full viewport while #form-root was centered,
// so selection boxes were shifted to the left of the actual Card. The 1024-px
// Playwright viewport hid this by coincidence (editor-shell width = form width).
// We explicitly re-test at 1440 px to ensure the alignment is correct.
// ---------------------------------------------------------------------------

test('ADR-0001: overlay aligns with Card at wider viewport (1440 px)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
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

  // Selection box must track the Card within 2 px tolerance on every edge.
  const TOL = 2;
  expect(Math.abs(selRect.left   - cardRect.left),   `left off by ${selRect.left - cardRect.left}`).toBeLessThanOrEqual(TOL);
  expect(Math.abs(selRect.top    - cardRect.top),    `top off by ${selRect.top - cardRect.top}`).toBeLessThanOrEqual(TOL);
  expect(Math.abs(selRect.width  - cardRect.width),  `width off by ${selRect.width - cardRect.width}`).toBeLessThanOrEqual(TOL);
  expect(Math.abs(selRect.height - cardRect.height), `height off by ${selRect.height - cardRect.height}`).toBeLessThanOrEqual(TOL);
});

// ---------------------------------------------------------------------------
// Test 5: License — bpmn.io watermark visible in both viewer and editor
// ---------------------------------------------------------------------------

test('License: bpmn.io watermark is visible in both viewer and editor', async ({ page }) => {
  // --- Viewer ---
  await page.goto(`${BASE_URL}/viewer.html`);
  await page.waitForSelector('[data-fjs-id="card-1"]');

  const viewerWatermark = page.locator('#viewer-root .fjs-powered-by');
  await expect(viewerWatermark).toBeVisible();

  const viewerBox = await viewerWatermark.boundingBox();
  expect(viewerBox).not.toBeNull();
  expect(viewerBox!.width).toBeGreaterThan(0);
  expect(viewerBox!.height).toBeGreaterThan(0);

  // Computed styles — must not be hidden
  const viewerStyles = await viewerWatermark.evaluate((el: Element) => {
    const cs = window.getComputedStyle(el);
    return {
      display:    cs.display,
      visibility: cs.visibility,
      opacity:    parseFloat(cs.opacity),
    };
  });
  expect(viewerStyles.display).not.toBe('none');
  expect(viewerStyles.visibility).not.toBe('hidden');
  expect(viewerStyles.opacity).toBeGreaterThan(0.1);

  // --- Editor ---
  await page.goto(`${BASE_URL}/editor.html`);
  await page.waitForSelector('[data-fjs-id="card-1"]');
  await page.waitForSelector('[data-testid="overlay"] .fjs-designer-overlay-selection');

  const editorWatermark = page.locator('#form-root .fjs-powered-by');
  await expect(editorWatermark).toBeVisible();

  const editorBox = await editorWatermark.boundingBox();
  expect(editorBox).not.toBeNull();
  expect(editorBox!.width).toBeGreaterThan(0);
  expect(editorBox!.height).toBeGreaterThan(0);

  // Computed styles — must not be hidden
  const editorStyles = await editorWatermark.evaluate((el: Element) => {
    const cs = window.getComputedStyle(el);
    return {
      display:    cs.display,
      visibility: cs.visibility,
      opacity:    parseFloat(cs.opacity),
    };
  });
  expect(editorStyles.display).not.toBe('none');
  expect(editorStyles.visibility).not.toBe('hidden');
  expect(editorStyles.opacity).toBeGreaterThan(0.1);

  // Overlay must not fully cover the watermark.
  // "fully covers" means: overlayRect contains the entire watermark rect.
  // Playwright's toBeVisible() already confirms the element is not
  // scroll-clipped or hidden — but we additionally assert the geometry.
  const coverCheck = await page.evaluate(() => {
    const watermark = document.querySelector('#form-root .fjs-powered-by') as HTMLElement | null;
    const overlayRoot = document.querySelector('#overlay-root') as HTMLElement | null;
    if (!watermark || !overlayRoot) return { fullyCovered: false };

    const wRect = watermark.getBoundingClientRect();
    const oRect = overlayRoot.getBoundingClientRect();

    // "Fully covered" = overlayRoot completely encloses watermark AND
    // overlay has pointer-events that would block interaction.
    // (overlay-root is pointer-events:none so it never truly blocks.)
    const fullyCovered =
      oRect.left   <= wRect.left   &&
      oRect.top    <= wRect.top    &&
      oRect.right  >= wRect.right  &&
      oRect.bottom >= wRect.bottom;

    // pointer-events on the overlay-root
    const pe = window.getComputedStyle(overlayRoot).pointerEvents;

    return { fullyCovered, overlayPointerEvents: pe };
  });

  // Either not fully covered, OR pointer-events is 'none' (so it's transparent)
  const safeFromOverlay =
    !coverCheck.fullyCovered ||
    coverCheck.overlayPointerEvents === 'none';

  expect(
    safeFromOverlay,
    `Watermark appears to be fully covered by #overlay-root ` +
    `(pointer-events: ${coverCheck.overlayPointerEvents})`,
  ).toBe(true);
});
