/**
 * TSK-01-04: openMarkdownPreview 헬퍼
 *
 * vscode.commands.executeCommand('markdown.showPreview', uri)를 래핑한다.
 * preview panel이 등록될 때까지 짧은 딜레이를 준다.
 *
 * reload 케이스에서는 동일 uri로 두 번 호출하여 재열림을 시뮬레이션한다.
 */
import * as vscode from 'vscode';

const PREVIEW_OPEN_DELAY_MS = 200;

/**
 * Markdown Preview 패널을 연다.
 * @param uri 열 문서의 URI
 */
export async function openMarkdownPreview(uri: vscode.Uri): Promise<void> {
  const doc = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(doc, { preview: false });
  await vscode.commands.executeCommand('markdown.showPreview', uri);
  // preview panel이 등록될 때까지 짧은 딜레이
  await delay(PREVIEW_OPEN_DELAY_MS);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
