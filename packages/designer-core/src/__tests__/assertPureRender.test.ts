import { describe, it, expect, vi, afterEach } from 'vitest';
import { assertPureRender } from '../assertPureRender';

describe('assertPureRender', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not warn for a clean render function', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const cleanFn = ({ field }: { field: unknown }) => field;
    assertPureRender(cleanFn as unknown as (...args: unknown[]) => unknown);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('warns once for a function containing useService("selection")', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // eslint-disable-next-line no-new-func
    const badFn = new Function('return function render() { useService("selection"); }')() as () => void;
    assertPureRender(badFn as unknown as (...args: unknown[]) => unknown);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]![0]).toContain('useService');
  });

  it("warns once for a function containing useService('selection') single-quoted", () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // eslint-disable-next-line no-new-func
    const badFn = new Function("return function render() { useService('selection'); }")() as () => void;
    assertPureRender(badFn as unknown as (...args: unknown[]) => unknown);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('warns once for a function containing the word editing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // eslint-disable-next-line no-new-func
    const badFn = new Function('return function render() { var editing = true; }')() as () => void;
    assertPureRender(badFn as unknown as (...args: unknown[]) => unknown);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]![0]).toContain('editing');
  });

  it('warns once for a function containing isPreview', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // eslint-disable-next-line no-new-func
    const badFn = new Function('return function render() { var isPreview = false; }')() as () => void;
    assertPureRender(badFn as unknown as (...args: unknown[]) => unknown);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]![0]).toContain('isPreview');
  });

  it('warns once for a function containing isDesigner', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // eslint-disable-next-line no-new-func
    const badFn = new Function('return function render() { var isDesigner = false; }')() as () => void;
    assertPureRender(badFn as unknown as (...args: unknown[]) => unknown);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]![0]).toContain('isDesigner');
  });

  it('warns once for a function containing document.body.appendChild', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // eslint-disable-next-line no-new-func
    const badFn = new Function('return function render() { document.body.appendChild(document.createElement("div")); }')() as () => void;
    assertPureRender(badFn as unknown as (...args: unknown[]) => unknown);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]![0]).toContain('document.body.appendChild');
  });

  it('warns multiple times for multiple forbidden patterns', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // eslint-disable-next-line no-new-func
    const badFn = new Function('return function render() { var editing = true; var isPreview = false; }')() as () => void;
    assertPureRender(badFn as unknown as (...args: unknown[]) => unknown);
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });

  it('does NOT throw even when forbidden patterns are found', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    // eslint-disable-next-line no-new-func
    const badFn = new Function('return function render() { useService("selection"); editing; isPreview; isDesigner; document.body.appendChild(null); }')() as () => void;
    expect(() => assertPureRender(badFn as unknown as (...args: unknown[]) => unknown)).not.toThrow();
  });

  it('warns for all five forbidden patterns in one function', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // eslint-disable-next-line no-new-func
    const badFn = new Function('return function render() { useService("selection"); var editing = true; var isPreview = false; var isDesigner = false; document.body.appendChild(null); }')() as () => void;
    assertPureRender(badFn as unknown as (...args: unknown[]) => unknown);
    expect(warnSpy).toHaveBeenCalledTimes(5);
  });
});
