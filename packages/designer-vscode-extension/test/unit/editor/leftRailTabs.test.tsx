import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { h } from 'preact';
import { LeftRailTabs } from '../../../src/editor/leftRail/LeftRailTabs';

describe('extension LeftRailTabs', () => {
  it('renders two tabs and toggles via callback', () => {
    const onTabChange = vi.fn();
    const { getByTestId } = render(
      <LeftRailTabs activeTab="components" onTabChange={onTabChange} />
    );
    expect(getByTestId('left-tab-components').getAttribute('aria-selected')).toBe('true');
    fireEvent.click(getByTestId('left-tab-outline'));
    expect(onTabChange).toHaveBeenCalledWith('outline');
  });
});
