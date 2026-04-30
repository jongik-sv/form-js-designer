// packages/designer-tiptap/src/editor/index.ts
//
// v0.2 editor entry — provides withDesigner(FormJsBlock) HOC that adds
// double-click → embedded designer modal behavior to the FormJsBlock node.

import './modal.css';
import './toolbar.css';

export { FormJsBlock } from '../node';
export { withDesigner } from './withDesigner';
export { FormJsToolbar, EMPTY_FORM_SCHEMA } from './toolbar';
export type { FormJsToolbarOptions } from './toolbar';
export type { FormJsBlockAttrs } from '../node';
