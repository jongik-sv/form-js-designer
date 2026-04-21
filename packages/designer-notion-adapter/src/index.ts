/**
 * @form-js-designer/designer-notion-adapter
 *
 * 패키지 공개 진입점.
 * form-js-viewer를 Notion-style 블록 에디터에 마운트하는 어댑터 컬렉션.
 */

export { genericMount } from './adapters/generic';
export type { GenericMountOptions } from './adapters/generic';

export { blockNotePlugin, createFormJsBlockSpec, createFormJsInsertSpec } from './adapters/blocknote';
export type { FormJsBlockData, BlockNoteBlockSpec, BlockNoteInsertSpec } from './adapters/blocknote';

export { SchemaEditor } from './SchemaEditor';
export type { SchemaEditorProps } from './SchemaEditor';

export { themeSync } from './themeSync';
export type { ThemeStrategy } from './themeSync';
