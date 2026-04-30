/**
 * LayoutHeightApplier — 순수 로직 유닛 (TSK-12-02)
 *
 * field 배열을 받아 DOM의 [data-id] / [data-fjs-id] 요소에
 * layout.height를 inline style로 주입한다.
 *
 * DI 서비스 클래스(LayoutHeightService)와 분리하여 jsdom 테스트 용이.
 */

export const LAYOUT_HEIGHT_TARGET_TYPES = [
  // Input
  'textarea',
  'filepicker',
  // Selection
  'checklist',
  'radio',
  // Presentation
  'text',
  'html',
  'image',
  'spacer',
  'separator',
  'expression',
  // Containers
  'group',
  'card',
  'modal',
  'tabs',
  'tabPanel',
  // Extra (user confirmed)
  'chartPlaceholder',
  'tree',
  'table',
  'iframe',
] as const;

export type LayoutHeightTargetType = (typeof LAYOUT_HEIGHT_TARGET_TYPES)[number];

/**
 * 컨테이너 타입 — min-height 로 적용하여 자식이 많아지면 자동으로 확장되게 한다.
 * 나머지(textarea/html/table 등 leaf 타입)는 고정 height 로 유지.
 */
const CONTAINER_TYPES: readonly string[] = ['group', 'card', 'modal', 'tabs', 'tabPanel'];

export interface ApplierField {
  id: string;
  type: string;
  layout?: { height?: number; [key: string]: unknown };
}

/**
 * 지정 root DOM 하위에서 각 field의 wrapper 요소를 찾아
 * layout.height를 inline style.height / min-height로 주입한다.
 *
 * 매칭 전략 — editor 와 viewer 의 DOM 이 달라 다중 fallback 이 필요하다:
 *   1) [data-id] / [data-fjs-id] — form-js-editor 는 drag-and-drop wrapper 에
 *      data-id 를 붙이지만 form-js-viewer 는 `.fjs-element` 에 아무 식별자도
 *      주지 않는다. editor 에서만 매칭.
 *   2) form-js 의 render 결과 내부 요소에 `id=fjs-form-<formId>-<fieldId>` 가
 *      항상 붙는다 (prefixId helper). viewer/editor 공통 — 이 id 로 먼저 찾고
 *      가장 가까운 `.fjs-element` 로 타고 올라간다. viewer 에 필요.
 *
 * @param root    탐색 범위 DOM 노드 (document 또는 form._container)
 * @param fields  form-js formFieldRegistry.getAll() 결과
 * @param formId  form._id (알면 viewer-side 매칭 가능 — 없으면 editor 전용)
 */
export function applyLayoutHeight(
  root: ParentNode,
  fields: ApplierField[],
  formId?: string,
): void {
  for (const field of fields) {
    if (!(LAYOUT_HEIGHT_TARGET_TYPES as readonly string[]).includes(field.type)) {
      continue;
    }

    // 1) editor wrapper (data-id / data-fjs-id)
    let wrapper: HTMLElement | null =
      (root.querySelector(`[data-id="${field.id}"]`) as HTMLElement | null) ??
      (root.querySelector(`[data-fjs-id="${field.id}"]`) as HTMLElement | null);

    // 2) viewer fallback: prefixed inner id → .fjs-element 조상
    if (!wrapper && formId) {
      const innerId = `fjs-form-${formId}-${field.id}`;
      // CSS selector 용 escape — id 에 특수문자(., :, / 등) 가 있을 수 있으나
      // form-js field id 는 일반적으로 [A-Za-z0-9_-] 범위라 attribute selector 가 안전.
      const inner = root.querySelector(`[id="${innerId}"]`) as HTMLElement | null;
      if (inner) {
        const fjsEl = inner.closest('.fjs-element') as HTMLElement | null;
        wrapper = fjsEl ?? inner;
      }
    }

    if (!wrapper) continue;

    // form-js 실제 DOM 에서 wrapper 자체가 `.fjs-element` 클래스를 가진다.
    // 이전 구현은 `wrapper.querySelector('.fjs-element')` 로 첫 자손을 찾아
    // container 타입의 경우 첫 자식 필드(tabPanel / 첫 row 의 field 등)에
    // 잘못 height 를 주입했다. wrapper 가 fjs-element 이면 wrapper 자체에 적용,
    // 아니면(legacy / synthetic DOM) 첫 자손 fjs-element 로 fallback.
    const fieldEl = wrapper.classList?.contains('fjs-element')
      ? wrapper
      : ((wrapper.querySelector('.fjs-element') as HTMLElement | null) ?? wrapper);

    const height = field.layout?.height;
    const isContainer = CONTAINER_TYPES.includes(field.type);

    if (typeof height === 'number') {
      if (isContainer) {
        // 컨테이너: min-height 로 적용 — 자식이 많아져 초과하면 자동 확장.
        // 반대 케이스(잔존 height 인라인 스타일)도 초기화.
        fieldEl.style.minHeight = `${height}px`;
        fieldEl.style.height = '';
      } else {
        // Leaf (textarea/html/table): 고정 height 유지.
        fieldEl.style.height = `${height}px`;
        fieldEl.style.minHeight = '';
      }

      // textarea 타입은 내부 <textarea> 요소에도 height 100% !important 강제
      if (field.type === 'textarea') {
        const nativeTextarea = wrapper.querySelector('textarea') as HTMLElement | null;
        if (nativeTextarea) {
          nativeTextarea.style.setProperty('height', '100%', 'important');
          nativeTextarea.style.setProperty('min-height', '100%', 'important');
          nativeTextarea.style.setProperty('max-height', '100%', 'important');
        }
      }
    } else {
      // height가 없거나 undefined → 양쪽 초기화
      fieldEl.style.height = '';
      fieldEl.style.minHeight = '';
    }
  }
}
