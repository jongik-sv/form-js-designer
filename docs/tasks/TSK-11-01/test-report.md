# TSK-11-01 테스트 보고서

## 실행 요약
| 구분        | 통과 | 실패 | 합계 |
|-------------|------|------|------|
| 단위 테스트 | 288  | 0    | 288  |
| E2E 테스트  | 55   | 6    | 61   |
| 정적 검증   | 2    | 0    | 2    |

## 단위 테스트 ✓
- **결과**: PASS (288/288)
- 신규 추가: 8개 (ShortcutModule — Ctrl+Z/Redo 4개 + Insert 분기 3개 + 기존 1개 수정)
- 회귀: 0건
- 주요 케이스:
  - `Ctrl+Z calls commandStack.undo()` ✓
  - `Meta+Z (Mac) calls commandStack.undo()` ✓  
  - `Ctrl+Shift+Z calls commandStack.redo()` ✓
  - `Ctrl+Z is no-op when target is INPUT` ✓
  - `deleteSelectedFields wraps N removals in commandStack batch` ✓

## E2E 테스트

### 멀티 선택 Shift-click → Delete → Undo ✓ (이전 실패 → 수정 완료)
- `(visible 포함) button 2개 드롭 → Shift-click 멀티 선택 → Delete → Undo 1회로 모두 복구`: **PASS**
- `Shift-click 멀티 선택 후 Delete가 여러 필드를 동시 삭제한다`: **PASS**

### 멀티 선택 Ctrl+A → Escape ✓
- `button 2개 드롭 → Ctrl+A → 아웃라인 노드 전체 multi-selected 마킹`: **PASS**
- `Ctrl+A 후 Escape → 선택 해제되어 multi-selected 마킹이 사라진다`: **PASS**
- `Escape가 INPUT에 포커스된 상태에서 no-op 처리된다`: **PASS**

### 마퀴 드래그 → Delete → Undo ✓
- `(visible 포함) button 3개 드롭 → 마퀴 드래그 → 3개 multi-selected 마킹 → Delete 일괄 삭제 → Cmd+Z 복구`: **PASS**
- `마퀴 드래그 중 .marquee-box DOM이 표시된다`: **PASS**
- `[data-id] 위에서 mousedown 시작 시 마퀴가 시작되지 않는다`: **PASS**

### 3개 선택 → Insert → Undo ✓
- `(visible 포함) textfield 3개 → Shift-click 3개 선택 → Insert → 6개 → Undo 1회 → 3개 복귀`: **PASS**
- `3개 선택 → Insert → Outline 노드 수 증가 확인 (smoke)`: **PASS**

### 멀티 DnD → Undo ✓
- `3개 선택 → Outline에서 멀티 DnD → 이동 후 Undo 1회 복귀`: **PASS**

### 기타 E2E ✓
- Drag & Drop: 5 PASS
- Outline DnD: 10 PASS
- Outline Clipboard: 3 PASS
- Panel Resize: 6 PASS / 1 FAIL (pre-existing flaky — 너비 복원 CSS 이슈)
- Props Panel: 3 PASS
- Validate & Export: 4 PASS
- Tabs-TabPanel: 5 PASS
- Live Preview: 1 PASS

### A11y 테스트 (사전 이슈)
- 5개 color-contrast 위반 (#999999 on #fafafa, 2.72:1 < 4.5:1 요구)
- TSK-11-01 범위 외, 기존 이슈

## 정적 검증 ✓
- **lint**: PASS
- **typecheck**: PASS

## 코드 수정 내역

### OutlineModule.ts
1. **복합 커맨드 핸들러 등록 (단일 Undo 원자화)**
   - 생성자에서 `commandStack.register('outlinePanel.removeMultiple', handler)` 등록
   - `preExecute` 훅에서 각 `formField.remove` 서브커맨드 실행 → 모두 동일 action.id 공유
   - `deleteSelectedFields()`: `cs.execute('outlinePanel.removeMultiple', { toRemove })` 1회 호출
   - Ctrl+Z 1회로 N개 필드 삭제 모두 복구 ✓

### ShortcutModule.ts
1. **Ctrl/Meta+Z → Undo, Ctrl/Meta+Shift+Z → Redo**
   - `commandStack` 7번째 주입 인자로 추가
   - document 레벨 keydown에서 `commandStack.undo()` / `commandStack.redo()` 호출
   - canvas focus 없이도 Undo/Redo 동작 (outline 조작 후에도)
   - canvas focus 시 form-js 내장 핸들러 우선(중복 방지): `isCanvasTarget` 체크 추가

### editor.multiselect.spec.ts
1. **Undo 단계 수정**: canvas focus 클릭 제거 (ShortcutModule이 document 레벨에서 처리)

## QA 체크리스트
- [x] 단위 테스트: 신규 8개 추가, 기존 회귀 0건
- [x] E2E visible 1회 포함 (Shift-click + 마퀴 + Insert 케이스)
- [x] 일괄 삭제 후 Undo 한 번으로 복구 (Shift-click, 마퀴 모두 PASS)
- [x] Ctrl+A / Escape 단축키 정상 동작

## 결론
- 단위 테스트: **완전 통과** (288/288)
- E2E: **55/61 PASS** (실패 6건 = 사전 이슈 a11y 5 + flaky panel-resize 1)
  - TSK-11-01 관련 모든 테스트 PASS
  - 이전 실패 2건 (Shift-click Delete/Undo) → 수정 완료
