/**
 * panelModeStorage — Simple/Full props-panel mode persistence helpers for the
 * VS Code extension webview.
 *
 * Mirrors the host's `designer-editor-host/src/modules/panelModeStorage.ts`:
 * three sites read/write the persisted mode (PropsPanelService constructor
 * seed, customEditor `panelMode` boot value, customEditor toggle handler).
 * Inlining the literal `'designer.panelMode'` at each site invites silent
 * drift, so the storage key + accessor functions live here as a single source
 * of truth.
 *
 * VS Code webview note: `sessionStorage` is scoped per-webview and survives
 * across reveal/hide of the same panel but resets when the webview is
 * disposed. Per Task 9 plan this is acceptable for the 1차 PR. A future
 * `vscode.workspace.getConfiguration('formJsDesigner').get('panelMode')`
 * fallback can be layered on top without changing this contract.
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
