import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { FormJsBlock } from '@form-js-designer/designer-tiptap';
import '@form-js-designer/designer-tiptap/styles';

import simple from './seed/simple.json';
import tabs from './seed/tabs.json';
import modal from './seed/modal.json';

const editorEl = document.querySelector<HTMLElement>('#editor')!;
const dumpEl = document.querySelector<HTMLElement>('#dump')!;

let txCount = 0;
const editor = new Editor({
  element: editorEl,
  extensions: [StarterKit, FormJsBlock],
  content: '<p>Type here, then insert a form below…</p>',
  onTransaction: () => {
    txCount += 1;
  },
});

(window as unknown as { editor: Editor; __txCount: number }).editor = editor;
Object.defineProperty(window, '__txCount', { get: () => txCount });

document.querySelector('[data-testid="insert-simple"]')!.addEventListener('click', () => {
  editor.commands.insertFormJsBlock(simple as Record<string, unknown>, 'simple-1');
});
document.querySelector('[data-testid="insert-tabs"]')!.addEventListener('click', () => {
  editor.commands.insertFormJsBlock(tabs as Record<string, unknown>, 'tabs-1');
});
document.querySelector('[data-testid="insert-modal"]')!.addEventListener('click', () => {
  editor.commands.insertFormJsBlock(modal as Record<string, unknown>, 'modal-1');
});
document.querySelector('[data-testid="dump-html"]')!.addEventListener('click', () => {
  dumpEl.textContent = editor.getHTML();
});
document.querySelector('[data-testid="reload-from-html"]')!.addEventListener('click', () => {
  editor.commands.setContent(dumpEl.textContent ?? '');
});
