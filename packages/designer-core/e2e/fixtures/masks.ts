import { PNG } from 'pngjs';

/**
 * applyPinkMask
 *
 * Decodes a PNG buffer, fills the given rectangle with a solid mask color
 * (default #FF00FF, alpha 255), and re-encodes to PNG.
 *
 * The rect coordinates are in CSS pixels relative to the top-left of the image.
 */
export function applyPinkMask(
  pngBuf: Buffer,
  rect: { x: number; y: number; w: number; h: number },
  hex = '#FF00FF',
): Buffer {
  const img = PNG.sync.read(pngBuf);

  // Parse hex color (#RRGGBB or RRGGBB)
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);

  const { width, height, data } = img;

  const xStart = Math.max(0, Math.round(rect.x));
  const yStart = Math.max(0, Math.round(rect.y));
  const xEnd   = Math.min(width,  Math.round(rect.x + rect.w));
  const yEnd   = Math.min(height, Math.round(rect.y + rect.h));

  for (let y = yStart; y < yEnd; y++) {
    for (let x = xStart; x < xEnd; x++) {
      const idx = (y * width + x) * 4;
      data[idx]     = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  return PNG.sync.write(img);
}

/**
 * normalizeFormHtml
 *
 * Strips form-js-generated unique id tokens (e.g. `fjs-form-abc123-`)
 * and collapses runs of whitespace so the innerHTML of #viewer-root
 * and #form-root can be compared without false positives.
 */
export function normalizeFormHtml(s: string): string {
  return s
    // Remove form-js unique prefix tokens like "fjs-form-abc123-"
    .replace(/fjs-form-[a-z0-9]+-/g, 'fjs-form-TOKEN-')
    // Collapse all whitespace sequences to a single space
    .replace(/\s+/g, ' ')
    .trim();
}
