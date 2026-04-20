/**
 * TSK-01-04: test bridge — 마운트 상태 저장소
 *
 * extension host 측 인메모리 상태 관리.
 * FORM_JS_TEST_MODE=1 환경에서만 사용된다.
 *
 * preview.ts가 postMessage({ type: 'test-mount-complete', blocks })를 발송하면
 * extension.ts가 이를 수신하여 updateMountState()를 호출한다.
 * 테스트는 getMountStateForUri()로 폴링하여 마운트 완료를 확인한다.
 */
import type { BlockMountState } from './shared/messages';

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
