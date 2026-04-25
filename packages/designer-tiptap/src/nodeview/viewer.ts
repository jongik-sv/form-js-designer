import type { NodeViewRenderer, NodeViewRendererProps } from '@tiptap/core';
import { mountFormJs, type MountHandle } from '../mount/mountFormJs';

export const createFormJsViewerNodeView: NodeViewRenderer = (props: NodeViewRendererProps) => {
  const dom = document.createElement('div');
  dom.dataset.type = 'form-js-block';
  dom.classList.add('form-js-tiptap-block');

  const inner = document.createElement('div');
  inner.classList.add('form-js-tiptap-block__inner');
  dom.appendChild(inner);

  let handle: MountHandle | null = null;
  let lastSchemaJson = '';

  const mount = async (schema: Record<string, unknown> | null) => {
    if (!schema) return;
    lastSchemaJson = JSON.stringify(schema);
    handle = await mountFormJs({ container: inner, schema });
  };

  void mount(props.node.attrs.schema as Record<string, unknown> | null);

  return {
    dom,
    update(updatedNode) {
      if (updatedNode.type.name !== props.node.type.name) return false;
      const next = updatedNode.attrs.schema as Record<string, unknown> | null;
      const nextJson = next ? JSON.stringify(next) : '';
      if (nextJson === lastSchemaJson) return true;
      lastSchemaJson = nextJson;
      if (handle && next) void handle.update(next);
      return true;
    },
    destroy() {
      handle?.destroy();
      handle = null;
      while (inner.firstChild) inner.removeChild(inner.firstChild);
    },
    stopEvent(event: Event) {
      const target = event.target as Node | null;
      return inner.contains(target);
    },
    ignoreMutation(mutation) {
      return inner.contains(mutation.target as Node);
    },
  };
};
