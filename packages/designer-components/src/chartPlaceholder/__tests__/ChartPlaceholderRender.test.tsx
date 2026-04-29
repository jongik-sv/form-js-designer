/**
 * Task 1.14: ChartPlaceholderRender 단위 테스트
 *
 * 검증 포인트(spec.md §9.1):
 * - title이 빈 문자열/undefined/공백 only면 title 노드 미렌더
 * - description 동일
 * - title/description이 정상 문자열이면 해당 노드 렌더 + 텍스트 일치
 * - chartType별 SVG 교체 — wrapper data-chart-type 속성 검증 (bar/pie/unknown→bar)
 * - aria-label에 koLabel 포함 (예: bar → "막대 차트 자리")
 * - canvas의 dangerouslySetInnerHTML로 svg 삽입 — innerHTML에 '<svg' 포함
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import { ChartPlaceholderComponent } from '../index';
import type { ChartPlaceholderSchema } from '../propsSchema';
import type { PureRenderProps } from '@form-js-designer/designer-core';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function makeProps(
  overrides?: Partial<ChartPlaceholderSchema>,
): PureRenderProps<ChartPlaceholderSchema> {
  const field: ChartPlaceholderSchema = {
    id: 'chart-test',
    type: 'chartPlaceholder',
    chartType: 'bar',
    title: '',
    description: '',
    ...overrides,
  };
  return {
    field,
    value: null,
    domId: 'chart-test-dom',
    errors: [],
    disabled: false,
    readonly: false,
  };
}

describe('ChartPlaceholderRender — title visibility', () => {
  it('does not render title node when title is empty string', () => {
    const Comp = ChartPlaceholderComponent.component;
    const { container } = render(<Comp {...makeProps({ title: '' })} />);
    expect(container.querySelector('.dc-chart-placeholder__title')).toBeNull();
  });

  it('does not render title node when title is undefined', () => {
    const Comp = ChartPlaceholderComponent.component;
    const { container } = render(
      <Comp {...makeProps({ title: undefined })} />,
    );
    expect(container.querySelector('.dc-chart-placeholder__title')).toBeNull();
  });

  it('does not render title node when title is whitespace only', () => {
    const Comp = ChartPlaceholderComponent.component;
    const { container } = render(<Comp {...makeProps({ title: '   ' })} />);
    expect(container.querySelector('.dc-chart-placeholder__title')).toBeNull();
  });

  it('renders title node with text when title is a normal string', () => {
    const Comp = ChartPlaceholderComponent.component;
    const { container } = render(
      <Comp {...makeProps({ title: '월별 매출' })} />,
    );
    const titleEl = container.querySelector('.dc-chart-placeholder__title');
    expect(titleEl).not.toBeNull();
    expect(titleEl?.textContent).toBe('월별 매출');
  });
});

describe('ChartPlaceholderRender — description visibility', () => {
  it('does not render description node when description is empty string', () => {
    const Comp = ChartPlaceholderComponent.component;
    const { container } = render(
      <Comp {...makeProps({ description: '' })} />,
    );
    expect(
      container.querySelector('.dc-chart-placeholder__description'),
    ).toBeNull();
  });

  it('does not render description node when description is undefined', () => {
    const Comp = ChartPlaceholderComponent.component;
    const { container } = render(
      <Comp {...makeProps({ description: undefined })} />,
    );
    expect(
      container.querySelector('.dc-chart-placeholder__description'),
    ).toBeNull();
  });

  it('does not render description node when description is whitespace only', () => {
    const Comp = ChartPlaceholderComponent.component;
    const { container } = render(
      <Comp {...makeProps({ description: '\t  \n' })} />,
    );
    expect(
      container.querySelector('.dc-chart-placeholder__description'),
    ).toBeNull();
  });

  it('renders description node with text when description is a normal string', () => {
    const Comp = ChartPlaceholderComponent.component;
    const { container } = render(
      <Comp {...makeProps({ description: '단위: 백만 원' })} />,
    );
    const descEl = container.querySelector('.dc-chart-placeholder__description');
    expect(descEl).not.toBeNull();
    expect(descEl?.textContent).toBe('단위: 백만 원');
  });
});

describe('ChartPlaceholderRender — chartType data attribute', () => {
  it('sets data-chart-type="bar" when chartType is "bar"', () => {
    const Comp = ChartPlaceholderComponent.component;
    const { container } = render(
      <Comp {...makeProps({ chartType: 'bar' })} />,
    );
    const wrapper = container.querySelector('[data-component="chartPlaceholder"]');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute('data-chart-type')).toBe('bar');
  });

  it('sets data-chart-type="pie" when chartType is "pie"', () => {
    const Comp = ChartPlaceholderComponent.component;
    const { container } = render(
      <Comp {...makeProps({ chartType: 'pie' })} />,
    );
    const wrapper = container.querySelector('[data-component="chartPlaceholder"]');
    expect(wrapper?.getAttribute('data-chart-type')).toBe('pie');
  });

  it('falls back to data-chart-type="bar" for unknown chartType', () => {
    // silence dev warn from getChart fallback
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Comp = ChartPlaceholderComponent.component;
    const { container } = render(
      <Comp
        {...makeProps({
          chartType: 'xyz' as ChartPlaceholderSchema['chartType'],
        })}
      />,
    );
    const wrapper = container.querySelector('[data-component="chartPlaceholder"]');
    expect(wrapper?.getAttribute('data-chart-type')).toBe('bar');
  });
});

describe('ChartPlaceholderRender — aria-label and canvas SVG', () => {
  it('canvas aria-label contains koLabel for bar chart (막대 차트 자리)', () => {
    const Comp = ChartPlaceholderComponent.component;
    const { container } = render(
      <Comp {...makeProps({ chartType: 'bar' })} />,
    );
    const canvas = container.querySelector('.dc-chart-placeholder__canvas');
    expect(canvas).not.toBeNull();
    const ariaLabel = canvas?.getAttribute('aria-label') ?? '';
    expect(ariaLabel).toContain('막대');
    expect(ariaLabel).toContain('차트 자리');
  });

  it('canvas aria-label contains koLabel for pie chart (파이 차트 자리)', () => {
    const Comp = ChartPlaceholderComponent.component;
    const { container } = render(
      <Comp {...makeProps({ chartType: 'pie' })} />,
    );
    const canvas = container.querySelector('.dc-chart-placeholder__canvas');
    const ariaLabel = canvas?.getAttribute('aria-label') ?? '';
    expect(ariaLabel).toContain('파이');
  });

  it('canvas role is "img"', () => {
    const Comp = ChartPlaceholderComponent.component;
    const { container } = render(<Comp {...makeProps()} />);
    const canvas = container.querySelector('.dc-chart-placeholder__canvas');
    expect(canvas?.getAttribute('role')).toBe('img');
  });

  it('canvas innerHTML contains <svg element (dangerouslySetInnerHTML)', () => {
    const Comp = ChartPlaceholderComponent.component;
    const { container } = render(
      <Comp {...makeProps({ chartType: 'bar' })} />,
    );
    const canvas = container.querySelector('.dc-chart-placeholder__canvas');
    expect(canvas).not.toBeNull();
    expect(canvas?.innerHTML).toContain('<svg');
  });

  it('canvas innerHTML changes when chartType changes (different SVG injected)', () => {
    const Comp = ChartPlaceholderComponent.component;
    const { container: barContainer } = render(
      <Comp {...makeProps({ chartType: 'bar' })} />,
    );
    const barInnerHTML =
      barContainer
        .querySelector('.dc-chart-placeholder__canvas')
        ?.innerHTML ?? '';
    cleanup();

    const { container: pieContainer } = render(
      <Comp {...makeProps({ chartType: 'pie' })} />,
    );
    const pieInnerHTML =
      pieContainer
        .querySelector('.dc-chart-placeholder__canvas')
        ?.innerHTML ?? '';

    expect(barInnerHTML.length).toBeGreaterThan(0);
    expect(pieInnerHTML.length).toBeGreaterThan(0);
    expect(barInnerHTML).not.toBe(pieInnerHTML);
  });
});

describe('ChartPlaceholderRender — root element', () => {
  it('renders root with data-component="chartPlaceholder" and provided domId', () => {
    const Comp = ChartPlaceholderComponent.component;
    const { container } = render(<Comp {...makeProps()} />);
    const root = container.querySelector('[data-component="chartPlaceholder"]');
    expect(root).not.toBeNull();
    expect((root as HTMLElement).id).toBe('chart-test-dom');
    expect(root?.classList.contains('dc-chart-placeholder')).toBe(true);
  });
});
