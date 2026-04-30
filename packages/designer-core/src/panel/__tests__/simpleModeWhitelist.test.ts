import { describe, it, expect } from 'vitest';
import {
  SIMPLE_MODE_WHITELIST,
  SIMPLE_MODE_HIDDEN_GROUPS,
  SIMPLE_MODE_PASSTHROUGH_GROUPS,
  SIMPLE_MODE_DEFAULT_ALLOWED,
  getAllowedEntryIds,
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
  it('tabs는 defaultValue 포함', () => {
    expect(SIMPLE_MODE_WHITELIST.tabs.has('defaultValue')).toBe(true);
  });
  it('getAllowedEntryIds(tabs).has(defaultValue) === true', () => {
    expect(getAllowedEntryIds('tabs').has('defaultValue')).toBe(true);
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
});
