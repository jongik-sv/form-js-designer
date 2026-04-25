import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { FormJsBlock } from '../node';

function makeEditor() {
  return new Editor({
    element: document.createElement('div'),
    extensions: [StarterKit, FormJsBlock],
  });
}

describe('FormJsBlock node spec', () => {
  it('inserts a form-js-block with schema attr', () => {
    const editor = makeEditor();
    const schema = { type: 'default', components: [{ type: 'textfield', key: 'name' }] };

    editor.commands.insertContent({
      type: 'formJsBlock',
      attrs: { schema, formId: 'f1' },
    });

    const json = editor.getJSON();
    const block = json.content?.find((n) => n.type === 'formJsBlock');
    expect(block?.attrs?.schema).toEqual(schema);
    expect(block?.attrs?.formId).toBe('f1');
  });

  it('serializes schema to data-form-schema and parses back', () => {
    const editor = makeEditor();
    const schema = { type: 'default', components: [{ type: 'textfield', key: 'a' }] };

    editor.commands.insertContent({ type: 'formJsBlock', attrs: { schema } });
    const html = editor.getHTML();

    expect(html).toContain('data-type="form-js-block"');
    expect(html).toContain('data-form-schema');

    const editor2 = makeEditor();
    editor2.commands.setContent(html);
    const block = editor2.getJSON().content?.find((n) => n.type === 'formJsBlock');
    expect(block?.attrs?.schema).toEqual(schema);
  });

  it('treats node as atom (no contentDOM)', () => {
    const editor = makeEditor();
    const ext = editor.extensionManager.extensions.find((e) => e.name === 'formJsBlock');
    expect(ext?.config.atom).toBe(true);
  });
});
