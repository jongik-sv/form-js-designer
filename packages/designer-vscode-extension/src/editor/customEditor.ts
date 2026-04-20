/**
 * customEditor.ts — TSK-02-01
 *
 * form-js.block-editor Custom Editor webview 진입점.
 *
 * dist/webview/customEditor.js (browser IIFE)로 번들된다.
 * VSCode Custom Editor webview panel 내에서 실행된다.
 *
 * 책임:
 * - acquireVsCodeApi()로 extension host 통신 채널 확보
 * - `edit-opened` 메시지 수신 → createFormEditor({ container, schema }) 마운트
 * - 저장 버튼 클릭 → `save-schema` 메시지 송신 (스텁; 실제 저장은 TSK-02-04)
 * - window unload 시 editor.destroy() 호출
 */

import { createFormEditor } from '@bpmn-io/form-js-editor';
import type { EditOpenedMessage, SaveSchemaMessage } from '../shared/messages';

/** VSCode webview API 타입 */
interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

/** window 확장: acquireVsCodeApi + lifecycle tracking */
interface CustomEditorWindow extends Window {
  acquireVsCodeApi?(): VsCodeApi;
  __formJsCustomEditorLoaded?: boolean;
}

/** form-js editor 인스턴스 타입 */
interface FormEditorInstance {
  destroy(): void;
  saveSchema?(): unknown;
}

let vscodeApi: VsCodeApi | null = null;
let editorInstance: FormEditorInstance | null = null;

/**
 * form-js editor를 #app 컨테이너에 마운트한다.
 */
export async function mountEditor(schema: unknown): Promise<void> {
  const container = document.getElementById('app');
  if (!container) {
    console.error('[form-js editor] #app 컨테이너를 찾을 수 없습니다.');
    return;
  }

  // 기존 인스턴스 정리
  if (editorInstance) {
    try {
      editorInstance.destroy();
    } catch {
      // destroy 실패 무시
    }
    editorInstance = null;
  }

  try {
    editorInstance = await createFormEditor({
      container,
      schema,
    }) as FormEditorInstance;
  } catch (err) {
    console.error('[form-js editor] createFormEditor 실패:', err);
    container.textContent = `편집기 초기화 실패: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * extension host로 save-schema 메시지를 송신한다.
 * 실제 저장 처리는 TSK-02-04에서 연결한다.
 */
export function sendSaveSchema(): void {
  if (!vscodeApi || !editorInstance) return;

  try {
    const schema = typeof editorInstance.saveSchema === 'function'
      ? editorInstance.saveSchema()
      : null;

    const msg: SaveSchemaMessage = {
      type: 'save-schema',
      schema: schema ? JSON.stringify(schema) : '{}',
    };
    vscodeApi.postMessage(msg);
  } catch (err) {
    console.error('[form-js editor] save-schema 송신 실패:', err);
  }
}

export function init(): void {
  const win = window as CustomEditorWindow;

  // lifecycle tracking
  win.__formJsCustomEditorLoaded = true;

  // acquireVsCodeApi
  if (typeof win.acquireVsCodeApi === 'function') {
    vscodeApi = win.acquireVsCodeApi();
  }

  // edit-opened 메시지 수신
  window.addEventListener('message', (event: MessageEvent) => {
    const msg = event.data as EditOpenedMessage;
    if (msg?.type === 'edit-opened') {
      let schema: unknown;
      try {
        schema = typeof msg.schema === 'string' ? JSON.parse(msg.schema) : msg.schema;
      } catch {
        schema = { type: 'default', components: [] };
      }
      void mountEditor(schema);
    }
  });

  // 저장 버튼 wiring (스텁 — TSK-02-04에서 완성)
  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', sendSaveSchema);
  }

  // unload 시 정리
  window.addEventListener('unload', () => {
    if (editorInstance) {
      try {
        editorInstance.destroy();
      } catch {
        // 무시
      }
      editorInstance = null;
    }
  });
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
