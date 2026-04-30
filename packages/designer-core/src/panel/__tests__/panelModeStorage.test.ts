/**
 * panelModeStorage unit tests — covers SSR fallback, missing key, valid
 * values, invalid value, write+read roundtrip, and exception swallow.
 *
 * The module is the single source of truth for the `'designer.panelMode'`
 * sessionStorage key consumed by host App.tsx (init + persist effect),
 * host PropsPanelService (constructor seed), and the VS Code extension
 * webview (PropsPanelService + customEditor). Drift between any of those
 * readers would silently break Full-mode default, so the contract is
 * exercised directly here.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  PANEL_MODE_STORAGE_KEY,
  readStoredPanelMode,
  writeStoredPanelMode,
} from '../panelModeStorage';

describe('panelModeStorage', () => {
  beforeEach(() => {
    try { window.sessionStorage.removeItem(PANEL_MODE_STORAGE_KEY); } catch { /* noop */ }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    try { window.sessionStorage.removeItem(PANEL_MODE_STORAGE_KEY); } catch { /* noop */ }
  });

  it('returns "simple" when window is undefined (SSR)', () => {
    const orig = globalThis.window;
    delete (globalThis as { window?: Window }).window;
    try {
      expect(readStoredPanelMode()).toBe('simple');
    } finally {
      (globalThis as { window?: Window }).window = orig;
    }
  });

  it('returns "simple" when key is missing', () => {
    expect(readStoredPanelMode()).toBe('simple');
  });

  it('returns "full" when sessionStorage holds "full"', () => {
    window.sessionStorage.setItem(PANEL_MODE_STORAGE_KEY, 'full');
    expect(readStoredPanelMode()).toBe('full');
  });

  it('returns "simple" when sessionStorage holds "simple"', () => {
    window.sessionStorage.setItem(PANEL_MODE_STORAGE_KEY, 'simple');
    expect(readStoredPanelMode()).toBe('simple');
  });

  it('returns "simple" for any invalid value (strict === "full" check)', () => {
    window.sessionStorage.setItem(PANEL_MODE_STORAGE_KEY, 'compact');
    expect(readStoredPanelMode()).toBe('simple');
    window.sessionStorage.setItem(PANEL_MODE_STORAGE_KEY, 'FULL');
    expect(readStoredPanelMode()).toBe('simple');
    window.sessionStorage.setItem(PANEL_MODE_STORAGE_KEY, '');
    expect(readStoredPanelMode()).toBe('simple');
  });

  it('write + read roundtrip preserves both modes', () => {
    writeStoredPanelMode('full');
    expect(window.sessionStorage.getItem(PANEL_MODE_STORAGE_KEY)).toBe('full');
    expect(readStoredPanelMode()).toBe('full');

    writeStoredPanelMode('simple');
    expect(window.sessionStorage.getItem(PANEL_MODE_STORAGE_KEY)).toBe('simple');
    expect(readStoredPanelMode()).toBe('simple');
  });

  it('swallows sessionStorage exceptions on read', () => {
    vi.spyOn(window.sessionStorage, 'getItem').mockImplementation(() => {
      throw new Error('privacy mode');
    });
    expect(() => readStoredPanelMode()).not.toThrow();
    expect(readStoredPanelMode()).toBe('simple');
  });

  it('swallows sessionStorage exceptions on write', () => {
    vi.spyOn(window.sessionStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    expect(() => writeStoredPanelMode('full')).not.toThrow();
  });
});
