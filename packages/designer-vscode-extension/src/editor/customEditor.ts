/**
 * customEditor.ts
 *
 * TSK-05-04: Custom Editor webview — createFormEditor 실 구현
 *
 * dist/webview/customEditor.js로 번들되는 브라우저 컨텍스트 진입점.
 * VSCode Custom Editor (*.form.json)의 webview panel 내에서 실행된다.
 *
 * contributes.customEditors[viewType="formJsDesigner.formEditor"]에 의해 등록된다.
 *
 * 구현 범위:
 * - createFormEditor({ container, schema, additionalModules: [customComponentsModule] }) 호출
 * - editor 인스턴스(destroy 포함) 반환
 * - TODO(TSK-02-01): postMessage 계약(edit-opened/save-schema) 및 round-trip 구현
 */
import { createFormEditor } from '@bpmn-io/form-js-editor';
import { customComponentsModule } from '../components';

/** Augmented global window for custom editor lifecycle tracking. */
interface CustomEditorWindow extends Window {
  __formJsCustomEditorLoaded?: boolean;
}

/** form-js editor 인스턴스 최소 계약 */
export interface FormEditorInstance {
  destroy(): void;
  importSchema?(schema: unknown): Promise<void>;
}

/**
 * initCustomEditor — Custom Editor webview 진입 함수
 *
 * @param container - form-js editor를 마운트할 DOM 컨테이너
 * @param schema - 초기 마운트 스키마 (form-js JSON schema)
 * @returns FormEditorInstance (destroy 포함)
 *
 * TODO(TSK-02-01): postMessage 핸들링(edit-opened 수신, save-schema 발신) 추가
 */
export async function initCustomEditor(
  container: HTMLElement,
  schema: unknown,
): Promise<FormEditorInstance> {
  const editor = await createFormEditor({
    container,
    schema,
    additionalModules: [customComponentsModule],
  });
  return editor as unknown as FormEditorInstance;
}

// 웹뷰 자동 실행: window가 있으면 로드 완료를 마킹
if (typeof window !== 'undefined') {
  (window as CustomEditorWindow).__formJsCustomEditorLoaded = true;
}
