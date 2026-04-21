/**
 * TSK-05-01: vscode-extension 커스텀 컴포넌트 모듈
 *
 * @form-js-designer/designer-components의 DesignerComponentsModule을
 * customComponentsModule 별칭으로 re-export한다.
 *
 * viewer(preview.ts)와 editor(customEditor.ts)가 동일 모듈 인스턴스를
 * `createForm({ additionalModules: [customComponentsModule] })`으로 주입한다.
 * Single Source of Truth.
 */
import { DesignerComponentsModule } from '@form-js-designer/designer-components';
import { StackRendererComponent } from './StackRenderer';

interface FormFieldsService {
  register: (type: string, component: unknown) => void;
}

function StackRegistration(formFields: FormFieldsService) {
  formFields.register(StackRendererComponent.type, StackRendererComponent.component);
}
(StackRegistration as unknown as { $inject: string[] }).$inject = ['formFields'];

/**
 * form-js additionalModules 주입용 싱글톤 모듈.
 * Card / Tabs / Modal / TabPanel (designer-components) + Stack (vscode-ext)를
 * FormFields registry에 등록한다.
 *
 * viewer·editor 양쪽에서 동일 객체 참조를 공유한다.
 */
export const customComponentsModule = {
  ...DesignerComponentsModule,
  __init__: [...DesignerComponentsModule.__init__, 'stackRegistration'],
  stackRegistration: ['type' as const, StackRegistration] as ['type', typeof StackRegistration],
};

export function createCustomComponentsModule(): typeof customComponentsModule {
  return customComponentsModule;
}

// defineComponent 계약 및 타입 re-export
export { defineComponent } from './defineComponent';
export type { ExtensionComponentDef } from './defineComponent';
export type { ComponentDefinition, FieldSchema } from '@form-js-designer/designer-core';

// TSK-05-02: VSCode webview 전용 Tabs/TabPanel 렌더러
export { TabsRenderer } from './TabsRenderer';
export type { TabsField, TabsRendererProps } from './TabsRenderer';
export { TabPanelRenderer } from './TabPanelRenderer';
export type { TabPanelField, TabPanelRendererProps } from './TabPanelRenderer';
