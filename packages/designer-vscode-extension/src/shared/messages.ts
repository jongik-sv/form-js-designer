/**
 * messages.ts — webview ↔ extension postMessage 타입 정의
 *
 * 판별 유니온 타입(`FormJsMessage`)으로 단일 소스 정의. `type` 필드로 narrowing.
 *
 * ## 메시지 방향
 *
 * webview → extension:
 *   - `request-edit`: 사용자가 펜스 블록에서 편집 요청
 *   - `save-schema`: 편집된 스키마를 저장 요청
 *   - `test-mount-complete`: test bridge — 모든 블록 마운트 완료 보고 (TSK-01-04)
 *
 * extension → webview:
 *   - `edit-opened`: 편집 모드 진입 시 초기 스키마 전달
 *   - `edit-closed`: 편집 세션 종료 시 preview ✏️ 재활성화 신호 (TSK-02-01)
 *   - `save-result`: 저장 완료/실패 결과 전달
 *   - `source-updated`: 소스 파일이 외부에서 변경되어 스키마가 갱신됨
 */

export interface RequestEditMessage {
  type: 'request-edit';
  mdStart: number;
  mdEnd: number;
  schema?: string;
}

/** extension → all preview webviews: 편집 세션 종료 시 ✏️ 재활성화 신호 (TSK-02-01) */
export interface EditClosedMessage {
  type: 'edit-closed';
  mdStart: number;
  mdEnd: number;
}

export interface EditOpenedMessage {
  type: 'edit-opened';
  schema: string;
  uri: string;
  mdStart: number;
  mdEnd: number;
  docVersion: number;
}

export interface SaveSchemaMessage {
  type: 'save-schema';
  /** 대상 Markdown 파일 URI 문자열 */
  uri: string;
  /** 펜스 블록 시작 라인 (0-based) */
  mdStart: number;
  /** 펜스 블록 종료 라인 (0-based) */
  mdEnd: number;
  /** 직렬화된 스키마 JSON 문자열 */
  schema: string;
  /** webview가 본 마지막 TextDocument.version */
  docVersion: number;
}

export interface SaveResultMessage {
  type: 'save-result';
  ok: boolean;
  error?: string;
}

export interface SourceUpdatedMessage {
  type: 'source-updated';
  /** 변경된 Markdown 파일 URI 문자열 */
  uri: string;
  /** 변경 후 TextDocument.version */
  version: number;
}

/** preview.ts가 각 .form-js-block의 마운트 결과를 보고한다. */
export interface BlockMountState {
  schemaId: string;
  hasError: boolean;
}

/**
 * webview → extension (TSK-01-04 test bridge)
 * 모든 .form-js-block 마운트 완료 시 preview.ts → extension host로 발송.
 * `FORM_JS_TEST_BRIDGE`가 true인 경우에만 발송된다.
 */
export interface TestMountCompleteMessage {
  type: 'test-mount-complete';
  blocks: BlockMountState[];
}

export type FormJsMessage =
  | RequestEditMessage
  | EditOpenedMessage
  | EditClosedMessage
  | SaveSchemaMessage
  | SaveResultMessage
  | SourceUpdatedMessage
  | TestMountCompleteMessage;
