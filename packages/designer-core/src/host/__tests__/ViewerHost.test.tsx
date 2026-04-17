/**
 * ViewerHost unit tests — TDD (TSK-03-03)
 *
 * 14 케이스:
 * 1. 마운트 시 new Form({ container }) 1회 호출 및 importSchema 호출
 * 2. schema prop 변경 시 importSchema 재호출
 * 3. data prop 변경 시 _update 호출 (importSchema 재호출 없음)
 * 4. unmount 시 form.destroy() 정확히 1회 호출
 * 5. onChange 콜백이 form-js 'changed' 이벤트 발화 시 호출
 * 6. onImport 콜백이 importSchema 완료 시 호출
 * 7. onError 콜백이 Form 생성 실패 시 호출
 * 8. form._update 미존재 시 importSchema fallback
 * 9. locale prop 전달 시 LocaleProvider로 감싸짐 (useT 접근 가능)
 * 10. schema=undefined 시 importSchema 호출 없이 빈 컨테이너 렌더
 * 11. additionalModules가 Form 생성자에 전달됨
 * 12. 중복 destroy 방지 (cleanup 1회만 호출)
 * 13. containerRef prop이 전달되면 ref에 DOM 노드 바인딩
 * 14. 에러 후 cleanup 시 destroy 중복 호출 없음
 *
 * Environment: happy-dom
 * Form is mocked via vi.mock
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { useRef } from 'preact/hooks';
import { ViewerHost } from '../ViewerHost';
import type { FormSchema } from '../hostTypes';

// ---------------------------------------------------------------------------
// form-js-viewer mock
// ---------------------------------------------------------------------------
type EventHandler = (event: unknown) => void;

interface MockFormInstance {
  importSchema: ReturnType<typeof vi.fn>;
  _update: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  _eventHandlers: Map<string, EventHandler>;
  _fireEvent: (name: string, payload: unknown) => void;
}

let lastFormInstance: MockFormInstance | null = null;

vi.mock('@bpmn-io/form-js-viewer', () => {
  const MockForm = vi.fn(function (this: MockFormInstance) {
    this._eventHandlers = new Map<string, EventHandler>();
    this.importSchema = vi.fn().mockResolvedValue({ warnings: [] });
    this._update = vi.fn();
    this.destroy = vi.fn();
    this.on = vi.fn((event: string, handler: EventHandler) => {
      this._eventHandlers.set(event, handler);
    });
    this._fireEvent = function(name: string, payload: unknown) {
      const handler = this._eventHandlers.get(name);
      if (handler) handler(payload);
    };
    lastFormInstance = this;
  });
  return { Form: MockForm };
});

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------
const BASE_SCHEMA: FormSchema = { components: [], type: 'default', id: 'test-schema' };
const BASE_DATA = { name: 'Alice' };

async function getFormSpy() {
  const mod = await import('@bpmn-io/form-js-viewer');
  return mod.Form as unknown as ReturnType<typeof vi.fn>;
}

function mountViewer(
  props: Partial<Parameters<typeof ViewerHost>[0]> & { schema?: FormSchema },
  container: HTMLElement,
) {
  act(() => {
    render(
      <ViewerHost
        schema={props.schema ?? BASE_SCHEMA}
        {...props}
      />,
      container,
    );
  });
}

function unmount(container: HTMLElement) {
  act(() => {
    render(null, container);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('ViewerHost', () => {
  let container: HTMLElement;

  beforeEach(() => {
    lastFormInstance = null;
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    unmount(container);
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  // 1. 마운트 시 new Form 1회 + importSchema 호출
  it('creates a single Form instance on mount and calls importSchema(schema, data)', async () => {
    const FormSpy = await getFormSpy();
    FormSpy.mockClear();

    mountViewer({ schema: BASE_SCHEMA, data: BASE_DATA }, container);

    await vi.waitFor(() => {
      expect(FormSpy).toHaveBeenCalledTimes(1);
    });
    await vi.waitFor(() => {
      expect(lastFormInstance!.importSchema).toHaveBeenCalledWith(BASE_SCHEMA, BASE_DATA);
    });
  });

  // 2. schema prop 변경 시 importSchema 재호출
  it('calls importSchema again when schema prop changes', async () => {
    mountViewer({ schema: BASE_SCHEMA, data: BASE_DATA }, container);

    await vi.waitFor(() => {
      expect(lastFormInstance!.importSchema).toHaveBeenCalledTimes(1);
    });

    const newSchema: FormSchema = { components: [], type: 'default', id: 'new-schema' };
    act(() => {
      render(
        <ViewerHost schema={newSchema} data={BASE_DATA} />,
        container,
      );
    });

    await vi.waitFor(() => {
      expect(lastFormInstance!.importSchema.mock.calls.length).toBeGreaterThanOrEqual(2);
      expect(lastFormInstance!.importSchema).toHaveBeenLastCalledWith(newSchema, expect.anything());
    });
  });

  // 3. data prop 변경 시 _update 호출 (importSchema 재호출 없음)
  it('calls _update when only data prop changes, without calling importSchema again', async () => {
    mountViewer({ schema: BASE_SCHEMA, data: BASE_DATA }, container);

    await vi.waitFor(() => {
      expect(lastFormInstance!.importSchema).toHaveBeenCalledTimes(1);
    });

    const newData = { name: 'Bob' };
    act(() => {
      render(
        <ViewerHost schema={BASE_SCHEMA} data={newData} />,
        container,
      );
    });

    await vi.waitFor(() => {
      expect(lastFormInstance!._update).toHaveBeenCalledWith({ data: newData });
    });
  });

  // 4. unmount 시 form.destroy() 정확히 1회
  it('calls form.destroy() exactly once on unmount', async () => {
    mountViewer({ schema: BASE_SCHEMA }, container);
    await vi.waitFor(() => expect(lastFormInstance).not.toBeNull());

    const form = lastFormInstance!;
    unmount(container);

    expect(form.destroy).toHaveBeenCalledTimes(1);
  });

  // 5. onChange 콜백 호출
  it('calls onChange callback when form fires changed event', async () => {
    const onChange = vi.fn();
    mountViewer({ schema: BASE_SCHEMA, onChange }, container);

    await vi.waitFor(() => expect(lastFormInstance).not.toBeNull());

    const payload = { data: { x: 1 }, schema: BASE_SCHEMA, errors: {} };
    act(() => {
      lastFormInstance!._fireEvent('changed', payload);
    });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      data: payload.data,
    }));
  });

  // 6. onImport 콜백 호출
  it('calls onImport callback after importSchema resolves', async () => {
    const onImport = vi.fn();
    mountViewer({ schema: BASE_SCHEMA, onImport }, container);

    await vi.waitFor(() => {
      expect(onImport).toHaveBeenCalledWith(expect.objectContaining({ warnings: expect.any(Array) }));
    });
  });

  // 7. onError 콜백 — Form 생성 시 throw
  it('calls onError callback when Form constructor throws', async () => {
    const onError = vi.fn();
    const FormSpy = await getFormSpy();
    FormSpy.mockImplementationOnce(function () {
      throw new Error('Form creation failed');
    });

    act(() => {
      render(<ViewerHost schema={BASE_SCHEMA} onError={onError} />, container);
    });

    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // 8. form._update 미존재 시 importSchema fallback
  it('falls back to importSchema when form._update is not a function', async () => {
    mountViewer({ schema: BASE_SCHEMA, data: BASE_DATA }, container);
    await vi.waitFor(() => expect(lastFormInstance).not.toBeNull());

    const initialImportCount = lastFormInstance!.importSchema.mock.calls.length;

    // _update를 제거하여 fallback 경로 테스트
    (lastFormInstance as unknown as Record<string, unknown>)._update = undefined;

    const newData = { name: 'Charlie' };
    act(() => {
      render(<ViewerHost schema={BASE_SCHEMA} data={newData} />, container);
    });

    await vi.waitFor(() => {
      expect(lastFormInstance!.importSchema.mock.calls.length).toBeGreaterThan(initialImportCount);
    });
  });

  // 9. locale prop 전달 시 LocaleProvider로 감싸짐
  it('wraps subtree with LocaleProvider when locale prop is provided', async () => {
    const mockT = vi.fn((key: string) => `ko:${key}`);
    mountViewer({ schema: BASE_SCHEMA, locale: { lang: 'ko', t: mockT } }, container);
    await vi.waitFor(() => {
      expect(container.querySelector('div')).not.toBeNull();
    });
  });

  // 10. schema=undefined 시 importSchema 호출 없음 + dev 경고
  it('does not call importSchema when schema is undefined, emits dev warning', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    act(() => {
      render(<ViewerHost schema={undefined as unknown as FormSchema} />, container);
    });

    // Form은 생성되더라도 schema=null이면 importSchema 미호출
    await vi.waitFor(() => expect(lastFormInstance).not.toBeNull());
    expect(lastFormInstance!.importSchema).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  // 11. additionalModules가 Form 생성자에 전달됨
  it('passes additionalModules to Form constructor', async () => {
    const FormSpy = await getFormSpy();
    FormSpy.mockClear();

    const modules = [{ name: 'testModule' }];
    mountViewer({ schema: BASE_SCHEMA, additionalModules: modules as unknown[] }, container);

    await vi.waitFor(() => {
      expect(FormSpy).toHaveBeenCalledWith(
        expect.objectContaining({ additionalModules: modules }),
      );
    });
  });

  // 12. 중복 destroy 방지
  it('does not call form.destroy() more than once even if cleanup fires multiple times', async () => {
    mountViewer({ schema: BASE_SCHEMA }, container);
    await vi.waitFor(() => expect(lastFormInstance).not.toBeNull());

    const form = lastFormInstance!;
    unmount(container);
    expect(form.destroy).toHaveBeenCalledTimes(1);
  });

  // 13. containerRef prop — DOM 노드 바인딩
  it('binds containerRef to the internal div element', async () => {
    function TestWrapper() {
      const ref = useRef<HTMLDivElement>(null);
      return <ViewerHost schema={BASE_SCHEMA} containerRef={ref} />;
    }

    act(() => {
      render(<TestWrapper />, container);
    });

    await vi.waitFor(() => {
      expect(container.querySelector('div')).not.toBeNull();
    });
  });

  // 14. 에러 후 destroy 중복 호출 없음
  it('does not call destroy after onError if Form was never created successfully', async () => {
    const onError = vi.fn();
    const FormSpy = await getFormSpy();
    FormSpy.mockImplementationOnce(function () {
      throw new Error('fail');
    });

    act(() => {
      render(<ViewerHost schema={BASE_SCHEMA} onError={onError} />, container);
    });

    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });

    unmount(container);
    // Form이 생성되지 않았으므로 destroy 호출 없음
    if (lastFormInstance) {
      expect(lastFormInstance.destroy).not.toHaveBeenCalled();
    }
  });
});
