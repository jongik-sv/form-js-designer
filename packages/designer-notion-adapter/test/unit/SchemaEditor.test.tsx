/**
 * TSK-03-03: SchemaEditor 단위 테스트
 * QA 체크리스트 기반 — design.md §QA 체크리스트
 *
 * - 유효한 JSON 저장 시 onSave 콜백 호출
 * - 잘못된 JSON 저장 시 에러 메시지 표시, onSave 미호출
 */
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { SchemaEditor } from '../../src/SchemaEditor';

function makeContainer(): HTMLDivElement {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

const VALID_JSON = '{"components":[]}';
const INVALID_JSON = '{ bad json ::';

describe('SchemaEditor', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = makeContainer();
  });

  afterEach(() => {
    render(null, container);
    document.body.innerHTML = '';
  });

  it('(정상) 유효한 JSON 입력 후 저장하면 onSave 콜백이 해당 JSON 문자열로 호출된다', () => {
    const onSave = vi.fn();
    // initialValue에 유효한 JSON을 넣고 바로 저장 — Preact controlled state 사용
    render(h(SchemaEditor, { initialValue: VALID_JSON, onSave }), container);

    const saveBtn = container.querySelector('button[data-action="save"]');
    expect(saveBtn).not.toBeNull();
    saveBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(VALID_JSON);
  });

  it('(에러) 잘못된 JSON 입력 후 저장하면 에러 메시지가 표시된다', () => {
    const onSave = vi.fn();
    // initialValue에 잘못된 JSON을 넣고 저장
    act(() => {
      render(h(SchemaEditor, { initialValue: INVALID_JSON, onSave }), container);
    });

    const saveBtn = container.querySelector('button[data-action="save"]');
    act(() => {
      saveBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const errorEl = container.querySelector('.schema-editor-error');
    expect(errorEl).not.toBeNull();
    expect(errorEl!.textContent).toBeTruthy();
  });

  it('(에러) 잘못된 JSON 입력 후 저장 시 onSave 콜백이 호출되지 않는다', () => {
    const onSave = vi.fn();
    render(h(SchemaEditor, { initialValue: INVALID_JSON, onSave }), container);

    const saveBtn = container.querySelector('button[data-action="save"]');
    saveBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onSave).not.toHaveBeenCalled();
  });

  it('(정상) 취소 버튼이 렌더된다', () => {
    const onSave = vi.fn();
    render(h(SchemaEditor, { initialValue: VALID_JSON, onSave }), container);

    const cancelBtn = container.querySelector('button[data-action="cancel"]');
    expect(cancelBtn).not.toBeNull();
  });

  it('(정상) initialValue가 textarea에 표시된다', () => {
    const onSave = vi.fn();
    render(h(SchemaEditor, { initialValue: VALID_JSON, onSave }), container);

    const textarea = container.querySelector('textarea');
    expect(textarea!.value).toBe(VALID_JSON);
  });
});
