# Test Report — TSK-05-02

**Task**: 편집·필터·컬럼이동·가상화  
**Status**: test.fail  
**Date**: 2026-04-17  
**Branch**: dev/WP-05

---

## 실행 요약

| 구분        | 통과 | 실패 | 합계 |
|-------------|------|------|------|
| 단위 테스트 | 81   | 0    | 81   |
| E2E 테스트  | 0    | 15   | 15   |
| 합계        | 81   | 15   | 96   |

---

## 단위 테스트 (PASS)

### 결과
```
Test Files  11 passed (11)
      Tests  81 passed (81)
```

### 상세 통과 항목

| 테스트 파일                    | 케이스 | 상태 |
|--------------------------------|--------|------|
| colspanMath.test.ts            | 4      | ✓    |
| columnDefToTanstack.test.ts    | 6      | ✓    |
| filterFns.test.ts              | 13     | ✓    |
| useCellEdit.test.ts            | 5      | ✓    |
| filters.test.tsx               | 9      | ✓    |
| cells.test.tsx                 | 20     | ✓    |
| moveItem.test.ts               | 8      | ✓    |
| defineComponent.contract.test.ts | 4    | ✓    |
| Table.test.tsx                 | 5      | ✓    |
| Table.editing.test.tsx         | 4      | ✓    |
| Table.filter.test.tsx          | 3      | ✓    |
| **총계**                       | **81** | **✓** |

---

## E2E 테스트 (FAIL — BLOCKER)

### 실패 사유

**BLOCKER: E2E 환경 미구성 — designer-editor-host 미존재**

```
TimeoutError: locator.waitFor: Timeout 10000ms exceeded.
  - waiting for locator('[data-palette-entry="table"]') to be visible
```

### 원인 분석

1. **필수 종속성 부재**: E2E 테스트는 `designer-editor-host` dev server (포트 5173)가 실행 중이어야 함
2. **현재 환경**: WP-05 worktree에는 `packages/designer-table`만 포함되어 있음
   - 메인 리포지토리에도 `designer-editor-host` 패키지 미존재 (phase-1 plan WP-05 범위: `designer-table` 구현만)
3. **palette entry 미존재**: `[data-palette-entry="table"]` 요소를 찾을 수 없음
   - 이는 TSK-06-01 (에디터 호스트 통합) 범위의 작업

### 재실행을 위한 조치

본 test-report는 다음 상황에서만 재운영 가능:

1. **선행 조건 (TSK-06-01 완료 후)**:
   - `packages/designer-editor-host` 패키지 생성 완료
   - `src/App.tsx`에서 Table 컴포넌트 등록
   - `src/modules/PaletteModule.ts`에서 `[data-palette-entry="table"]` 요소 추가
   - dev server가 포트 5173에서 정상 기동

2. **환경 설정**:
   ```bash
   npm install
   npm --prefix packages/designer-editor-host run dev &  # 백그라운드 기동
   npm --prefix packages/designer-table run test:e2e
   ```

---

## QA 체크리스트 판정

### 단위 테스트 기반 검증 (PASS)

- [x] (정상) 단위 테스트 51 케이스 이상 통과 → **81 케이스 확인**
- [x] (정상) TextCell 클릭 → input 렌더 → Enter → onChange 호출 (단위 테스트)
- [x] (정상) NumberCell min/max validate (단위 테스트)
- [x] (정상) DateCell ISO 문자열 처리 (단위 테스트)
- [x] (정상) BooleanCell 즉시 toggle (단위 테스트)
- [x] (정상) EnumCell select 변경 → onChange (단위 테스트)
- [x] (정상) TextFilter debounce 200ms (단위 테스트)
- [x] (정상) SelectFilter 옵션 선택 (단위 테스트)
- [x] (정상) RangeFilter min/max 범위 (단위 테스트)
- [x] (정상) dnd leaf column drag → moveItem (단위 테스트)
- [x] (정상) 10,000 행 virtualization DOM 수 제한 (단위 테스트)
- [x] (정상) features.virtualization=false 시 전체 행 렌더 (단위 테스트)
- [x] (엣지) 빈 데이터 + 편집/필터/reorder 모두 on → 크래시 없음 (단위 테스트)
- [x] (엣지) 단일 컬럼 dnd drag → no-op (단위 테스트)
- [x] (엣지) RangeFilter min만 입력 → max 무제한 (단위 테스트)
- [x] (엣지) 편집 중 Escape → draft 폐기 (단위 테스트)
- [x] (에러) 알 수 없는 type → TextCell fallback (단위 테스트)
- [x] (에러) 알 수 없는 filter → 필터 미렌더 (단위 테스트)
- [x] (에러) features.editing=false 시 read-only (단위 테스트)
- [x] (통합) Table.editing 통합 테스트 → 5 케이스 통과 (단위 테스트)
- [x] (통합) Table.filter 통합 테스트 → 3 케이스 통과 (단위 테스트)
- [x] (통합) BUILTIN_CELL_RENDERERS/BUILTIN_FILTER_RENDERERS export 및 타입 포함 (단위 테스트)
- [x] (회귀) TSK-05-01 단위 테스트 전부 통과 (단위 테스트에서 확인)
- [x] (회귀) state 항목 stable-ref (단위 테스트 코드 리뷰)

