/**
 * customEditor.ts
 *
 * Custom Editor webview 스텁
 *
 * dist/webview/customEditor.js로 번들되는 브라우저 컨텍스트 진입점.
 * VSCode Custom Editor (*.form.json)의 webview panel 내에서 실행된다.
 *
 * contributes.customEditors[viewType="formJsDesigner.formEditor"]에 의해 등록된다.
 */

// TODO(TSK-00-02): Mount Preact + form-js editor into #app

/** Augmented global window for custom editor lifecycle tracking. */
interface CustomEditorWindow extends Window {
  __formJsCustomEditorLoaded?: boolean;
}

// Stub: mark that the custom editor webview script has loaded
if (typeof window !== 'undefined') {
  (window as CustomEditorWindow).__formJsCustomEditorLoaded = true;
}
