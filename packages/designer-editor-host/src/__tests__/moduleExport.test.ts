import { describe, it, expect } from 'vitest';

describe('package exports', () => {
  it('exposes OutlineModule via ./modules/outline subpath', async () => {
    const mod = await import('@form-js-designer/designer-editor-host/modules/outline');
    expect(mod.OutlineModule).toBeDefined();
    expect((mod.OutlineModule as { __init__?: string[] }).__init__).toContain('outlinePanel');
  });
});
