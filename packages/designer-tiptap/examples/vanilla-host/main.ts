import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { FormJsBlock as RawFormJsBlock } from '@form-js-designer/designer-tiptap';
import { withDesigner, FormJsToolbar } from '@form-js-designer/designer-tiptap/editor';
import '@form-js-designer/designer-tiptap/styles';

const FormJsBlock = withDesigner(RawFormJsBlock);

import simple from './seed/simple.json';
import tabs from './seed/tabs.json';
import modal from './seed/modal.json';
import chart from './seed/chart.json';

const editorEl = document.querySelector<HTMLElement>('#editor')!;
const dumpEl = document.querySelector<HTMLElement>('#dump')!;

let txCount = 0;
const editor = new Editor({
  element: editorEl,
  extensions: [StarterKit, FormJsBlock, FormJsToolbar],
  content: `
    <h2>Tiptap × form-js-designer 통합 데모</h2>
    <p>여기는 일반 <strong>Tiptap rich-text</strong> 영역입니다. <em>이탤릭</em>, <code>인라인 코드</code>도 가능.</p>
    <ul>
      <li>위 툴바로 서식 적용</li>
      <li>"+ Tabs form" 버튼으로 form-js block 삽입</li>
      <li>각 block은 atom — 한 덩어리로 선택만 됨</li>
    </ul>
    <blockquote>이 단락은 Tiptap blockquote입니다.</blockquote>
    <p>아래에 form-js 블록을 삽입해보세요 ↓</p>
  `,
  onTransaction: () => {
    txCount += 1;
    syncToolbar();
  },
});

(window as unknown as { editor: Editor; __txCount: number }).editor = editor;
Object.defineProperty(window, '__txCount', { get: () => txCount });

// --- Tiptap rich-text 툴바 핸들러 ---
const cmdMap: Record<string, () => boolean> = {
  bold: () => editor.chain().focus().toggleBold().run(),
  italic: () => editor.chain().focus().toggleItalic().run(),
  strike: () => editor.chain().focus().toggleStrike().run(),
  code: () => editor.chain().focus().toggleCode().run(),
  h1: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  h2: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  h3: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  paragraph: () => editor.chain().focus().setParagraph().run(),
  bulletList: () => editor.chain().focus().toggleBulletList().run(),
  orderedList: () => editor.chain().focus().toggleOrderedList().run(),
  blockquote: () => editor.chain().focus().toggleBlockquote().run(),
  codeBlock: () => editor.chain().focus().toggleCodeBlock().run(),
  hr: () => editor.chain().focus().setHorizontalRule().run(),
  undo: () => editor.chain().focus().undo().run(),
  redo: () => editor.chain().focus().redo().run(),
};

const cmdButtons = document.querySelectorAll<HTMLButtonElement>('[data-cmd]');
cmdButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const cmd = btn.dataset.cmd;
    if (cmd && cmdMap[cmd]) cmdMap[cmd]();
  });
});

const activeChecks: Record<string, () => boolean> = {
  bold: () => editor.isActive('bold'),
  italic: () => editor.isActive('italic'),
  strike: () => editor.isActive('strike'),
  code: () => editor.isActive('code'),
  h1: () => editor.isActive('heading', { level: 1 }),
  h2: () => editor.isActive('heading', { level: 2 }),
  h3: () => editor.isActive('heading', { level: 3 }),
  paragraph: () => editor.isActive('paragraph'),
  bulletList: () => editor.isActive('bulletList'),
  orderedList: () => editor.isActive('orderedList'),
  blockquote: () => editor.isActive('blockquote'),
  codeBlock: () => editor.isActive('codeBlock'),
};

function syncToolbar() {
  cmdButtons.forEach((btn) => {
    const cmd = btn.dataset.cmd;
    if (cmd && activeChecks[cmd]) {
      btn.classList.toggle('is-active', activeChecks[cmd]());
    }
  });
}

// --- form-js block 삽입 버튼 ---
document.querySelector('[data-testid="insert-simple"]')!.addEventListener('click', () => {
  editor.commands.insertFormJsBlock(simple as Record<string, unknown>, 'simple-1');
});
document.querySelector('[data-testid="insert-tabs"]')!.addEventListener('click', () => {
  editor.commands.insertFormJsBlock(tabs as Record<string, unknown>, 'tabs-1');
});
document.querySelector('[data-testid="insert-modal"]')!.addEventListener('click', () => {
  editor.commands.insertFormJsBlock(modal as Record<string, unknown>, 'modal-1');
});
document.querySelector('[data-testid="insert-chart"]')!.addEventListener('click', () => {
  editor.commands.insertFormJsBlock(chart as Record<string, unknown>, 'chart-1');
});
document.querySelector('[data-testid="dump-html"]')!.addEventListener('click', () => {
  dumpEl.textContent = editor.getHTML();
});
document.querySelector('[data-testid="reload-from-html"]')!.addEventListener('click', () => {
  editor.commands.setContent(dumpEl.textContent ?? '');
});
