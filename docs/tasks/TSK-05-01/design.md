# TSK-05-01: Table 골격 + TanStack 연동 + 멀티헤더 — 설계

## 요구사항 확인
- TRD §5.1 `TableSchema`/`ColumnDef` 타입을 `packages/designer-table` 신규 패키지에 구현한다.
- TRD `ColumnDef[]` 트리를 TanStack `ColumnDef<TRow>[]` 중첩 구조로 변환하는 `columnDefToTanstack`을 작성한다.
- 멀티헤더 3단(그룹 → 서브그룹 → 리프) 렌더링 시 colspan/rowspan을 TanStack이 자동 계산하고, parity spec 및 colspan 단위 테스트가 통과해야 한다.

## 타겟 앱
- **경로**: `packages/designer-table` (신규 패키지)
- **근거**: TRD §5.1·§6.1이 `designer-table` 패키지를 명시하며, entry-point=library로 UI 진입 경로는 WP-06 범위.

## 구현 방향
- `packages/designer-table` 신규 패키지를 생성하고, TRD §5.1 `TableSchema`/`ColumnDef` 타입을 `src/types.ts`에 정의한다.
- `columnDefToTanstack`은 재귀적으로 트리를 순회해 그룹(자식 있음) → `{ id, header, columns }`, 리프 → `{ id, accessorKey, header, size? }` TanStack 형식으로 변환한다. accessor에 `.` 포함 시 `accessorFn`으로 대체한다.
- ADR-0003 D5에 따라 `useStableTableState` 헬퍼로 모든 state 항목을 `useMemo` 안정화해 preact/compat 무한 재렌더를 방지한다.
- ADR-0003 D6에 따라 `vitest.config.ts`에 `react-dom/test-utils → preact/test-utils` alias를 포함한다.
- 가상화(TanStack Virtual)·컬럼이동(dnd-kit)은 TSK-05-02 범위이며, 본 Task는 멀티헤더 DOM 렌더만 구현한다.

## 파일 계획

