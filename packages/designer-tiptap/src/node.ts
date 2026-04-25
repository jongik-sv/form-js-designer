import { Node, mergeAttributes } from '@tiptap/core';
import { createFormJsViewerNodeView } from './nodeview/viewer';

export interface FormJsBlockAttrs {
  schema: Record<string, unknown> | null;
  formId: string | null;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    formJsBlock: {
      insertFormJsBlock: (schema: Record<string, unknown>, formId?: string) => ReturnType;
      updateFormJsBlock: (schema: Record<string, unknown>) => ReturnType;
    };
  }
}

export const FormJsBlock = Node.create({
  name: 'formJsBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      schema: {
        default: null,
        parseHTML: (el) => {
          const raw = (el as HTMLElement).getAttribute('data-form-schema');
          if (!raw) return null;
          try {
            return JSON.parse(raw);
          } catch {
            return null;
          }
        },
        renderHTML: (attrs) => ({
          'data-form-schema': attrs.schema ? JSON.stringify(attrs.schema) : '',
        }),
      },
      formId: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-form-id'),
        renderHTML: (attrs) => (attrs.formId ? { 'data-form-id': attrs.formId } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="form-js-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'form-js-block' })];
  },

  addCommands() {
    return {
      insertFormJsBlock:
        (schema, formId) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { schema, formId: formId ?? null },
          }),
      updateFormJsBlock:
        (schema) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { schema }),
    };
  },

  addNodeView() {
    return createFormJsViewerNodeView;
  },
});
