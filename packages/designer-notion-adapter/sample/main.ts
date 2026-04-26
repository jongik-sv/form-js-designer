/**
 * sample/main.ts — 샘플 페이지 진입 스크립트
 *
 * genericMount()를 호출하여 form-js viewer를 DOM에 마운트한다.
 * "블록 삽입" 버튼 클릭 시 새 블록을 추가한다.
 */
import { genericMount } from '../src/adapters/generic';

const DEFAULT_SCHEMA = JSON.stringify({
  type: 'default',
  components: [
    {
      type: 'textfield',
      key: 'name',
      label: '이름',
    },
    {
      type: 'textfield',
      key: 'email',
      label: '이메일',
    },
  ],
});

const blocksContainer = document.getElementById('blocks-container');
const insertBtn = document.getElementById('btn-insert-block');
const themeToggleBtn = document.getElementById('btn-toggle-theme');
const editSchemaBtn = document.getElementById('btn-edit-schema');
const schemaEditorContainer = document.getElementById('schema-editor-container') as HTMLDivElement | null;
const schemaEditorTextarea = document.getElementById('schema-editor-textarea') as HTMLTextAreaElement | null;
const saveSchemaBtn = document.getElementById('btn-save-schema');
const cancelSchemaBtn = document.getElementById('btn-cancel-schema');

/** 첫 번째 블록의 현재 스키마 (스키마 편집 대상) */
let currentSchema = DEFAULT_SCHEMA;
/** 첫 번째 블록의 wrapper 요소 */
let firstBlockWrapper: HTMLDivElement | null = null;

async function insertBlock(schema: string = DEFAULT_SCHEMA): Promise<HTMLDivElement | null> {
  if (!blocksContainer) return null;

  const wrapper = document.createElement('div');
  wrapper.className = 'block-wrapper';
  blocksContainer.appendChild(wrapper);

  try {
    await genericMount(wrapper, schema);
  } catch (err) {
    console.error('Failed to mount block:', err);
    wrapper.innerHTML = `<div class="form-js-error-banner">Failed to mount: ${err instanceof Error ? err.message : String(err)}</div>`;
  }
  return wrapper;
}

// 초기 블록 마운트 (firstBlockWrapper 저장)
insertBlock(currentSchema).then((wrapper) => {
  firstBlockWrapper = wrapper;
});

// "블록 삽입" 버튼
insertBtn?.addEventListener('click', () => {
  insertBlock();
});

// "스키마 편집" 버튼 — SchemaEditor 패널 표시
editSchemaBtn?.addEventListener('click', () => {
  if (!schemaEditorContainer || !schemaEditorTextarea) return;
  schemaEditorTextarea.value = currentSchema;
  schemaEditorTextarea.style.outline = '';
  schemaEditorContainer.style.display = 'block';
});

// "저장" 버튼 — 첫 번째 블록 재렌더
saveSchemaBtn?.addEventListener('click', async () => {
  if (!schemaEditorContainer || !schemaEditorTextarea || !firstBlockWrapper) return;
  const newSchema = schemaEditorTextarea.value;
  try {
    JSON.parse(newSchema);
    currentSchema = newSchema;
    schemaEditorTextarea.style.outline = '';
    schemaEditorContainer.style.display = 'none';
    await genericMount(firstBlockWrapper, currentSchema);
  } catch {
    // 유효하지 않은 JSON — 에러 표시 (패널 유지)
    schemaEditorTextarea.style.outline = '2px solid #e74c3c';
  }
});

// "취소" 버튼
cancelSchemaBtn?.addEventListener('click', () => {
  if (!schemaEditorContainer || !schemaEditorTextarea) return;
  schemaEditorTextarea.style.outline = '';
  schemaEditorContainer.style.display = 'none';
});

// 테마 토글 버튼
themeToggleBtn?.addEventListener('click', () => {
  const current = document.body.getAttribute('data-theme');
  document.body.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
  const label = document.getElementById('theme-label');
  if (label) {
    label.textContent = current === 'dark' ? '라이트 모드' : '다크 모드';
  }
});
