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

// TSK-05-01: customComponentsModule import — tree-shaking 방지용 최소 연결
// TSK-02-01에서 createFormEditor({ additionalModules: [customComponentsModule] })로 승격 예정
import { customComponentsModule } from '../components';

// TODO(TSK-00-02): Mount Preact + form-js editor into #app

/** Augmented global window for custom editor lifecycle tracking. */
interface CustomEditorWindow extends Window {
  __formJsCustomEditorLoaded?: boolean;
}

// Stub: mark that the custom editor webview script has loaded
if (typeof window !== 'undefined') {
  // tree-shaking 방지: customComponentsModule이 번들에 포함되도록 참조 유지
  void customComponentsModule;
  (window as CustomEditorWindow).__formJsCustomEditorLoaded = true;
}
