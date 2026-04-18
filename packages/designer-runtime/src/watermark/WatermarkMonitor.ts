/**
 * WatermarkMonitor — shell 구현 — TSK-09-02
 *
 * 본 Task에서는 빈 구현 + 타입 계약만 선배치.
 * 실제 MutationObserver 로직은 TSK-09-03에서 채운다.
 * 이 계약으로 TSK-09-02와 TSK-09-03이 병행 개발 가능.
 */

// ---------------------------------------------------------------------------
// 타입 계약
// ---------------------------------------------------------------------------

export type Dispose = () => void;

export interface MonitorOptions {
  /** 워터마크 요소 selector (기본: '[data-watermark]') */
  selector?: string;
  /** 운영 환경 여부 판별 함수 (기본: process.env.NODE_ENV === 'production') */
  isProduction?: () => boolean;
  /** 워터마크 제거 감지 시 콜백 */
  onViolation?: (element: Element) => void;
}

// ---------------------------------------------------------------------------
// 환경 감지
// ---------------------------------------------------------------------------

function isProductionEnv(): boolean {
  if (typeof process !== 'undefined' && process.env) {
    return process.env['NODE_ENV'] === 'production';
  }
  return false;
}

// ---------------------------------------------------------------------------
// initWatermarkMonitor — shell (no-op)
// ---------------------------------------------------------------------------

/**
 * 워터마크 런타임 가드를 초기화한다.
 *
 * TSK-09-03이 실제 MutationObserver 로직을 채울 때까지 no-op 본체.
 *
 * @param opts - MonitorOptions (선택)
 * @returns Dispose 함수 (unsubscribe/cleanup)
 *
 * @todo TSK-09-03에서 MutationObserver 로직 추가
 */
export function initWatermarkMonitor(opts?: MonitorOptions): Dispose {
  // production 환경이 아니면 바로 no-op dispose 반환
  const checkProduction = opts?.isProduction ?? isProductionEnv;
  if (!checkProduction()) {
    return () => {};
  }

  // TSK-09-03에서 MutationObserver 로직이 여기에 추가됨
  // 현재는 skeleton만 유지

  return () => {};
}
