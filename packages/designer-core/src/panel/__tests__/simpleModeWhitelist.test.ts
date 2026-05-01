import { describe, it, expect } from 'vitest';
import {
  SIMPLE_MODE_WHITELIST,
  SIMPLE_MODE_HIDDEN_GROUPS,
  SIMPLE_MODE_PASSTHROUGH_GROUPS,
  SIMPLE_MODE_DEFAULT_ALLOWED,
  getAllowedEntryIds,
  isPassthroughGroup,
} from '../simpleModeWhitelist';

describe('SIMPLE_MODE_WHITELIST', () => {
  it('form-js 기본 22종 + default + 커스텀 6종 = 29 키', () => {
    expect(Object.keys(SIMPLE_MODE_WHITELIST)).toHaveLength(29);
  });
  it('커스텀 6종 키 존재', () => {
    for (const t of ['card','chartPlaceholder','modal','tabPanel','tabs','tree']) {
      expect(SIMPLE_MODE_WHITELIST[t]).toBeInstanceOf(Set);
    }
  });
  it('card 화이트리스트 = header,headerTag,padding,elevation', () => {
    expect([...SIMPLE_MODE_WHITELIST.card]).toEqual(
      expect.arrayContaining(['header','headerTag','padding','elevation']),
    );
    expect(SIMPLE_MODE_WHITELIST.card.size).toBe(4);
  });
  it('separator는 빈 set', () => {
    expect(SIMPLE_MODE_WHITELIST.separator.size).toBe(0);
  });
  it('tabs는 orientation 포함', () => {
    expect(SIMPLE_MODE_WHITELIST.tabs.has('orientation')).toBe(true);
  });
  it('getAllowedEntryIds(tabs).has(orientation) === true', () => {
    expect(getAllowedEntryIds('tabs').has('orientation')).toBe(true);
  });
  it('HIDDEN_GROUPS = condition + customProperties', () => {
    expect(SIMPLE_MODE_HIDDEN_GROUPS.has('condition')).toBe(true);
    expect(SIMPLE_MODE_HIDDEN_GROUPS.has('customProperties')).toBe(true);
  });
  it('PASSTHROUGH_GROUPS는 columns 포함', () => {
    expect(SIMPLE_MODE_PASSTHROUGH_GROUPS.has('columns')).toBe(true);
  });
  it('getAllowedEntryIds(undefined) === DEFAULT_ALLOWED', () => {
    expect(getAllowedEntryIds(undefined)).toBe(SIMPLE_MODE_DEFAULT_ALLOWED);
  });
  it('getAllowedEntryIds(미등록 type) === DEFAULT_ALLOWED', () => {
    expect(getAllowedEntryIds('myCustomX')).toBe(SIMPLE_MODE_DEFAULT_ALLOWED);
  });
  it('getAllowedEntryIds(card) === card set', () => {
    expect(getAllowedEntryIds('card')).toBe(SIMPLE_MODE_WHITELIST.card);
  });
  it('image whitelist uses form-js actual IDs: source and alt', () => {
    expect(SIMPLE_MODE_WHITELIST.image.has('source')).toBe(true);
    expect(SIMPLE_MODE_WHITELIST.image.has('alt')).toBe(true);
    expect(SIMPLE_MODE_WHITELIST.image.has('imageSource')).toBe(false);
    expect(SIMPLE_MODE_WHITELIST.image.has('altText')).toBe(false);
  });
  it('table whitelist uses form-js actual IDs: label, dataSource, pagination, rowCount', () => {
    expect(SIMPLE_MODE_WHITELIST.table.has('label')).toBe(true);
    expect(SIMPLE_MODE_WHITELIST.table.has('dataSource')).toBe(true);
    expect(SIMPLE_MODE_WHITELIST.table.has('pagination')).toBe(true);
    expect(SIMPLE_MODE_WHITELIST.table.has('rowCount')).toBe(true);
    expect(SIMPLE_MODE_WHITELIST.table.has('staticColumns')).toBe(false);
  });
});

describe('isPassthroughGroup', () => {
  it('returns true for static passthrough IDs', () => {
    expect(isPassthroughGroup('columns')).toBe(true);
    expect(isPassthroughGroup('layout')).toBe(true);
    expect(isPassthroughGroup('staticOptions')).toBe(true);
    expect(isPassthroughGroup('group-columns')).toBe(true);
    expect(isPassthroughGroup('group-staticOptions')).toBe(true);
  });
  it('returns true for dynamic table column group IDs (suffix match)', () => {
    expect(isPassthroughGroup('group-Field_1rcxb6q-columns')).toBe(true);
    expect(isPassthroughGroup('group-Field_abc123-columns')).toBe(true);
    expect(isPassthroughGroup('group-Field_1rcxb6q-columnsSource')).toBe(true);
    expect(isPassthroughGroup('group-Field_xyz-columnsSource')).toBe(true);
  });
  it('returns false for unrelated group IDs', () => {
    expect(isPassthroughGroup('condition')).toBe(false);
    expect(isPassthroughGroup('appearance')).toBe(false);
    expect(isPassthroughGroup('group-condition')).toBe(false);
    expect(isPassthroughGroup('designer-custom-props')).toBe(false);
    expect(isPassthroughGroup('myGroup-columnsExtra')).toBe(false);
  });
});
