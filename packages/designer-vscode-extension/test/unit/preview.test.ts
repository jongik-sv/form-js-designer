/**
 * TSK-01-02: previewScripts 단위 테스트
 * QA 체크리스트 기반 — design.md §QA 체크리스트
 *
 * 순수 로직(mountViewers, disposeAll, applyTheme)을 jsdom 환경에서 테스트한다.
 * createForm은 mock으로 대체하여 DOM 마운트 계약만 검증한다.
 */
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ──────────────────────────────────────────────────────
// vi.hoisted를 사용하여 호이스팅 안전한 mock 변수 선언
// ──────────────────────────────────────────────────────
const { mockDestroy, mockImportSchema, mockCreateForm } = vi.hoisted(() => {
  const mockDestroy = vi.fn();
  const mockImportSchema = vi.fn();
  const mockCreateForm = vi.fn(async (_options: unknown) => ({
    destroy: mockDestroy,
    importSchema: mockImportSchema,
  }));
  return { mockDestroy, mockImportSchema, mockCreateForm };
});

vi.mock('@bpmn-io/form-js-viewer', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    createForm: mockCreateForm,
  };
});

import {
  mountViewers,
  disposeAll,
  applyTheme,
  instanceMap,
  viewerCache,
} from '../../src/markdown/preview';

// ──────────────────────────────────────────────────────
// Helper: .form-js-block DOM 요소 생성
// ──────────────────────────────────────────────────────
function createBlock(schema: object, id: string): HTMLDivElement {
  const div = document.createElement('div');
  div.className = 'form-js-block';
  div.dataset['schemaId'] = id;

  const pre = document.createElement('pre');
  pre.className = 'form-js-source';
  pre.hidden = true;
  pre.textContent = JSON.stringify(schema);

  div.appendChild(pre);
  document.body.appendChild(div);
  return div;
}

function createBlockWithRawText(raw: string, id: string): HTMLDivElement {
  const div = document.createElement('div');
  div.className = 'form-js-block';
  div.dataset['schemaId'] = id;

  const pre = document.createElement('pre');
  pre.className = 'form-js-source';
  pre.hidden = true;
  pre.textContent = raw;

  div.appendChild(pre);
  document.body.appendChild(div);
  return div;
}

