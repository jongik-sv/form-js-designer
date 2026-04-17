# Test Report — TSK-05-02

**Task**: 편집·필터·컬럼이동·가상화  
**Status**: test.ok  
**Date**: 2026-04-17  
**Branch**: dev/WP-05

---

## 실행 요약

| 구분        | 통과 | 실패 | 합계 |
|-------------|------|------|------|
| 단위 테스트 | 81   | 0    | 81   |
| E2E 테스트  | 15   | 0    | 15   |
| 합계        | 96   | 0    | 96   |

**최종 결과: PASS**

---

## 단위 테스트 (PASS)

### 결과
```
Test Files  11 passed (11)
      Tests  81 passed (81)
   Duration  903ms
```

### 상세 통과 항목

| 테스트 파일                      | 케이스 | 상태 |
|----------------------------------|--------|------|
| colspanMath.test.ts              | 4      | ✓    |
| columnDefToTanstack.test.ts      | 6      | ✓    |
| filterFns.test.ts                | 13     | ✓    |
| useCellEdit.test.ts              | 5      | ✓    |
| filters.test.tsx                 | 9      | ✓    |
| cells.test.tsx                   | 20     | ✓    |
| moveItem.test.ts                 | 8      | ✓    |
| defineComponent.contract.test.ts | 4      | ✓    |
| Table.test.tsx                   | 5      | ✓    |
| Table.editing.test.tsx           | 4      | ✓    |
| Table.filter.test.tsx            | 3      | ✓    |
| **총계**                         | **81** | **✓** |

---

## E2E 테스트 (PASS)

### 환경

- E2E 서버: 독립 Vite 하네스 (`vite.e2e.config.ts`), 포트 5176
- 진입 방식: 팔레트 `[data-palette-entry="table"]` 클릭 → `[data-testid="designer-table"]` 마운트 대기
- 브라우저: Chromium (Playwright Desktop Chrome)

### 결과
```
Running 15 tests using 4 workers
  15 passed (4.5s)
```

### 상세 통과 항목

| 스펙 파일                        | 케이스 | 상태 |
|----------------------------------|--------|------|
| table.editing.spec.ts            | 5      | ✓    |
| table.filter.spec.ts             | 4      | ✓    |
| table.reorder.spec.ts            | 3      | ✓    |
| table.virtualization.spec.ts     | 3      | ✓    |
| **총계**                         | **15** | **✓** |

### 가상화 측정

```
[virtualization] 10k rows scroll FPS: 60.6  (threshold: ≥55)
[virtualization] total scroll height: 360021px  (min: 360000px)
```

FPS 60.6 ≥ 55 임계값 충족.

---

## 실물 브라우저 검증 (brw-test)

Playwright visible 모드로 `http://localhost:5176` 직접 접속 후 확인:

- 팔레트 "Table" 버튼 클릭 → 테이블 컴포넌트 캔버스에 렌더됨
- 6컬럼 (ID/Name/Date/Active/Status/Score) 10행 데이터 표시
- Name 셀 클릭 시 `textbox "텍스트 입력..." [active]` 인라인 편집 모드 진입 확인
- thead 필터 입력 (RangeFilter, TextFilter, SelectFilter) 렌더 확인
- BooleanCell checkbox 렌더 확인

**brw-test PASS**

---

## QA 체크리스트 판정

### 단위 테스트 기반 검증 (PASS)

- [x] 단위 테스트 81 케이스 통과
- [x] TextCell 클릭 → input 렌더 → Enter → onChange 호출
- [x] NumberCell min/max validate
- [x] DateCell ISO 문자열 처리
- [x] BooleanCell 즉시 toggle
- [x] EnumCell select 변경 → onChange
- [x] TextFilter debounce 200ms
- [x] SelectFilter 옵션 선택
- [x] RangeFilter min/max 범위
- [x] dnd leaf column drag → moveItem
- [x] 10,000 행 virtualization DOM 수 제한
- [x] features.virtualization=false 시 전체 행 렌더
- [x] 빈 데이터 + 편집/필터/reorder 모두 on → 크래시 없음
- [x] 단일 컬럼 dnd drag → no-op
- [x] RangeFilter min만 입력 → max 무제한
- [x] 편집 중 Escape → draft 폐기
- [x] 알 수 없는 type → TextCell fallback
- [x] 알 수 없는 filter → 필터 미렌더
- [x] features.editing=false 시 read-only
- [x] Table.editing 통합 테스트 5 케이스 통과
- [x] Table.filter 통합 테스트 3 케이스 통과

### E2E 테스트 기반 검증 (PASS)

- [x] 팔레트 Table 클릭 → 캔버스 드롭 → 렌더
- [x] 화면 렌더링 — 테이블 UI 요소 브라우저 표시
- [x] `table.editing.spec.ts` 5 케이스 (text/number/date/boolean/enum)
- [x] `table.filter.spec.ts` 4 케이스
- [x] `table.reorder.spec.ts` 3 케이스
- [x] `table.virtualization.spec.ts` FPS 60.6 ≥ 55

---

## 수정 이력 (dev-test 단계)

| 수정 파일 | 내용 |
|-----------|------|
| `src/Table.tsx` | `<td>` 에 `data-column-type={cellType}` 추가 (E2E 셀 타입별 셀렉터 지원) |
| `src/Table.tsx` | boolean 셀 td onClick에서 `beginEdit` 호출 제외 (BooleanCell은 directCommit 방식) |
| `e2e/table.editing.spec.ts` | text/number 셀 입력 선택자를 `tbody input.fjs-designer-table__cell-input`으로 변경 (필터 입력과 구분) |
| `e2e/table.editing.spec.ts` | text 셀 클릭 대상을 `td[data-column-type="text"]`로 수정 |
| `playwright.config.ts` | baseURL을 5173→5176으로 변경, webServer를 독립 dev:e2e 서버로 변경 |
| `vite.e2e.config.ts` | 신규 생성 — E2E 하네스 Vite 설정 (포트 5176) |
| `e2e-app/index.html` | 신규 생성 — E2E 하네스 HTML |
| `e2e-app/main.tsx` | 신규 생성 — E2E 하네스 Preact App |

---

## 기술 결론

| 검증 유형           | 상태   | 근거                                          |
|---------------------|--------|-----------------------------------------------|
| 단위 테스트         | PASS   | 81/81 케이스 통과 (vitest run)               |
| E2E 테스트          | PASS   | 15/15 케이스 통과 (playwright chromium)      |
| 가상화 FPS          | PASS   | 60.6 FPS (임계값 55 초과)                    |
| 실물 브라우저 검증  | PASS   | Playwright visible 모드 직접 확인            |
