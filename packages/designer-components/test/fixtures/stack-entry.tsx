/**
 * Stack fixture entry point — viewer/editor 두 루트 렌더
 */
import { h, render } from 'preact';
import { StackComponent } from '../../src/stack/index';
import type { StackSchema } from '../../src/stack/propsSchema';
import type { PureRenderProps } from '@form-js-designer/designer-core';

const baseField: StackSchema = {
  id: 'stack-fixture',
  type: 'stack',
  direction: 'vertical',
  gap: 4,
  align: 'start',
  justify: 'start',
};

const baseProps: PureRenderProps<StackSchema> = {
  field: baseField,
  value: null,
  domId: 'stack-fixture-dom',
  errors: [],
  disabled: false,
  readonly: false,
};

const Comp = StackComponent.component;

function ViewerRoot() {
  return <Comp {...baseProps} domId="stack-viewer" />;
}

function EditorRoot() {
  return <Comp {...baseProps} domId="stack-editor" />;
}

const viewerEl = document.getElementById('viewer-root');
const editorEl = document.getElementById('editor-root');

if (viewerEl) render(<ViewerRoot />, viewerEl);
if (editorEl) render(<EditorRoot />, editorEl);
