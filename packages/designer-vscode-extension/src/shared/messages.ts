/**
 * messages.ts — webview ↔ extension postMessage 타입 정의
 *
 * 5종 메시지를 판별 유니온 타입(`FormJsMessage`)으로 단일 소스로 정의한다.
 * `type` 필드로 각 메시지를 구분하며 TypeScript가 자동으로 narrowing한다.
 *
 * ## 메시지 방향
 *
 * webview → extension:
 *   - `request-edit`: 사용자가 펜스 블록에서 편집 요청
 *   - `save-schema`: 편집된 스키마를 저장 요청
 *
 * extension → webview:
 *   - `edit-opened`: 편집 모드 진입 시 초기 스키마 전달
 *   - `save-result`: 저장 완료/실패 결과 전달
 *   - `source-updated`: 소스 파일이 외부에서 변경되어 스키마가 갱신됨
 */

/**
 * webview → extension
 * 사용자가 Markdown 펜스 블록에서 편집 버튼을 클릭하여 편집 모드를 요청한다.
 */
export interface RequestEditMessage {
  type: 'request-edit';
  /** 펜스 여는 줄 번호 (0-based) */
  mdStart: number;
  /** 펜스 닫는 줄 번호 (0-based) */
  mdEnd: number;
}

/**
 * extension → webview
 * 편집 모드 진입 시 현재 펜스 본문 JSON 스키마를 webview에 전달한다.
 */
export interface EditOpenedMessage {
  type: 'edit-opened';
  /** 현재 편집 대상 스키마 JSON 문자열 */
  schema: string;
  /** 펜스 여는 줄 번호 (0-based) — 후속 save 시 위치 식별용 */
  mdStart: number;
  /** 펜스 닫는 줄 번호 (0-based) */
  mdEnd: number;
}

/**
 * webview → extension
 * form-js 에디터에서 저장 이벤트 발생 시 변경된 스키마를 extension으로 전달한다.
 */
export interface SaveSchemaMessage {
  type: 'save-schema';
  /** 저장할 스키마 JSON 문자열 */
  schema: string;
}

/**
 * extension → webview
 * WorkspaceEdit 적용 결과를 webview에 통보한다.
 */
export interface SaveResultMessage {
  type: 'save-result';
  /** 저장 성공 여부 */
  ok: boolean;
  /** 실패 시 에러 메시지 (ok=false인 경우에만 존재) */
  error?: string;
}

/**
 * extension → webview
 * 외부 편집(다른 에디터, git checkout 등)으로 소스 파일이 변경된 경우
 * 갱신된 스키마를 webview에 전달하여 에디터를 업데이트한다.
 */
export interface SourceUpdatedMessage {
  type: 'source-updated';
  /** 외부 변경으로 갱신된 스키마 JSON 문자열 */
  schema: string;
}

/**
 * webview ↔ extension 간 모든 postMessage 타입의 판별 유니온.
 * `msg.type`으로 narrowing하여 각 메시지 인터페이스의 필드에 안전하게 접근할 수 있다.
 */
export type FormJsMessage =
  | RequestEditMessage
  | EditOpenedMessage
  | SaveSchemaMessage
  | SaveResultMessage
  | SourceUpdatedMessage;
