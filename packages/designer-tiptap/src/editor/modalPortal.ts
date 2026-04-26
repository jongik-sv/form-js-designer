// packages/designer-tiptap/src/editor/modalPortal.ts
//
// Single-instance enforcement for the embedded designer modal.
// withDesigner.onDoubleClick checks `getActiveModal()` before mounting;
// if non-null, focuses the existing modal root instead of opening a second.
//
// The modal handle and root element are tracked at module scope (singleton).
// This is intentional — the spec selected single-instance to avoid focus
// guard prototype-patch conflicts (see spec section 11.4 / 15).

import type { EmbeddedEditorHandle } from '@form-js-designer/designer-editor-host/embedded';

let activeModal: EmbeddedEditorHandle | null = null;
let activeModalRootEl: HTMLElement | null = null;

export function getActiveModal(): EmbeddedEditorHandle | null {
  return activeModal;
}

export function getActiveModalRoot(): HTMLElement | null {
  return activeModalRootEl;
}

export function setActiveModal(handle: EmbeddedEditorHandle, rootEl: HTMLElement): void {
  if (activeModal !== null) {
    throw new Error(
      '[designer-tiptap] setActiveModal called while another modal is active. ' +
      'Single-instance constraint violated.',
    );
  }
  activeModal = handle;
  activeModalRootEl = rootEl;
}

export function clearActiveModal(): void {
  activeModal = null;
  activeModalRootEl = null;
}

/**
 * Attempt to focus the existing modal (used when user double-clicks a second
 * form block while a modal is already open). Returns true if a modal was
 * focused, false if no modal is active.
 */
export function focusActiveModal(): boolean {
  if (activeModalRootEl) {
    activeModalRootEl.focus();
    return true;
  }
  return false;
}
