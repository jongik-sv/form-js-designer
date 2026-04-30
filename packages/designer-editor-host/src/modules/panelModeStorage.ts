/**
 * panelModeStorage — Single source of truth for the persisted Simple/Full
 * properties-panel mode key.
 *
 * Three sites read/write this state (App.tsx init, App.tsx persist effect,
 * PropsPanelService constructor seed). Inlining the literal `'designer.panelMode'`
 * at each site invites silent drift: a typo in one reader would fall back to
 * `'simple'` without throwing, breaking Full-mode default for any user that
 * already toggled the panel. Centralising the key + accessor functions here
 * makes the contract explicit and refactor-safe.
 *
 * Both reader and writer guard against SSR (`window === undefined`) and
 * privacy-mode/quota throws by swallowing the exception and returning the
 * Simple-mode default.
 */

export const PANEL_MODE_STORAGE_KEY = 'designer.panelMode';
export type PanelMode = 'simple' | 'full';

export function readStoredPanelMode(): PanelMode {
  try {
    if (typeof window === 'undefined') return 'simple';
    return window.sessionStorage.getItem(PANEL_MODE_STORAGE_KEY) === 'full' ? 'full' : 'simple';
  } catch {
    return 'simple';
  }
}

export function writeStoredPanelMode(mode: PanelMode): void {
  try {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(PANEL_MODE_STORAGE_KEY, mode);
    }
  } catch {
    /* SSR / privacy / quota — silently swallow */
  }
}
