/**
 * tabs-tabpanel-refactor: Proxy 기반 팔레트 숨김 단위 테스트
 *
 * QA 체크리스트 항목:
 * - DesignerComponentsRegistration 이 tabPanel 등록 후
 *   Object.entries(formFields._formFields) 에서 'tabPanel'이 빠져 있다
 * - 동시에 formFields.get('tabPanel') 은 정상적으로 TabPanelComponent를 반환한다
 */
import { describe, it, expect, vi } from 'vitest';
import { DesignerComponentsModule } from '../../module';

function createMockFormFields() {
  const _formFields: Record<string, unknown> = {};
  return {
    _formFields,
    register: vi.fn((type: string, componentDef: unknown) => {
      _formFields[type] = componentDef;
    }),
    get: vi.fn((type: string) => _formFields[type]),
  };
}

function invokeRegistration(formFields: ReturnType<typeof createMockFormFields>) {
  const entry = (DesignerComponentsModule as Record<string, unknown>)['designerComponentsRegistration'];
  let fn: ((ff: unknown) => void) | undefined;
  if (Array.isArray(entry)) {
    const last = entry[entry.length - 1];
    if (typeof last === 'function') fn = last as (ff: unknown) => void;
  } else if (typeof entry === 'function') {
    fn = entry as (ff: unknown) => void;
  }
  if (fn) fn(formFields);
}

describe('Proxy-based palette hiding', () => {
  it('tabPanel is not enumerable via Object.entries(_formFields) after registration', () => {
    const ff = createMockFormFields();
    invokeRegistration(ff);
    const keys = Object.entries(ff._formFields).map(([k]) => k);
    expect(keys).not.toContain('tabPanel');
  });

  it('formFields.get("tabPanel") returns the TabPanel component (not hidden from get)', () => {
    const ff = createMockFormFields();
    invokeRegistration(ff);
    // Simulate the get() using the Proxy'd _formFields
    const result = ff.get('tabPanel');
    expect(result).toBeDefined();
    expect(typeof result).toBe('function');
    // The config should identify it as tabPanel
    const config = (result as { config?: { type?: string } })?.config;
    expect(config?.type).toBe('tabPanel');
  });

  it('other components (card, tabs) remain enumerable', () => {
    const ff = createMockFormFields();
    invokeRegistration(ff);
    const keys = Object.entries(ff._formFields).map(([k]) => k);
    expect(keys).toContain('card');
    expect(keys).toContain('tabs');
  });

  it('Object.keys(_formFields) also excludes tabPanel', () => {
    const ff = createMockFormFields();
    invokeRegistration(ff);
    expect(Object.keys(ff._formFields)).not.toContain('tabPanel');
  });
});
