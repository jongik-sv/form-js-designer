import { Extension } from '@tiptap/core';

export const EMPTY_FORM_SCHEMA = { type: 'default', components: [] as unknown[] };

export interface FormJsToolbarOptions {
  label: string;
  /** 툴바를 삽입할 외부 컨테이너. null이면 에디터 element 안 ProseMirror 앞에 삽입. */
  container: HTMLElement | null;
}

export const FormJsToolbar = Extension.create<FormJsToolbarOptions>({
  name: 'formJsToolbar',

  addOptions() {
    return {
      label: '+ 폼 블록 추가',
      container: null,
    };
  },

  onCreate() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'fjd-toolbar-btn';
    btn.textContent = this.options.label;
    btn.addEventListener('click', () => {
      // 커서가 없을 때는 끝에 삽입, 있으면 현재 위치에 삽입
      const { from } = this.editor.state.selection;
      const atStart = from <= 1;
      this.editor
        .chain()
        .focus(atStart ? 'end' : undefined)
        .insertFormJsBlock({ ...EMPTY_FORM_SCHEMA })
        .run();
    });

    const bar = document.createElement('div');
    bar.className = 'fjd-toolbar';
    bar.appendChild(btn);

    if (this.options.container) {
      // 호스트가 컨테이너를 지정한 경우: 그 안에 삽입
      this.options.container.insertBefore(bar, this.options.container.firstChild);
    } else {
      // 기본: 에디터 element 안, ProseMirror div 앞에 삽입 → 에디터 테두리 안에 표시
      const editorEl = this.editor.options.element;
      editorEl.insertBefore(bar, editorEl.firstChild);
    }

    (this as unknown as { _bar: HTMLElement })._bar = bar;
  },

  onDestroy() {
    (this as unknown as { _bar?: HTMLElement })._bar?.remove();
  },
});
