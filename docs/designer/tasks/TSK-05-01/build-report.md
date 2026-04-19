# TSK-05-01: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-table/package.json` | 패키지 메타. deps: @form-js-designer/designer-core, @tanstack/react-table. devDeps: @preact/preset-vite, vitest, happy-dom, @testing-library/preact | 신규 |
| `packages/designer-table/tsconfig.json` | designer-core 구조 계승 + path alias. jsx: react-jsx, jsxImportSource: preact | 신규 |
| `packages/designer-table/vitest.config.ts` | preact 단일 인스턴스 강제(절대 경로 alias + server.deps.inline), react/react-dom → preact/compat, @tanstack/react-table inline 처리 | 신규 |
| `packages/designer-table/src/types.ts` | TRD §5.1 TableSchema·ColumnDef 타입. LocaleKey는 designer-core에서 re-export | 신규 |
| `packages/designer-table/src/columnDefToTanstack.ts` | ColumnDef[] 트리 → TanStack ColumnDef<TRow>[] 재귀 변환. accessor에 '.' 포함 시 accessorFn으로 대체. id/accessor 미지정 시 throw | 신규 |
| `packages/designer-table/src/colspanMath.ts` | 순수 유틸: 트리 깊이·leaf 수 계산으로 기대 colSpan/rowSpan 행렬 산출. TanStack 결과 QA 게이트용 | 신규 |
| `packages/designer-table/src/useStableTableState.ts` | ADR-0003 D5 강제 헬퍼. sorting·columnOrder·columnFilters 등을 useMemo + JSON.stringify로 안정화 | 신규 |
| `packages/designer-table/src/propsSchema.ts` | table 타입 PropsSchema — data(expression), features.*: boolean, features.pagination.pageSize: number | 신규 |
| `packages/designer-table/src/Table.tsx` | defineComponent({ type: 'table', group: 'data', ... }). useReactTable 호출 → headerGroups 순회로 멀티헤더 3단 DOM 렌더. state는 useStableTableState로 감쌈. header는 t(key) 함수형 전달 | 신규 |
| `packages/designer-table/src/Table.css` | 평문 CSS(.module.css 금지). .fjs-designer-table, .fjs-designer-table__thead, .fjs-designer-table__th[data-level] 등 | 신규 |
| `packages/designer-table/src/index.ts` | DesignerTableModule(form-js additionalModules factory), Table, TableSchema/ColumnDef/columnDefToTanstack public export | 신규 |
| `packages/designer-table/src/__tests__/columnDefToTanstack.test.ts` | 단위 테스트: 1단 flat, 2단 그룹, 3단 그룹, id/accessor 미지정 throw, LocaleKey ctx.t 주입 (6 테스트) | 신규 |
| `packages/designer-table/src/__tests__/colspanMath.test.ts` | 3단 예시 → 기대 rowSpan/colSpan 행렬 일치. 비대칭 트리(얕은 leaf rowSpan=2) (4 테스트) | 신규 |
| `packages/designer-table/src/__tests__/Table.test.tsx` | 통합: thead 3개 tr 렌더, LocaleProvider 번역, features.sorting 정렬, 무한재렌더 방지(≤5 render) (5 테스트) | 신규 |
| `packages/designer-table/src/__tests__/defineComponent.contract.test.ts` | defineComponent 계약 검증: type='table', group='data', create() 규약 (4 테스트) | 신규 |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 (designer-table) | 19 | 0 | 19 |
| 회귀 테스트 (designer-core) | 192 | 0 | 192 |
| **합계** | **211** | **0** | **211** |

## E2E 테스트 (작성만 — 실행은 dev-test)

N/A — library domain (e2e_test: null)

## 커버리지 (Dev Config에 coverage 정의 시)

N/A — Dev Config의 coverage 명령이 designer-core 대상으로만 정의되어 있음. designer-table 전용 커버리지 명령은 미정의.

## 비고

### preact 다중 인스턴스 이슈 해결 (ADR-0003 D5·D6 연계)

- **증상**: designer-table/node_modules/preact(10.29.1)와 루트 node_modules/preact(10.15.1) + @testing-library/preact가 각기 다른 preact 인스턴스를 사용하여 `useContext` 실패.
- **해결**: vitest.config.ts에 절대 경로 alias(PREACT_ROOT)로 모든 preact/*, react, react-dom을 단일 인스턴스로 강제. 추가로 `server.deps.inline: ['preact', '@testing-library/preact', '@tanstack/react-table', '@tanstack/table-core']`로 vite transform 파이프라인 통과 보장.
- **근거**: ADR-0003 D6 "@preact/preset-vite 기본 alias 세트에 react-dom/test-utils → preact/test-utils 포함"의 확장 적용.

### CSS 모듈 없음 확인

- `npm run lint:no-css-modules` → `0 violations` (designer-table에 *.module.css 없음)

### design.md 설계 vs 구현 차이 없음

- 파일 계획의 모든 파일 구현 완료.
- `vitest.workspace.ts` 수정 불필요 — `./packages/*` 와일드카드가 designer-table 자동 포함.
