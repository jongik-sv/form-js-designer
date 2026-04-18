/**
 * PanelSplitter 컴포넌트 단위 테스트
 * panel-resize-toggle feature
 *
 * 검증 항목:
 * - role="separator" 렌더
 * - aria-orientation="vertical"
 * - aria-valuenow / aria-valuemin / aria-valuemax
 * - tabIndex={0}
 * - onPointerDown 핸들러 호출 (startDrag)
 * - ArrowLeft → adjustWidth(-10)
 * - ArrowRight → adjustWidth(+10)
 * - Home → adjustWidth('min')
 * - End → adjustWidth('max')
 * - data-testid="panel-splitter"
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/preact';
import { h } from 'preact';
import { PanelSplitter } from '../components/PanelSplitter';

afterEach(() => {
  cleanup();
});

function renderSplitter(props?: Partial<Parameters<typeof PanelSplitter>[0]>) {
  const defaults = {
    width: 300,
    minWidth: 180,
    maxWidth: 600,
    onDragStart: vi.fn(),
    onAdjust: vi.fn(),
  };
  return render(<PanelSplitter {...defaults} {...props} />);
}

describe('PanelSplitter', () => {
  // ----- 1. 렌더 & 기본 속성 -----
  it('renders an element with role="separator"', () => {
    renderSplitter();
    const el = screen.getByRole('separator');
    expect(el).toBeTruthy();
  });

  it('has data-testid="panel-splitter"', () => {
    renderSplitter();
    expect(screen.getByTestId('panel-splitter')).toBeTruthy();
  });

  it('has aria-orientation="vertical"', () => {
    renderSplitter();
    const el = screen.getByRole('separator');
    expect(el.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('has aria-valuenow matching width prop', () => {
    renderSplitter({ width: 350 });
    const el = screen.getByRole('separator');
    expect(el.getAttribute('aria-valuenow')).toBe('350');
  });

  it('has aria-valuemin matching minWidth prop', () => {
    renderSplitter({ minWidth: 180 });
    const el = screen.getByRole('separator');
    expect(el.getAttribute('aria-valuemin')).toBe('180');
  });

  it('has aria-valuemax matching maxWidth prop', () => {
    renderSplitter({ maxWidth: 600 });
    const el = screen.getByRole('separator');
    expect(el.getAttribute('aria-valuemax')).toBe('600');
  });

  it('has tabIndex=0 for keyboard focus', () => {
    renderSplitter();
    const el = screen.getByRole('separator');
    expect(el.getAttribute('tabindex')).toBe('0');
  });

  // ----- 2. 드래그 이벤트 -----
  it('calls onDragStart when pointerdown event fires', () => {
    const onDragStart = vi.fn();
    renderSplitter({ onDragStart });
    const el = screen.getByRole('separator');
    fireEvent.pointerDown(el, { clientX: 100, clientY: 200 });
    expect(onDragStart).toHaveBeenCalledTimes(1);
  });

  // ----- 3. 키보드 이벤트 -----
  it('calls onAdjust(-10) on ArrowLeft key', () => {
    const onAdjust = vi.fn();
    renderSplitter({ onAdjust });
    const el = screen.getByRole('separator');
    fireEvent.keyDown(el, { key: 'ArrowLeft' });
    expect(onAdjust).toHaveBeenCalledWith(-10);
  });

  it('calls onAdjust(10) on ArrowRight key', () => {
    const onAdjust = vi.fn();
    renderSplitter({ onAdjust });
    const el = screen.getByRole('separator');
    fireEvent.keyDown(el, { key: 'ArrowRight' });
    expect(onAdjust).toHaveBeenCalledWith(10);
  });

  it('calls onAdjust("min") on Home key', () => {
    const onAdjust = vi.fn();
    renderSplitter({ onAdjust });
    const el = screen.getByRole('separator');
    fireEvent.keyDown(el, { key: 'Home' });
    expect(onAdjust).toHaveBeenCalledWith('min');
  });

  it('calls onAdjust("max") on End key', () => {
    const onAdjust = vi.fn();
    renderSplitter({ onAdjust });
    const el = screen.getByRole('separator');
    fireEvent.keyDown(el, { key: 'End' });
    expect(onAdjust).toHaveBeenCalledWith('max');
  });

  it('does not call onAdjust for unrelated key (e.g. Tab)', () => {
    const onAdjust = vi.fn();
    renderSplitter({ onAdjust });
    const el = screen.getByRole('separator');
    fireEvent.keyDown(el, { key: 'Tab' });
    expect(onAdjust).not.toHaveBeenCalled();
  });

  // ----- 4. aria-valuenow 갱신 -----
  it('updates aria-valuenow when width prop changes', () => {
    const { rerender } = renderSplitter({ width: 300 });
    rerender(<PanelSplitter width={450} minWidth={180} maxWidth={600} onDragStart={vi.fn()} onAdjust={vi.fn()} />);
    const el = screen.getByRole('separator');
    expect(el.getAttribute('aria-valuenow')).toBe('450');
  });
});
