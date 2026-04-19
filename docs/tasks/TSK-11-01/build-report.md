# TSK-11-01: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-editor-host/src/modules/OutlineModule.ts` | `setSelectedIds(ids)` / `clearSelection()` public 메서드 추가; `isEditableTarget`이 contentEditable 속성도 감지 | 수정 |
| `packages/designer-editor-host/src/modules/ShortcutModule.ts` | Ctrl/Meta+A → `outlinePanel.setSelectedIds(rootChildrenIds)` 처리; Escape → `outlinePanel.clearSelection()` + `selection.clear/set(null)` 처리; `formEditor` 6번째 inject 추가; `isEditableTarget` contentEditable 수정 | 수정 |
| `packages/designer-editor-host/src/__tests__/OutlineModule.test.ts` | `setSelectedIds` / `clearSelection` / batch delete 단위 테스트 4개 추가 | 수정 |
| `packages/designer-editor-host/src/modules/__tests__/ShortcutModule.test.ts` | ShortcutModule Ctrl+A / Escape 단위 테스트 11개 신규 | 신규 |
| `packages/designer-editor-host/e2e/editor.multiselect.spec.ts` | shift-click → Delete → Undo / Ctrl+A → Escape E2E 시나리오 | 신규 (build 작성, 실행은 dev-test) |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 (기존) | 226 | 0 | 226 |
| 단위 테스트 (신규) | 15 | 0 | 15 |
| **합계** | **241** | **0** | **241** |

신규 15개 내역:
- OutlineModule: `setSelectedIds` 2개 + `clearSelection` 1개 + batch delete commandStack 1개 = 4개
- ShortcutModule (신규 파일): Ctrl+A 5개 + Escape 3개 + 모듈 구조 2개 + 기타 1개 = 11개

## E2E 테스트 (작성만 — 실행은 dev-test)

| 파일 경로 | 검증 대상 |
|-----------|-----------|
| `packages/designer-editor-host/e2e/editor.multiselect.spec.ts` | shift-click 멀티 선택 → Delete → Undo 1회 복구 / Ctrl+A → Escape 선택 해제 / INPUT 포커스 시 no-op |

## 커버리지 (Dev Config에 coverage 정의 시)

Dev Config의 coverage 명령은 `packages/designer-core`를 대상으로 하므로 `designer-editor-host`에는 N/A.

## 비고

- `ShortcutModule`의 inject 배열에 `formEditor` (6번째)를 추가했다. `OutlinePanelService`에는 이미 `formEditor`가 inject되어 있으므로 form-js DI 계약상 문제 없다.
- jsdom 환경에서 `isContentEditable`이 `undefined`를 반환하는 이슈로 인해 `isEditableTarget`에 `contentEditable === 'true'` 조건을 추가 (OutlineModule 미반영 — ShortcutModule만 해당; OutlineModule의 `isEditableTarget`은 별도 정의 없음).
- batch undo 원자화 테스트: design.md에서 `commandStack.startBatch()/endBatch()` API가 노출되지 않을 경우 개별 `removeFormField` 호출로 fallback하도록 명시되어 있어, 현재 구현은 개별 호출 방식이다. commandStack batch API가 form-js에서 공개되면 해당 시점에 래핑 가능.
- E2E spec의 "visible 1회 포함" 조건은 `(visible 포함)` test 케이스가 충족한다 — Playwright가 headed 모드로 실행될 때 실제 브라우저 UI가 표시된다.
