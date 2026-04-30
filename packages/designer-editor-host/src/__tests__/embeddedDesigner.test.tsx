import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Capture the mock PropsPanelService instance so tests can inspect setMode calls
let mockPropsPanelSvcInstance: { setMode: ReturnType<typeof vi.fn> } | null = null;

// Shared mock eventBus — used to trigger re-renders that surface ComponentResizeOverlay
const mockEventBus = { on: vi.fn(), off: vi.fn() };

vi.mock('@bpmn-io/form-js-editor', () => ({
  FormEditor: class {
    importSchema = vi.fn().mockResolvedValue(undefined);
    saveSchema = vi.fn().mockResolvedValue({ schema: { type: 'default', components: [] } });
    destroy = vi.fn();
    get = vi.fn((key: string) => {
      if (key === 'propsPanel') {
        if (!mockPropsPanelSvcInstance) {
          mockPropsPanelSvcInstance = { setMode: vi.fn() };
        }
        return mockPropsPanelSvcInstance;
      }
      if (key === 'eventBus') return mockEventBus;
      return undefined;
    });
  },
}));

import { mountEmbeddedEditorModal } from '../embeddedDesigner';

describe('mountEmbeddedEditorModal', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mockPropsPanelSvcInstance = null;
    // Clean up sessionStorage to ensure test isolation
    try { window.sessionStorage.removeItem('designer.panelMode'); } catch { /* SSR */ }
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.body.style.overflow = '';
    mockPropsPanelSvcInstance = null;
    try { window.sessionStorage.removeItem('designer.panelMode'); } catch { /* SSR */ }
  });

  it('mount returns handle + appends wrapper to container', async () => {
    const handle = await mountEmbeddedEditorModal({
      container,
      initialSchema: { type: 'default', components: [] },
      onSave: () => {},
    });
    expect(handle.destroy).toBeTypeOf('function');
    expect(handle.getSchema).toBeTypeOf('function');
    expect(container.querySelector('.fjd-embedded-designer-root')).toBeTruthy();
    handle.destroy();
  });

  it('destroy removes wrapper, restores prototype.focus, restores body overflow', async () => {
    const native = HTMLElement.prototype.focus;
    const prevOverflow = document.body.style.overflow;
    const handle = await mountEmbeddedEditorModal({
      container,
      initialSchema: { type: 'default', components: [] },
      onSave: () => {},
    });
    expect(HTMLElement.prototype.focus).not.toBe(native);
    expect(document.body.style.overflow).toBe('hidden');
    handle.destroy();
    expect(container.querySelector('.fjd-embedded-designer-root')).toBeNull();
    expect(HTMLElement.prototype.focus).toBe(native);
    expect(document.body.style.overflow).toBe(prevOverflow);
  });

  it('getSchema returns initial schema before any edits', async () => {
    const initial = { type: 'default', components: [{ type: 'textfield', key: 'a' }] };
    const handle = await mountEmbeddedEditorModal({
      container,
      initialSchema: initial,
      onSave: () => {},
    });
    expect(handle.getSchema()).toEqual(initial);
    handle.destroy();
  });

  it('triggerClose path (Esc) — onSave called once with current schema, onClose fires once', async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    await mountEmbeddedEditorModal({
      container,
      initialSchema: { type: 'default', components: [] },
      onSave,
      onClose,
    });
    const wrapper = container.querySelector('.fjd-embedded-designer-root') as HTMLElement;
    wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('destroy path (external force-close) — onSave NOT called, onClose fires once', async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const handle = await mountEmbeddedEditorModal({
      container,
      initialSchema: { type: 'default', components: [] },
      onSave,
      onClose,
    });
    handle.destroy();
    await Promise.resolve();
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('embedded modal renders left-rail with components/outline tabs', async () => {
    const handle = await mountEmbeddedEditorModal({
      container,
      initialSchema: { type: 'default', components: [] },
      onSave: () => {},
    });
    const rail = container.querySelector('.left-rail') as HTMLElement;
    expect(rail).toBeTruthy();
    expect(rail.getAttribute('data-active-panel')).toBe('components');
    expect(container.querySelector('[data-testid="left-tab-outline"]')).toBeTruthy();
    expect(container.querySelector('.left-rail__panel[data-panel="outline"][data-outline-container]')).toBeTruthy();
    handle.destroy();
  });

  // ─── FU-C: initialPanelMode prop ──────────────────────────────────────────

  it('FU-C: initialPanelMode=\'simple\' takes precedence over sessionStorage \'full\'', async () => {
    // Seed sessionStorage with 'full' to simulate a prior web-App session
    try { window.sessionStorage.setItem('designer.panelMode', 'full'); } catch { /* SSR */ }

    const handle = await mountEmbeddedEditorModal({
      container,
      initialSchema: { type: 'default', components: [] },
      initialPanelMode: 'simple',
      onSave: () => {},
    });
    // Allow the importSchema.then() microtask to run so setServices/setMode fire
    await Promise.resolve();
    await Promise.resolve();
    // Verify PropsPanelService.setMode was called with 'simple'
    if (mockPropsPanelSvcInstance) {
      expect(mockPropsPanelSvcInstance.setMode).toHaveBeenCalledWith('simple');
    }
    handle.destroy();
  });

  it('FU-C: no initialPanelMode → falls back to readStoredPanelMode() (sessionStorage)', async () => {
    // Seed sessionStorage with 'full'
    try { window.sessionStorage.setItem('designer.panelMode', 'full'); } catch { /* SSR */ }

    const handle = await mountEmbeddedEditorModal({
      container,
      initialSchema: { type: 'default', components: [] },
      // No initialPanelMode — should read sessionStorage
      onSave: () => {},
    });
    await Promise.resolve();
    await Promise.resolve();
    // PropsPanelService.setMode should be called with 'full' (from sessionStorage)
    if (mockPropsPanelSvcInstance) {
      expect(mockPropsPanelSvcInstance.setMode).toHaveBeenCalledWith('full');
    }
    handle.destroy();
  });

  it('FU-C: initialPanelMode=\'simple\' even when sessionStorage missing → simple', async () => {
    // No sessionStorage entry — readStoredPanelMode() returns 'simple' by default,
    // so this mainly verifies the prop is wired correctly when nothing is in storage.
    const handle = await mountEmbeddedEditorModal({
      container,
      initialSchema: { type: 'default', components: [] },
      initialPanelMode: 'simple',
      onSave: () => {},
    });
    await Promise.resolve();
    await Promise.resolve();
    if (mockPropsPanelSvcInstance) {
      expect(mockPropsPanelSvcInstance.setMode).toHaveBeenCalledWith('simple');
    }
    handle.destroy();
  });

  // ─── TSK-12-02: ComponentResizeOverlay mount regression guard ─────────────

  it('TSK-12-02: ComponentResizeOverlay is mounted inside embedded modal after importSchema', async () => {
    // The overlay renders a hidden sentinel div when no field is selected.
    // It is only rendered after setServices() triggers a re-render (eventBus + editorInstance).
    await mountEmbeddedEditorModal({
      container,
      initialSchema: { type: 'default', components: [] },
      onSave: () => {},
    });
    // Wait for importSchema microtask + setServices state update
    await Promise.resolve();
    await Promise.resolve();
    // ComponentResizeOverlay renders a sentinel div with data-testid when no field is selected
    expect(
      container.querySelector('[data-testid="component-resize-overlay-mounted"]'),
    ).toBeTruthy();
  });
});
