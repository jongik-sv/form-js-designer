/**
 * TSK-02-03: editButton 단위 테스트
 * QA 체크리스트 기반 — design.md §QA 체크리스트
 *
 * mountEditButton, lockAllButtons, unlockAllButtons 계약을 jsdom에서 검증.
 * acquireVsCodeApi 없는 환경(테스트)에서는 null 방어 분기를 통해 TypeError 없이 처리.
 */
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ──────────────────────────────────────────────────────
// acquireVsCodeApi mock 세팅 (window 레벨)
// ──────────────────────────────────────────────────────
const mockPostMessage = vi.fn();

function setupVscodeApi() {
  (window as unknown as Record<string, unknown>)['acquireVsCodeApi'] = vi.fn(() => ({
    postMessage: mockPostMessage,
  }));
}

function removeVscodeApi() {
  delete (window as unknown as Record<string, unknown>)['acquireVsCodeApi'];
}

// ──────────────────────────────────────────────────────
// Helper: .form-js-block DOM 요소 생성
// ──────────────────────────────────────────────────────
function createBlock(mdStart = 10, mdEnd = 50): HTMLDivElement {
  const div = document.createElement('div');
  div.className = 'form-js-block';
  div.dataset['mdStart'] = String(mdStart);
  div.dataset['mdEnd'] = String(mdEnd);
  document.body.appendChild(div);
  return div;
}

// ──────────────────────────────────────────────────────
// 각 테스트 전 DOM / mock 초기화
// ──────────────────────────────────────────────────────
beforeEach(() => {
  document.body.innerHTML = '';
  mockPostMessage.mockClear();
  vi.resetModules();
});

afterEach(() => {
  removeVscodeApi();
  vi.restoreAllMocks();
});

// ──────────────────────────────────────────────────────
// 1. mountEditButton: 버튼 생성·마운트 계약
// ──────────────────────────────────────────────────────
describe('mountEditButton: 버튼 생성·마운트', () => {
  it('host에 .fjs-edit-btn 버튼이 1개 삽입된다', async () => {
    setupVscodeApi();
    const { mountEditButton } = await import('../../src/markdown/editButton');
    const block = createBlock();

    mountEditButton(block, 10, 50);

    const btn = block.querySelector('.fjs-edit-btn');
    expect(btn).not.toBeNull();
    expect(btn!.tagName).toBe('BUTTON');
  });

  it('버튼에 aria-label="편집"이 설정된다', async () => {
    setupVscodeApi();
    const { mountEditButton } = await import('../../src/markdown/editButton');
    const block = createBlock();

    mountEditButton(block, 10, 50);

    const btn = block.querySelector<HTMLButtonElement>('.fjs-edit-btn');
    expect(btn?.getAttribute('aria-label')).toBe('편집');
  });

  it('버튼에 type="button"이 설정된다', async () => {
    setupVscodeApi();
    const { mountEditButton } = await import('../../src/markdown/editButton');
    const block = createBlock();

    mountEditButton(block, 10, 50);

    const btn = block.querySelector<HTMLButtonElement>('.fjs-edit-btn');
    expect(btn?.type).toBe('button');
  });

  it('버튼에 tabindex="0"이 설정된다', async () => {
    setupVscodeApi();
    const { mountEditButton } = await import('../../src/markdown/editButton');
    const block = createBlock();

    mountEditButton(block, 10, 50);

    const btn = block.querySelector<HTMLButtonElement>('.fjs-edit-btn');
    expect(btn?.getAttribute('tabindex')).toBe('0');
  });

  it('동일 블록에 두 번 호출해도 버튼이 1개만 존재한다 (중복 방지)', async () => {
    setupVscodeApi();
    const { mountEditButton } = await import('../../src/markdown/editButton');
    const block = createBlock();

    mountEditButton(block, 10, 50);
    mountEditButton(block, 10, 50);

    const btns = block.querySelectorAll('.fjs-edit-btn');
    expect(btns.length).toBe(1);
  });
});

