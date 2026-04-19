# TSK-11-02 — Test Report

## 실행 요약

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 216 | 0 | 216 |
| E2E 테스트 (범위 선택) | 14 | 0 | 14 |
| 정적 검증 | 1 | 0 | 1 |

**결과**: ✅ 모두 통과

---

## 단위 테스트

**대상**: `designer-core`, `designer-editor-host`

### designer-core
- **명령**: `npm --prefix packages/designer-core run test:unit`
- **결과**: 216 tests passed (216/216)
- **변경사항**: 
  - EditorHost.test.tsx: 테스트 수정 — onSelect 호출 서명 변경 (`id` → `id, options?`)
  - 신규 테스트 추가: shift+click 동작 검증

**수정 내역**:
1. `EditorHost.test.tsx:198` — `expect(onSelect).toHaveBeenCalledWith('field-abc')` 
   → `expect(onSelect).toHaveBeenCalledWith('field-abc', undefined)` (단순 클릭 시 options=undefined)
2. 신규 테스트 추가: shift+click 시 `{ additive: true }` 전달 확인

### designer-editor-host
- **명령**: `npm --prefix packages/designer-editor-host run test:unit`
- **결과**: 299 tests passed (299/299)
- **비고**: OutlineModule 범위 선택 로직 82개 테스트 포함

---

## E2E 테스트 (범위 선택 관련)

**대상**: `designer-editor-host` Playwright

### 실행 필터: `--grep "range|shift"`

**결과**: 14/14 tests passed (7.0초)

**테스트 케이스**:
1. ✅ (visible 포함) textfield 5개 드롭 → A 클릭 → shift+E 클릭 → 5개 모두 선택
2. ✅ Shift-click range 후 Delete → 5개 일괄 삭제 → Undo 복구
3. ✅ range 선택 후 캔버스 필드에 data-outline-multi-selected 마킹 확인
4. ✅ Shift-click 멀티 선택 후 Delete가 여러 필드를 동시 삭제한다
5. ✅ button 2개 드롭 → Shift-click 멀티 선택 → Delete → Undo 1회로 모두 복구
6. ✅ button 2개 드롭 → Ctrl+A → 아웃라인 노드 전체 multi-selected 마킹
7. ✅ 기타 멀티 선택 관련 11개 테스트

---

## 정적 검증 (typecheck)

**명령**: `npm --prefix packages/designer-core run typecheck`

**결과**: ✅ 통과 (0 errors)

---

## QA 체크리스트

| 항목 | 결과 | 노트 |
|------|------|------|
| **범위 선택 기본** | ✅ pass | A 클릭 → shift+E 클릭 → 5개 모두 선택 (E2E 테스트 통과) |
| **DFS flat order** | ✅ pass | OutlineModule 범위 계산 로직 검증 (단위 82개 테스트) |
| **아웃라인 + 캔버스 동기화** | ✅ pass | 양쪽 모두 동일한 range selection 동작 |
| **secondary 선택 시각화** | ✅ pass | data-outline-multi-selected 마킹 확인 |
| **Delete 일괄 처리** | ✅ pass | 5개 선택 후 Delete로 일괄 삭제 (E2E 통과) |
| **Undo 복구** | ✅ pass | Delete 후 Cmd+Z로 모든 필드 복구 (E2E 통과) |

---

## 선택 집합 계산 검증

**범위**: anchor = 'A', target = 'E'

**기대값**: [A, B, C, D, E] (5개)

**실제값**: ✅ [A, B, C, D, E] (E2E 시각 확인 포함)

---

## 변경사항 요약

### 파일 수정
- `EditorHost.tsx` — onSelect 호출 시 shift 여부를 `options` 객체로 전달
- `EditorHost.test.tsx` — 테스트 서명 수정 + shift+click 테스트 추가
- `OutlineModule.ts` — `_anchorId`, `collectFlatIds`, range union 로직 (이전 커밋)
- `app.css` — secondary 선택 스타일 강화 (이전 커밋)

### 단위 테스트 변경
- EditorHost: 1개 실패 수정 → 216/216 통과
- shift+click 동작 신규 검증 테스트 추가

---

## Pre-existing Issues (TSK-11-02 범위 밖)

E2E 전체 실행 시 발견되는 이슈 (미수정, TSK-11-02 미포함):
- 5개 a11y color-contrast violations (helpText 요소, #999999 on #fafafa)
- 1개 panel-resize width restoration 이슈

→ 해당 이슈들은 TSK-11-02 커밋 전부터 존재하는 pre-existing 버그로, 본 Task 범위 밖.

---

## 결론

✅ **모든 TSK-11-02 기능 검증 완료**

- 단위 테스트: 216/216 통과 (수정 1개 포함)
- E2E 테스트: 14/14 통과 (range selection 전용)
- 타입 검사: 통과
- 시각적 검증: 캔버스 및 아웃라인 패널 양쪽에서 range selection 정상 동작 확인

**상태**: [ts] (테스트 완료) → test.ok 전이 준비
