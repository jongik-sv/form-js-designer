/**
 * Tabs fixture entry point — viewer/editor 두 루트 렌더
 * Vite dev 서버가 /test/fixtures/tabs.html 요청 시 이 파일을 로드한다.
 */
import { h, render } from 'preact';
import { TabsComponent } from '../../src/tabs/Tabs';
import type { TabsSchema } from '../../src/tabs/propsSchema';
import type { PureRenderProps } from '@form-js-designer/designer-core';

const baseField: TabsSchema = {
  id: 'tabs-fixture',
  type: 'tabs',
  tabs: [
    { label: 'Tab 1', value: 'tab1' },
    { label: 'Tab 2', value: 'tab2' },
    { label: 'Tab 3', value: 'tab3' },
  ],
  defaultValue: 'tab1',
  orientation: 'horizontal',
};

const baseProps: PureRenderProps<TabsSchema> = {
  field: baseField,
  value: null,
  domId: 'tabs-fixture-dom',
  errors: [],
  disabled: false,
  readonly: false,
};

const Comp = TabsComponent.component;

function ViewerRoot() {
  return <Comp {...baseProps} domId="tabs-viewer" />;
}

function EditorRoot() {
  return <Comp {...baseProps} domId="tabs-editor" />;
}

const viewerEl = document.getElementById('viewer-root');
const editorEl = document.getElementById('editor-root');

if (viewerEl) render(<ViewerRoot />, viewerEl);
if (editorEl) render(<EditorRoot />, editorEl);