// ──────────────────────────────────────────────────────
// 2. mountEditButton: 클릭 → postMessage 송신
// ──────────────────────────────────────────────────────
describe('mountEditButton: 클릭 → postMessage 송신', () => {
  it('버튼 클릭 시 postMessage가 { type: "request-edit", mdStart, mdEnd }로 1회 호출된다', async () => {
    setupVscodeApi();
    const { mountEditButton } = await import('../../src/markdown/editButton');
    const block = createBlock(10, 50);

    mountEditButton(block, 10, 50);
    const btn = block.querySelector<HTMLButtonElement>('.fjs-edit-btn')!;
    btn.click();

    expect(mockPostMessage).toHaveBeenCalledTimes(1);
    expect(mockPostMessage).toHaveBeenCalledWith({
      type: 'request-edit',
      mdStart: 10,
      mdEnd: 50,
    });
  });

  it('aria-disabled="true" 상태에서 클릭해도 postMessage가 호출되지 않는다', async () => {
    setupVscodeApi();
    const { mountEditButton } = await import('../../src/markdown/editButton');
    const block = createBlock(10, 50);

    mountEditButton(block, 10, 50);
    const btn = block.querySelector<HTMLButtonElement>('.fjs-edit-btn')!;
    btn.setAttribute('aria-disabled', 'true');
    btn.click();

    expect(mockPostMessage).not.toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────────────
// 3. lockAllButtons: single-editor lock
// ──────────────────────────────────────────────────────
describe('lockAllButtons: single-editor lock', () => {
  it('호출 후 모든 .fjs-edit-btn에 aria-disabled="true"가 설정된다', async () => {
    setupVscodeApi();
    const { mountEditButton, lockAllButtons } = await import('../../src/markdown/editButton');
    const block1 = createBlock(10, 50);
    const block2 = createBlock(60, 100);

    mountEditButton(block1, 10, 50);
    mountEditButton(block2, 60, 100);

    lockAllButtons();

    const btns = document.querySelectorAll<HTMLButtonElement>('.fjs-edit-btn');
    for (const btn of btns) {
      expect(btn.getAttribute('aria-disabled')).toBe('true');
    }
  });

  it('호출 후 모든 .fjs-edit-btn에 tabindex="-1"이 설정된다', async () => {
    setupVscodeApi();
    const { mountEditButton, lockAllButtons } = await import('../../src/markdown/editButton');
    const block1 = createBlock(10, 50);
    const block2 = createBlock(60, 100);

    mountEditButton(block1, 10, 50);
    mountEditButton(block2, 60, 100);

    lockAllButtons();

    const btns = document.querySelectorAll<HTMLButtonElement>('.fjs-edit-btn');
    for (const btn of btns) {
      expect(btn.getAttribute('tabindex')).toBe('-1');
    }
  });

  it('단일 블록에서 클릭 시 자신도 aria-disabled가 설정된다', async () => {
    setupVscodeApi();
    const { mountEditButton } = await import('../../src/markdown/editButton');
    const block = createBlock(10, 50);

    mountEditButton(block, 10, 50);
    const btn = block.querySelector<HTMLButtonElement>('.fjs-edit-btn')!;
    btn.click();

    expect(btn.getAttribute('aria-disabled')).toBe('true');
  });

  it('버튼 클릭 후 다른 블록의 버튼에도 aria-disabled="true"가 설정된다', async () => {
    setupVscodeApi();
    const { mountEditButton } = await import('../../src/markdown/editButton');
    const block1 = createBlock(10, 50);
    const block2 = createBlock(60, 100);

    mountEditButton(block1, 10, 50);
    mountEditButton(block2, 60, 100);

    const btn1 = block1.querySelector<HTMLButtonElement>('.fjs-edit-btn')!;
    btn1.click();

    const btn2 = block2.querySelector<HTMLButtonElement>('.fjs-edit-btn')!;
    expect(btn2.getAttribute('aria-disabled')).toBe('true');
  });
});

// ──────────────────────────────────────────────────────
// 4. unlockAllButtons: edit-closed 재활성화
// ──────────────────────────────────────────────────────
describe('unlockAllButtons: 재활성화', () => {
  it('lockAllButtons 후 unlockAllButtons 호출 시 aria-disabled 속성이 제거된다', async () => {
    setupVscodeApi();
    const { mountEditButton, lockAllButtons, unlockAllButtons } = await import('../../src/markdown/editButton');
    const block = createBlock();
    mountEditButton(block, 10, 50);

    lockAllButtons();
    unlockAllButtons();

    const btn = block.querySelector<HTMLButtonElement>('.fjs-edit-btn')!;
    expect(btn.getAttribute('aria-disabled')).toBeNull();
  });

  it('unlockAllButtons 후 tabindex="0"으로 복원된다', async () => {
    setupVscodeApi();
    const { mountEditButton, lockAllButtons, unlockAllButtons } = await import('../../src/markdown/editButton');
    const block = createBlock();
    mountEditButton(block, 10, 50);

    lockAllButtons();
    unlockAllButtons();

    const btn = block.querySelector<HTMLButtonElement>('.fjs-edit-btn')!;
    expect(btn.getAttribute('tabindex')).toBe('0');
  });

  it('unlockAllButtons 후 aria-pressed 속성이 제거된다', async () => {
    setupVscodeApi();
    const { mountEditButton, lockAllButtons, unlockAllButtons } = await import('../../src/markdown/editButton');
    const block = createBlock();
    mountEditButton(block, 10, 50);

    lockAllButtons();
    unlockAllButtons();

    const btn = block.querySelector<HTMLButtonElement>('.fjs-edit-btn')!;
    expect(btn.getAttribute('aria-pressed')).toBeNull();
  });

  it('여러 버튼 모두 재활성화된다', async () => {
    setupVscodeApi();
    const { mountEditButton, lockAllButtons, unlockAllButtons } = await import('../../src/markdown/editButton');
    const block1 = createBlock(10, 50);
    const block2 = createBlock(60, 100);
    mountEditButton(block1, 10, 50);
    mountEditButton(block2, 60, 100);

    lockAllButtons();
    unlockAllButtons();

    const btns = document.querySelectorAll<HTMLButtonElement>('.fjs-edit-btn');
    for (const btn of btns) {
      expect(btn.getAttribute('aria-disabled')).toBeNull();
      expect(btn.getAttribute('tabindex')).toBe('0');
    }
  });
});

// ──────────────────────────────────────────────────────
// 5. acquireVsCodeApi 부재 환경
// ──────────────────────────────────────────────────────
describe('acquireVsCodeApi 부재 환경 (graceful)', () => {
  it('acquireVsCodeApi가 없는 환경에서 mountEditButton 호출 시 TypeError가 발생하지 않는다', async () => {
    removeVscodeApi();
    const { mountEditButton } = await import('../../src/markdown/editButton');
    const block = createBlock();

    expect(() => mountEditButton(block, 10, 50)).not.toThrow();
  });

  it('acquireVsCodeApi가 없는 환경에서 버튼 클릭해도 오류가 발생하지 않는다', async () => {
    removeVscodeApi();
    const { mountEditButton } = await import('../../src/markdown/editButton');
    const block = createBlock();

    mountEditButton(block, 10, 50);
    const btn = block.querySelector<HTMLButtonElement>('.fjs-edit-btn')!;

    expect(() => btn.click()).not.toThrow();
  });
});

// ──────────────────────────────────────────────────────
// 6. edit-closed 수신 → unlockAllButtons 연계
// ──────────────────────────────────────────────────────
describe('edit-closed 수신 후 버튼 재활성화 (unlockAllButtons)', () => {
  it('lockAllButtons 상태에서 unlockAllButtons 호출 시 모든 버튼 상태가 초기화된다', async () => {
    setupVscodeApi();
    const { mountEditButton, lockAllButtons, unlockAllButtons } = await import('../../src/markdown/editButton');
    const block1 = createBlock(10, 50);
    const block2 = createBlock(60, 100);

    mountEditButton(block1, 10, 50);
    mountEditButton(block2, 60, 100);

    lockAllButtons();
    unlockAllButtons();

    const btns = document.querySelectorAll<HTMLButtonElement>('.fjs-edit-btn');
    for (const btn of btns) {
      expect(btn.getAttribute('aria-disabled')).toBeNull();
      expect(btn.getAttribute('tabindex')).toBe('0');
    }
  });
});
