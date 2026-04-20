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
