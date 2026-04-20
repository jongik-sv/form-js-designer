export { locateFenceBody, FenceNotFoundError, blockLocator } from './blockLocator';
export { detectIndent, formatJson, replaceFenceBody } from './workspaceEdit';
export type { FormatJsonOpts } from './workspaceEdit';

// TSK-02-01: Custom Editor Provider + EditSession
export { FormJsBlockEditorProvider, buildHtml, generateNonce } from './customEditorProvider';
export type { BroadcastFn } from './customEditorProvider';
export { EditSessionRegistry, editSessionRegistry } from './editSession';
export type { EditSession, SessionEvent } from './editSession';
export { openBlockEditorCommand, pendingEditSchemas } from './openBlockEditorCommand';
export type { OpenBlockEditorArgs } from './openBlockEditorCommand';

// TSK-02-04: 저장 트랜잭션 + 충돌 모달 + 외부 변경 감지
export { handleSaveSchema } from './saveSchemaController';
export type { SaveSchemaDeps } from './saveSchemaController';
export { showConflictModal } from './conflictModal';
export type { ConflictChoice } from './conflictModal';
export { startSourceWatcher } from './sourceWatcher';
