/**
 * TSK-05-03: StackRenderer 단위 테스트
 *
 * QA 체크리스트:
 * - direction: 'horizontal' Stack이 flex-direction: row로 렌더된다
 * - direction: 'vertical' Stack이 flex-direction: column으로 렌더된다
 * - gap: 16 설정 시 CSS gap이 '16px'로 적용된다
 * - wrap: true 설정 시 flex-wrap: wrap이 적용된다
 * - Stack에 min-height: 0이 적용되어 overflow가 발생하지 않는다
 * - StackRendererComponent가 defineComponent 계약을 준수한다 (type='stack', group='container')
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

import { StackRendererComponent } from '../../src/components/StackRenderer';

function getStackRenderFn() {
  const call = mockCoreDefineComponent.mock.calls.find(
    (c) => (c[0] as Record<string, unknown>)['type'] === 'stack',
  );
  return call?.[0]?.render as ((props: Record<string, unknown>) => ReturnType<typeof h>) | undefined;
}

describe('StackRendererComponent: 컴포넌트 계약', () => {
  it('type이 "stack"이다', () => {
    expect(StackRendererComponent.type).toBe('stack');
  });

  it('defineComponent가 "stack" 타입으로 호출되었다', () => {
    const called = mockCoreDefineComponent.mock.calls.some(
      (c) => (c[0] as Record<string, unknown>)['type'] === 'stack',
    );
    expect(called).toBe(true);
  });

  it('component 속성이 존재한다', () => {
    expect(StackRendererComponent).toHaveProperty('component');
  });
});

describe('StackRendererComponent: flex 스타일 렌더', () => {
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

  it('direction: horizontal Stack이 flex-direction: row로 렌더된다', () => {
    const RenderFn = getStackRenderFn();
    if (!RenderFn) return;
    render(
      h(RenderFn as unknown as Parameters<typeof h>[0], {
        field: { id: 'stack-1', type: 'stack', direction: 'horizontal', gap: 8, components: [] },
        domId: 'stack-1',
        errors: [],
      } as unknown as Parameters<typeof h>[1]),
      container,
    );
    const el = container.querySelector('.fjs-stack') as HTMLElement | null;
    expect(el).not.toBeNull();
    expect(el?.style.flexDirection).toBe('row');
  });

  it('direction: vertical Stack이 flex-direction: column으로 렌더된다', () => {
    const RenderFn = getStackRenderFn();
    if (!RenderFn) return;
    render(
      h(RenderFn as unknown as Parameters<typeof h>[0], {
        field: { id: 'stack-2', type: 'stack', direction: 'vertical', gap: 8, components: [] },
        domId: 'stack-2',
        errors: [],
      } as unknown as Parameters<typeof h>[1]),
      container,
    );
    const el = container.querySelector('.fjs-stack') as HTMLElement | null;
    expect(el).not.toBeNull();
    expect(el?.style.flexDirection).toBe('column');
  });

  it('gap: 16 설정 시 CSS gap이 "16px"로 적용된다', () => {
    const RenderFn = getStackRenderFn();
    if (!RenderFn) return;
    render(
      h(RenderFn as unknown as Parameters<typeof h>[0], {
        field: { id: 'stack-3', type: 'stack', direction: 'horizontal', gap: 16, components: [] },
        domId: 'stack-3',
        errors: [],
      } as unknown as Parameters<typeof h>[1]),
      container,
    );
    const el = container.querySelector('.fjs-stack') as HTMLElement | null;
    expect(el).not.toBeNull();
    expect(el?.style.gap).toBe('16px');
  });

  it('wrap: true 설정 시 flex-wrap: wrap이 적용된다', () => {
    const RenderFn = getStackRenderFn();
    if (!RenderFn) return;
    render(
      h(RenderFn as unknown as Parameters<typeof h>[0], {
        field: {
          id: 'stack-4',
          type: 'stack',
          direction: 'horizontal',
          gap: 8,
          wrap: true,
          components: [],
        },
        domId: 'stack-4',
        errors: [],
      } as unknown as Parameters<typeof h>[1]),
      container,
    );
    const el = container.querySelector('.fjs-stack') as HTMLElement | null;
    expect(el).not.toBeNull();
    expect(el?.style.flexWrap).toBe('wrap');
  });

  it('Stack 루트 요소에 min-height: 0이 적용된다', () => {
    const RenderFn = getStackRenderFn();
    if (!RenderFn) return;
    render(
      h(RenderFn as unknown as Parameters<typeof h>[0], {
        field: { id: 'stack-5', type: 'stack', direction: 'vertical', gap: 0, components: [] },
        domId: 'stack-5',
        errors: [],
      } as unknown as Parameters<typeof h>[1]),
      container,
    );
    const el = container.querySelector('.fjs-stack') as HTMLElement | null;
    expect(el).not.toBeNull();
    expect(el?.style.minHeight).toBe('0');
  });

  it('gap 숫자에 단위가 없어도 px로 변환된다', () => {
    const RenderFn = getStackRenderFn();
    if (!RenderFn) return;
    render(
      h(RenderFn as unknown as Parameters<typeof h>[0], {
        field: { id: 'stack-6', type: 'stack', direction: 'horizontal', gap: 24, components: [] },
        domId: 'stack-6',
        errors: [],
      } as unknown as Parameters<typeof h>[1]),
      container,
    );
    const el = container.querySelector('.fjs-stack') as HTMLElement | null;
    expect(el?.style.gap).toBe('24px');
  });
});
