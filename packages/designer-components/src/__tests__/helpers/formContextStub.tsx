/**
 * formContextStub — form-js FormContext/FormRenderContext stub providers for unit tests.
 *
 * Tabs/TabPanel 등 custom container가 form-js의 `FormField` 컴포넌트에 자식 렌더를
 * 위임하면서 단위 테스트에서도 `useService('form', ...)` / `useService('formFields', ...)`
 * 등 DI 의존이 발생한다. happy-dom 환경에서는 실제 form-js 인스턴스를 띄울 수 없으므로
 * 본 헬퍼가 최소 stub을 제공한다.
 */
import { h } from 'preact';
// @ts-ignore — form-js-viewer has no bundled types for these contexts
import { FormContext } from '@bpmn-io/form-js-viewer';

void h;

type ServiceMap = Record<string, unknown>;

export interface FormContextStubOptions {
  formFields?: { get: (type: string) => unknown };
  formState?: {
    data?: Record<string, unknown>;
    initialData?: Record<string, unknown>;
    errors?: Record<string, unknown>;
    properties?: Record<string, unknown>;
  };
  pathRegistry?: { getValuePath: (field: unknown) => unknown[] };
  eventBus?: { on: (...a: unknown[]) => void; off: (...a: unknown[]) => void; fire: (...a: unknown[]) => void };
  /** additional services */
  extra?: ServiceMap;
}

export function makeFormContextValue(options: FormContextStubOptions = {}) {
  const services: ServiceMap = {
    form: {
      _getState: () => ({
        data: options.formState?.data ?? {},
        initialData: options.formState?.initialData ?? {},
        errors: options.formState?.errors ?? {},
        properties: options.formState?.properties ?? {},
      }),
    },
    formFields: options.formFields ?? {
      get: () => function StubComponent() {
        return null;
      },
    },
    pathRegistry: options.pathRegistry ?? {
      getValuePath: () => [],
    },
    eventBus: options.eventBus ?? {
      on: () => {},
      off: () => {},
      fire: () => {},
    },
    ...(options.extra ?? {}),
  };

  return {
    getService: (type: string, strict?: boolean): unknown => {
      const svc = services[type];
      if (svc === undefined) {
        if (strict === false) return null;
        return null;
      }
      return svc;
    },
    formId: 'stub-form-id',
  };
}

export interface FormContextProviderProps extends FormContextStubOptions {
  children?: unknown;
}

export function FormContextProvider(props: FormContextProviderProps): h.JSX.Element {
  const { children, ...opts } = props;
  const value = makeFormContextValue(opts);
  // Default FormRenderContext value already handles Column/Element/Children/Row/Empty/Hidden.
  return (
    <FormContext.Provider value={value}>
      {children as h.JSX.Element}
    </FormContext.Provider>
  );
}