### E2E 테스트 기반 검증 (UNVERIFIED — 환경 미구성)

- [ ] (클릭 경로) 팔레트 Table 드래그 → 캔버스 드롭 → 렌더 (환경 미구성)
- [ ] (화면 렌더링) 테이블 UI 요소 브라우저 표시 (환경 미구성)
- [ ] `table.editing.spec.ts` 5 케이스 (환경 미구성)
- [ ] `table.filter.spec.ts` 3 케이스 (환경 미구성)
- [ ] `table.reorder.spec.ts` 2 케이스 (환경 미구성)
- [ ] `table.virtualization.spec.ts` FPS ≥ 55 (환경 미구성)

---

## 기술 결론

### 코드 구현 완료도: 100%

본 Task의 **설계 문서에 명시된 모든 소스 코드 구현**이 완료되었습니다:

- ✓ 셀 편집 5종 (TextCell, NumberCell, DateCell, BooleanCell, EnumCell)
- ✓ 필터 3종 (TextFilter, SelectFilter, RangeFilter) + filterFns
- ✓ dnd-kit 컬럼 이동 (useColumnReorder, moveItem, ColumnDragHandle)
- ✓ TanStack Virtual 가상화 (useRowVirtualizer, VirtualRows)
- ✓ 단위 테스트 81 케이스
- ✓ E2E 테스트 코드 작성 (15 케이스, 미실행)
- ✓ playwright.config.ts 설정

### 테스트 검증 현황

| 검증 유형       | 상태   | 근거                             |
|-----------------|--------|----------------------------------|
| 단위 테스트     | PASS   | 81/81 케이스 통과 (vitest run)  |
| 정적 검증       | N/A    | designer-table typecheck 패스   |
| E2E 검증        | FAIL   | 환경 미구성 (designer-editor-host 부재) |
| 수동 검증 (localhost) | N/A | 개발자 테스트 가능하나 현재 불가 |

### 선행 작업

본 Task의 E2E 검증은 **다음 작업에 의존**합니다:

1. **TSK-06-01**: designer-editor-host 생성 및 Table 컴포넌트 등록
   - 팔레트 entry 추가
   - 캔버스 렌더 통합
2. **의존성 패키지**: designer-i18n (선택사항, fallback 가능)

---

## 제약 및 향후 계획

### 현재 제약

- designer-editor-host 미존재로 인한 E2E 실행 불가
- 실제 브라우저 테스트 미수행 (feedback_e2e_browser_verify 메모리 룰)

### FPS 측정 재확인 (TSK-06-01 완료 후)

design.md §5 "FPS ≥ 55 단언, headless + visible 두 모드 모두 통과" 요구사항:

```bash
# headless 측정 (CI)
npm --prefix packages/designer-table run test:e2e

# visible 측정 (개발자 머신, 필수)
HEADED=1 npm --prefix packages/designer-table run test:e2e
```

---

## 권장 조치

### 즉시 (현 Phase)

1. ✓ 단위 테스트 전부 통과 확인
2. 상위 Task (TSK-06-01) 완료 대기

### TSK-06-01 완료 후

1. designer-editor-host dev server 기동
2. `npm --prefix packages/designer-table run test:e2e` 실행
3. 실패한 E2E 케이스 수정 및 FPS 재확인
4. 최종 E2E PASS까지 반복

---

## 변수

- **E2E 환경 준비 시간**: TSK-06-01 인수인계 이후 약 30분
- **FPS 측정 안정성**: CI 환경(2vCPU)에서 retry 전략 필요 가능성 (현 설정: 2회 retry)
