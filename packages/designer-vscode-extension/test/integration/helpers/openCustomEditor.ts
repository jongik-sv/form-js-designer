/**
 * openCustomEditor.ts — TSK-02-05
 *
 * formJs.openBlockEditor 커맨드를 호출하여 Custom Editor 패널을 열고
 * editSessionRegistry.getActive(uri) 폴링으로 EditSession이 등록될 때까지 대기한다.
 *
 * @vscode/test-electron 통합 테스트 헬퍼.
 */

import * as vscode from 'vscode';
import type { EditSessionRegistry } from '../../../src/editor/editSession';
import { waitForElement } from './waitForElement';

/**
 * extension host의 editSessionRegistry 싱글톤을 가져온다.
 * FORM_JS_TEST_MODE=1 시 extension.ts가 globalThis에 등록한 인스턴스를 사용한다 (TSK-02-05).
 * extension host와 테스트 번들이 동일 Node.js process를 공유하므로 globalThis를 통해 공유 가능.
 */
function getRegistry(): EditSessionRegistry {
  const registry = (globalThis as Record<string, unknown>)['__formJsEditSessionRegistry'] as EditSessionRegistry | undefined;
  if (!registry) {
    throw new Error('openCustomEditor: __formJsEditSessionRegistry를 globalThis에서 찾을 수 없습니다.');
  }
  return registry;
}

const VIEW_TYPE = 'form-js.block-editor';
const DEFAULT_TIMEOUT_MS = 15000;

export interface OpenCustomEditorOptions {
  /** 펜스 블록 시작 라인 (0-based) */
  mdStart: number;
  /** 펜스 블록 종료 라인 (0-based) */
  mdEnd: number;
  /** 초기 스키마 JSON 문자열 또는 객체 */
  schema: unknown;
  /** 타임아웃(ms), 기본 15000 */
  timeout?: number;
}

/**
 * formJs.openBlockEditor 커맨드를 호출하여 Custom Editor를 열고
 * editSessionRegistry에서 활성 EditSession이 생성될 때까지 대기한다.
 *
 * @param uri 편집 대상 Markdown 문서 URI
 * @param opts 블록 위치 및 스키마 옵션
 * @returns 활성 EditSession
 * @throws waitForElement 타임아웃 초과 시 Error
 */
export async function openCustomEditor(
  uri: vscode.Uri,
  opts: OpenCustomEditorOptions
): Promise<import('../../../src/editor/editSession').EditSession> {
  const { mdStart, mdEnd, schema, timeout = DEFAULT_TIMEOUT_MS } = opts;
  const uriStr = uri.toString();

  await vscode.commands.executeCommand('formJs.openBlockEditor', {
    uri: uriStr,
    mdStart,
    mdEnd,
    schema: typeof schema === 'string' ? schema : JSON.stringify(schema),
  });

  // tabGroups에서 Custom Editor 탭이 등장할 때까지 폴링
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const group of vscode.window.tabGroups.all) {
      for (const tab of group.tabs) {
        const input = tab.input as { viewType?: string } | undefined;
        if (input?.viewType === VIEW_TYPE) {
          // 탭이 열렸으면 registry에서도 세션 조회 폴링
          const remaining = Math.max(500, deadline - Date.now());
          const session = await waitForElement(
            () => getRegistry().getActive(uriStr),
            remaining
          );
          return session;
        }
      }
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }

  throw new Error(
    `openCustomEditor: Custom Editor 탭이 ${timeout}ms 내에 열리지 않았습니다. uri=${uriStr}`
  );
}
