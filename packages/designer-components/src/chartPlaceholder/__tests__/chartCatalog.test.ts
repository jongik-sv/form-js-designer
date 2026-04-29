/**
 * Task 1.14: chartCatalog 단위 테스트
 *
 * 검증 포인트(spec.md §9.1):
 * - getChart('bar') → bar entry
 * - getChart('unknown') → bar entry (폴백) + console.warn 1회 (dev)
 * - getChart(undefined) → bar entry (폴백, 경고 없음)
 * - CHART_CATALOG.length === 11, 모든 type 유니크
 * - 모든 entry에 fullSvg/thumbnailSvg가 비어있지 않은 string
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { getChart, CHART_CATALOG } from '../chartCatalog';

describe('getChart()', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  afterEach(() => {
    if (warnSpy) {
      warnSpy.mockRestore();
    }
    vi.restoreAllMocks();
  });

  it('returns bar entry for "bar"', () => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const entry = getChart('bar');
    expect(entry.type).toBe('bar');
    expect(entry.koLabel).toBe('막대');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('returns the matching entry for each known chart type', () => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (const expected of CHART_CATALOG) {
      const entry = getChart(expected.type);
      expect(entry.type).toBe(expected.type);
    }
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('falls back to bar entry and warns once for unknown string (dev)', () => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // vitest의 import.meta.env.PROD는 기본 false이므로 isProductionEnv() === false.
    // dev 환경에서 unknown chartType은 console.warn 1회 발화.
    const entry = getChart('unknown-chart-type-xyz');
    expect(entry.type).toBe('bar');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const firstCallArg = warnSpy.mock.calls[0]?.[0];
    expect(typeof firstCallArg).toBe('string');
    expect(String(firstCallArg)).toContain('chartPlaceholder');
    expect(String(firstCallArg)).toContain('unknown-chart-type-xyz');
  });

  it('falls back to bar entry without warning for undefined input', () => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const entry = getChart(undefined);
    expect(entry.type).toBe('bar');
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe('CHART_CATALOG', () => {
  it('has exactly 11 entries', () => {
    expect(CHART_CATALOG.length).toBe(11);
  });

  it('has unique type values across all entries', () => {
    const types = CHART_CATALOG.map((e) => e.type);
    const uniqueTypes = new Set(types);
    expect(uniqueTypes.size).toBe(types.length);
  });

  it('has bar as the first entry (FALLBACK invariant)', () => {
    expect(CHART_CATALOG[0]?.type).toBe('bar');
  });

  it('every entry has non-empty fullSvg string', () => {
    for (const entry of CHART_CATALOG) {
      expect(typeof entry.fullSvg).toBe('string');
      expect(entry.fullSvg.length).toBeGreaterThan(0);
      // sanity: must contain svg element
      expect(entry.fullSvg).toContain('<svg');
    }
  });

  it('every entry has non-empty thumbnailSvg string', () => {
    for (const entry of CHART_CATALOG) {
      expect(typeof entry.thumbnailSvg).toBe('string');
      expect(entry.thumbnailSvg.length).toBeGreaterThan(0);
      expect(entry.thumbnailSvg).toContain('<svg');
    }
  });

  it('every entry has a non-empty Korean label', () => {
    for (const entry of CHART_CATALOG) {
      expect(typeof entry.koLabel).toBe('string');
      expect(entry.koLabel.length).toBeGreaterThan(0);
    }
  });
});
