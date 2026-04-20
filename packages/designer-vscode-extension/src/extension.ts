/**
 * extension.ts
 *
 * VSCode Extension 진입점 스텁
 *
 * activate(ctx) / deactivate() export.
 * 이후 Task에서 Custom Editor 등록 플레이스홀더를 채운다.
 */

import type * as vscode from 'vscode';

/**
 * Extension activation entry point.
 * Called by VSCode when the extension is first activated.
 */
export function activate(_ctx: vscode.ExtensionContext): void {
  // TODO(TSK-00-02): Register Custom Editor provider
  // TODO(TSK-00-03): Register Markdown It plugin for preview
}

/**
 * Extension deactivation entry point.
 * Called by VSCode when the extension is deactivated.
 */
export function deactivate(): void {
  // Cleanup is handled via context.subscriptions in activate()
}
