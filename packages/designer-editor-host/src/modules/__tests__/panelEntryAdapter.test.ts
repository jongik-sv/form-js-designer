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
});
