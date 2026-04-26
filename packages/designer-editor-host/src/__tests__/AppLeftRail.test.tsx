import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import { h } from 'preact';

vi.mock('@bpmn-io/form-js-editor', () => ({
  FormEditor: class {
    importSchema = vi.fn().mockResolvedValue(undefined);
    saveSchema = vi.fn().mockResolvedValue({ schema: { type: 'default', components: [] } });
    destroy = vi.fn();
    get = vi.fn();
  },
}));

import { App } from '../App';

describe('App — left rail layout', () => {
  beforeEach(() => { document.body.innerHTML = ''; });
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  it('renders .left-rail with components/outline tabs and panels, default active=components', () => {
    const { container } = render(<App />);
    const rail = container.querySelector('.left-rail') as HTMLElement;
    expect(rail).toBeTruthy();
    expect(rail.getAttribute('data-active-panel')).toBe('components');

    expect(container.querySelector('[data-testid="left-tab-components"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="left-tab-outline"]')).toBeTruthy();
    expect(container.querySelector('.left-rail__panel[data-panel="components"]')).toBeTruthy();
    expect(container.querySelector('.left-rail__panel[data-panel="outline"]')).toBeTruthy();
  });

  it('does not render the legacy hamburger toggle button', () => {
    const { container } = render(<App />);
    expect(container.querySelector('[data-testid="outline-toggle"]')).toBeNull();
    expect(container.querySelector('.outline-toggle-btn')).toBeNull();
  });

  it('keeps data-outline-container on the outline panel for MarqueeModule', () => {
    const { container } = render(<App />);
    const outlinePanel = container.querySelector('.left-rail__panel[data-panel="outline"]');
    expect(outlinePanel?.hasAttribute('data-outline-container')).toBe(true);
  });
});
