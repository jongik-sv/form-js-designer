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
    const expected = ['textarea', 'html', 'table', 'group', 'card', 'stack', 'modal', 'tabs', 'tabPanel'];
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

  // Case 5: 멀티 필드 — 3개 중 2개만 layout.height 지정
  it('5: 3개 필드 중 2개만 layout.height 지정 → 해당 2개만 주입', () => {
    const c1 = makeContainer('m1', 'card');
    const c2 = makeContainer('m2', 'stack');
    const c3 = makeContainer('m3', 'html');
    root.appendChild(c1);
    root.appendChild(c2);
    root.appendChild(c3);

    const fields: TestField[] = [
      { id: 'm1', type: 'card', layout: { height: 300 } },
      { id: 'm2', type: 'stack' },
      { id: 'm3', type: 'html', layout: { height: 100 } },
    ];
    applyLayoutHeight(root, fields);

    expect((c1.querySelector('.fjs-element') as HTMLElement).style.height).toBe('300px');
    expect((c2.querySelector('.fjs-element') as HTMLElement).style.height).toBe('');
    expect((c3.querySelector('.fjs-element') as HTMLElement).style.height).toBe('100px');
  });

  // Case 6: data-fjs-id 속성도 조회 (대체 selector)
  it('6: data-fjs-id 속성이 있어도 조회 가능', () => {
    const container = document.createElement('div');
    container.setAttribute('data-fjs-id', 'fjs1');
    const fieldEl = document.createElement('div');
    fieldEl.className = 'fjs-element';
    container.appendChild(fieldEl);
    root.appendChild(container);

    const fields: TestField[] = [{ id: 'fjs1', type: 'group', layout: { height: 250 } }];
    applyLayoutHeight(root, fields);

    expect(fieldEl.style.height).toBe('250px');
  });

  // Case 7: group 타입 — layout.height 주입 (내부 textarea 없음)
  it('7: group 타입 height 주입', () => {
    const container = makeContainer('g1', 'group');
    root.appendChild(container);

    const fields: TestField[] = [{ id: 'g1', type: 'group', layout: { height: 400 } }];
    applyLayoutHeight(root, fields);

    const fieldEl = container.querySelector('.fjs-element') as HTMLElement;
    expect(fieldEl.style.height).toBe('400px');
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
});
