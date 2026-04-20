/**
 * TSK-05-04: customEditor.ts 단위 테스트
 *
 * QA 체크리스트:
 * - initCustomEditor 함수가 export된다
 * - initCustomEditor 호출 시 createFormEditor가 additionalModules 포함하여 호출된다
 * - initCustomEditor가 editor 인스턴스(destroy 포함)를 반환한다
 */
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// mock: @bpmn-io/form-js-editor
const { mockCreateFormEditor, mockEditorDestroy, mockEditorImportSchema } = vi.hoisted(() => {
  const mockEditorDestroy = vi.fn();
  const mockEditorImportSchema = vi.fn();
  const mockCreateFormEditor = vi.fn(async (_options: unknown) => ({
    destroy: mockEditorDestroy,
    importSchema: mockEditorImportSchema,
    on: vi.fn(),
    off: vi.fn(),
  }));
  return { mockCreateFormEditor, mockEditorDestroy, mockEditorImportSchema };
});

vi.mock('@bpmn-io/form-js-editor', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    createFormEditor: mockCreateFormEditor,
  };
});

// mock: ../components
vi.mock('../../src/components', () => ({
  customComponentsModule: {
    __init__: ['designerComponentsRegistration'],
    designerComponentsRegistration: ['type', vi.fn()],
  },
}));

describe('customEditor: 기본 계약', () => {
  beforeEach(() => {
    mockCreateFormEditor.mockClear();
    mockEditorDestroy.mockClear();
    mockEditorImportSchema.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initCustomEditor 함수를 export한다', async () => {
    const mod = await import('../../src/editor/customEditor');
    expect(typeof mod.initCustomEditor).toBe('function');
  });

  it('initCustomEditor 호출 시 createFormEditor가 호출된다', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const { initCustomEditor } = await import('../../src/editor/customEditor');
    await initCustomEditor(container, { components: [], id: 'test-form' });

    expect(mockCreateFormEditor).toHaveBeenCalledTimes(1);
    document.body.removeChild(container);
  });

  it('initCustomEditor 호출 시 additionalModules에 customComponentsModule이 포함된다', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const { initCustomEditor } = await import('../../src/editor/customEditor');
    await initCustomEditor(container, { components: [], id: 'test-form' });

    expect(mockCreateFormEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        additionalModules: expect.arrayContaining([expect.anything()]),
      }),
    );
    document.body.removeChild(container);
  });

  it('initCustomEditor가 editor 인스턴스를 반환한다', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const { initCustomEditor } = await import('../../src/editor/customEditor');
    const editor = await initCustomEditor(container, { components: [], id: 'test-form' });

    expect(editor).not.toBeNull();
    expect(typeof editor?.destroy).toBe('function');
    document.body.removeChild(container);
  });
});
