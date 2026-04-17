/**
 * Modal fixture entry point — viewer/editor 두 루트 렌더
 * Vite dev 서버가 /test/fixtures/modal.html 요청 시 이 파일을 로드한다.
 *
 * Portal.container: '#portal-anchor' — axe region 위반 해소 (ADR-0002 D1 조건 3)
 */
import { h, render } from 'preact';
import { ModalComponent } from '../../src/modal/Modal';
import type { ModalSchema } from '../../src/modal/propsSchema';
import type { PureRenderProps } from '@form-js-designer/designer-core';

const baseField: ModalSchema = {
  id: 'modal-fixture',
  type: 'modal',
  title: '모달 제목',
  description: '모달 설명 텍스트입니다.',
  triggerLabel: '모달 열기',
  size: 'md',
  portalContainerRef: '#portal-anchor',
};

const baseProps: PureRenderProps<ModalSchema> = {
  field: baseField,
  value: null,
  domId: 'modal-fixture-dom',
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
