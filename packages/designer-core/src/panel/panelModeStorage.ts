/**
 * panelModeStorage — Single source of truth for the persisted Simple/Full
 * properties-panel mode key, shared across the editor host and the VS Code
 * extension webview.
 *
 * Multiple sites read/write this state (host App.tsx init + persist effect,
 * host PropsPanelService constructor seed, extension PropsPanelService
 * constructor seed, extension customEditor `panelMode` boot value + toggle
 * handler). Inlining the literal `'designer.panelMode'` at each site invites
 * silent drift: a typo in one reader would fall back to `'simple'` without
 * throwing, breaking Full-mode default for any user that already toggled the
 * panel. Centralising the key + accessor functions here makes the contract
 * explicit and refactor-safe.
 *
 * VS Code webview note: `sessionStorage` is scoped per-webview and survives
 * across reveal/hide of the same panel but resets when the webview is
 * disposed. A future
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
