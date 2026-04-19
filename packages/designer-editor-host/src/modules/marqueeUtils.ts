/**
 * marqueeUtils.ts — TSK-11-03 마퀴 선택 순수 함수
 *
 * 모든 함수는 DOM에 의존하지 않는 순수 함수로 작성한다.
 * 테스트 대상: rectsIntersect, normalizeDragRect, filterIntersecting
 */

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * 필드 항목 — DOM 쿼리 없이 순수 함수로 교차 판정하기 위한 데이터 구조.
 * collectIntersectingIds에서 DOM을 직접 사용하고, 단위 테스트는 이 구조를 주입한다.
 */
export interface FieldEntry {
  id: string;
  rect: Rect;
  type: string;
  parentId: string;
  /** 루트까지의 조상 id 배열 (루트 제외). 가장 가까운 조상이 먼저. */
  ancestorIds: string[];
}

/**
 * AABB 교차 판정.
 * 경계선 접촉(a.right === b.left 등)은 교차로 취급하지 않는다 (strict < 사용).
 */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/**
 * 드래그 시작/끝 좌표로 normalize된 Rect를 반환한다.
 * 역방향 드래그도 left <= right, top <= bottom이 되도록 정규화.
 */
export function normalizeDragRect(start: Point, end: Point): Rect {
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const right = Math.max(start.x, end.x);
  const bottom = Math.max(start.y, end.y);
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

/**
 * 교차하는 필드 id 배열을 반환하는 순수 함수.
 *
 * 규칙:
 * 1. marqueeRect와 교차하는 entry만 포함한다.
 * 2. excludedInsideTypes에 해당하는 필드의 조상이 excludedInsideTypes에 속하면 제외한다
 *    (즉 excludedInsideTypes 컨테이너 내부의 자식은 제외. 컨테이너 자체는 포함).
 * 3. ancestor-dedup: 이미 선택된 ancestor가 있으면 하위 id는 제외한다
 *    (deleteSelectedFields의 hasSelectedAncestor 규약과 동일).
 *
 * @param entries - 모든 필드 항목 배열
 * @param marqueeRect - 마퀴 박스의 viewport 좌표 rect
 * @param excludedInsideTypes - 이 타입의 내부(자식)를 선택에서 제외할 타입 집합
 */
export function filterIntersecting(
  entries: FieldEntry[],
  marqueeRect: Rect,
  excludedInsideTypes: Set<string>,
): string[] {
  // 1단계: 교차하는 entry 수집
  const intersecting = entries.filter((entry) => rectsIntersect(marqueeRect, entry.rect));

  // intersecting id 집합 (ancestor-dedup 판정에 사용)
  const intersectingIdSet = new Set(intersecting.map((e) => e.id));

  // 2단계: excludedInsideTypes 조상 필터 적용
  // 어떤 조상이 excludedInsideTypes에 속하면, 그 내부의 자식을 제외.
  // 단, excludedInsideTypes 타입 자체가 intersecting에 포함된 경우 그 자신은 유지.
  const afterExclude = intersecting.filter((entry) => {
    // entry 자신은 조상 제외 규칙과 무관 — 조상이 excludedInsideTypes인지만 체크
    for (const ancestorId of entry.ancestorIds) {
      // ancestorId가 어떤 타입인지 찾는다
      const ancestor = entries.find((e) => e.id === ancestorId);
      if (ancestor && excludedInsideTypes.has(ancestor.type)) {
        // 이 entry는 excludedInsideTypes 내부에 있으므로 제외
        return false;
      }
    }
    return true;
  });

  // 3단계: ancestor-dedup 적용
  // afterExclude 중에서 intersectingIdSet 안에 ancestor가 있는 entry는 제외한다.
  const result: string[] = [];
  for (const entry of afterExclude) {
    let hasSelectedAncestor = false;
    for (const ancestorId of entry.ancestorIds) {
      if (intersectingIdSet.has(ancestorId)) {
        // 조상이 이미 intersecting에 포함 → 이 entry는 제외
        hasSelectedAncestor = true;
        break;
      }
    }
    if (!hasSelectedAncestor) {
      result.push(entry.id);
    }
  }

  return result;
}

/**
 * DOM 컨테이너에서 직접 FieldEntry 배열을 수집하는 헬퍼.
 * 단위 테스트에서는 filterIntersecting에 직접 entries를 주입하므로 이 함수는 MarqueeModule에서만 사용한다.
 *
 * @param container - `.fjs-editor-container` DOM 요소
 * @param resolveType - id → type 조회 함수 (formFieldRegistry.get(id).type)
 */
export function collectFieldEntries(
  container: Element,
  resolveType: (id: string) => string | undefined,
): FieldEntry[] {
  const elements = container.querySelectorAll('[data-id]');
  const entries: FieldEntry[] = [];

  elements.forEach((el) => {
    const id = el.getAttribute('data-id');
    if (!id) return;

    const domRect = el.getBoundingClientRect();
    const rect: Rect = {
      left: domRect.left,
      top: domRect.top,
      right: domRect.right,
      bottom: domRect.bottom,
      width: domRect.width,
      height: domRect.height,
    };

    const type = resolveType(id) ?? 'unknown';

    // 조상 id 수집 (container까지만 — 가장 가까운 조상부터)
    const ancestorIds: string[] = [];
    let parent = el.parentElement;
    while (parent && parent !== container) {
      const ancestorId = parent.getAttribute('data-id');
      if (ancestorId) {
        ancestorIds.push(ancestorId);
      }
      parent = parent.parentElement;
    }

    // parentId: 가장 가까운 직계 [data-id] 부모
    const parentId = ancestorIds.length > 0 ? ancestorIds[0]! : 'root';

    entries.push({ id, rect, type, parentId, ancestorIds });
  });

  return entries;
}
