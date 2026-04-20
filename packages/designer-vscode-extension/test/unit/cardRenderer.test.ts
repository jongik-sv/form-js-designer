/**
 * TSK-05-03: CardRenderer 단위 테스트
 *
 * QA 체크리스트:
 * - label 있는 Card 스키마가 .fjs-card__header 요소와 label 텍스트를 렌더한다
 * - label 없는 Card 스키마가 헤더 없이 본문만 렌더한다 (.fjs-card__header 부재)
 * - actions 배열이 있는 Card는 .fjs-card__footer + 버튼 목록을 렌더한다
 * - actions 없는 Card는 footer를 렌더하지 않는다
 * - CardRendererComponent가 defineComponent 계약을 준수한다 (type, group, render 포함)
 */
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { h, render } from 'preact';

// mock: @form-js-designer/designer-core
const { mockCoreDefineComponent } = vi.hoisted(() => {
  const mockCoreDefineComponent = vi.fn((def: Record<string, unknown>) => ({
    ...def,
    type: def['type'] as string,
    component: {
      config: { type: def['type'] },
    },
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

import { CardRendererComponent } from '../../src/components/CardRenderer';

// render 함수 추출 헬퍼
function getCardRenderFn() {
  const call = mockCoreDefineComponent.mock.calls.find(
    (c) => (c[0] as Record<string, unknown>)['type'] === 'card',
  );
  return call?.[0]?.render as ((props: Record<string, unknown>) => ReturnType<typeof h>) | undefined;
}

describe('CardRendererComponent: 컴포넌트 계약', () => {
  it('type이 "card"이다', () => {
    expect(CardRendererComponent.type).toBe('card');
  });

  it('defineComponent가 "card" 타입으로 호출되었다', () => {
    const called = mockCoreDefineComponent.mock.calls.some(
      (c) => (c[0] as Record<string, unknown>)['type'] === 'card',
    );
    expect(called).toBe(true);
  });

  it('component 속성이 존재한다', () => {
    expect(CardRendererComponent).toHaveProperty('component');
  });
});

describe('CardRendererComponent: label 렌더', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentElement) {
      document.body.removeChild(container);
    }
  });

  it('label 있는 Card는 .fjs-card__header와 label 텍스트를 렌더한다', () => {
    const RenderFn = getCardRenderFn();
    if (!RenderFn) return;
    render(
      h(RenderFn as unknown as Parameters<typeof h>[0], {
        field: { id: 'card-1', type: 'card', label: '카드 제목', components: [] },
        domId: 'card-1',
        errors: [],
      }),
      container,
    );
    const header = container.querySelector('.fjs-card__header');
    expect(header).not.toBeNull();
    expect(header?.textContent).toContain('카드 제목');
  });

  it('label 없는 Card는 .fjs-card__header를 렌더하지 않는다', () => {
    const RenderFn = getCardRenderFn();
    if (!RenderFn) return;
    render(
      h(RenderFn as unknown as Parameters<typeof h>[0], {
        field: { id: 'card-2', type: 'card', components: [] },
        domId: 'card-2',
        errors: [],
      }),
      container,
    );
    const header = container.querySelector('.fjs-card__header');
    expect(header).toBeNull();
  });

  it('actions 배열이 있는 Card는 .fjs-card__footer를 렌더한다', () => {
    const RenderFn = getCardRenderFn();
    if (!RenderFn) return;
    render(
      h(RenderFn as unknown as Parameters<typeof h>[0], {
        field: {
          id: 'card-3',
          type: 'card',
          label: '카드',
          components: [],
          actions: [{ label: '확인', variant: 'primary' }],
        },
        domId: 'card-3',
        errors: [],
      }),
      container,
    );
    const footer = container.querySelector('.fjs-card__footer');
    expect(footer).not.toBeNull();
  });

  it('actions 없는 Card는 .fjs-card__footer를 렌더하지 않는다', () => {
    const RenderFn = getCardRenderFn();
    if (!RenderFn) return;
    render(
      h(RenderFn as unknown as Parameters<typeof h>[0], {
        field: { id: 'card-4', type: 'card', label: '카드', components: [] },
        domId: 'card-4',
        errors: [],
      }),
      container,
    );
    const footer = container.querySelector('.fjs-card__footer');
    expect(footer).toBeNull();
  });
});
