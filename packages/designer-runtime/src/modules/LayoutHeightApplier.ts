/**
 * LayoutHeightApplier — 순수 로직 유닛 (TSK-12-02)
 *
 * field 배열을 받아 DOM의 [data-id] / [data-fjs-id] 요소에
 * layout.height를 inline style로 주입한다.
 *
 * DI 서비스 클래스(LayoutHeightService)와 분리하여 jsdom 테스트 용이.
 */

export const LAYOUT_HEIGHT_TARGET_TYPES = [
  'textarea',
  'html',
  'table',
  'group',
  'card',
  'stack',
  'modal',
  'tabs',
  'tabPanel',
] as const;

export type LayoutHeightTargetType = (typeof LAYOUT_HEIGHT_TARGET_TYPES)[number];

export interface ApplierField {
  id: string;
  type: string;
  layout?: { height?: number; [key: string]: unknown };
}

/**
 * 지정 root DOM 하위에서 각 field의 [data-id] / [data-fjs-id] 요소를 찾아
 * layout.height를 inline style.height로 주입한다.
 *
 * @param root  탐색 범위 DOM 노드 (document 또는 컨테이너)
 * @param fields form-js formFieldRegistry.getAll() 결과
 */
export function applyLayoutHeight(root: ParentNode, fields: ApplierField[]): void {
  for (const field of fields) {
    if (!(LAYOUT_HEIGHT_TARGET_TYPES as readonly string[]).includes(field.type)) {
      continue;
    }

    // [data-id] 또는 [data-fjs-id] 두 selector 모두 조회
    const wrapper =
      (root.querySelector(`[data-id="${field.id}"]`) ??
      root.querySelector(`[data-fjs-id="${field.id}"]`)) as HTMLElement | null;

    if (!wrapper) continue;

    // .fjs-element 클래스를 가진 내부 요소 또는 wrapper 자체에 style 적용
    const fieldEl =
      (wrapper.querySelector('.fjs-element') as HTMLElement | null) ??
      wrapper;

    const height = field.layout?.height;

    if (typeof height === 'number') {
      fieldEl.style.height = `${height}px`;

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
      // height가 없거나 undefined → 초기화
      fieldEl.style.height = '';
    }
  }
}
