/**
 * Modal LG fixture entry — size="lg" 렌더
 */
import { h, render } from 'preact';
import { ModalComponent } from '../../src/modal/Modal';
import type { ModalSchema } from '../../src/modal/propsSchema';
import type { PureRenderProps } from '@form-js-designer/designer-core';

const baseField: ModalSchema = {
  id: 'modal-lg-fixture',
  type: 'modal',
  title: '모달 제목 (LG)',
  description: '큰 크기의 모달입니다.',
  triggerLabel: '모달 열기',
  size: 'lg',
  portalContainerRef: '#portal-anchor',
};

const baseProps: PureRenderProps<ModalSchema> = {
  field: baseField,
  value: null,
  domId: 'modal-lg-fixture-dom',
  errors: [],
  disabled: false,
  readonly: false,
};

const Comp = ModalComponent.component;

function ViewerRoot() {
  return <Comp {...baseProps} domId="modal-viewer" />;
}

function EditorRoot() {
  return <Comp {...baseProps} domId="modal-editor" />;
}

const viewerEl = document.getElementById('viewer-root');
const editorEl = document.getElementById('editor-root');

if (viewerEl) render(<ViewerRoot />, viewerEl);
if (editorEl) render(<EditorRoot />, editorEl);
