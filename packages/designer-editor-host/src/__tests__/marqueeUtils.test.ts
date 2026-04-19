/**
 * marqueeUtils.test.ts — TSK-11-03 마퀴 선택 순수 함수 단위 테스트
 *
 * 대상:
 *   - rectsIntersect(a, b): AABB 교차 판정
 *   - normalizeDragRect(start, end): 드래그 rect 정규화
 *   - filterIntersecting(entries, rect, excludeTypes): 교차 id 필터 (순수)
 */

import { describe, it, expect } from 'vitest';
import {
  rectsIntersect,
  normalizeDragRect,
  filterIntersecting,
} from '../modules/marqueeUtils';
import type { Rect, FieldEntry } from '../modules/marqueeUtils';

// ============================================================
// rectsIntersect
// ============================================================

describe('rectsIntersect', () => {
  // 완전 포함: b가 a 안에 완전히 들어있음 → true
  it('완전 포함: b가 a 내부에 있으면 true를 반환한다', () => {
    const a: Rect = { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 };
    const b: Rect = { left: 20, top: 20, right: 80, bottom: 80, width: 60, height: 60 };
    expect(rectsIntersect(a, b)).toBe(true);
  });

  // 부분 겹침 → true
  it('부분 겹침: rect가 일부 겹치면 true를 반환한다', () => {
    const a: Rect = { left: 0, top: 0, right: 50, bottom: 50, width: 50, height: 50 };
    const b: Rect = { left: 25, top: 25, right: 75, bottom: 75, width: 50, height: 50 };
    expect(rectsIntersect(a, b)).toBe(true);
  });

  // 완전 분리 → false
  it('비교차: 완전히 분리된 rect는 false를 반환한다', () => {
    const a: Rect = { left: 0, top: 0, right: 50, bottom: 50, width: 50, height: 50 };
    const b: Rect = { left: 100, top: 100, right: 150, bottom: 150, width: 50, height: 50 };
    expect(rectsIntersect(a, b)).toBe(false);
  });

  // 경계선 접촉 (a.right === b.left) → false (설계: < 아니라 <= 사용하면 true, 설계는 < 사용)
  it('변 접촉: a.right === b.left 경계선 접촉은 false를 반환한다', () => {
    const a: Rect = { left: 0, top: 0, right: 50, bottom: 50, width: 50, height: 50 };
    const b: Rect = { left: 50, top: 0, right: 100, bottom: 50, width: 50, height: 50 };
    expect(rectsIntersect(a, b)).toBe(false);
  });

  // 경계선 접촉 (a.bottom === b.top) → false
  it('변 접촉: a.bottom === b.top 경계선 접촉은 false를 반환한다', () => {
    const a: Rect = { left: 0, top: 0, right: 50, bottom: 50, width: 50, height: 50 };
    const b: Rect = { left: 0, top: 50, right: 50, bottom: 100, width: 50, height: 50 };
    expect(rectsIntersect(a, b)).toBe(false);
  });

  // 1px 겹침 → true
  it('1px 겹침: 최소한의 겹침도 true를 반환한다', () => {
    const a: Rect = { left: 0, top: 0, right: 51, bottom: 51, width: 51, height: 51 };
    const b: Rect = { left: 50, top: 50, right: 100, bottom: 100, width: 50, height: 50 };
    expect(rectsIntersect(a, b)).toBe(true);
  });

  // 오른쪽에서 비교차
  it('비교차: a가 b의 오른쪽에 있으면 false를 반환한다', () => {
    const a: Rect = { left: 100, top: 0, right: 150, bottom: 50, width: 50, height: 50 };
    const b: Rect = { left: 0, top: 0, right: 50, bottom: 50, width: 50, height: 50 };
    expect(rectsIntersect(a, b)).toBe(false);
  });

  // 위쪽에서 비교차
  it('비교차: a가 b 위에 있으면 false를 반환한다', () => {
    const a: Rect = { left: 0, top: 0, right: 50, bottom: 50, width: 50, height: 50 };
    const b: Rect = { left: 0, top: 100, right: 50, bottom: 150, width: 50, height: 50 };
    expect(rectsIntersect(a, b)).toBe(false);
  });
});

