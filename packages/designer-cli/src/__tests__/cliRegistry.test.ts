import { describe, it, expect } from 'vitest';
import { getCLIRegistry } from '../registry/cliRegistry.js';

describe('getCLIRegistry', () => {
  it('form-js 기본 타입 존재 확인', () => {
    const registry = getCLIRegistry();
    // SYNC with @bpmn-io/form-js-viewer built-in field types
    const baseTypes = ['textfield', 'number', 'datetime', 'checkbox', 'select', 'radio', 'textarea', 'group', 'default'];
    for (const type of baseTypes) {
      expect(registry.has(type), `기본 타입 "${type}" 이 등록되어 있어야 함`).toBe(true);
    }
  });

  it('designer-table 타입 존재 확인', () => {
    // SYNC with packages/designer-table/src/index.ts
    const registry = getCLIRegistry();
    expect(registry.has('table')).toBe(true);
  });

  it('designer-components 타입 존재 확인', () => {
    // SYNC with packages/designer-components/src/index.ts
    const registry = getCLIRegistry();
    expect(registry.has('card')).toBe(true);
    expect(registry.has('stack')).toBe(true);
    expect(registry.has('button')).toBe(true);
    expect(registry.has('tabs')).toBe(true);
    expect(registry.has('modal')).toBe(true);
  });

  it('미등록 타입 has() false 반환', () => {
    const registry = getCLIRegistry();
    expect(registry.has('unknown-widget')).toBe(false);
    expect(registry.has('')).toBe(false);
  });
});
