/**
 * TSK-01-04: 웹뷰 ↔ extension host 메시지 타입 정의
 *
 * test bridge 패턴에서 preview.ts가 postMessage로 발송하고
 * extension.ts가 수신하는 메시지의 타입을 정의한다.
 */

/**
 * 블록 마운트 상태 항목.
 * preview.ts가 각 .form-js-block의 마운트 결과를 보고한다.
 */
export interface BlockMountState {
  /** data-schema-id 속성값 */
  schemaId: string;
  /** JSON 파싱 실패 또는 createForm 실패 시 true */
  hasError: boolean;
}

/**
 * 모든 .form-js-block 마운트 완료 시 preview.ts → extension host로 발송하는 메시지.
 * FORM_JS_TEST_BRIDGE가 true인 경우에만 발송된다.
 */
export interface TestMountCompleteMessage {
  type: 'test-mount-complete';
  /** 마운트된 블록 목록 (에러 포함) */
  blocks: BlockMountState[];
}
