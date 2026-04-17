/**
 * assertSharedOrigin — ADR-0001 §3 D3 불변식 계약
 *
 * OverlayLayer 부모 컨테이너는 `#form-root`와 동일한
 * bounding-box origin(left, top)·width를 공유해야 한다.
 * 위반 시 `SharedOriginViolation`(Error 서브클래스) throw.
 *
 * BrowserEnvContractViolation 패턴과 동형(§4.2 영향 표 참조).
 */

export interface SharedOriginMeasured {
  formRect: Pick<DOMRect, 'left' | 'top' | 'width'>;
  overlayRect: Pick<DOMRect, 'left' | 'top' | 'width'>;
  delta: { left: number; top: number; width: number };
}

/**
 * ADR-0001 §3 D3 위반 시 throw되는 에러 클래스.
 * `measured` 필드에 formRect, overlayRect, delta를 포함하여
 * 수정 가이드를 제공한다.
 */
export class SharedOriginViolation extends Error {
  override readonly name = 'SharedOriginViolation';
  readonly measured: SharedOriginMeasured;

  constructor(message: string, measured: SharedOriginMeasured) {
    super(message);
    this.measured = measured;
  }
}

/**
 * assertSharedOrigin(formRoot, overlayParent, tolerance = 2)
 *
 * `getBoundingClientRect()`로 `left`, `top`, `width`를 비교한다.
 * 세 값 중 하나라도 절대 차이가 tolerance(기본 2px)를 초과하면
 * `SharedOriginViolation`을 throw한다.
 *
 * 특수 케이스:
 * - `overlayParent`가 null/undefined이면 즉시 throw.
 * - `formRoot.offsetWidth === 0`(아직 layout 전)이면 assert를 skip하고
 *   console.warn만 남긴다.
 *
 * @param formRoot       - 기준이 되는 formRoot HTMLElement
 * @param overlayParent  - OverlayLayer를 담는 부모 컨테이너
 * @param tolerance      - 허용 픽셀 오차 (기본 2px)
 */
export function assertSharedOrigin(
  formRoot: HTMLElement,
  overlayParent: HTMLElement,
  tolerance = 2,
): void {
  if (overlayParent == null) {
    throw new SharedOriginViolation(
      'ADR-0001 §3 D3 violation: overlayParent is null or undefined. ' +
        'OverlayLayer must be mounted inside a container that shares the same stacking container as formRoot.',
      {
        formRect: { left: 0, top: 0, width: 0 },
        overlayRect: { left: 0, top: 0, width: 0 },
        delta: { left: 0, top: 0, width: 0 },
      },
    );
  }

  const formRect = formRoot.getBoundingClientRect();

  // formRect.width === 0 → layout 전 상태(offsetWidth 접근 전에 rect로 판단), skip + warn
  if (formRect.width === 0) {
    console.warn(
      '[assertSharedOrigin] formRoot bounding width is 0 — skipping D3 assertion (layout not yet complete).',
    );
    return;
  }

  const overlayRect = overlayParent.getBoundingClientRect();

  const delta = {
    left: overlayRect.left - formRect.left,
    top: overlayRect.top - formRect.top,
    width: overlayRect.width - formRect.width,
  };

  const measured: SharedOriginMeasured = {
    formRect: { left: formRect.left, top: formRect.top, width: formRect.width },
    overlayRect: { left: overlayRect.left, top: overlayRect.top, width: overlayRect.width },
    delta,
  };

  const violations: string[] = [];

  if (Math.abs(delta.left) > tolerance) {
    violations.push(`Δleft=${delta.left}px`);
  }
  if (Math.abs(delta.top) > tolerance) {
    violations.push(`Δtop=${delta.top}px`);
  }
  if (Math.abs(delta.width) > tolerance) {
    violations.push(`Δwidth=${delta.width}px`);
  }

  if (violations.length > 0) {
    throw new SharedOriginViolation(
      `ADR-0001 §3 D3 violation: overlayParent origin drifted from formRoot. ` +
        `${violations.join(', ')}. ` +
        `OverlayLayer must share the same stacking container as formRoot. ` +
        `Ensure the overlayParent has position:relative and the same offsetParent chain as formRoot.`,
      measured,
    );
  }
}