// ============================================================
// normalizeDragRect
// ============================================================

describe('normalizeDragRect', () => {
  it('start가 end보다 좌상단에 있을 때 그대로 반환한다', () => {
    const result = normalizeDragRect({ x: 10, y: 20 }, { x: 100, y: 200 });
    expect(result).toEqual({ left: 10, top: 20, right: 100, bottom: 200, width: 90, height: 180 });
  });

  it('start가 end보다 우하단에 있을 때 (역방향 드래그) 정규화한다', () => {
    const result = normalizeDragRect({ x: 100, y: 200 }, { x: 10, y: 20 });
    expect(result).toEqual({ left: 10, top: 20, right: 100, bottom: 200, width: 90, height: 180 });
  });

  it('가로만 역방향인 경우 정규화한다', () => {
    const result = normalizeDragRect({ x: 100, y: 20 }, { x: 10, y: 200 });
    expect(result).toEqual({ left: 10, top: 20, right: 100, bottom: 200, width: 90, height: 180 });
  });

  it('세로만 역방향인 경우 정규화한다', () => {
    const result = normalizeDragRect({ x: 10, y: 200 }, { x: 100, y: 20 });
    expect(result).toEqual({ left: 10, top: 20, right: 100, bottom: 200, width: 90, height: 180 });
  });

  it('동일 좌표 (점) 이면 width=height=0 rect를 반환한다', () => {
    const result = normalizeDragRect({ x: 50, y: 50 }, { x: 50, y: 50 });
    expect(result).toEqual({ left: 50, top: 50, right: 50, bottom: 50, width: 0, height: 0 });
  });
});

// ============================================================
// filterIntersecting
// ============================================================

