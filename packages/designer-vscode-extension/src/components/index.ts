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

/**
 * form-js additionalModules 주입용 싱글톤 모듈.
 * Card / Tabs / Modal / TabPanel 을 FormFields registry에 등록한다.
 *
 * viewer·editor 양쪽에서 동일 객체 참조를 공유한다.
 */
export const customComponentsModule = DesignerComponentsModule;

/**
 * 팩토리 형태의 export — 테스트에서 격리 인스턴스가 필요한 경우 사용.
 * 싱글톤과 동일 객체를 반환하며, 이는 form-js didi 컨테이너가 참조 동등성을
 * 요구하지 않으므로 기능상 동일하다.
 */
export function createCustomComponentsModule(): typeof DesignerComponentsModule {
  return DesignerComponentsModule;
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
