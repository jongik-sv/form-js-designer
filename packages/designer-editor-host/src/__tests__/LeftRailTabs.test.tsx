import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/preact';
import { h } from 'preact';
import { LeftRailTabs } from '../components/LeftRailTabs';

afterEach(() => {
  cleanup();
});

describe('LeftRailTabs', () => {
  it('renders two tabs with correct labels and aria roles', () => {
    const { getByTestId, getByRole } = render(
      <LeftRailTabs activeTab="components" onTabChange={() => {}} />
    );
    const list = getByRole('tablist');
    expect(list.getAttribute('aria-label')).toBe('좌측 패널 탭');
    expect(getByTestId('left-tab-components').textContent).toBe('컴포넌트');
    expect(getByTestId('left-tab-outline').textContent).toBe('아웃라인');
  });

  it('marks the active tab with aria-selected=true', () => {
    const { getByTestId } = render(
      <LeftRailTabs activeTab="outline" onTabChange={() => {}} />
    );
    expect(getByTestId('left-tab-components').getAttribute('aria-selected')).toBe('false');
    expect(getByTestId('left-tab-outline').getAttribute('aria-selected')).toBe('true');
  });

  it('calls onTabChange when an inactive tab is clicked', () => {
    const onTabChange = vi.fn();
    const { getByTestId } = render(
      <LeftRailTabs activeTab="components" onTabChange={onTabChange} />
    );
    fireEvent.click(getByTestId('left-tab-outline'));
    expect(onTabChange).toHaveBeenCalledWith('outline');
  });
});
