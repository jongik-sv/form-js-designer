/**
 * ValidateService 단위 테스트 — TSK-06-02
 * 6 케이스: validate 결과, 에러 포맷, designer-core validateFormSchema 위임 확인
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// validateFormSchema mock
vi.mock('@form-js-designer/designer-core', () => ({
  validateFormSchema: vi.fn(),
}));

import { validateFormSchema } from '@form-js-designer/designer-core';
import { ValidateService } from '../ValidateService';

const mockValidateFormSchema = vi.mocked(validateFormSchema);

function makeDeps(overrides: Record<string, unknown> = {}) {
  return {
    formEditor: {
      getSchema: vi.fn().mockReturnValue({ type: 'default', components: [] }),
    },
    formFieldRegistry: {
      get: vi.fn(),
      getAll: vi.fn().mockReturnValue([]),
    },
    eventBus: {
      fire: vi.fn(),
    },
    ...overrides,
  };
}

describe('ValidateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Case 1: 유효 스키마 → ok=true
  it('1: 유효 스키마에서 validate() 호출 시 ok=true 반환', () => {
    mockValidateFormSchema.mockReturnValue({ ok: true, errors: [], warnings: [] });
    const deps = makeDeps();
    const service = new ValidateService(deps.formEditor, deps.formFieldRegistry, deps.eventBus);
    const result = service.validate();
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // Case 2: 에러 포함 스키마 → ok=false, errors 포함
  it('2: 에러 스키마에서 validate() 호출 시 ok=false + errors 배열', () => {
    mockValidateFormSchema.mockReturnValue({
      ok: false,
      errors: [{ path: 'components[id=f1]', code: 'UNKNOWN_COMPONENT_TYPE', message: 'Unknown type' }],
      warnings: [],
    });
    const deps = makeDeps();
    const service = new ValidateService(deps.formEditor, deps.formFieldRegistry, deps.eventBus);
    const result = service.validate();
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  // Case 3: designer-core validateFormSchema를 호출하여 로직을 위임
  it('3: designer-core validateFormSchema에 로직을 위임함', () => {
    mockValidateFormSchema.mockReturnValue({ ok: true, errors: [], warnings: [] });
    const deps = makeDeps();
    const service = new ValidateService(deps.formEditor, deps.formFieldRegistry, deps.eventBus);
    service.validate();
    expect(mockValidateFormSchema).toHaveBeenCalledTimes(1);
  });

  // Case 4: 스키마를 직접 전달하면 formEditor.getSchema() 대신 해당 스키마 사용
  it('4: 스키마를 직접 전달하면 formEditor.getSchema() 대신 사용', () => {
    mockValidateFormSchema.mockReturnValue({ ok: true, errors: [], warnings: [] });
    const deps = makeDeps();
    const service = new ValidateService(deps.formEditor, deps.formFieldRegistry, deps.eventBus);
    const customSchema = { type: 'default', components: [{ id: 'x', type: 'text' }] };
    service.validate(customSchema);
    expect(mockValidateFormSchema).toHaveBeenCalledWith(customSchema, expect.anything());
    expect(deps.formEditor.getSchema).not.toHaveBeenCalled();
  });

  // Case 5: validate 후 eventBus.fire('designer.validate.done') 발화
  it('5: validate 완료 후 eventBus.fire("designer.validate.done") 발화', () => {
    mockValidateFormSchema.mockReturnValue({ ok: true, errors: [], warnings: [] });
    const deps = makeDeps();
    const service = new ValidateService(deps.formEditor, deps.formFieldRegistry, deps.eventBus);
    const result = service.validate();
    expect(deps.eventBus.fire).toHaveBeenCalledWith('designer.validate.done', result);
  });

  // Case 6: 미등록 컴포넌트 type 에러 포맷 — UNKNOWN_COMPONENT_TYPE + path
  it('6: 미등록 컴포넌트 에러 포맷 — UNKNOWN_COMPONENT_TYPE + path 포함', () => {
    mockValidateFormSchema.mockReturnValue({
      ok: false,
      errors: [{ path: 'myField', code: 'UNKNOWN_COMPONENT_TYPE', message: 'type "foo" not registered' }],
      warnings: [],
    });
    const deps = makeDeps();
    const service = new ValidateService(deps.formEditor, deps.formFieldRegistry, deps.eventBus);
    const result = service.validate();
    const err = result.errors[0]!;
    expect(err.code).toBe('UNKNOWN_COMPONENT_TYPE');
    expect(err.path).toBe('myField');
  });
});
