/**
 * Card fixture entry point — viewer/editor 두 루트 렌더
 * Vite dev 서버가 /test/fixtures/card.html 요청 시 이 파일을 로드한다.
 */
import { h, render } from 'preact';
import { CardComponent } from '../../src/card/index';
import type { CardSchema } from '../../src/card/propsSchema';
import type { PureRenderProps } from '@form-js-designer/designer-core';

const baseField: CardSchema = {
  id: 'card-fixture',
  type: 'card',
  padding: 'md',
  elevation: 1,
  header: '카드 제목',
  headerTag: 'h3',
};

const baseProps: PureRenderProps<CardSchema> = {
  field: baseField,
  value: null,
  domId: 'card-fixture-dom',
  errors: [],
  disabled: false,
  readonly: false,
};

const Comp = CardComponent.component;

function ViewerRoot() {
  return <Comp {...baseProps} domId="card-viewer" />;
}

function EditorRoot() {
  return <Comp {...baseProps} domId="card-editor" />;
}

const viewerEl = document.getElementById('viewer-root');
const editorEl = document.getElementById('editor-root');

if (viewerEl) render(<ViewerRoot />, viewerEl);
if (editorEl) render(<EditorRoot />, editorEl);
