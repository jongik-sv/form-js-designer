# TSK-11-01: Undo 배치 + Ctrl+A/Escape + E2E — 설계

## 요구사항 확인
- `OutlineModule.deleteSelectedFields()` 호출 시 form-js `commandStack` 의 복합 command 로 감싸 **단일 undo/redo** 로 N 개 필드가 일괄 복구되도록 한다.
- 전역 `Ctrl/Meta+A` 단축키로 현재 루트 children 전체를 선택(`_selectedIds`). `INPUT/TEXTAREA/contentEditable` 포커스 시 no-op.
- 전역 `Escape` 단축키로 선택 해제 (`_selectedIds=[]` + `selection.clear()`).
- `editor.multiselect.spec.ts` E2E: shift-click 일괄 삭제 + undo 1회 복구 / Ctrl+A → Escape 시나리오.

## 타겟 앱
- **경로**: `packages/designer-editor-host`
- **근거**: 모든 멀티 선택 상태는 `OutlineModule`/`ShortcutModule` 안에 있고, 호스트 앱(`App.tsx`) 이 실행 컨텍스트.

## 구현 방향
1. `FormJsCommandStack` 타입/inject 추가. `deleteSelectedFields()` 를 `commandStack.execute('composite-remove', { ids: [...] })` 형태 커스텀 command 로 감싸거나, `commandStack.startBatch(desc)` / `endBatch()` API 가 노출되지 않으면 `eventBus.fire('commandStack.changed')` 한 번만 내보내도록 `_refreshNodes`/`_render` 를 트랜잭션화.
2. `ShortcutModule` 에 `Ctrl/Meta+A` 처리: `formEditor.getSchema().components` 의 top-level id 를 `outlinePanel.setSelectedIds(ids)` 에 주입 (신규 public 메서드).
3. `ShortcutModule` 에 `Escape` 처리: `outlinePanel.clearSelection()` + `selection.clear()` (selection 이 `clear` 미노출이면 `selection.set(null)`).
4. E2E: Playwright `multiselect.spec.ts` 신규. visible 1회 포함(프로젝트 규칙).

## 파일 계획
| 파일 | 역할 | 신규/수정 |
|---|---|---|
| `packages/designer-editor-host/src/modules/OutlineModule.ts` | `setSelectedIds`/`clearSelection` public, `deleteSelectedFields` batch화 | 수정 |
| `packages/designer-editor-host/src/modules/ShortcutModule.ts` | Ctrl+A, Escape 분기 | 수정 |
| `packages/designer-editor-host/src/__tests__/OutlineModule.test.ts` | batch 삭제 이벤트·setSelectedIds·clearSelection 테스트 | 수정 |
| `packages/designer-editor-host/e2e/multiselect.spec.ts` | shift-click → Delete → Undo / Ctrl+A → Escape | 신규 |

## Acceptance
- 기존 vitest 226 개 회귀 0, 신규 ≥ 4 추가
- `multiselect.spec.ts` green, visible 1회 수행 증빙(screenshots)
- 일괄 삭제 후 **Cmd/Ctrl+Z 한 번** 으로 모든 필드 복구
