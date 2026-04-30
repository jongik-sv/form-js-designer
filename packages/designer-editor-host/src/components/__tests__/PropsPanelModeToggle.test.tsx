import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/preact';
import { PropsPanelModeToggle } from '../PropsPanelModeToggle';

afterEach(() => cleanup());

describe('PropsPanelModeToggle', () => {
  it('현재 mode 버튼만 is-active', () => {
    const { getByTestId } = render(
      <PropsPanelModeToggle mode="simple" onChange={() => {}} />,
    );
    expect(getByTestId('props-mode-simple').className).toContain('is-active');
    expect(getByTestId('props-mode-full').className).not.toContain('is-active');
  });

  it('클릭 시 onChange 호출', () => {
    const onChange = vi.fn();
    const { getByTestId } = render(
      <PropsPanelModeToggle mode="simple" onChange={onChange} />,
    );
    fireEvent.click(getByTestId('props-mode-full'));
    expect(onChange).toHaveBeenCalledWith('full');
  });
});
