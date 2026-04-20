/**
 * waitForCustomEditor.ts — TSK-02-01
 *
 * Custom Editor 패널이 지정된 viewType으로 열릴 때까지 대기하는 헬퍼.
 * @vscode/test-electron 통합 테스트에서 사용한다.
 *
 * 타임아웃: 15초, 폴링 간격: 50ms
 */

import * as vscode from 'vscode';

export interface WaitForCustomEditorOptions {
  /** 대기할 Custom Editor viewType (기본: 'form-js.block-editor') */
  viewType?: string;
  /** 타임아웃(ms), 기본 15000 */
  timeout?: number;
  /** 폴링 간격(ms), 기본 50 */
  interval?: number;
}

/**
 * Custom Editor 패널이 열릴 때까지 대기한다.
 *
 * VSCode 1.85+의 `tabGroups` API로 Custom Editor 탭 등장을 감지한다.
 *
 * @throws 타임아웃 초과 시 Error
 */
export async function waitForCustomEditor(
  options: WaitForCustomEditorOptions = {}
): Promise<void> {
  const {
    viewType = 'form-js.block-editor',
    timeout = 15000,
    interval = 50,
  } = options;

  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    if (vscode.window.tabGroups) {
      for (const group of vscode.window.tabGroups.all) {
        for (const tab of group.tabs) {
          const input = tab.input;
          if (
            input &&
            typeof input === 'object' &&
            'viewType' in input &&
            (input as { viewType: string }).viewType === viewType
          ) {
            return;
          }
        }
      }
    }

    await new Promise<void>((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(
    `waitForCustomEditor: viewType="${viewType}" 패널이 ${timeout}ms 내에 열리지 않았습니다.`
  );
}
