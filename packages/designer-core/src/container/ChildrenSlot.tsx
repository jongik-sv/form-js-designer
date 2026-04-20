/**
 * ChildrenSlot — custom container 필드용 자식 렌더 슬롯.
 *
 * 커스텀 container 컴포넌트(Card/Stack/Modal 등)의 render 함수에서
 * `<ChildrenSlot field={field} />` 형태로 호출하면 form-js가 해당 위치에
 * `.fjs-drop-container-vertical` (dragula drop zone)를 그려준다.
 */
import { h, Fragment } from 'preact';
import { useContext } from 'preact/hooks';
import { FormContext, FormRenderContext, FormField } from '@bpmn-io/form-js-viewer';
import type { ContainerField } from '../types';

void h;

interface ChildrenSlotProps {
  field: ContainerField;
}

interface FormLayouter {
  getRows: (parentId: string) => Array<{ id: string; components?: string[] }>;
}

interface FormFieldRegistry {
  get: (id: string) => ContainerField | undefined;
}

export function ChildrenSlot(props: ChildrenSlotProps): h.JSX.Element {
  const { field } = props;
  const { Children, Empty } = useContext(FormRenderContext) as {
    Children: (p: { class?: string; field: ContainerField; children?: unknown }) => h.JSX.Element;
    Empty: (p: { field: ContainerField }) => h.JSX.Element | null;
  };
  const components = field.components ?? [];
  const isEmpty = components.length === 0;

  return (
    <Children class="fjs-vertical-layout fjs-children cds--grid cds--grid--condensed" field={field}>
      <Rows field={field} />
      {isEmpty ? <Empty field={field} /> : null}
    </Children>
  );
}

function Rows(props: { field: ContainerField }): h.JSX.Element {
  const { field } = props;
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
              // FormField는 form-js-viewer가 export — field 필수, 나머지는 내부에서 service 조회
              return <FormField key={childId} field={childField as never} />;
            })}
          </Row>
        );
      })}
    </Fragment>
  );
}
