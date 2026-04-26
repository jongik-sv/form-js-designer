# TSK-02-04: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-vscode-extension/src/shared/messages.ts` | `SaveSchemaMessage`에 `uri`, `mdStart`, `mdEnd`, `docVersion` 필드 추가; `SourceUpdatedMessage`를 `uri`+`version` 구조로 교체 | 수정 |
| `packages/designer-vscode-extension/src/editor/conflictModal.ts` | `showConflictModal(showWarningMessage)` — 충돌 모달 wrapper, 응답 매핑 | 신규 |
| `packages/designer-vscode-extension/src/editor/saveSchemaController.ts` | `handleSaveSchema(message, deps)` — 저장 트랜잭션 오케스트레이터, deps 주입 인터페이스 | 신규 |
| `packages/designer-vscode-extension/src/editor/sourceWatcher.ts` | `startSourceWatcher(registry, broadcast, subscribe)` — 외부 변경 감지, self-edit cascade 억제 | 신규 |
| `packages/designer-vscode-extension/src/editor/editSession.ts` | `EditSession`에 `openedDocVersion`, `lastKnownDocVersion`, `pendingSaveTokens` optional 필드 추가; `EditSessionRegistry`에 `markSaveInFlight`, `clearSaveInFlight`, `findByUri` 메서드 추가 | 수정 |
| `packages/designer-vscode-extension/src/editor/customEditor.ts` | `sendSaveSchema()`에 `uri/mdStart/mdEnd/docVersion` 포함; `edit-opened`/`save-result`/`source-updated` 핸들러; `showSaveToast`, `showErrorBanner` 헬퍼; Cmd+S keydown 캡처 | 수정 |
| `packages/designer-vscode-extension/src/editor/index.ts` | `saveSchemaController`, `conflictModal`, `sourceWatcher` re-export 추가 | 수정 |
| `packages/designer-vscode-extension/src/extension.ts` | `activate()`에 `startSourceWatcher()` + `formJs.saveBlockEditor` 커맨드 등록; `deactivate()`에 watcher dispose | 수정 |
| `packages/designer-vscode-extension/package.json` | `contributes.commands[]`에 `formJs.saveBlockEditor` 추가; `contributes.keybindings[]`에 `Cmd+S` 매핑 추가 | 수정 |
| `packages/designer-vscode-extension/test/unit/messages-save.test.ts` | `SaveSchemaMessage`/`SourceUpdatedMessage` TSK-02-04 확장 필드 narrowing 검증 (4케이스) | 신규 |
| `packages/designer-vscode-extension/test/unit/editor/conflictModal.test.ts` | 모달 호출 인자, 버튼 라벨, 응답 매핑 검증 (7케이스) | 신규 |
| `packages/designer-vscode-extension/test/unit/editor/saveSchemaController.test.ts` | 정상 저장/버전 불일치+덮어쓰기/버전 불일치+취소/fence 미발견/applyEdit 실패/throw/finally 보장/openTextDocument 실패 (10케이스) | 신규 |
| `packages/designer-vscode-extension/test/unit/editor/sourceWatcher.test.ts` | 활성 세션 브로드캐스트/세션 없음/self-edit 억제/토큰 외 버전/dispose 후 무시/올바른 uri·version/토큰 제거 (7케이스) | 신규 |
| `packages/designer-vscode-extension/test/unit/messages.test.ts` | `save-schema`/`source-updated` narrowing 테스트를 새 필드 구조로 업데이트 | 수정 |
| `packages/designer-vscode-extension/test/integration/suite/saveAndConflict.test.ts` | 정상 저장/충돌 감지/source-updated 처리 통합 테스트 (3케이스) | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-vscode-extension/test/fixtures/save-2space.md` | 2-space 들여쓰기 저장 테스트 fixture | 신규 |
| `packages/designer-vscode-extension/test/fixtures/save-4space.md` | 4-space 들여쓰기 저장 테스트 fixture | 신규 |
| `packages/designer-vscode-extension/test/fixtures/save-crlf.md` | CRLF 라인엔딩 저장 테스트 fixture (UTF-8 with CRLF 확인) | 신규 |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 244 | 0 | 244 |

## E2E 테스트 (작성만 — 실행은 dev-test)

| 파일 경로 | 검증 대상 |
|-----------|-----------|
| `test/integration/suite/saveAndConflict.test.ts` | 정상 저장(펜스 본문 교체), 외부 변경 후 충돌 감지, source-updated 이벤트 처리 |

## 커버리지

- 전체: 69.64% statements / 76.08% functions
- `saveSchemaController.ts`: 88.57% statements
- `sourceWatcher.ts`: 100% statements
- `editSession.ts`: 76.08% statements (신규 메서드 일부 간접 커버)
- 미커버 파일: `customEditor.ts` (browser IIFE — jsdom 단위 테스트 제외 대상, 기존 동일), `extension.ts` (vscode require 없는 환경 — 기존 동일)

## 비고

- `SourceUpdatedMessage`의 기존 `schema` 필드를 `uri`+`version` 구조로 교체하면서 `test/unit/messages.test.ts`의 narrowing 테스트도 함께 업데이트하여 regression 방지.
- `saveSchemaController`/`sourceWatcher`가 deps 주입 방식으로 설계되어 `vscode-mock-impl.ts`에 추가 mock 불필요.
- `save-crlf.md` fixture는 bash `printf`로 CRLF 라인엔딩을 직접 생성 — `file` 명령으로 "UTF-8 text, with CRLF line terminators" 확인.
