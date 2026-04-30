/**
 * ChildrenSlot — custom container 필드용 자식 렌더 슬롯.
 *
 * 커스텀 container 컴포넌트(Card/Stack/Modal 등)의 render 함수에서
 * `<ChildrenSlot field={field} {...renderProps} />` 형태로 호출한다.
 *
 * **부모 props 전파 (CRITICAL):**
 * form-js 의 native RowsRenderer 는 부모 FormField 의 props (onChange/onBlur/
 * onFocus/disabled/readonly/...) 를 자식 FormField 에 spread 한다. 우리 ChildrenSlot
 * 도 동일하게 동작해야 컨테이너 안의 입력 필드(select/datetime/textfield 등)가
 * form._update 와 연결된다. 이를 누락하면 자식 FormField 가 onChange undefined 인
 * 상태로 렌더되어 사용자 인터랙션 시 `_onChange is not a function` 에러가 던져진다.
 */
import { h, Fragment } from 'preact';
import { useContext } from 'preact/hooks';
import { FormContext, FormRenderContext, FormField } from '@bpmn-io/form-js-viewer';
import type { ContainerField } from '../types';

void h;

/**
 * ChildrenSlot 은 `field` 외에 부모 FormField 가 받은 임의 props 를 받아
 * 자식 FormField 에 그대로 spread 한다. form-js native RowsRenderer 동작과 동등.
 */
interface ChildrenSlotProps {
  field: ContainerField;
  [key: string]: unknown;
}

interface FormLayouter {
  getRows: (parentId: string) => Array<{ id: string; components?: string[] }>;
}

interface FormFieldRegistry {
  get: (id: string) => ContainerField | undefined;
}

export function ChildrenSlot(props: ChildrenSlotProps): h.JSX.Element {
  const { field, ...rest } = props;
  const { Children, Empty } = useContext(FormRenderContext) as {
    Children: (p: { class?: string; field: ContainerField; children?: unknown }) => h.JSX.Element;
    Empty: (p: { field: ContainerField }) => h.JSX.Element | null;
  };
  const components = field.components ?? [];
  const isEmpty = components.length === 0;

  return (
    <Children class="fjs-vertical-layout fjs-children cds--grid cds--grid--condensed" field={field}>
      <Rows field={field} parentProps={rest} />
      {isEmpty ? <Empty field={field} /> : null}
    </Children>
  );
}

function Rows(props: {
  field: ContainerField;
  parentProps: Record<string, unknown>;
}): h.JSX.Element {
  const { field, parentProps } = props;
  const { getService } = useContext(FormContext) as {
    getService: <T>(type: string, strict?: boolean) => T;
  };
  const { Row } = useContext(FormRenderContext) as {
    Row: (p: {
      class?: string;
      style?: Record<string, unknown>;
      row: { id: string };
      children?: unknown;
    }) => h.JSX.Element;
  };

  const formLayouter = getService<FormLayouter>('formLayouter');
  const formFieldRegistry = getService<FormFieldRegistry>('formFieldRegistry');

  if (!formLayouter || !formFieldRegistry) {
    return <Fragment />;
  }

  const rows = formLayouter.getRows(field.id) ?? [];
  const verticalAlignment = field.verticalAlignment ?? 'start';

  return (
    <Fragment>
      {rows.map((row) => {
        const rowComponents = row.components ?? [];
        if (rowComponents.length === 0) {
          return null;
        }
        return (
          <Row
            key={row.id}
            row={row}
            class="fjs-layout-row cds--row"
            style={{ alignItems: verticalAlignment }}>
            {rowComponents.map((childId) => {
              const childField = formFieldRegistry.get(childId);
              if (!childField) return null;
              // form-js RowsRenderer 와 동일: 부모 props (onChange/onBlur/...) 를 자식에 spread.
              return (
                <FormField
                  key={childId}
                  {...(parentProps as Record<string, unknown>)}
                  field={childField as never}
                />
              );
            })}
          </Row>
        );
      })}
    </Fragment>
  );
}
