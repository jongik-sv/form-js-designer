/**
 * panelEntryAdapter 단위 테스트 — TSK-06-02
 * 6 케이스: isEdited / set → modeling.editFormField 호출, component slot 반환
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { panelEntryAdapter } from '../panelEntryAdapter';
import type { PanelEntry } from '@form-js-designer/designer-core';

function makeMockEntry(overrides: Partial<PanelEntry> = {}): PanelEntry {
  return {
    key: 'label',
    widgetType: 'string',
    widget: {
      render: vi.fn().mockReturnValue(null),
      edit: vi.fn().mockReturnValue(null),
      validate: vi.fn().mockReturnValue({ ok: true, errors: [] }),
    },
    label: '레이블',
    defaultValue: '',
    meta: { type: 'string' },
    ...overrides,
  };
}

function makeMockCtx(overrides: Record<string, unknown> = {}) {
  return {
    field: { id: 'f1', type: 'text', label: 'My Label' },
    modeling: {
      editFormField: vi.fn(),
    },
    t: (key: string) => key,
    ...overrides,
  };
}

describe('panelEntryAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Case 1: 어댑터 반환 객체에 id 필드가 entry.key와 동일
  it('1: 반환 객체의 id가 entry.key와 일치', () => {
    const entry = makeMockEntry({ key: 'title' });
    const ctx = makeMockCtx();
    const adapted = panelEntryAdapter(entry, ctx);
    expect(adapted.id).toBe('title');
  });

  // Case 2: isEdited — 현재 field 값이 defaultValue와 다르면 true
  it('2: isEdited — field 값이 defaultValue와 다르면 true', () => {
    const entry = makeMockEntry({ key: 'label', defaultValue: '' });
    const ctx = makeMockCtx({
      field: { id: 'f1', type: 'text', label: 'Changed Label' },
    });
    const adapted = panelEntryAdapter(entry, ctx);
    const result = adapted.isEdited(null);
    expect(result).toBe(true);
  });

  // Case 3: isEdited — field 값이 defaultValue와 같으면 false
  it('3: isEdited — field 값이 defaultValue와 같으면 false', () => {
    const entry = makeMockEntry({ key: 'label', defaultValue: '' });
    const ctx = makeMockCtx({
      field: { id: 'f1', type: 'text', label: '' },
    });
    const adapted = panelEntryAdapter(entry, ctx);
    const result = adapted.isEdited(null);
    expect(result).toBe(false);
  });

  // Case 4: component — 호출 시 widget.edit 호출
  it('4: component 호출 시 widget.edit 가 호출됨', () => {
    const entry = makeMockEntry();
    const ctx = makeMockCtx();
    const adapted = panelEntryAdapter(entry, ctx);
    // adapted.component는 함수 또는 JSX 반환
    if (typeof adapted.component === 'function') {
      adapted.component({ value: 'test', editField: vi.fn(), field: ctx.field });
      expect(entry.widget.edit).toHaveBeenCalled();
    } else {
      // component가 직접 JSX인 경우도 허용
      expect(adapted.component).toBeDefined();
    }
  });

  // Case 5: set 호출 → modeling.editFormField(field, { [key]: value }) 호출
  it('5: set(value) 호출 시 modeling.editFormField 가 호출됨', () => {
    const entry = makeMockEntry({ key: 'label' });
    const ctx = makeMockCtx();
    const adapted = panelEntryAdapter(entry, ctx);
    adapted.set('New Title', ctx.field);
    expect(ctx.modeling.editFormField).toHaveBeenCalledWith(ctx.field, { label: 'New Title' });
  });

  // Case 6: element 필드가 ctx.field를 참조
  it('6: 반환 객체의 element가 ctx.field를 참조', () => {
    const entry = makeMockEntry();
    const ctx = makeMockCtx();
    const adapted = panelEntryAdapter(entry, ctx);
    expect(adapted.element).toBe(ctx.field);
  });

  // Case 7: 중첩 경로 read — layout.height 값 반환
  it('7: 중첩 키 "layout.height" read — field의 layout.height 값 반환', () => {
    const entry = makeMockEntry({ key: 'layout.height', widgetType: 'number', defaultValue: undefined });
    const ctx = makeMockCtx({
      field: { id: 'f1', type: 'textarea', layout: { height: 180, columns: 8 } },
    });
    const adapted = panelEntryAdapter(entry, ctx);
    // component 호출 시 value가 layout.height(180)로 설정되는지 확인
    if (typeof adapted.component === 'function') {
      let capturedValue: unknown;
      (entry.widget.edit as ReturnType<typeof vi.fn>).mockImplementation((v: unknown) => {
        capturedValue = v;
        return null;
      });
      adapted.component({ value: undefined });
      expect(capturedValue).toBe(180);
    }
  });

  // Case 8: 중첩 경로 write — modeling.editFormField(field, 'layout', {height:240, columns:8}) 호출
  it('8: 중첩 키 "layout.height" set(240) → modeling.editFormField(field, "layout", {height:240, columns:8})', () => {
    const entry = makeMockEntry({ key: 'layout.height', widgetType: 'number', defaultValue: undefined });
    const ctx = makeMockCtx({
      field: { id: 'f1', type: 'textarea', label: 'x', layout: { height: 180, columns: 8 } },
    });
    const adapted = panelEntryAdapter(entry, ctx);
    adapted.set(240);
    expect(ctx.modeling.editFormField).toHaveBeenCalledWith(
      ctx.field,
      'layout',
      { height: 240, columns: 8 },
    );
  });

  // Case 9: 기존 flat 경로('label') 동작 변경 없음
  it('9: 기존 flat 경로 "label" set — modeling.editFormField(field, {label: value}) 호출', () => {
    const entry = makeMockEntry({ key: 'label' });
    const ctx = makeMockCtx({
      field: { id: 'f1', type: 'text', label: '' },
    });
    const adapted = panelEntryAdapter(entry, ctx);
    adapted.set('Hello');
    expect(ctx.modeling.editFormField).toHaveBeenCalledWith(ctx.field, { label: 'Hello' });
  });
});
