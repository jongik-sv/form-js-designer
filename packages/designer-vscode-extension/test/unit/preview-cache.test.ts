/**
 * TSK-01-03: preview.ts LRU 캐시 + 오류 배너 통합 단위 테스트
 * QA 체크리스트 기반 — design.md §QA 체크리스트
 *
 * 캐시 히트/미스 시나리오, 오류 배너 통합, parseFail 격리를 검증한다.
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

vi.mock('@bpmn-io/form-js-viewer', () => ({
  createForm: mockCreateForm,
}));

import {
  mountViewers,
  disposeAll,
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
// 각 테스트 전 DOM, 캐시, mock 초기화
// ──────────────────────────────────────────────────────
beforeEach(() => {
  document.body.innerHTML = '';
  instanceMap.clear();
  viewerCache.clear();
  mockCreateForm.mockClear();
  mockDestroy.mockClear();
  mockImportSchema.mockClear();
  mockCreateForm.mockImplementation(async (_options: unknown) => ({
    destroy: mockDestroy,
    importSchema: mockImportSchema,
  }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ──────────────────────────────────────────────────────
// 1. 캐시 미스: 처음 등장하는 블록
// ──────────────────────────────────────────────────────
describe('mountViewers with LRU cache: 캐시 미스', () => {
  it('처음 등장하는 schemaId는 createForm()이 호출되고 viewerCache에 저장된다', async () => {
    createBlock({ id: 'f1', components: [] }, 'id-miss');

    await mountViewers();

    expect(mockCreateForm).toHaveBeenCalledTimes(1);
    expect(viewerCache.has('id-miss')).toBe(true);
  });

  it('schemaId가 없는 블록은 viewerCache를 건너뛰고 매번 createForm이 호출된다', async () => {
    // data-schema-id 없는 블록
    const div = document.createElement('div');
    div.className = 'form-js-block';
    // schemaId 속성 없음
    const pre = document.createElement('pre');
    pre.className = 'form-js-source';
    pre.textContent = JSON.stringify({ id: 'noId', components: [] });
    div.appendChild(pre);
    document.body.appendChild(div);

    await mountViewers();

    expect(mockCreateForm).toHaveBeenCalledTimes(1);
    // schemaId가 없으므로 캐시에 저장되지 않음
    expect(viewerCache.has('')).toBe(false);
  });
});

// ──────────────────────────────────────────────────────
// 2. 캐시 히트: 동일 schemaId 블록 재등장
// ──────────────────────────────────────────────────────
describe('mountViewers with LRU cache: 캐시 히트', () => {
  it('동일 schemaId가 재등장하면 createForm 대신 importSchema만 호출된다', async () => {
    createBlock({ id: 'f1', components: [] }, 'same-id');

    // 첫 번째 마운트 (캐시 미스 → createForm)
    await mountViewers();
    expect(mockCreateForm).toHaveBeenCalledTimes(1);
    expect(mockImportSchema).not.toHaveBeenCalled();

    // 두 번째 마운트: 동일 schemaId 블록 재등장 (캐시 히트 → importSchema)
    mockCreateForm.mockClear();
    mockImportSchema.mockClear();

    // 동일 schemaId 블록을 다시 DOM에 추가 (mountViewers는 DOM의 블록을 탐색)
    document.body.innerHTML = '';
    createBlock({ id: 'f1', components: [] }, 'same-id');
    await mountViewers();

    // 캐시 히트 → createForm 호출 없음
    expect(mockCreateForm).not.toHaveBeenCalled();
    // importSchema 호출됨
    expect(mockImportSchema).toHaveBeenCalledTimes(1);
  });

  it('캐시 히트 시 viewerCache의 기존 인스턴스가 재사용된다', async () => {
    createBlock({ id: 'f1', components: [] }, 'reuse-id');
    await mountViewers();

    const instance = viewerCache.get('reuse-id');
    expect(instance).toBeDefined();

    // 두 번째 마운트
    document.body.innerHTML = '';
    mockCreateForm.mockClear();
    createBlock({ id: 'f1', components: [] }, 'reuse-id');
    await mountViewers();

    // 동일 인스턴스가 viewerCache에 남아 있어야 함
    expect(viewerCache.get('reuse-id')).toBe(instance);
  });

  it('여러 블록 중 일부만 캐시 히트 — 히트 블록은 importSchema, 미스 블록은 createForm', async () => {
    createBlock({ id: 'f1', components: [] }, 'cached-id');
    await mountViewers(); // 'cached-id' 캐시에 저장

    mockCreateForm.mockClear();
    mockImportSchema.mockClear();
    document.body.innerHTML = '';

    // 다음 렌더: cached-id(히트) + new-id(미스)
    createBlock({ id: 'f1', components: [] }, 'cached-id');
    createBlock({ id: 'f2', components: [] }, 'new-id');
    await mountViewers();

    // new-id만 createForm 호출
    expect(mockCreateForm).toHaveBeenCalledTimes(1);
    // cached-id는 importSchema 호출
    expect(mockImportSchema).toHaveBeenCalledTimes(1);
  });
});

// ──────────────────────────────────────────────────────
// 3. JSON 파싱 실패 — 오류 배너 (.form-js-block--error)
// ──────────────────────────────────────────────────────
describe('mountViewers: JSON 파싱 실패 오류 배너', () => {
  it('파싱 실패 블록에 .form-js-block--error 클래스 배너가 렌더된다', async () => {
    createBlockWithRawText('{ bad json }', 'bad-id');

    await mountViewers();

    const banner = document.querySelector('.form-js-block--error');
    expect(banner).not.toBeNull();
  });

  it('오류 배너에 role="alert" 접근성 속성이 있다', async () => {
    createBlockWithRawText('not json', 'bad-id');

    await mountViewers();

    const banner = document.querySelector('.form-js-block--error');
    expect(banner?.getAttribute('role')).toBe('alert');
  });

  it('오류 배너 텍스트가 "⚠ Invalid form-js schema — {message}" 형식이다', async () => {
    createBlockWithRawText('{ bad json }', 'bad-id');

    await mountViewers();

    const banner = document.querySelector('.form-js-block--error');
    expect(banner?.textContent).toMatch(/^⚠ Invalid form-js schema — /);
  });

  it('파싱 실패 블록 1개가 있어도 나머지 블록은 정상 렌더된다', async () => {
    createBlockWithRawText('{ bad json }', 'bad-id');
    createBlock({ id: 'good', components: [] }, 'good-id');

    await mountViewers();

    // 정상 블록은 createForm 호출
    expect(mockCreateForm).toHaveBeenCalledTimes(1);
    // 오류 배너 존재
    const banner = document.querySelector('.form-js-block--error');
    expect(banner).not.toBeNull();
  });

  it('빈 JSON 문자열은 파싱 실패로 처리되어 오류 배너가 렌더된다', async () => {
    createBlockWithRawText('', 'empty-id');

    await mountViewers();

    const banner = document.querySelector('.form-js-block--error');
    expect(banner).not.toBeNull();
    expect(mockCreateForm).not.toHaveBeenCalled();
  });

  it('파싱 실패 블록은 viewerCache에 저장되지 않는다', async () => {
    createBlockWithRawText('bad json', 'bad-cache-id');

    await mountViewers();

    expect(viewerCache.has('bad-cache-id')).toBe(false);
  });
});

// ──────────────────────────────────────────────────────
// 4. createForm 실패 — .form-js-block--error 배너
// ──────────────────────────────────────────────────────
describe('mountViewers: createForm 실패 오류 배너', () => {
  it('createForm이 throw하면 .form-js-block--error 배너가 렌더된다', async () => {
    mockCreateForm.mockRejectedValueOnce(new Error('mount failed'));
    createBlock({ id: 'f1', components: [] }, 'fail-id');

    await mountViewers();

    const banner = document.querySelector('.form-js-block--error');
    expect(banner).not.toBeNull();
    expect(banner?.getAttribute('role')).toBe('alert');
  });

  it('createForm 실패 블록도 다른 블록 정상 처리에 영향 없다', async () => {
    const successDestroy = vi.fn();
    const successImportSchema = vi.fn();
    mockCreateForm
      .mockRejectedValueOnce(new Error('mount failed'))
      .mockResolvedValueOnce({ destroy: successDestroy, importSchema: successImportSchema });

    createBlock({ id: 'f1', components: [] }, 'fail-id');
    createBlock({ id: 'f2', components: [] }, 'success-id');

    await mountViewers();

    expect(mockCreateForm).toHaveBeenCalledTimes(2);
    const banner = document.querySelector('.form-js-block--error');
    expect(banner).not.toBeNull();
    expect(viewerCache.has('success-id')).toBe(true);
  });
});

// ──────────────────────────────────────────────────────
// 5. disposeAll + viewerCache 초기화 (패널 재열림 시뮬레이션)
// ──────────────────────────────────────────────────────
describe('disposeAll: viewerCache 초기화', () => {
  it('disposeAll 호출 후 viewerCache가 비워진다 (패널 재열림 시 초기화)', async () => {
    createBlock({ id: 'f1', components: [] }, 'cache-id');
    await mountViewers();

    expect(viewerCache.has('cache-id')).toBe(true);

    disposeAll();

    expect(viewerCache.has('cache-id')).toBe(false);
  });

  it('disposeAll 후 재마운트하면 캐시가 초기화되어 createForm이 다시 호출된다', async () => {
    createBlock({ id: 'f1', components: [] }, 'reinit-id');
    await mountViewers();

    disposeAll();
    document.body.innerHTML = '';
    mockCreateForm.mockClear();

    createBlock({ id: 'f1', components: [] }, 'reinit-id');
    await mountViewers();

    // 캐시가 초기화되었으므로 createForm 다시 호출
    expect(mockCreateForm).toHaveBeenCalledTimes(1);
  });
});

// ──────────────────────────────────────────────────────
// 6. LRU capacity=20 경계 (preview 레벨)
// ──────────────────────────────────────────────────────
describe('mountViewers: LRU capacity 경계', () => {
  it('21번째 다른 schemaId 추가 시 가장 오래된 항목이 viewerCache에서 제거된다', async () => {
    // 20개 서로 다른 schemaId 블록 마운트
    for (let i = 0; i < 20; i++) {
      document.body.innerHTML = '';
      createBlock({ id: `f${i}`, components: [] }, `id-lru-${i}`);
      await mountViewers();
    }

    expect(viewerCache.has('id-lru-0')).toBe(true);

    // 21번째 새 schemaId
    mockCreateForm.mockClear();
    document.body.innerHTML = '';
    createBlock({ id: 'f20', components: [] }, 'id-lru-20');
    await mountViewers();

    // id-lru-0이 evict되어야 함
    expect(viewerCache.has('id-lru-0')).toBe(false);
    expect(viewerCache.has('id-lru-20')).toBe(true);
  });
});
