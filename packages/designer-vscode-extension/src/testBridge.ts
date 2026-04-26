/**
 * TSK-01-04: test bridge — 마운트 상태 저장소
 * TSK-04-02: axe bridge 확장 — axe-core 스캔 결과 중계
 *
 * extension host 측 인메모리 상태 관리.
 * FORM_JS_TEST_MODE=1 환경에서만 사용된다.
 *
 * preview.ts가 postMessage({ type: 'test-mount-complete', blocks })를 발송하면
 * extension.ts가 이를 수신하여 updateMountState()를 호출한다.
 * 테스트는 getMountStateForUri()로 폴링하여 마운트 완료를 확인한다.
 *
 * axe bridge:
 * webview 내부에서 axe-core 스캔 후 postMessage({ type: 'axe-result', violations })를
 * 발송하면 extension host가 registerAxeResult()를 호출한다.
 * 테스트는 waitForAxeResult()로 결과를 기다린다.
 */
import type { BlockMountState } from './shared/messages';

// ─── TSK-04-02: axe bridge 타입 ───────────────────────────────────────────────

/** axe-core violation 단순화 인터페이스 (impact 필드 중심) */
export interface AxeViolation {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor' | string;
  description: string;
  nodes: unknown[];
}

/** axe 스캔 결과 컨테이너 */
export interface AxeScanResult {
  violations: AxeViolation[];
}

/** webviewId → AxeScanResult 인메모리 맵 */
const _axeResults = new Map<string, AxeScanResult>();

/**
 * webview가 axe 스캔 결과를 등록한다.
 * @param webviewId 식별자 (예: 'preview', 'custom-editor')
 * @param result axe 스캔 결과
 */
export function registerAxeResult(webviewId: string, result: AxeScanResult): void {
  _axeResults.set(webviewId, result);
}

/**
 * 등록된 axe 스캔 결과를 조회한다.
 * @param webviewId 식별자
 * @returns 등록된 결과 또는 undefined
 */
export function getAxeResult(webviewId: string): AxeScanResult | undefined {
  return _axeResults.get(webviewId);
}

/**
 * axe 결과를 제거한다.
 * @param webviewId 지정하면 해당 ID만 제거, 없으면 전체 제거
 */
export function clearAxeResult(webviewId?: string): void {
  if (webviewId !== undefined) {
    _axeResults.delete(webviewId);
  } else {
    _axeResults.clear();
  }
}

/**
 * violations 중 serious/critical impact만 필터링한다.
 * acceptance criteria: serious/critical = 0 이면 통과.
 * @param violations axe violation 배열
 * @returns serious 또는 critical impact인 violation만
 */
export function filterCriticalViolations(violations: AxeViolation[]): AxeViolation[] {
  return violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious'
  );
}

/**
 * axe 스캔 결과가 등록될 때까지 폴링하며 대기한다.
 * @param webviewId 식별자
 * @param timeout 밀리초 단위 타임아웃 (기본 15000ms)
 * @returns 등록된 AxeScanResult
 * @throws 타임아웃 초과 시 Error('axe-result timeout')
 */
export function waitForAxeResult(
  webviewId: string,
  timeout = 15000
): Promise<AxeScanResult> {
  return new Promise<AxeScanResult>((resolve, reject) => {
    const start = Date.now();
    const poll = () => {
      const result = _axeResults.get(webviewId);
      if (result !== undefined) {
        resolve(result);
        return;
      }
      const elapsed = Date.now() - start;
      if (elapsed >= timeout) {
        reject(new Error(`axe-result timeout: webviewId="${webviewId}" (${timeout}ms)`));
        return;
      }
      setTimeout(poll, 100);
    };
    poll();
  });
}

/**
 * URI별 마운트 상태.
 */
export interface MountState {
  blocks: BlockMountState[];
}

/** URI → MountState 인메모리 맵 */
const _testMountState = new Map<string, MountState>();

/**
 * MountState 객체를 생성한다.
 * @param blocks 마운트된 블록 목록
 */
export function createTestMountState(blocks: BlockMountState[]): MountState {
  return { blocks };
}

/**
 * URI에 대한 마운트 상태를 저장/갱신한다.
 * @param uri 문서 URI (string)
 * @param blocks 마운트된 블록 목록
 */
export function updateMountState(uri: string, blocks: BlockMountState[]): void {
  _testMountState.set(uri, { blocks });
}

/**
 * URI에 대한 마운트 상태를 조회한다.
 * @param uri 문서 URI (string)
 * @returns 마운트 상태 또는 undefined (미등록 URI)
 */
export function getMountStateForUri(uri: string): MountState | undefined {
  return _testMountState.get(uri);
}

/**
 * 마운트 상태를 제거한다.
 * @param uri 특정 URI를 지정하면 해당 URI만 제거, 없으면 전체 제거
 */
export function clearMountState(uri?: string): void {
  if (uri !== undefined) {
    _testMountState.delete(uri);
  } else {
    _testMountState.clear();
  }
}
