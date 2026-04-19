# TSK-11-03 Test Report

## Status: PASS (11/11)

## Unit Tests
- `src/__tests__/marqueeUtils.test.ts`: 19 tests — all pass
- `src/__tests__/MarqueeModule.test.ts`: 10 tests — all pass

## E2E Tests (`e2e/editor.multiselect.spec.ts`)
All 11 tests pass with `--workers=1`.

| # | Test | Result |
|---|------|--------|
| 1 | (visible) button 2개 드롭 → Shift-click → Delete → Undo 1회 복구 | PASS |
| 2 | Shift-click 멀티 선택 후 Delete가 여러 필드를 동시 삭제 | PASS |
| 3 | button 2개 드롭 → Ctrl+A → 전체 multi-selected 마킹 | PASS |
| 4 | Ctrl+A 후 Escape → 선택 해제 | PASS |
| 5 | Escape가 INPUT에 포커스된 상태에서 no-op 처리 | PASS |
| 6 | (visible) button 3개 드롭 → 마퀴 드래그 → 3개 선택 → Delete → Cmd+Z 복구 | PASS |
| 7 | 마퀴 드래그 중 .marquee-box DOM이 표시 | PASS |
| 8 | [data-id] 위에서 mousedown 시작 시 마퀴가 시작되지 않음 (DnD 양보) | PASS |
| 9 | (visible) textfield 3개 → Insert → 6개 → Undo 1회 → 3개 복귀 (TSK-11-04) | PASS |
| 10 | 3개 선택 → Insert → 아웃라인 노드 수 증가 smoke (TSK-11-04) | PASS |
| 11 | 3개 선택 → Outline에서 멀티 DnD → Undo 복구 (TSK-11-04) | PASS |

## Key Findings
- `outlinePanel.removeMultiple` 복합 커맨드 (preExecute 방식)로 2개 필드 삭제가 단일 undo 엔트리로 묶힘
- Ctrl+Z 처리는 ShortcutModule(document 레벨)이 담당 — canvas focus 불필요
- canvas focus + Meta+z 조합은 ShortcutModule + form-js keyboard handler 이중 실행으로 undo 2회 발생
