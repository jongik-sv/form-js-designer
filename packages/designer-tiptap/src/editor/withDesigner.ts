// packages/designer-tiptap/src/editor/withDesigner.ts
//
// HOC that wraps the v0.1 FormJsBlock node with a double-click handler that
// opens the embedded designer modal. The wrapped node delegates the actual
// viewer DOM creation to v0.1's createFormJsViewerNodeView (which already
// handles the async mountFormJs lifecycle correctly), then layers a dblclick
// listener that mounts mountEmbeddedEditorModal — single-instance gated.

import { mountEmbeddedEditorModal } from '@form-js-designer/designer-editor-host/embedded';
import type {
  EmbeddedEditorHandle,
  FormSchema,
} from '@form-js-designer/designer-editor-host/embedded';
import type { NodeViewRendererProps } from '@tiptap/core';
import { FormJsBlock } from '../node';
import { createFormJsViewerNodeView } from '../nodeview/viewer';
import {
  getActiveModal,
  setActiveModal,
  clearActiveModal,
  focusActiveModal,
} from './modalPortal';

export function withDesigner(node: typeof FormJsBlock): typeof FormJsBlock {
  return node.extend({
    addNodeView() {
      return (props: NodeViewRendererProps) => {
        const { node: pmNode, getPos, editor } = props;
        const baseView = createFormJsViewerNodeView(props) as ReturnType<
          typeof createFormJsViewerNodeView
        > & { dom: HTMLElement; destroy?: () => void };

        const dom = baseView.dom;

        const onDblClick = (e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          if (getActiveModal() !== null) {
            focusActiveModal();
            return;
          }
          void (async () => {
            let handle: EmbeddedEditorHandle | null = null;
            try {
              handle = await mountEmbeddedEditorModal({
                initialSchema: pmNode.attrs.schema as FormSchema,
                onSave: (newSchema: FormSchema) => {
                  const pos = typeof getPos === 'function' ? getPos() : null;
                  if (pos == null) {
                    console.warn('[designer-tiptap] getPos() returned null, skipping update');
                    return;
                  }
                  editor
                    .chain()
                    .setNodeSelection(pos)
                    .updateAttributes(pmNode.type.name, { schema: newSchema })
                    .run();
                },
                onClose: () => {
                  // Host has already torn down the modal DOM by the time onClose
                  // fires (see embeddedDesigner.tsx finishClose flow). Calling
                  // active.destroy() here would re-enter finishClose which is
                  // closing-guarded as a no-op — clearActiveModal() alone is
                  // sufficient to free the singleton slot.
                  clearActiveModal();
                },
              });
              const rootEl = document.querySelector<HTMLElement>('.fjd-embedded-designer-root');
              if (handle && rootEl) {
                setActiveModal(handle, rootEl);
              } else if (handle) {
                // Defensive: handle resolved but root element wasn't found in
                // the document (shouldn't happen — host appends synchronously
                // before resolving). Tear down to avoid an orphan modal that
                // can't be reached via the portal.
                console.warn('[designer-tiptap] .fjd-embedded-designer-root not found; tearing down orphan modal');
                try { handle.destroy(); } catch { /* ignore */ }
              }
            } catch (err) {
              console.error('[designer-tiptap] mountEmbeddedEditorModal failed:', err);
            }
          })();
        };

        dom.addEventListener('dblclick', onDblClick);

        const baseDestroy = baseView.destroy;
        return {
          ...baseView,
          dom,
          destroy() {
            dom.removeEventListener('dblclick', onDblClick);
            baseDestroy?.call(baseView);
            const active = getActiveModal();
            if (active) {
              try {
                active.destroy();
              } catch {
                /* ignore */
              }
            }
          },
        };
      };
    },
  });
}
