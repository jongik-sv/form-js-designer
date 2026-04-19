# TSK-11-01 테스트 보고서

## 실행 요약
| 구분        | 통과 | 실패 | 합계 |
|-------------|------|------|------|
| 단위 테스트 | 280  | 0    | 280  |
| E2E 테스트  | 53   | 2    | 55   |
| 정적 검증   | 2    | 0    | 2    |

## 단위 테스트 ✓
- **결과**: PASS (280/280)
- 모든 테스트 통과, 회귀 0건
- `deleteSelectedFields batch undo 원자화` 포함

## E2E 테스트
### 멀티 선택 Ctrl+A → Escape ✓
- `button 2개 드롭 → Ctrl+A → 아웃라인 노드 전체 multi-selected 마킹`: **PASS**
- `Ctrl+A 후 Escape → 선택 해제되어 multi-selected 마킹이 사라진다`: **PASS**
- `Escape가 INPUT에 포커스된 상태에서 no-op 처리된다`: **PASS**

### Shift-click 멀티 선택 → Delete → Undo
- `(visible 포함) button 2개 드롭 → Shift-click 멀티 선택 → Delete → Undo 1회로 모두 복구`: **FAIL**
  - 원인: Shift-click 후 Delete 키 누르기가 deleteSelectedFields 호출로 이어지지 않음
  - 체크: afterDeleteCount expected < 2, received 2 (노드 개수 변화 없음)

- `Shift-click 멀티 선택 후 Delete가 여러 필드를 동시 삭제한다`: **FAIL**
  - 원인: 동일 (Shift-click 멀티 선택이 제대로 동작하지 않는 것으로 추정)

### 마퀴 선택 → Delete → Undo ✓
- `(visible 포함) button 3개 드롭 → 마퀴 드래그 → 3개 multi-selected 마킹 → Delete 일괄 삭제 → Cmd+Z 복구`: **PASS**

### 기타 E2E
- Drag & Drop: 5 PASS
- Outline DnD: 10 PASS
- Outline Clipboard: 3 PASS
- Panel Resize: 5 PASS
- Props Panel: 2 PASS
- Validate & Export: 4 PASS
- Tabs-TabPanel: 5 PASS
- Debug: 1 PASS

### A11y 테스트
- 5개 color-contrast 위반 (기존 이슈, TSK-11-01 범위 외)

## 정적 검증 ✓
- **lint**: PASS
- **typecheck**: PASS

## 코드 수정 내역

### OutlineModule.ts
1. **commandStack 주입 추가**
   - `static inject` 목록에 'commandStack' 추가
   - 생성자에 `commandStack?: unknown` 파라미터 추가
   - `_commandStack` 필드에 저장

2. **deleteSelectedFields batch 원자화**
   - 방법: `commandStack.changed` 리스너 임시 제거 → 모든 삭제 수행 → 리스너 재등록
   - 결과: 여러 필드 삭제가 commandStack에 단일 이벤트로 기록되어, Undo 1회로 모두 복구 가능

### ShortcutModule.ts
- 기존 코드에 Ctrl+A, Escape 처리 이미 포함되어 있음 (수정 불필요)

## QA 체크리스트
- [x] 단위 테스트: 신규 ≥ 4, 기존 회귀 0
- [~] E2E visible 1회 포함 (마퀴 드래그 케이스에서 PASS)
- [~] 일괄 삭제 후 Undo 한 번으로 복구 (마퀴 드래그는 작동, Shift-click은 미작동)

## 남은 작업
### Shift-click 멀티 선택 미작동 진단 필요
1. E2E에서 Shift-click 후 `_selectedIds`가 제대로 설정되는지 확인
2. OutlinePanel의 shift modifier 감지 로직 확인
3. 테스트 환경에서의 Shift 키 입력 시뮬레이션 정확도 확인

### 예상 원인
- E2E의 `click({ modifiers: ['Shift'] })` 동작이 OutlinePanel에 제대로 전달되지 않을 가능성
- OutlineModule._handleSelect의 additive 옵션 미전달 가능성

## 결론
- 단위 테스트: 완전 통과 (Batch undo 구현 검증됨)
- E2E (Ctrl+A / Escape): 완전 통과
- E2E (Shift-click Delete): 부분 실패 (마퀴 드래그는 작동 → 멀티 삭제 메커니즘은 정상, Shift-click 처리만 미작동)
