/**
 * LayoutHeightApplier 단위 테스트 — TSK-12-02
 *
 * jsdom 환경에서 DOM에 data-id 노드를 만들고
 * layout.height 주입/clear/비대상/멀티 케이스를 검증한다.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { applyLayoutHeight, LAYOUT_HEIGHT_TARGET_TYPES } from '../LayoutHeightApplier';

type TestField = {
  id: string;
  type: string;
  layout?: { height?: number; row?: number; columns?: number };
};

function makeContainer(id: string, type: string, extraInner = ''): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.setAttribute('data-id', id);
  const fieldDiv = document.createElement('div');
  fieldDiv.className = `fjs-form-field-${type} fjs-element`;
  wrapper.appendChild(fieldDiv);
  if (extraInner) {
    fieldDiv.insertAdjacentHTML('beforeend', extraInner);
  }
  return wrapper;
}

describe('LAYOUT_HEIGHT_TARGET_TYPES', () => {
  it('타겟 타입 목록이 올바르다', () => {
    const expected = [
      'textarea',
      'html',
      'table',
      'group',
      'card',
      'modal',
      'tabs',
      'tabPanel',
      'iframe',
      'image',
      'text',
    ];
    for (const t of expected) {
      expect(LAYOUT_HEIGHT_TARGET_TYPES).toContain(t);
    }
  });
});

describe('applyLayoutHeight', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  // Case 1: textarea 컨테이너에 style.height 주입 + 내부 <textarea> 100% important
  it('1: textarea 타입에 height 200px 주입, 내부 textarea는 100% !important', () => {
    const container = makeContainer('f1', 'textarea', '<textarea class="fjs-textarea"></textarea>');
    root.appendChild(container);

    const fields: TestField[] = [{ id: 'f1', type: 'textarea', layout: { height: 200 } }];
    applyLayoutHeight(root, fields);

    const fieldEl = container.querySelector('.fjs-element') as HTMLElement;
    expect(fieldEl.style.height).toBe('200px');

    const textareaEl = container.querySelector('textarea') as HTMLElement;
    expect(textareaEl.style.getPropertyValue('height')).toBe('100%');
    expect(textareaEl.style.getPropertyPriority('height')).toBe('important');
  });

  // Case 2: 비대상 타입(textfield)은 style 주입 없음
  it('2: textfield 타입은 layout.height가 있어도 style 주입하지 않음', () => {
    const container = makeContainer('f2', 'textfield');
    root.appendChild(container);

    const fields: TestField[] = [{ id: 'f2', type: 'textfield', layout: { height: 150 } }];
    applyLayoutHeight(root, fields);

    const fieldEl = container.querySelector('.fjs-element') as HTMLElement;
    expect(fieldEl.style.height).toBe('');
  });

  // Case 3: layout.height clear — 이전에 주입 후 undefined 전달하면 style.height = ''
  it('3: layout.height undefined 전달 시 style.height 초기화', () => {
    const container = makeContainer('f3', 'html');
    const fieldEl = container.querySelector('.fjs-element') as HTMLElement;
    fieldEl.style.height = '200px'; // 이전 값
    root.appendChild(container);

    const fields: TestField[] = [{ id: 'f3', type: 'html', layout: { height: undefined } }];
    applyLayoutHeight(root, fields);

    expect(fieldEl.style.height).toBe('');
  });

  // Case 4: layout 없는 필드 → style 초기화
  it('4: layout 속성 없는 필드 → style.height 초기화', () => {
    const container = makeContainer('f4', 'group');
    const fieldEl = container.querySelector('.fjs-element') as HTMLElement;
    fieldEl.style.height = '300px';
    root.appendChild(container);

    const fields: TestField[] = [{ id: 'f4', type: 'group' }];
    applyLayoutHeight(root, fields);

    expect(fieldEl.style.height).toBe('');
  });

  // Case 5: 멀티 필드 — 3개 중 2개만 layout.height 지정 (container=min-height, leaf=height)
  it('5: 3개 필드 중 2개만 layout.height 지정 → container 는 min-height, leaf 는 height', () => {
    const c1 = makeContainer('m1', 'card');
    const c2 = makeContainer('m2', 'modal');
    const c3 = makeContainer('m3', 'html');
    root.appendChild(c1);
    root.appendChild(c2);
    root.appendChild(c3);

    const fields: TestField[] = [
      { id: 'm1', type: 'card', layout: { height: 300 } },
      { id: 'm2', type: 'modal' },
      { id: 'm3', type: 'html', layout: { height: 100 } },
    ];
    applyLayoutHeight(root, fields);

    // card 는 container → min-height
    expect((c1.querySelector('.fjs-element') as HTMLElement).style.minHeight).toBe('300px');
    expect((c1.querySelector('.fjs-element') as HTMLElement).style.height).toBe('');
    // modal 은 height 미지정 → 둘 다 초기화
    expect((c2.querySelector('.fjs-element') as HTMLElement).style.height).toBe('');
    expect((c2.querySelector('.fjs-element') as HTMLElement).style.minHeight).toBe('');
    // html 은 leaf → height 고정
    expect((c3.querySelector('.fjs-element') as HTMLElement).style.height).toBe('100px');
    expect((c3.querySelector('.fjs-element') as HTMLElement).style.minHeight).toBe('');
  });

  // Case 6: data-fjs-id 속성도 조회 (대체 selector)
  it('6: data-fjs-id 속성이 있어도 조회 가능 (group 은 container → min-height)', () => {
    const container = document.createElement('div');
    container.setAttribute('data-fjs-id', 'fjs1');
    const fieldEl = document.createElement('div');
    fieldEl.className = 'fjs-element';
    container.appendChild(fieldEl);
    root.appendChild(container);

    const fields: TestField[] = [{ id: 'fjs1', type: 'group', layout: { height: 250 } }];
    applyLayoutHeight(root, fields);

    expect(fieldEl.style.minHeight).toBe('250px');
    expect(fieldEl.style.height).toBe('');
  });

  // Case 7: group 타입 — container 이므로 min-height 로 주입 (자식 추가 시 자동 확장)
  it('7: group 타입은 container → min-height 로 주입', () => {
    const container = makeContainer('g1', 'group');
    root.appendChild(container);

    const fields: TestField[] = [{ id: 'g1', type: 'group', layout: { height: 400 } }];
    applyLayoutHeight(root, fields);

    const fieldEl = container.querySelector('.fjs-element') as HTMLElement;
    expect(fieldEl.style.minHeight).toBe('400px');
    expect(fieldEl.style.height).toBe('');
  });

  // Case 8: table 타입 height 주입
  it('8: table 타입 height 주입', () => {
    const container = makeContainer('t1', 'table');
    root.appendChild(container);

    const fields: TestField[] = [{ id: 't1', type: 'table', layout: { height: 500 } }];
    applyLayoutHeight(root, fields);

    const fieldEl = container.querySelector('.fjs-element') as HTMLElement;
    expect(fieldEl.style.height).toBe('500px');
  });

  // Case 9: 기존 layout.row, layout.columns 값은 영향 없음
  it('9: layout.row/columns와 함께 height 주입 — 다른 layout 키 영향 없음', () => {
    const container = makeContainer('lc1', 'html');
    root.appendChild(container);

    const fields: TestField[] = [{ id: 'lc1', type: 'html', layout: { height: 180, row: 2, columns: 6 } }];
    applyLayoutHeight(root, fields);

    const fieldEl = container.querySelector('.fjs-element') as HTMLElement;
    expect(fieldEl.style.height).toBe('180px');
  });

  // Case 10: 실제 form-js DOM 구조 — wrapper 자체가 .fjs-element 클래스를 갖고
  //          내부에 자식 필드의 .fjs-element 가 중첩되어 있을 때, height 는 wrapper 에만 적용되어야 함.
  //          (container type 을 리사이즈할 때 첫 자식 필드로 주입되던 버그 회귀 방지)
  it('10: wrapper 가 .fjs-element 인 경우 wrapper 자체에 주입 (container 첫 자식으로 새지 않음)', () => {
    // 실제 form-js DOM: <div class="fjs-element" data-id="tabs_1"> ... <div class="fjs-element" data-id="child" /> ... </div>
    const tabsWrapper = document.createElement('div');
    tabsWrapper.className = 'fjs-element';
    tabsWrapper.setAttribute('data-id', 'tabs_1');

    const childWrapper = document.createElement('div');
    childWrapper.className = 'fjs-element';
    childWrapper.setAttribute('data-id', 'child_1');
    tabsWrapper.appendChild(childWrapper);
    root.appendChild(tabsWrapper);

    const fields: TestField[] = [{ id: 'tabs_1', type: 'tabs', layout: { height: 800 } }];
    applyLayoutHeight(root, fields);

    // tabs 는 container → min-height
    expect(tabsWrapper.style.minHeight).toBe('800px');
    expect(tabsWrapper.style.height).toBe('');
    // 회귀 방지 핵심: 첫 자식 필드에는 어떤 height/min-height 도 들어가면 안 됨
    expect(childWrapper.style.height).toBe('');
    expect(childWrapper.style.minHeight).toBe('');
  });

  // Case 11: container 의 min-height 주입 — 잔존 style.height 가 있으면 해제
  it('11: container 로 재주입 시 이전 style.height 가 있으면 해제', () => {
    const container = makeContainer('c11', 'tabs');
    const fieldEl = container.querySelector('.fjs-element') as HTMLElement;
    fieldEl.style.height = '500px'; // 과거 버그/이전 버전이 남긴 값
    root.appendChild(container);

    const fields: TestField[] = [{ id: 'c11', type: 'tabs', layout: { height: 600 } }];
    applyLayoutHeight(root, fields);

    expect(fieldEl.style.minHeight).toBe('600px');
    expect(fieldEl.style.height).toBe('');
  });

  // Case 12: leaf(height) → container(min-height) 간 전환 시 상호 초기화
  it('12: height 없을 때 height/minHeight 둘 다 초기화', () => {
    const c1 = makeContainer('c12a', 'group');
    const fieldA = c1.querySelector('.fjs-element') as HTMLElement;
    fieldA.style.minHeight = '400px';
    fieldA.style.height = '400px';
    root.appendChild(c1);

    const fields: TestField[] = [{ id: 'c12a', type: 'group' }];
    applyLayoutHeight(root, fields);

    expect(fieldA.style.height).toBe('');
    expect(fieldA.style.minHeight).toBe('');
  });
});
