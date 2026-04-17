/**
 * Button fixture entry point — viewer/editor 두 루트 렌더
 */
import { h, render } from 'preact';
import { ButtonComponent } from '../../src/button/index';
import type { ButtonSchema } from '../../src/button/propsSchema';
import type { PureRenderProps } from '@form-js-designer/designer-core';

const baseField: ButtonSchema = {
  id: 'button-fixture',
  type: 'button',
  variant: 'primary',
  size: 'md',
  disabled: false,
  label: '버튼',
};

const baseProps: PureRenderProps<ButtonSchema> = {
  field: baseField,
  value: null,
  domId: 'button-fixture-dom',
  errors: [],
  disabled: false,
  readonly: false,
};

const Comp = ButtonComponent.component;

function ViewerRoot() {
  return <Comp {...baseProps} domId="button-viewer" />;
}

function EditorRoot() {
  return <Comp {...baseProps} domId="button-editor" />;
}

const viewerEl = document.getElementById('viewer-root');
const editorEl = document.getElementById('editor-root');

if (viewerEl) render(<ViewerRoot />, viewerEl);
if (editorEl) render(<EditorRoot />, editorEl);
