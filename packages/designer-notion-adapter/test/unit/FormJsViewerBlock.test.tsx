/**
 * TSK-03-03: FormJsViewerBlock 단위 테스트
 * QA 체크리스트 기반 — design.md §QA 체크리스트
 *
 * - genericMount로 viewer 렌더 성공
 * - 라이트/다크 테마 클래스 적용
 * - 에러 배너 렌더 (잘못된 스키마)
 * - 빈 스키마 {} 렌더 (에러 배너 없음)
 * - 두 개 블록 동시 마운트 (Preact 단일 인스턴스)
 */
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ──────────────────────────────────────────────────────
// form-js-viewer mock
// ──────────────────────────────────────────────────────
const { mockFormDestroy, mockFormImportSchema, mockCreateForm } = vi.hoisted(() => {
  const mockFormDestroy = vi.fn();
  const mockFormImportSchema = vi.fn();
  const mockCreateForm = vi.fn(async (_options: unknown) => ({
    destroy: mockFormDestroy,
    importSchema: mockFormImportSchema,
  }));
  return { mockFormDestroy, mockFormImportSchema, mockCreateForm };
});

vi.mock('@bpmn-io/form-js-viewer', () => ({
  createForm: mockCreateForm,
}));

import { genericMount } from '../../src/adapters/generic';
import { themeSync } from '../../src/themeSync';

// ──────────────────────────────────────────────────────
// Helper
// ──────────────────────────────────────────────────────
function makeContainer(): HTMLDivElement {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

const VALID_SCHEMA = JSON.stringify({ components: [] });
const EMPTY_SCHEMA = JSON.stringify({});
const INVALID_SCHEMA = '{ not valid json :::';

describe('genericMount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('(정상) 유효한 스키마로 마운트하면 .form-js-block 컨테이너가 DOM에 존재한다', async () => {
    const container = makeContainer();
    await genericMount(container, VALID_SCHEMA);
    expect(container.querySelector('.form-js-block')).not.toBeNull();
  });

  it('(정상) 유효한 스키마로 마운트하면 createForm이 호출된다', async () => {
    const container = makeContainer();
    await genericMount(container, VALID_SCHEMA);
    expect(mockCreateForm).toHaveBeenCalledTimes(1);
  });

  it('(정상) 유효한 스키마로 마운트하면 에러 배너가 없다', async () => {
    const container = makeContainer();
    await genericMount(container, VALID_SCHEMA);
    expect(container.querySelector('.form-js-error-banner')).toBeNull();
  });

  it('(엣지) 빈 스키마 {} 로 마운트해도 에러 배너 없이 createForm이 호출된다', async () => {
    const container = makeContainer();
    await genericMount(container, EMPTY_SCHEMA);
    expect(mockCreateForm).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.form-js-error-banner')).toBeNull();
  });

  it('(에러) 잘못된 JSON 스키마로 마운트하면 에러 배너가 렌더된다', async () => {
    const container = makeContainer();
    await genericMount(container, INVALID_SCHEMA);
    expect(container.querySelector('.form-js-error-banner')).not.toBeNull();
  });

  it('(에러) 잘못된 JSON 스키마로 마운트하면 createForm이 호출되지 않는다', async () => {
    const container = makeContainer();
    await genericMount(container, INVALID_SCHEMA);
    expect(mockCreateForm).not.toHaveBeenCalled();
  });

  it('(통합) 두 개의 블록을 동시에 마운트해도 각자 독립적으로 .form-js-block이 생성된다', async () => {
    const c1 = makeContainer();
    const c2 = makeContainer();
    await Promise.all([
      genericMount(c1, VALID_SCHEMA),
      genericMount(c2, VALID_SCHEMA),
    ]);
    expect(c1.querySelector('.form-js-block')).not.toBeNull();
    expect(c2.querySelector('.form-js-block')).not.toBeNull();
    expect(mockCreateForm).toHaveBeenCalledTimes(2);
  });
});

describe('themeSync', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.body.removeAttribute('data-theme');
    document.body.removeAttribute('data-color-scheme');
    document.body.className = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.body.removeAttribute('data-theme');
    document.body.removeAttribute('data-color-scheme');
    document.body.className = '';
  });

  it('(정상) data-theme="light" 환경에서 컨테이너에 theme-light 클래스가 적용된다', () => {
    document.body.setAttribute('data-theme', 'light');
    const container = makeContainer();
    themeSync(container);
    expect(container.classList.contains('theme-light')).toBe(true);
  });

  it('(정상) data-theme="dark" 환경에서 컨테이너에 theme-dark 클래스가 적용된다', () => {
    document.body.setAttribute('data-theme', 'dark');
    const container = makeContainer();
    themeSync(container);
    expect(container.classList.contains('theme-dark')).toBe(true);
  });

  it('(정상) data-color-scheme="dark" 환경에서 컨테이너에 theme-dark 클래스가 적용된다', () => {
    document.body.setAttribute('data-color-scheme', 'dark');
    const container = makeContainer();
    themeSync(container);
    expect(container.classList.contains('theme-dark')).toBe(true);
  });

  it('(정상) data-theme 없을 때 MutationObserver로 변경 감지 후 theme-dark 적용', async () => {
    const container = makeContainer();
    themeSync(container);
    // 초기 상태 — 테마 없음
    expect(container.classList.contains('theme-dark')).toBe(false);
    expect(container.classList.contains('theme-light')).toBe(false);

    // DOM 변경 → observer 발화
    document.body.setAttribute('data-theme', 'dark');
    // MutationObserver는 microtask에서 발화
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    expect(container.classList.contains('theme-dark')).toBe(true);
  });
});
