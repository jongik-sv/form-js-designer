import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installPropsPanelFocusGuard } from '../hooks/usePropsPanelFocusGuard';

describe('installPropsPanelFocusGuard scope', () => {
  let canvas: HTMLElement;
  let propsPanel: HTMLElement;
  let propsInput: HTMLInputElement;
  let cleanup: (() => void) | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
    canvas = document.createElement('div');
    canvas.classList.add('fjs-editor-selected');
    propsPanel = document.createElement('div');
    propsPanel.classList.add('props-panel');
    propsInput = document.createElement('input');
    propsPanel.appendChild(propsInput);
    document.body.append(canvas, propsPanel);
    propsInput.focus(); // activeElement = propsInput
  });

  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it('default scope (document) — patches all canvas focus calls', () => {
    cleanup = installPropsPanelFocusGuard();
    canvas.focus();
    expect(document.activeElement).toBe(propsInput);
  });

  it('scope=Element — does NOT patch focus calls outside scope', () => {
    const modalRoot = document.createElement('div');
    document.body.appendChild(modalRoot);
    cleanup = installPropsPanelFocusGuard(modalRoot);
    canvas.focus();
    expect(document.activeElement).toBe(canvas);
  });

  it('scope=Element — DOES patch focus calls inside scope', () => {
    const modalRoot = document.createElement('div');
    const scopedCanvas = document.createElement('div');
    scopedCanvas.classList.add('fjs-editor-selected');
    const scopedPropsPanel = document.createElement('div');
    scopedPropsPanel.classList.add('props-panel');
    const scopedInput = document.createElement('input');
    scopedPropsPanel.appendChild(scopedInput);
    modalRoot.append(scopedCanvas, scopedPropsPanel);
    document.body.appendChild(modalRoot);
    scopedInput.focus();
    cleanup = installPropsPanelFocusGuard(modalRoot);
    scopedCanvas.focus();
    expect(document.activeElement).toBe(scopedInput);
  });

  it('cleanup restores original prototype.focus', () => {
    const native = HTMLElement.prototype.focus;
    cleanup = installPropsPanelFocusGuard();
    expect(HTMLElement.prototype.focus).not.toBe(native);
    cleanup();
    cleanup = null;
    expect(HTMLElement.prototype.focus).toBe(native);
  });
});
