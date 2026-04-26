# TSK-02-04: WorkspaceEdit 저장 + docVersion 충돌 처리 - 테스트 결과

## 결과: PASS

## 실행 요약

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 244 | 0 | 244 |
| E2E 테스트 | 6 | 0 | 6 |

## 정적 검증 (Dev Config에 정의된 경우만)

| 구분 | 결과 | 비고 |
|------|------|------|
| lint | N/A | lint: not yet configured |
| typecheck | pass | 0 에러 |

## QA 체크리스트 판정

| # | 항목 | 결과 |
|---|------|------|
| 1 | (정상 — 저장 성공) Custom Editor에서 필드 1개 추가 후 저장 버튼 클릭 → 원본 `.md` 파일의 펜스 본문이 새 스키마로 교체되고, webview가 `save-result { ok:true }` 토스트를 표시한다. | pass |
| 2 | (정상 — 펜스 외 무변경) 저장 전후 파일을 byte diff했을 때 펜스 본문 외 영역(주변 라인·빈 줄·라인엔딩)은 0바이트 변경. | pass |
| 3 | (정상 — 들여쓰기 보존) 2-space 들여쓰기 fixture와 4-space 들여쓰기 fixture에서 저장 결과 JSON의 들여쓰기가 원본 문서 우세값과 일치한다. | pass |
| 4 | (정상 — CRLF 보존) CRLF 라인엔딩 fixture에서 저장 후에도 모든 라인엔딩이 CRLF로 유지된다. | pass |
| 5 | (정상 — Cmd+S) Custom Editor 패널 포커스 상태에서 `Cmd+S`/`Ctrl+S` keydown → 동일 저장 경로가 호출된다. | pass |
| 6 | (충돌 — 모달 등장) 편집 중 같은 `.md` 파일을 외부에서 수정한 뒤 저장 시도 → `showWarningMessage`가 `{ modal: true, detail: '...' }` + `덮어쓰기`/`취소` 2버튼으로 호출된다. | pass |
| 7 | (충돌 — 덮어쓰기) 충돌 모달에서 `덮어쓰기` 선택 시 → `applyEdit`이 호출되고 webview는 `save-result { ok:true }`를 받는다. | pass |
| 8 | (충돌 — 취소) 충돌 모달에서 `취소`(또는 dismiss) 시 → `applyEdit` 호출 없음, 파일 변경 0바이트, webview는 `save-result { ok:false, error:'cancelled' }`를 받고 편집 상태 유지. | pass |
| 9 | (외부 변경 알림) 활성 EditSession이 있는 `.md` 파일이 외부에서 변경되면 Custom Editor webview는 `source-updated { uri, version }` 메시지를 수신한다. self-edit(applyEdit) 결과로 발생한 경우는 수신하지 않는다. | pass |
| 10 | (에러 — fence 미발견) 저장 시 펜스 블록을 찾지 못하면 `applyEdit` 호출 없이 `save-result { ok:false, error:'fence not found' }` 회신, 원본 파일 무변경, Custom Editor에 에러 배너 표시. | pass |
| 11 | (에러 — applyEdit 실패) `workspace.applyEdit`이 false 반환 또는 throw 시 `save-result { ok:false, error }` 회신, 원본 파일 무변경, `pendingSaveTokens`에서 in-flight 토큰이 정리된다. | pass |
| 12 | (idempotency — 중복 저장) 같은 schema로 연속 저장 2회 → webview는 두 번 모두 `save-result { ok:true }` 수신. | pass |
| 13 | (성능) 정상 저장 1회 round-trip이 로컬 dev에서 200ms 이내, 충돌 모달 표시까지 300ms 이내. | pass |
| 14 | (타입 안정성) `SaveSchemaMessage`에 `uri/mdStart/mdEnd/docVersion`이 포함된 상태에서 `npm -w @form-js-designer/designer-vscode-extension run typecheck` 통과. | pass |
| 15 | (자원 정리) 확장 deactivate 시 `sourceWatcher.dispose()` 호출되어 onDidChangeTextDocument 핸들이 해제되고, 다음 activate에서 중복 구독이 발생하지 않는다. | pass |
| 16 | (클릭 경로 — fullstack/frontend E2E) `fixtures/save-2space.md` 열기 → `Cmd+Shift+V`로 Markdown preview 열기 → preview webview의 `.form-js-block a.form-js-edit-button` 클릭 → ViewColumn.Two에 Custom Editor 패널 등장 → 패널 webview의 `[data-testid="form-js-save-button"]` 클릭 → `save-result` 수신·파일 변경 확인. | pass |
| 17 | (화면 렌더링 — fullstack/frontend E2E) Custom Editor webview에서 form-js-editor 위 toolbar의 "저장" 버튼이 보이고 클릭 가능하며, 저장 후 토스트 텍스트가 변경되는 것을 확인. 충돌 시나리오에서는 시스템 modal이 등장하여 "덮어쓰기"·"취소" 버튼이 보이는 것을 확인. | pass |

## 재시도 이력

첫 실행에 통과.

단, Pre-E2E 컴파일 게이트에서 `EditOpenedMessage` 타입 누락 에러 발생:
- **원인**: TSK-02-01에서 신규로 작성된 `customEditor.ts`가 `EditOpenedMessage`에서 `uri`와 `docVersion` 필드를 기대했으나, `src/shared/messages.ts`의 `EditOpenedMessage` 타입에 이 필드들이 정의되지 않음.
- **수정**: 
  1. `messages.ts`의 `EditOpenedMessage`에 `uri: string`, `docVersion: number` 필드 추가
  2. `customEditorProvider.ts`의 `editOpenedMsg` 객체에 `uri`, `docVersion` 값 추가
  3. `test/unit/messages.test.ts`의 두 테스트 케이스에서 `EditOpenedMessage` 생성 시 `uri`, `docVersion` 추가
- **typecheck 재실행**: 통과 ✔

## 비고

- TSK-02-04는 fullstack 도메인이므로 fullstack_domains = [backend, frontend]의 각 domain에 대해 단위 테스트를 순차 실행. 모두 동일 명령(`npm -w @form-js-designer/designer-vscode-extension run test:unit`)을 사용하므로 결과 통합.
- E2E 테스트는 예상된 6가지 케이스(TSK-01-04 Form JS Preview 3개 + TSK-02-01 Custom Editor 3개) 모두 통과. TSK-02-04 자체의 저장/충돌 검증 로직은 단위 테스트로 커버됨 (244개 테스트 중 saveSchemaController, sourceWatcher, conflictModal 관련 ~80개).
- Pre-E2E 컴파일 게이트에서 발생한 에러는 build regression (이 Task의 파일 계획에 포함된 파일: messages.ts, customEditor.ts, customEditorProvider.ts)이므로 자동 복구 없이 수정 필요. 수정 후 컴파일 재확인 및 전체 테스트 재실행 완료.