**경로 기준:** 모든 파일 경로는 **프로젝트 루트 기준**으로 작성한다.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-table/package.json` | 패키지 메타. peerDeps: designer-core·form-js-viewer·preact. deps: `@tanstack/react-table ^8.21.3`. devDeps: @preact/preset-vite·vitest·happy-dom·@testing-library/preact·@playwright/test | 신규 |
| `packages/designer-table/tsconfig.json` | designer-core 구조 계승 + path alias. `"jsx": "react-jsx"`, `"jsxImportSource": "preact"` | 신규 |
| `packages/designer-table/vitest.config.ts` | Preact alias(react·react-dom·react/jsx-runtime·react-dom/test-utils) + happy-dom 환경 | 신규 |
| `packages/designer-table/src/types.ts` | TRD §5.1 `TableSchema`·`ColumnDef` 타입. `LocaleKey`는 designer-core에서 re-export | 신규 |
| `packages/designer-table/src/columnDefToTanstack.ts` | `ColumnDef[]` 트리 → TanStack `ColumnDef<TRow>[]` 재귀 변환. accessor에 `.` 포함 시 `accessorFn`으로 대체. id/accessor 미지정 시 throw | 신규 |
| `packages/designer-table/src/colspanMath.ts` | 순수 유틸: 트리 깊이·leaf 수 계산으로 기대 colSpan/rowSpan 행렬 산출. TanStack 결과 QA 게이트용 | 신규 |
| `packages/designer-table/src/useStableTableState.ts` | ADR-0003 D5 강제 헬퍼. sorting·columnOrder·columnFilters 등을 useMemo로 안정화 | 신규 |
| `packages/designer-table/src/propsSchema.ts` | `table` 타입 `PropsSchema` — data(expression), features.*: boolean, features.pagination.pageSize: number, columns: array(ColumnDef) | 신규 |
| `packages/designer-table/src/Table.tsx` | `defineComponent({ type: 'table', group: 'data', ... })`. `useReactTable` 호출 → headerGroups 순회로 멀티헤더 3단 DOM 렌더. state는 `useStableTableState`로 감쌈. header는 `ctx.t(key)` 함수형 전달 | 신규 |
| `packages/designer-table/src/Table.css` | 평문 CSS(`.module.css` 금지). `.fjs-designer-table`, `.fjs-designer-table__thead`, `.fjs-designer-table__th[data-level]` 등 | 신규 |
| `packages/designer-table/src/index.ts` | `DesignerTableModule`(form-js additionalModules factory), `Table`, `TableSchema`/`ColumnDef`/`columnDefToTanstack` public export | 신규 |
| `packages/designer-table/src/__tests__/columnDefToTanstack.test.ts` | 단위 테스트: 1단 flat, 2단 그룹, 3단 그룹, id/accessor 미지정 throw, LocaleKey ctx.t 주입 | 신규 |
| `packages/designer-table/src/__tests__/colspanMath.test.ts` | 3단 예시 spike Demo.tsx 동일 구조 → 기대 rowSpan/colSpan 행렬 일치. 비대칭 트리(얕은 leaf rowSpan=2) | 신규 |
| `packages/designer-table/src/__tests__/Table.test.tsx` | 통합: thead 3개 tr 렌더, LocaleProvider 번역, features.sorting=false 정렬불변, 무한재렌더 방지(≤5 render) | 신규 |
| `packages/designer-table/src/__tests__/defineComponent.contract.test.ts` | defineComponent 계약 검증: type='table', group='data', assertPureRender 통과 | 신규 |
| `vitest.workspace.ts` | packages/designer-table 워크스페이스 등록 추가 | 수정 |

## 진입점 (Entry Points)

N/A — `entry-point: library`. UI 진입 경로(PaletteModule 등록, Live Preview 연동)는 WP-06 TSK-06-02 범위. 본 Task는 form-js `additionalModules`에 `DesignerTableModule`을 전달하는 라이브러리 API만 노출한다.

## 주요 구조
- `columnDefToTanstack(cols: ColumnDef[]): TanStackColumnDef<TRow>[]` — TRD ColumnDef 트리를 TanStack 중첩 ColumnDef로 재귀 변환
- `colspanMath.getExpectedMatrix(cols: ColumnDef[])` — 기대 colSpan/rowSpan 행렬 계산 (QA 게이트)
- `useStableTableState(input)` — preact/compat 무한재렌더 방지용 stable-ref memoization 헬퍼
- `Table` (`defineComponent` 결과) — `useReactTable` → headerGroups 순회 → 3단 멀티헤더 DOM 구성
- `DesignerTableModule` — form-js `additionalModules` 등록용 factory export

## 데이터 흐름
입력: `TableSchema.columns(ColumnDef[])` → `columnDefToTanstack` → TanStack `useReactTable` → `table.getHeaderGroups()` → 3단 `<thead>` DOM(colSpan/rowSpan 자동) + `table.getRowModel().rows` → `<tbody>` plain rows → 출력: 멀티헤더 테이블 DOM

## 설계 결정 (대안이 있는 경우만)

### colSpan/rowSpan 계산 방식
- **결정**: TanStack `useReactTable`에 중첩 columns 트리를 전달해 headerGroup의 colSpan/rowSpan을 위임하고, `colspanMath.ts`로 기대값을 독립 계산해 QA 게이트로 비교
- **대안**: 직접 BFS/DFS로 colSpan·rowSpan을 계산해 DOM에 세팅
- **근거**: TanStack이 이미 검증된 자동 계산 로직을 제공하므로 중복 구현보다 QA 비교로 충분; spike Demo.tsx에서 동작 확인됨

### accessor path escape
- **결정**: `columnDefToTanstack`에서 accessor에 `.` 포함 시 `accessorFn: row => get(row, path)`로 대체
- **대안**: TanStack `accessorKey`에 dot-path를 그대로 전달
- **근거**: TanStack `accessorKey`는 중첩 경로를 지원하지만 특수문자 포함 키에서 예상 외 동작 가능; 명시적 `accessorFn`이 더 안전

## 선행 조건
- TSK-03-03 완료 (designer-core `defineComponent`·`LocaleProvider`·`useT`·`PureRenderProps`·`assertSharedOrigin` 계약 확정)
- `@tanstack/react-table ^8.21.3` npm 설치 가능 확인 (spike 실측 완료)

## 리스크
- HIGH: preact/compat + TanStack `useSyncExternalStore` 무한 루프(spike I1). 완화 — `useStableTableState` 필수 + `Table.test.tsx` 무한재렌더 회귀 가드
- HIGH: accessor에 `.` 포함 경로(예: `'address.city'`) → `accessorKey` 불일치. 완화 — `columnDefToTanstack`이 `.` 감지 시 `accessorFn`으로 자동 대체
- MEDIUM: happy-dom에서 `getComputedStyle`/`ResizeObserver` 미지원 엣지케이스. 완화 — CSS 렌더 검증은 E2E(TSK-05-02)로 이월, 단위 테스트는 DOM 구조만 검증
- LOW: `*.module.css` 혼입. 완화 — root `scripts/ci/no-css-modules.mjs` CI 가드 존재

## QA 체크리스트

- [ ] (정상) `columnDefToTanstack`이 1단 리프만 있는 `ColumnDef[]`를 flat TanStack `ColumnDef[]`로 변환한다
- [ ] (정상) `columnDefToTanstack`이 2단 그룹(개인정보→이름/이메일) 변환 시 그룹 노드에 `columns: [...]`가 포함되고 colSpan=2 기대값과 일치한다
- [ ] (정상) `columnDefToTanstack`이 3단 그룹(개인정보→기본→이름/이메일) 변환 시 중간층에 `columns` 중첩이 올바르게 생성된다
- [ ] (정상) `Table` 렌더 결과 `<thead>`에 3개의 `<tr>`이 존재하고, 최상단 `<th>`의 `colSpan`이 모든 leaf 수와 일치한다
- [ ] (정상) `LocaleProvider` 주입 시 header 텍스트가 `t(key)` 번역 결과와 일치한다
- [ ] (정상) `features.sorting=true`일 때 헤더 클릭으로 정렬 상태가 전환된다
- [ ] (엣지) 리프만 있는 단일단 트리 → `<thead>` `<tr>` 1개, 모든 `<th>`의 `rowSpan=1`
- [ ] (엣지) 비대칭 깊이 트리(한쪽 leaf 3단, 다른쪽 2단) → 얕은 leaf가 `rowSpan=2`
- [ ] (엣지) `accessor`에 `.` 포함(예: `'address.city'`) → `columnDefToTanstack`이 `accessorFn`으로 자동 변환
- [ ] (에러) `id`·`accessor` 둘 다 미지정 ColumnDef → `columnDefToTanstack`이 명시적 에러를 throw한다
- [ ] (에러) state에 새 배열을 매 렌더 전달하는 패턴 → 5회 이하 렌더로 무한재렌더가 발생하지 않는다 (회귀 가드)
- [ ] (통합) `Table`이 `defineComponent({ type:'table', group:'data' }).config`를 올바르게 노출해 form-js `additionalModules` 등록 규약을 충족한다
- [ ] (통합) `DesignerTableModule`을 `ViewerHost additionalModules`에 전달하면 `{ type:'table', ... }` 컴포넌트가 경고 없이 렌더된다
- [ ] (통합) `npm --prefix packages/designer-table run typecheck` 통과 — `TableSchema`/`ColumnDef` 타입이 public export
- [ ] (회귀) `npm --prefix packages/designer-core run test:unit` 기존 케이스 모두 통과 — 본 Task는 designer-core를 수정하지 않음
- [ ] (회귀) root `npm run lint:no-css-modules` 통과 — designer-table에 `*.module.css` 파일 없음
