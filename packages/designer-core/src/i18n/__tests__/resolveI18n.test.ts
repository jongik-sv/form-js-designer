/**
 * resolveI18n — unit tests (FU-5)
 *
 * Covers: nullish/empty → '', string roundtrip, ko priority, key fallback,
 * empty-ko falls through to key, malformed input → ''.
 */
import { describe, it, expect } from 'vitest';
import { resolveI18n } from '../resolveI18n';

describe('resolveI18n', () => {
  describe('nullish & empty', () => {
    it('returns "" for undefined', () => {
      expect(resolveI18n(undefined)).toBe('');
    });

    it('returns "" for null', () => {
      expect(resolveI18n(null)).toBe('');
    });

    it('returns "" for empty string', () => {
      expect(resolveI18n('')).toBe('');
    });
  });

  describe('string passthrough', () => {
    it('returns the string itself', () => {
      expect(resolveI18n('hello')).toBe('hello');
    });

    it('returns Korean strings as-is', () => {
      expect(resolveI18n('안녕하세요')).toBe('안녕하세요');
    });

    it('preserves whitespace', () => {
      expect(resolveI18n('  spaced  ')).toBe('  spaced  ');
    });
  });

  describe('object with ko priority', () => {
    it('returns ko when both key and ko present', () => {
      expect(resolveI18n({ key: 'card.header', ko: '카드 제목' })).toBe('카드 제목');
    });

    it('returns ko-only', () => {
      expect(resolveI18n({ ko: '한글만' })).toBe('한글만');
    });
  });

  describe('key fallback', () => {
    it('returns key when ko is absent', () => {
      expect(resolveI18n({ key: 'modal.title' })).toBe('modal.title');
    });

    it('returns key when ko is empty string', () => {
      expect(resolveI18n({ key: 'modal.title', ko: '' })).toBe('modal.title');
    });

    it('returns key when ko is not a string', () => {
      // @ts-expect-error — testing malformed input intentionally
      expect(resolveI18n({ key: 'modal.title', ko: 42 })).toBe('modal.title');
    });
  });

  describe('empty / malformed objects', () => {
    it('returns "" for {} ', () => {
      expect(resolveI18n({})).toBe('');
    });

    it('returns "" for { key: "", ko: "" }', () => {
      expect(resolveI18n({ key: '', ko: '' })).toBe('');
    });

    it('returns "" for object with non-string fields', () => {
      // @ts-expect-error — testing malformed input intentionally
      expect(resolveI18n({ key: 1, ko: 2 })).toBe('');
    });
  });

  describe('hostile input safety', () => {
    it('does not throw for arrays', () => {
      // @ts-expect-error — array is technically object; verify it returns ''
      expect(resolveI18n([])).toBe('');
    });

    it('does not throw for numbers (handled as default)', () => {
      // @ts-expect-error — non-spec input
      expect(resolveI18n(42)).toBe('');
    });

    it('does not throw for booleans', () => {
      // @ts-expect-error — non-spec input
      expect(resolveI18n(true)).toBe('');
    });
  });
});
