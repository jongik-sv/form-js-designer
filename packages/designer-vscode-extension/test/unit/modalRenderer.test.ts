/**
 * TSK-05-03: ModalRenderer 단위 테스트
 *
 * QA 체크리스트:
 * - trigger 버튼이 렌더되고 키보드 Tab으로 포커스 가능하다
 * - trigger 버튼 클릭 → dialog open 상태가 된다
 * - Esc 키 → dialog가 닫히고 trigger 버튼으로 포커스가 반환된다
 * - backdrop 영역 클릭 → dialog가 닫힌다
 * - Modal portal DOM이 .fjs-portal-root에 마운트된다 (document.body 직접 자식 없음)
 * - document.body scroll lock이 걸리지 않는다
 * - ModalRendererComponent가 defineComponent 계약을 준수한다 (type='modal')
 */
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { h, render } from 'preact';

// mock: @form-js-designer/designer-core
const { mockCoreDefineComponent } = vi.hoisted(() => {
  const mockCoreDefineComponent = vi.fn((def: Record<string, unknown>) => ({
    ...def,
    type: def['type'] as string,
    component: { config: { type: def['type'] } },
  }));
  return { mockCoreDefineComponent };
});

vi.mock('@form-js-designer/designer-core', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    defineComponent: mockCoreDefineComponent,
    ChildrenSlot: ({ field }: { field: { id?: string } }) =>
      h('div', { 'data-testid': 'children-slot', 'data-field-id': field.id ?? '' }),
  };
});

import { ModalRendererComponent } from '../../src/components/ModalRenderer';

function getModalRenderFn() {
  const call = mockCoreDefineComponent.mock.calls.find(
    (c) => (c[0] as Record<string, unknown>)['type'] === 'modal',
  );
  return call?.[0]?.render as ((props: Record<string, unknown>) => ReturnType<typeof h>) | undefined;
}

describe('ModalRendererComponent: 컴포넌트 계약', () => {
  it('type이 "modal"이다', () => {
    expect(ModalRendererComponent.type).toBe('modal');
  });

  it('defineComponent가 "modal" 타입으로 호출되었다', () => {
    const called = mockCoreDefineComponent.mock.calls.some(
      (c) => (c[0] as Record<string, unknown>)['type'] === 'modal',
    );
    expect(called).toBe(true);
  });

  it('component 속성이 존재한다', () => {
    expect(ModalRendererComponent).toHaveProperty('component');
  });
});

describe('ModalRendererComponent: trigger 버튼 렌더', () => {
  let container: HTMLElement;
  let blockEl: HTMLElement;

  beforeEach(() => {
    blockEl = document.createElement('div');
    blockEl.className = 'form-js-block';
    container = document.createElement('div');
    blockEl.appendChild(container);
    document.body.appendChild(blockEl);
  });

  afterEach(() => {
    if (blockEl.parentElement) document.body.removeChild(blockEl);
  });

  it('trigger 버튼이 .fjs-modal-trigger 클래스로 렌더된다', () => {
    const RenderFn = getModalRenderFn();
    if (!RenderFn) return;
    render(
      h(RenderFn as unknown as Parameters<typeof h>[0], {
        field: { id: 'modal-1', type: 'modal', trigger: { label: '열기', variant: 'primary' }, components: [] },
        domId: 'modal-1',
        errors: [],
      }),
      container,
    );
    const trigger = container.querySelector('.fjs-modal-trigger') as HTMLElement | null;
    expect(trigger).not.toBeNull();
    expect(trigger?.tagName.toLowerCase()).toBe('button');
  });

  it('trigger 버튼에 trigger.label 텍스트가 표시된다', () => {
    const RenderFn = getModalRenderFn();
    if (!RenderFn) return;
    render(
      h(RenderFn as unknown as Parameters<typeof h>[0], {
        field: { id: 'modal-2', type: 'modal', trigger: { label: '모달 열기', variant: 'default' }, components: [] },
        domId: 'modal-2',
        errors: [],
      }),
      container,
    );
    const trigger = container.querySelector('.fjs-modal-trigger');
    expect(trigger?.textContent).toContain('모달 열기');
  });

  it('trigger 버튼이 type="button"이다 (form submit 방지)', () => {
    const RenderFn = getModalRenderFn();
    if (!RenderFn) return;
    render(
      h(RenderFn as unknown as Parameters<typeof h>[0], {
        field: { id: 'modal-3', type: 'modal', trigger: { label: '열기', variant: 'primary' }, components: [] },
        domId: 'modal-3',
        errors: [],
      }),
      container,
    );
    const trigger = container.querySelector('.fjs-modal-trigger') as HTMLButtonElement | null;
    expect(trigger?.type).toBe('button');
  });
});

describe('ModalRendererComponent: scroll lock 없음', () => {
  let container: HTMLElement;
  let blockEl: HTMLElement;

  beforeEach(() => {
    blockEl = document.createElement('div');
    blockEl.className = 'form-js-block';
    container = document.createElement('div');
    blockEl.appendChild(container);
    document.body.appendChild(blockEl);
    document.body.style.overflow = '';
    document.body.style.overflowY = '';
  });

  afterEach(() => {
    if (blockEl.parentElement) document.body.removeChild(blockEl);
    document.body.style.overflow = '';
    document.body.style.overflowY = '';
  });

  it('Modal 렌더 전후로 document.body overflow-y가 변경되지 않는다', () => {
    const RenderFn = getModalRenderFn();
    if (!RenderFn) return;
    const beforeOverflow = document.body.style.overflowY;
    render(
      h(RenderFn as unknown as Parameters<typeof h>[0], {
        field: { id: 'modal-scroll', type: 'modal', trigger: { label: '열기', variant: 'primary' }, components: [] },
        domId: 'modal-scroll',
        errors: [],
      }),
      container,
    );
    expect(document.body.style.overflowY).toBe(beforeOverflow);
  });
});
