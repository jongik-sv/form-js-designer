# table-form-js-defaults: 리팩토링 내역

## 변경 사항

| 파일 | 변경 내용 (요약) | 적용 기법 |
|------|-----------------|-----------|
| `packages/designer-table/src/demoData.ts` | 파일 수준 블록 주석 제거 (개별 JSDoc으로 충분), `shouldUseDemoData` JSDoc의 `@param` 태그 제거 (시그니처에서 자명) | Remove Duplication |
| `packages/designer-table/src/Table.tsx` | line 117의 중복 `// filterFns:` 주석 제거 (line 55와 동일 내용의 dead comment) | Remove Duplication |

## 검토 결과: 변경하지 않은 항목

- **`extractLeafIds` vs `extractLeafKeys` 분리 유지**: 두 함수는 반환하는 key가 다르다(`col.id` vs `col.accessor ?? col.id`). `extractLeafIds`는 TanStack columnOrder 용, `extractLeafKeys`는 demo data key 매칭용으로 의미론적으로 구분된다. 통합 시 타입 경계(`TRDColumnDef` vs `ColumnDef`) 혼재로 위험 대비 이득이 없음.
- **테스트 fixture 공통화 미적용**: 각 describe 블록의 인라인 fixture는 케이스별 의도를 명확히 하며, fixture 추출 시 오히려 가독성이 떨어짐. 현행 유지.
- **`shouldUseDemoData` 알고리즘**: `extractLeafKeys` + `DEMO_KEY_SET.has` 패턴은 이미 충분히 간결하며 변경 불필요.

## 테스트 확인

- 결과: PASS
- 실행 명령: `npm --prefix packages/designer-table run test:unit`
- 12 test files, 101 tests 모두 통과

## 비고

- 케이스 분류: A (성공) — 변경 적용 후 테스트 통과
