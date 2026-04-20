/**
 * DesignerFormLayouter — FormLayouter 서브클래스.
 *
 * 기본 FormLayouter의 calculateLayout은 'default'/'group'/'dynamiclist' 타입만
 * row 추적 대상으로 인정한다. 커스텀 container(card/tabs/modal)를 포함하려면
 * field.type을 임시로 'group'으로 치환하여 부모 구현을 통과시킨다.
 */
import { FormLayouter } from '@bpmn-io/form-js-viewer';

/** 커스텀 컨테이너 타입 목록 — designer-components 등록 타입과 동기화 유지 */
const DESIGNER_CONTAINER_TYPES = new Set<string>(['card', 'tabs', 'modal', 'tabPanel']);

const BUILTIN_GROUPLIKE = new Set<string>(['default', 'group', 'dynamiclist']);

type AnyField = { type: string; id: string; components?: AnyField[]; layout?: { row?: string } };

type LayouterCtor = new (eventBus: unknown) => {
  calculateLayout(formField: AnyField): void;
};

const BaseLayouter = FormLayouter as unknown as LayouterCtor;

export class DesignerFormLayouter extends BaseLayouter {
  override calculateLayout(formField: AnyField): void {
    if (isCustomContainer(formField)) {
      // type만 'group'으로 치환한 proxy 객체를 부모에 전달.
      // super.calculateLayout 은 내부적으로 `components.forEach(field => this.calculateLayout(field))`
      // 로 자식을 재귀 처리한다. 이 때 field 는 원본 child 이고 this 는 우리 override 이므로
      // 중첩 커스텀 컨테이너(tabPanel 등)도 자동으로 우리 override 경로를 타고 올라간다.
      // 추가 재귀 loop 를 돌면 동일 child 를 두 번 처리해 formLayouter.addRow 가 행을 중복
      // 축적(rowsPerComponent.rows.push)해 DOM 에 같은 field 가 반복 렌더된다.
      super.calculateLayout({ ...formField, type: 'group' } as AnyField);
      return;
    }

    super.calculateLayout(formField);
  }
}

function isCustomContainer(field: AnyField): boolean {
  return (
    typeof field?.type === 'string' &&
    !BUILTIN_GROUPLIKE.has(field.type) &&
    DESIGNER_CONTAINER_TYPES.has(field.type)
  );
}
