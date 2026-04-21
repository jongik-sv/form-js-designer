/**
 * sample/main.ts — 샘플 페이지 진입 스크립트
 *
 * genericMount()를 호출하여 form-js viewer를 DOM에 마운트한다.
 * "블록 삽입" 버튼 클릭 시 새 블록을 추가한다.
 */
import { genericMount } from '../src/adapters/generic';

const DEFAULT_SCHEMA = JSON.stringify({
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
    {
      type: 'button',
      label: '제출',
      action: 'submit',
    },
  ],
});

const blocksContainer = document.getElementById('blocks-container');
const insertBtn = document.getElementById('btn-insert-block');
const themeToggleBtn = document.getElementById('btn-toggle-theme');

async function insertBlock(schema: string = DEFAULT_SCHEMA): Promise<void> {
  if (!blocksContainer) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'block-wrapper';
  blocksContainer.appendChild(wrapper);

  await genericMount(wrapper, schema);
}

// 초기 블록 마운트
insertBlock();

// "블록 삽입" 버튼
insertBtn?.addEventListener('click', () => {
  insertBlock();
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