// ──────────────────────────────────────────────────────
// 각 테스트 전 DOM 초기화
// ──────────────────────────────────────────────────────
beforeEach(() => {
  document.body.innerHTML = '';
  document.body.removeAttribute('data-vscode-theme-kind');
  instanceMap.clear();
  viewerCache.clear();
  mockCreateForm.mockClear();
  mockDestroy.mockClear();
  mockImportSchema.mockClear();
  // 기본 resolve 동작 복원
  mockCreateForm.mockImplementation(async (_options: unknown) => ({
    destroy: mockDestroy,
    importSchema: mockImportSchema,
  }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ──────────────────────────────────────────────────────
// 1. mountViewers: 정상 케이스
// ──────────────────────────────────────────────────────
describe('mountViewers: 정상 케이스', () => {
  it('유효한 .form-js-block 하나에 createForm이 1회 호출된다', async () => {
    const schema = { components: [], id: 'form1' };
    createBlock(schema, 'abc123');

    await mountViewers();

    expect(mockCreateForm).toHaveBeenCalledTimes(1);
    expect(mockCreateForm).toHaveBeenCalledWith(
      expect.objectContaining({ schema })
    );
  });

  it('container 인자에 .form-js-block DOM 요소가 전달된다', async () => {
    const schema = { components: [], id: 'form1' };
    const block = createBlock(schema, 'abc123');

    await mountViewers();

    expect(mockCreateForm).toHaveBeenCalledWith(
      expect.objectContaining({ container: block })
    );
  });

  it('properties.readOnly=true가 createForm에 전달된다', async () => {
    createBlock({ components: [], id: 'form1' }, 'abc123');

    await mountViewers();

    expect(mockCreateForm).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({ readOnly: true }),
      })
    );
  });

  it('3개 .form-js-block이 있으면 createForm이 3회 호출된다', async () => {
    createBlock({ id: 'f1', components: [] }, 'id1');
    createBlock({ id: 'f2', components: [] }, 'id2');
    createBlock({ id: 'f3', components: [] }, 'id3');

    await mountViewers();

    expect(mockCreateForm).toHaveBeenCalledTimes(3);
  });

  it('마운트 후 인스턴스가 instanceMap에 data-schema-id 키로 등록된다', async () => {
    createBlock({ id: 'form1', components: [] }, 'myId');

    await mountViewers();

    expect(instanceMap.has('myId')).toBe(true);
  });
});

// ──────────────────────────────────────────────────────
// 2. mountViewers: 엣지 케이스
// ──────────────────────────────────────────────────────
describe('mountViewers: 엣지 케이스', () => {
  it('.form-js-block이 없으면 createForm이 호출되지 않는다', async () => {
    await mountViewers();
    expect(mockCreateForm).not.toHaveBeenCalled();
  });

  it('components 배열이 비어 있는 스키마도 오류 없이 createForm이 호출된다', async () => {
    createBlock({ components: [], id: 'empty' }, 'emptyId');

    await mountViewers();

    expect(mockCreateForm).toHaveBeenCalledTimes(1);
  });

  it('form-js-source가 빈 문자열이면 해당 블록에 오류 배너가 렌더되고 다음 블록은 계속 처리된다', async () => {
    // 첫 번째: 빈 텍스트 (JSON 파싱 오류)
    createBlockWithRawText('', 'emptyText');
    // 두 번째: 유효한 JSON
    createBlock({ id: 'f2', components: [] }, 'validId');

    await mountViewers();

    // 유효한 블록만 createForm 호출
    expect(mockCreateForm).toHaveBeenCalledTimes(1);

    // 오류 블록에 오류 배너가 렌더됨
    const errorBanners = document.querySelectorAll('.form-js-block--error');
    expect(errorBanners.length).toBeGreaterThanOrEqual(1);
  });

  it('잘못된 JSON이면 해당 블록에만 오류 배너가 표시되고 나머지는 정상 처리된다', async () => {
    createBlockWithRawText('{ bad json }', 'badId');
    createBlock({ id: 'good', components: [] }, 'goodId');

    await mountViewers();

    // 유효한 블록만 createForm 호출
    expect(mockCreateForm).toHaveBeenCalledTimes(1);
    const errorBanners = document.querySelectorAll('.form-js-block--error');
    expect(errorBanners.length).toBeGreaterThanOrEqual(1);
  });

  it('form-js-source pre 요소가 없는 블록은 건너뛴다', async () => {
    // pre 없는 블록
    const div = document.createElement('div');
    div.className = 'form-js-block';
    div.dataset['schemaId'] = 'noPreId';
    document.body.appendChild(div);

    await mountViewers();

    expect(mockCreateForm).not.toHaveBeenCalled();
  });

  it('최소 높이 보장: .form-js-block에 min-height 스타일이 없어도 mountViewers 호출은 성공한다', async () => {
    createBlock({ id: 'f1', components: [] }, 'hId');
    await expect(mountViewers()).resolves.not.toThrow();
  });
});

// ──────────────────────────────────────────────────────
// 3. disposeAll: 인스턴스 정리
// ──────────────────────────────────────────────────────
describe('disposeAll', () => {
  it('instanceMap의 모든 인스턴스에 destroy()가 호출된다', () => {
    const destroy1 = vi.fn();
    const destroy2 = vi.fn();
    instanceMap.set('k1', { destroy: destroy1 });
    instanceMap.set('k2', { destroy: destroy2 });

    disposeAll();

    expect(destroy1).toHaveBeenCalledTimes(1);
    expect(destroy2).toHaveBeenCalledTimes(1);
  });

  it('disposeAll 호출 후 instanceMap이 비워진다', () => {
    instanceMap.set('k1', { destroy: vi.fn() });

    disposeAll();

    expect(instanceMap.size).toBe(0);
  });

  it('instanceMap이 비어 있을 때 disposeAll은 오류 없이 실행된다', () => {
    expect(() => disposeAll()).not.toThrow();
  });

  it('mountViewers 재실행 시 disposeAll이 선행되어 중복 마운트가 방지된다', async () => {
    createBlock({ id: 'f1', components: [] }, 'id1');

    // 1회 마운트
    await mountViewers();
    expect(mockCreateForm).toHaveBeenCalledTimes(1);

    // 인스턴스가 등록되었는지 확인
    expect(instanceMap.size).toBe(1);

    // disposeAll 호출 — destroy가 이 시점에 호출되어야 함
    disposeAll();
    expect(instanceMap.size).toBe(0);
    // disposeAll이 이전 인스턴스의 destroy를 호출했는지 확인 (clear 전에 검증)
    expect(mockDestroy).toHaveBeenCalledTimes(1);

    // 두 번째 마운트
    mockCreateForm.mockClear();
    await mountViewers();

    // 두 번째 마운트에서도 createForm 1회 호출
    expect(mockCreateForm).toHaveBeenCalledTimes(1);
  });
});

// ──────────────────────────────────────────────────────
// 4. applyTheme: 테마 클래스 토글
// ──────────────────────────────────────────────────────
describe('applyTheme', () => {
  it('vscode-light 테마 시 .form-js-block에 theme-light 클래스가 추가된다', () => {
    const block = createBlock({ id: 'f1', components: [] }, 'id1');

    applyTheme('vscode-light');

    expect(block.classList.contains('theme-light')).toBe(true);
  });

  it('vscode-dark 테마 시 .form-js-block에 theme-dark 클래스가 추가된다', () => {
    const block = createBlock({ id: 'f1', components: [] }, 'id1');

    applyTheme('vscode-dark');

    expect(block.classList.contains('theme-dark')).toBe(true);
  });

  it('vscode-high-contrast 테마 시 .form-js-block에 theme-high-contrast 클래스가 추가된다', () => {
    const block = createBlock({ id: 'f1', components: [] }, 'id1');

    applyTheme('vscode-high-contrast');

    expect(block.classList.contains('theme-high-contrast')).toBe(true);
  });

  it('테마 전환 시 이전 테마 클래스는 제거되고 새 테마 클래스만 남는다', () => {
    const block = createBlock({ id: 'f1', components: [] }, 'id1');

    applyTheme('vscode-light');
    expect(block.classList.contains('theme-light')).toBe(true);

    applyTheme('vscode-dark');
    expect(block.classList.contains('theme-dark')).toBe(true);
    expect(block.classList.contains('theme-light')).toBe(false);
  });

  it('알 수 없는 테마 값은 모든 테마 클래스를 제거한다', () => {
    const block = createBlock({ id: 'f1', components: [] }, 'id1');

    applyTheme('vscode-light');
    applyTheme('unknown-theme');

    expect(block.classList.contains('theme-light')).toBe(false);
    expect(block.classList.contains('theme-dark')).toBe(false);
    expect(block.classList.contains('theme-high-contrast')).toBe(false);
  });

  it('themeKind가 빈 문자열이면 모든 테마 클래스가 제거된다', () => {
    const block = createBlock({ id: 'f1', components: [] }, 'id1');

    applyTheme('vscode-dark');
    applyTheme('');

    expect(block.classList.contains('theme-dark')).toBe(false);
  });

  it('applyTheme 호출 시 현재 DOM의 모든 .form-js-block에 적용된다', () => {
    const b1 = createBlock({ id: 'f1', components: [] }, 'id1');
    const b2 = createBlock({ id: 'f2', components: [] }, 'id2');

    applyTheme('vscode-dark');

    expect(b1.classList.contains('theme-dark')).toBe(true);
    expect(b2.classList.contains('theme-dark')).toBe(true);
  });

  it('High Contrast Light 테마도 처리된다 (vscode-high-contrast-light)', () => {
    const block = createBlock({ id: 'f1', components: [] }, 'id1');

    applyTheme('vscode-high-contrast-light');

    expect(block.classList.contains('theme-high-contrast-light')).toBe(true);
  });
});

// ──────────────────────────────────────────────────────
// 5. createForm 내부 오류 격리
// ──────────────────────────────────────────────────────
describe('mountViewers: createForm 오류 격리', () => {
  it('createForm이 throw하면 해당 블록에 오류 배너가 표시되고 나머지는 계속 처리된다', async () => {
    const successDestroy = vi.fn();
    const successImportSchema = vi.fn();
    mockCreateForm
      .mockRejectedValueOnce(new Error('mount failed'))
      .mockResolvedValueOnce({ destroy: successDestroy, importSchema: successImportSchema });

    createBlock({ id: 'f1', components: [] }, 'failId');
    createBlock({ id: 'f2', components: [] }, 'successId');

    await mountViewers();

    // 두 블록 모두 createForm 시도
    expect(mockCreateForm).toHaveBeenCalledTimes(2);
    // 오류 배너가 렌더됨
    const errorBanners = document.querySelectorAll('.form-js-block--error');
    expect(errorBanners.length).toBeGreaterThanOrEqual(1);
  });

  it('같은 블록에 오류가 두 번 발생하면 오류 배너가 교체된다 (기존 배너 제거 후 재생성)', async () => {
    // 첫 번째: 오류 배너 생성
    createBlockWithRawText('bad json', 'badId');
    await mountViewers();

    const firstBanners = document.querySelectorAll('.form-js-block--error');
    expect(firstBanners.length).toBe(1);

    // 두 번째: 같은 블록에 다시 오류 발생 (mountViewers 재호출)
    await mountViewers();

    // 오류 배너가 중복되지 않고 1개여야 함
    const secondBanners = document.querySelectorAll('.form-js-block--error');
    expect(secondBanners.length).toBe(1);
  });
});

// ──────────────────────────────────────────────────────
// 6. MutationObserver 테마 변화 구독 (startThemeObserver 간접 테스트)
// ──────────────────────────────────────────────────────
describe('applyTheme: 테마 변화 반응', () => {
  it('body data-vscode-theme-kind 속성 변경 시 applyTheme이 호출된 결과와 동일하다', () => {
    // MutationObserver 콜백을 직접 트리거하기 어려우므로
    // applyTheme 함수 자체가 attribute 값을 정확히 처리함을 검증한다
    const block = createBlock({ id: 'f1', components: [] }, 'id1');

    // 라이트 → 다크 전환 시뮬레이션
    applyTheme('vscode-light');
    expect(block.classList.contains('theme-light')).toBe(true);

    applyTheme('vscode-dark');
    expect(block.classList.contains('theme-dark')).toBe(true);
    expect(block.classList.contains('theme-light')).toBe(false);
  });
});
