# TSK-05-02: 리팩토링 내역

## 변경 사항

| 파일 | 변경 내용 (요약) | 적용 기법 |
|------|-----------------|-----------|
| `packages/designer-table/src/TableDnd.tsx` | 중복 정의된 `extractLeafIds` 함수 제거 → `Table.tsx`에서 export된 버전 import로 교체 | Remove Duplication |
| `packages/designer-table/src/Table.tsx` | BUILTIN_CELL_RENDERERS fallback 시 중복 체크(`let … = … ?? …` + `if (!…)`) 를 단일 `if + const`로 통합 | Simplify Conditional |
| `packages/designer-table/src/Table.tsx` | `makeHeaderFn` 독립 함수 제거 → `applyT` 내 인라인 화살표 함수로 교체 | Inline Function |
| `packages/designer-table/src/Table.tsx` | `isSortable` 변수를 `headerContent` 블록 위로 호이스팅하여 `features.sorting && header.column.getCanSort()` 표현식 3중 중복 제거 | Introduce Explaining Variable, Remove Duplication |
| `packages/designer-table/src/Table.tsx` | `['th', sortable ? 'th--sortable' : ''].join(' ').trim()` → 삼항 문자열 리터럴 직접 선택으로 단순화 | Simplify Conditional |
| `packages/designer-table/src/cells/NumberCell.tsx` | `onKeyDown Enter`와 `onBlur`에 동일하게 반복된 parseFloat-commit 로직을 `commitOrCancel` 헬퍼 함수로 추출 | Extract Function, Remove Duplication |

## 테스트 확인
- 결과: PASS
- 실행 명령: `npm --prefix packages/designer-table run test:unit`
- 81 tests / 11 test files — 전부 통과

## 비고
- 케이스 분류: A (성공 — 변경 적용 후 테스트 통과)