describe('filterIntersecting', () => {
  // 기본 교차 판정
  it('marqueeRect와 교차하는 entry id 목록을 반환한다', () => {
    const marqueeRect: Rect = { left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200 };
    const entries: FieldEntry[] = [
      { id: 'field-1', rect: { left: 10, top: 10, right: 50, bottom: 50, width: 40, height: 40 }, type: 'textfield', parentId: 'root', ancestorIds: [] },
      { id: 'field-2', rect: { left: 300, top: 300, right: 350, bottom: 350, width: 50, height: 50 }, type: 'textfield', parentId: 'root', ancestorIds: [] },
      { id: 'field-3', rect: { left: 100, top: 100, right: 150, bottom: 150, width: 50, height: 50 }, type: 'textfield', parentId: 'root', ancestorIds: [] },
    ];
    const result = filterIntersecting(entries, marqueeRect, new Set<string>());
    expect(result).toContain('field-1');
    expect(result).not.toContain('field-2');
    expect(result).toContain('field-3');
  });

  // DISABLED_INSIDE_TYPES 제외 규칙: tabs 내부 자식은 제외
  it('DISABLED_INSIDE_TYPES(tabs)에 해당하는 필드 안의 자식 entry는 제외한다', () => {
    const marqueeRect: Rect = { left: 0, top: 0, right: 400, bottom: 400, width: 400, height: 400 };
    // tabsContainer 안의 자식: parentId가 tabs 타입 컨테이너를 가리킴
    const entries: FieldEntry[] = [
      {
        id: 'tabs-container',
        rect: { left: 10, top: 10, right: 300, bottom: 300, width: 290, height: 290 },
        type: 'tabs',
        parentId: 'root',
        ancestorIds: [],
      },
      {
        id: 'tab-child',
        rect: { left: 50, top: 50, right: 100, bottom: 100, width: 50, height: 50 },
        type: 'tabPanel',
        parentId: 'tabs-container',
        // tabs 타입 조상을 가짐
        ancestorIds: ['tabs-container'],
      },
    ];
    // tabs 타입 자체는 선택 가능하지만, DISABLED_INSIDE_TYPES 안의 자식은 제외
    const result = filterIntersecting(entries, marqueeRect, new Set(['tabs']));
    expect(result).toContain('tabs-container'); // tabs 컨테이너 자체는 선택 가능
    expect(result).not.toContain('tab-child'); // tabs 안의 자식은 제외
  });

  // ancestor-dedup 규칙: card 자체와 card 안 필드가 모두 교차할 때 card만 선택
  it('ancestor-dedup: 부모가 이미 선택되면 자식은 제외한다', () => {
    const marqueeRect: Rect = { left: 0, top: 0, right: 400, bottom: 400, width: 400, height: 400 };
    const entries: FieldEntry[] = [
      {
        id: 'card-1',
        rect: { left: 10, top: 10, right: 300, bottom: 300, width: 290, height: 290 },
        type: 'card',
        parentId: 'root',
        ancestorIds: [],
      },
      {
        id: 'field-inside-card',
        rect: { left: 50, top: 50, right: 100, bottom: 100, width: 50, height: 50 },
        type: 'textfield',
        parentId: 'card-1',
        ancestorIds: ['card-1'],
      },
    ];
    const result = filterIntersecting(entries, marqueeRect, new Set<string>());
    expect(result).toContain('card-1');
    expect(result).not.toContain('field-inside-card');
  });

  // 교차하지 않는 경우 빈 배열
  it('교차하는 entry가 없으면 빈 배열을 반환한다', () => {
    const marqueeRect: Rect = { left: 0, top: 0, right: 10, bottom: 10, width: 10, height: 10 };
    const entries: FieldEntry[] = [
      { id: 'field-1', rect: { left: 100, top: 100, right: 150, bottom: 150, width: 50, height: 50 }, type: 'textfield', parentId: 'root', ancestorIds: [] },
    ];
    const result = filterIntersecting(entries, marqueeRect, new Set<string>());
    expect(result).toEqual([]);
  });

  // DISABLED_INSIDE_TYPES 자체(tabs 컨테이너)는 선택 가능
  it('DISABLED_INSIDE_TYPES(tabs) 컨테이너 자체는 교차 시 선택에 포함된다', () => {
    const marqueeRect: Rect = { left: 0, top: 0, right: 400, bottom: 400, width: 400, height: 400 };
    const entries: FieldEntry[] = [
      {
        id: 'tabs-1',
        rect: { left: 10, top: 10, right: 300, bottom: 300, width: 290, height: 290 },
        type: 'tabs',
        parentId: 'root',
        ancestorIds: [],
      },
    ];
    const result = filterIntersecting(entries, marqueeRect, new Set(['tabs']));
    expect(result).toContain('tabs-1');
  });

  // 여러 독립 필드가 모두 교차 → 모두 포함
  it('여러 독립 필드가 모두 교차하면 모두 포함한다', () => {
    const marqueeRect: Rect = { left: 0, top: 0, right: 500, bottom: 500, width: 500, height: 500 };
    const entries: FieldEntry[] = [
      { id: 'f1', rect: { left: 10, top: 10, right: 60, bottom: 60, width: 50, height: 50 }, type: 'textfield', parentId: 'root', ancestorIds: [] },
      { id: 'f2', rect: { left: 100, top: 100, right: 150, bottom: 150, width: 50, height: 50 }, type: 'textfield', parentId: 'root', ancestorIds: [] },
      { id: 'f3', rect: { left: 200, top: 200, right: 250, bottom: 250, width: 50, height: 50 }, type: 'textfield', parentId: 'root', ancestorIds: [] },
    ];
    const result = filterIntersecting(entries, marqueeRect, new Set<string>());
    expect(result).toContain('f1');
    expect(result).toContain('f2');
    expect(result).toContain('f3');
    expect(result).toHaveLength(3);
  });
});
