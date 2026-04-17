/**
 * assertSharedOrigin contract tests (TSK-03-01)
 *
 * ADR-0001 §3 D3 불변식 계약 테스트:
 * OverlayLayer 부모 컨테이너는 #form-root와 동일한 bounding-box origin·width를
 * 공유해야 한다. 위반 시 SharedOriginViolation(Error 서브클래스) throw.
 *
 * Environment: happy-dom (vitest.config.ts)
 * Pattern: vi.spyOn(Element.prototype, 'getBoundingClientRect') per element
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { assertSharedOrigin, SharedOriginViolation } from '../assertSharedOrigin';
import { stubRectMap } from './fixtures/rectStub';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stubRectFor(
  formRoot: HTMLElement,
  overlayParent: HTMLElement,
  formRect: { left: number; top: number; width: number; height: number },
  overlayRect: { left: number; top: number; width: number; height: number },
): ReturnType<typeof vi.spyOn> {
  return stubRectMap([
    [formRoot, formRect],
    [overlayParent, overlayRect],
  ]);
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('assertSharedOrigin', () => {
  // -------------------------------------------------------------------------
  // Test 1: 동일 bounding box → void 반환 (throw 없음)
  // -------------------------------------------------------------------------
  it('returns void when formRoot and overlayParent share the same origin and width', () => {
    const formRoot = document.createElement('div');
    const overlayParent = document.createElement('div');

    stubRectFor(
      formRoot,
      overlayParent,
      { left: 0, top: 0, width: 1024, height: 768 },
      { left: 0, top: 0, width: 1024, height: 768 },
    );

    expect(() => assertSharedOrigin(formRoot, overlayParent)).not.toThrow();
  });

  // -------------------------------------------------------------------------
  // Test 2: 1px 오차 허용 (tolerance 기본 2px, 1.5px 차이 → pass)
  // -------------------------------------------------------------------------
  it('does not throw when the difference is within the default tolerance (1.5px < 2px)', () => {
    const formRoot = document.createElement('div');
    const overlayParent = document.createElement('div');

    stubRectFor(
      formRoot,
      overlayParent,
      { left: 100, top: 50, width: 1024, height: 768 },
      { left: 101.5, top: 50, width: 1024, height: 768 }, // Δleft=1.5
    );

    expect(() => assertSharedOrigin(formRoot, overlayParent)).not.toThrow();
  });

  // -------------------------------------------------------------------------
  // Test 3: tolerance 초과 (2.5px > 2px) → SharedOriginViolation throw
  // -------------------------------------------------------------------------
  it('throws SharedOriginViolation when Δleft exceeds tolerance (2.5px > 2px default)', () => {
    const formRoot = document.createElement('div');
    const overlayParent = document.createElement('div');

    stubRectFor(
      formRoot,
      overlayParent,
      { left: 100, top: 50, width: 1024, height: 768 },
      { left: 102.5, top: 50, width: 1024, height: 768 }, // Δleft=2.5
    );

    expect(() => assertSharedOrigin(formRoot, overlayParent)).toThrow(SharedOriginViolation);
  });

  // -------------------------------------------------------------------------
  // Test 4: width 불일치 → throw
  // -------------------------------------------------------------------------
  it('throws SharedOriginViolation when width differs beyond tolerance', () => {
    const formRoot = document.createElement('div');
    const overlayParent = document.createElement('div');

    stubRectFor(
      formRoot,
      overlayParent,
      { left: 0, top: 0, width: 1024, height: 768 },
      { left: 0, top: 0, width: 800, height: 768 }, // Δwidth=224
    );

    expect(() => assertSharedOrigin(formRoot, overlayParent)).toThrow(SharedOriginViolation);
  });

  // -------------------------------------------------------------------------
  // Test 5: 큰 오프셋 불일치 → 에러 메시지에 measured 값 포함
  // -------------------------------------------------------------------------
  it('error message includes Δleft, Δtop, Δwidth measured values', () => {
    const formRoot = document.createElement('div');
    const overlayParent = document.createElement('div');

    stubRectFor(
      formRoot,
      overlayParent,
      { left: 0, top: 0, width: 1024, height: 768 },
      { left: 208, top: 0, width: 1024, height: 768 }, // Δleft=208 (1440px regression)
    );

    let error: SharedOriginViolation | null = null;
    try {
      assertSharedOrigin(formRoot, overlayParent);
    } catch (e) {
      error = e as SharedOriginViolation;
    }

    expect(error).not.toBeNull();
    expect(error).toBeInstanceOf(SharedOriginViolation);
    expect(error!.message).toContain('D3');
    expect(error!.message).toContain('Δleft=208');
    expect(error!.measured).toBeDefined();
    expect(error!.measured.delta.left).toBe(208);
  });

  // -------------------------------------------------------------------------
  // Test 6: overlayParent가 null → throw (nullish guard)
  // -------------------------------------------------------------------------
  it('throws when overlayParent is null', () => {
    const formRoot = document.createElement('div');

    // null 전달 시 throw 해야 함
    expect(() => assertSharedOrigin(formRoot, null as unknown as HTMLElement)).toThrow();
  });

  // -------------------------------------------------------------------------
  // Test 7: tolerance 커스텀 값 (10px) → 8px 차이 pass
  // -------------------------------------------------------------------------
  it('respects custom tolerance: 8px difference passes with tolerance=10', () => {
    const formRoot = document.createElement('div');
    const overlayParent = document.createElement('div');

    stubRectFor(
      formRoot,
      overlayParent,
      { left: 0, top: 0, width: 1024, height: 768 },
      { left: 8, top: 0, width: 1024, height: 768 }, // Δleft=8
    );

    expect(() => assertSharedOrigin(formRoot, overlayParent, 10)).not.toThrow();
  });

  // -------------------------------------------------------------------------
  // Test 8: SharedOriginViolation의 measured 구조체 검증
  // -------------------------------------------------------------------------
  it('exposes measured.formRect, measured.overlayRect, measured.delta on SharedOriginViolation', () => {
    const formRoot = document.createElement('div');
    const overlayParent = document.createElement('div');

    const formRectDef = { left: 100, top: 50, width: 800, height: 600 };
    const overlayRectDef = { left: 100, top: 100, width: 800, height: 600 }; // Δtop=50

    stubRectFor(formRoot, overlayParent, formRectDef, overlayRectDef);

    let error: SharedOriginViolation | null = null;
    try {
      assertSharedOrigin(formRoot, overlayParent);
    } catch (e) {
      error = e as SharedOriginViolation;
    }

    expect(error).toBeInstanceOf(SharedOriginViolation);
    expect(error!.measured.formRect.left).toBe(100);
    expect(error!.measured.overlayRect.top).toBe(100);
    expect(error!.measured.delta.top).toBe(50);
    expect(error!.name).toBe('SharedOriginViolation');
  });
});
