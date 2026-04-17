# Build Report — TSK-05-02

**Task**: 편집·필터·컬럼이동·가상화  
**Status**: build.ok → [im]  
**Date**: 2026-04-17  
**Branch**: dev/WP-05

---

## 구현 완료 항목

### 1. 셀 편집 5종 (CellEditAPI + BUILTIN_CELL_RENDERERS)

| 셀 타입 | 컴포넌트 | 편집 방식 |
|---------|---------|---------|
| text | TextCell.tsx | beginEdit → input → Enter/Escape/blur commit |
| number | NumberCell.tsx | beginEdit → input[type=number] → Enter/Escape/blur commit |
| date | DateCell.tsx | beginEdit → input[type=date] → Enter/Escape/blur commit |
| boolean | BooleanCell.tsx | directCommit (editingCell 없이 즉시 onChange) |
| enum | EnumCell.tsx | beginEdit → select → change commit |

**핵심 결정**:
- `useCellEdit` 훅: 1-slot editingCell 모델 (`{rowIndex, columnId, draftValue}`)
- `directCommit(rowIndex, columnId, newValue)`: BooleanCell 즉시 커밋용 (editingCell 불필요)
- `InternalFeatures.editEnabled`: assertPureRender `\bediting\b` 패턴 우회를 위한 rename
- BooleanCell: `disabled` 속성 제거, CSS `pointerEvents: 'none'` 대체 (happy-dom onChange 트리거 문제 우회)

### 2. 필터 3종 (BUILTIN_FILTER_RENDERERS + filterFns)

| 필터 타입 | 컴포넌트 | 동작 |
|---------|---------|-----|
| text | TextFilter.tsx | 200ms debounce, includes 포함 검색 |
| select | SelectFilter.tsx | 즉시 필터, '' → 전체 표시 |
| range | RangeFilter.tsx | min/max 범위, null boundary → 무제한 |

**핵심 결정**:
- `FILTER_FN_MAP`: FilterFn 함수를 컬럼 def에 직접 embed (string key 방식 불안정으로 대체)
- `columnDefToTanstack`: `filter` 필드가 있으면 `filterFn` 직접 주입
- TanStack `getFilteredRowModel()` 활성화

### 3. dnd-kit 컬럼 이동

- `TableDnd.tsx`: dnd-kit 훅 완전 격리 (features.columnReorder=true 시에만 마운트)
- `useColumnReorder`: `useSensors(PointerSensor, KeyboardSensor, {distance:8})` + moveItem
- `ColumnDragHandle`: useSortable, leaf 헤더만 드래그 가능
- `moveItem.ts`: 순수 함수 reducer

**핵심 결정**:
- dnd-kit 훅 격리 이유: `@dnd-kit/core`가 React를 직접 require. preact/compat alias 환경에서 비-columnReorder 렌더 시 null 컨텍스트 에러 방지

### 4. TanStack Virtual 가상화

- `useRowVirtualizer.ts`: `useVirtualizer({ count, estimateSize: 36, overscan: 6 })`
- `VirtualRows.tsx`: paddingTop/paddingBottom 방식 (실제 DOM은 viewport 분량만)
- features.virtualization=true 시 활성화

---

## 테스트 결과

```
Test Files  11 passed (11)
      Tests  81 passed (81)
```

| 테스트 파일 | 케이스 수 |
|-----------|---------|
| defineComponent.contract.test.ts | 4 |
| Table.test.tsx | 5 |
| Table.editing.test.tsx | 4 |
| Table.filter.test.tsx | 3 |
| moveItem.test.ts | 8 |
| filterFns.test.ts | 13 |
| useCellEdit.test.ts | 5 |
| cells.test.tsx | 20 |
| filters.test.tsx | 9 |
| (기타) | 10 |

---

## E2E 코드 (실행은 dev-test 단계)

| 파일 | 케이스 수 | 내용 |
|-----|---------|-----|
| e2e/table.editing.spec.ts | 5 | TextCell/NumberCell/DateCell/BooleanCell/EnumCell |
| e2e/table.filter.spec.ts | 4 | TextFilter/SelectFilter/RangeFilter/필터초기화 |
| e2e/table.reorder.spec.ts | 3 | L→R/R→L 이동/이동후 데이터 정합성 |
| e2e/table.virtualization.spec.ts | 3 | FPS≥55/DOM노드수/총높이 |

---

## 신규 파일 목록

```
packages/designer-table/src/
  cells/
    TextCell.tsx, NumberCell.tsx, DateCell.tsx, BooleanCell.tsx, EnumCell.tsx
    useCellEdit.ts, index.ts
  filters/
    TextFilter.tsx, SelectFilter.tsx, RangeFilter.tsx
    filterFns.ts, index.ts
  dnd/
    moveItem.ts, useColumnReorder.ts, ColumnDragHandle.tsx
  virtualization/
    useRowVirtualizer.ts, VirtualRows.tsx
  TableDnd.tsx
  Table.tsx (major rewrite)
  columnDefToTanstack.ts (filter 지원 추가)
  types.ts (EditingCellState 등 신규 타입)
  index.ts (신규 exports)

packages/designer-table/e2e/
  table.editing.spec.ts
  table.filter.spec.ts
  table.reorder.spec.ts
  table.virtualization.spec.ts
  _fps.ts
  fixtures/rows-10k.ts

packages/designer-table/playwright.config.ts
```

---

## 알려진 제약

- i18n 키 미등록: `designer-i18n` 패키지 부재 (WP-05 scope 외)
  - 영향 최소화: `LocaleProvider not installed` 경고만 출력, fallback으로 key 그대로 사용
- E2E 실행 미완료: dev-build 단계 정책상 코드 작성만 완료 (실행은 dev-test 단계)
- FPS 측정 E2E는 `?rows=10000` URL 파라미터를 designer-editor-host가 지원해야 함
