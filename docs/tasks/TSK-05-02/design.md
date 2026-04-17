# TSK-05-02: 편집·필터·컬럼이동·가상화 - 설계

## 요구사항 확인
- TSK-05-01 에서 골격이 완성되는 `packages/designer-table` 에 **셀 편집 5종(text/number/date/boolean/enum)**, **필터 3종(text/select/range)**, **dnd-kit 컬럼 이동**, **TanStack Virtual 1만 행 가상화**를 추가하여 PRD §4 AC #8 ("테이블 고급 기능: 편집·필터·멀티헤더·컬럼이동") 과 TRD §10 ("1만 행 가상화 스크롤 60fps 유지, 합격선 ≥ 55") 을 충족한다 (phase-1-plan §3.3).
- 모든 구현은 Q2 spike (`packages/designer-core/spike/phase1-q1q2/q2-tanstack/`, FPS 59.99 @ 10k rows) 에서 검증된 패턴 — stable-ref `state`, `useSortable` leaf-only drag, wheel-sim FPS — 을 그대로 이관하되 `TableSchema`/`ColumnDef` (TRD §5.1) 계약을 외부 인터페이스로 유지한다.
- 게이트: `npm --prefix packages/designer-table run test:unit` + `test:e2e` → 단위(필터 pred/편집 토글/reorder reducer) + E2E 4종(`table.editing`, `table.filter`, `table.reorder`, `table.virtualization`) 전부 통과, 특히 `table.virtualization.spec.ts` 가 **FPS ≥ 55** 를 측정으로 재확인한다 (headless 측정만으로 보고 금지, visible Playwright 병행 필수 — `feedback_e2e_browser_verify` 메모리 룰).

## 타겟 앱
- **경로**: `packages/designer-table` (모노레포 라이브러리 패키지. TSK-05-01 에서 신규 생성됨을 전제).
- **근거**: phase-1-plan §3.3 파일 체크리스트는 모든 셀/필터/dnd 모듈을 `packages/designer-table/src/` 하위로 지정. E2E spec 도 `packages/designer-table/e2e/table.*.spec.ts` 로 고정. designer-editor-host 팔레트 등록·LivePreview 통합은 TSK-06-01/TSK-06-02 범위(본 Task 외, 연계 확인만 수행).

## 구현 방향
- `Table.tsx`(TSK-05-01 에서 생성된 베이스) 를 확장하여 (a) 행 렌더를 **TanStack Virtual** 로 교체, (b) `cells/` 5개 모듈을 cell renderer 로 바인딩, (c) `filters/` 3개 모듈을 column filter UI 로 바인딩, (d) `dnd/` 모듈로 leaf header 만 드래그 가능하게 래핑.
- `TableSchema.features.{editing,filtering,virtualization,columnReorder}` 플래그로 **모든 신규 기능이 기본 off 로 하위호환**(TSK-05-01 기본 렌더 회귀 방지). 플래그 off 시 해당 hook/컴포넌트는 import만 되고 실제로는 no-op 렌더(`features.editing===false` → `editable:true` 컬럼도 read-only 셀로 렌더).
- 상태 관리: spike I1 원칙 — `state: { columnFilters, columnOrder, editingCell }` 는 모두 `useMemo`/`useState` stable-ref. 안전한 setter 제공. 편집 state 는 `{ rowIndex, columnId, draftValue }` 1 슬롯만 유지(셀 1개 inline edit 모델, Excel 스타일 다중 편집은 Phase 2+).
- 가상화: `useVirtualizer({ count, estimateSize:36, overscan:6, getScrollElement })` 로 viewport 내 행만 렌더. `columnVirtualizer` 는 phase 1 범위 외(컬럼 수 ≤ 30 가정, TRD §5.1). `table.virtualization.spec.ts` 는 Q2 spike `startFpsMeasurement` 를 재사용한 wheel-sim + visible Playwright 병행 측정.
- i18n: 편집 placeholder, 필터 "모두 보기" 등 신규 가시 문자열 전부 `t('designer-table.*')` 키 사용. ko 사전 엔트리는 본 Task PR 에서 함께 추가(TSK-07-02 가 build-time diff 게이트 — 누락 시 빌드 실패).

## 파일 계획

**경로 기준:** 모든 파일 경로는 **프로젝트 루트 기준**이다.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-table/src/Table.tsx` | TSK-05-01 골격 확장. (a) `useVirtualizer` 통합, (b) `features.editing/filtering/columnReorder` 분기로 하위 훅 활성화, (c) `editingCell` state + `commit/cancel` 핸들러 추가. | 수정 |
| `packages/designer-table/src/types.ts` | `CellRenderContext`, `FilterRenderContext`, `EditingCellState`, `ColumnReorderContext` 타입 추가. `ColumnDef.editable?`/`filter?` 가 런타임 분기 키임을 주석 명시(기존 타입은 TSK-05-01에서 이관). | 수정 |
| `packages/designer-table/src/cells/TextCell.tsx` | `<input type="text">` inline editor (editing state 시), 읽기 모드에서는 `<span>{value}</span>`. `onCommit(value)` / `onCancel()` 인터페이스. | 신규 |
| `packages/designer-table/src/cells/NumberCell.tsx` | `<input type="number">` + `min/max/step` 지원(`column.meta?.numberConstraints`). blur/Enter commit, Escape cancel. `Intl.NumberFormat` 로케일 포맷팅. | 신규 |
| `packages/designer-table/src/cells/DateCell.tsx` | `<input type="date">` inline editor. `Intl.DateTimeFormat` ko-KR 표시(`designer-i18n` 어댑터 없으면 fallback). ISO 날짜 문자열만 허용. | 신규 |
| `packages/designer-table/src/cells/BooleanCell.tsx` | `<input type="checkbox">` inline. 공백 문자("—") vs "✓" 표시. 즉시 commit(편집 모드 전환 없이). | 신규 |
| `packages/designer-table/src/cells/EnumCell.tsx` | `<select>` inline. `column.meta?.enum: {value, label}[]`. 키보드 ↑↓ Enter 지원. | 신규 |
| `packages/designer-table/src/cells/index.ts` | 5 셀 barrel + `BUILTIN_CELL_RENDERERS: Record<ColumnDef.type, CellRenderer>` 맵. | 신규 |
| `packages/designer-table/src/cells/useCellEdit.ts` | 편집 state 훅 — `{editingCell, beginEdit(row,col), commit(value), cancel(), isEditing(row,col)}`. keydown 핸들러 중앙화. | 신규 |
| `packages/designer-table/src/filters/TextFilter.tsx` | `<input type="text">` + debounce 200ms. TanStack `filterFn:'includesString'` + 커스텀 case-insensitive predicate. | 신규 |
| `packages/designer-table/src/filters/SelectFilter.tsx` | `<select>` 단일 선택. 옵션은 `column.meta?.selectOptions` 또는 데이터에서 unique 값 자동 수집. 기본값 "모두 보기"(i18n: `designer-table.filter.all`). | 신규 |
| `packages/designer-table/src/filters/RangeFilter.tsx` | `[<input type="number">, <input type="number">]` min/max 2개. `filterFn:'inNumberRange'`. 빈값은 경계 해제. | 신규 |
| `packages/designer-table/src/filters/index.ts` | 3 필터 barrel + `BUILTIN_FILTER_RENDERERS: Record<ColumnDef.filter, FilterRenderer>` 맵. | 신규 |
| `packages/designer-table/src/filters/filterFns.ts` | TanStack `filterFns` 확장 — `text`(includes, case-insensitive), `select`(strict equal), `range`([min,max] inclusive) 3 종 pure predicate. 단위 테스트에서 직접 import. | 신규 |
| `packages/designer-table/src/dnd/ColumnDragHandle.tsx` | `useSortable({ id: columnId })` 래퍼. `attributes`/`listeners` spread + transform 스타일 적용. leaf header 내부에서만 렌더(group header 는 drag 비활성). | 신규 |
| `packages/designer-table/src/dnd/useColumnReorder.ts` | `DndContext` + `SortableContext`(leaf IDs only) + `onDragEnd` reducer. `setColumnOrder(prev => moveItem(prev, activeId, overId))` 순수 함수. | 신규 |
| `packages/designer-table/src/dnd/moveItem.ts` | pure reducer `moveItem(order: string[], from: string, to: string): string[]`. TSK 단위 테스트의 핵심 예측 유닛. | 신규 |
| `packages/designer-table/src/virtualization/useRowVirtualizer.ts` | `useVirtualizer` 래퍼 — `count`, `estimateSize=36`, `overscan=6`, `measureElement` 포함. viewport height props 로 주입 가능. | 신규 |
| `packages/designer-table/src/virtualization/VirtualRows.tsx` | viewport 렌더 컴포넌트. `paddingTop/paddingBottom` 계산 + 절대 포지셔닝 행. 키보드 포커스 시 auto-scroll(`scrollToIndex`). | 신규 |
| `packages/designer-table/src/index.ts` | `Table` + 5 셀/3 필터 public export + 타입 재-export(`BUILTIN_CELL_RENDERERS`, `BUILTIN_FILTER_RENDERERS`, `moveItem`). | 수정 |
| `packages/designer-table/package.json` | ① `dependencies` 에 `@tanstack/react-virtual@^3`, `@dnd-kit/core@^6`, `@dnd-kit/sortable@^8`, `@dnd-kit/utilities@^3` 추가 (TSK-05-01 에 `@tanstack/react-table` 만 있을 경우). 모두 MIT — TRD §3 라이선스 게이트 통과. ② `exports` 에 `"./cells"`, `"./filters"` 서브패스 추가(호스트 앱 selective import용). | 수정 |
| `packages/designer-table/src/__tests__/moveItem.test.ts` | `moveItem` 순수 reducer 8 케이스(정상 이동, 같은 위치, 양끝, 존재하지 않는 id). | 신규 |
| `packages/designer-table/src/__tests__/filterFns.test.ts` | `text/select/range` 각 predicate 9 케이스(빈값/대소문자/경계). | 신규 |
| `packages/designer-table/src/__tests__/useCellEdit.test.ts` | 편집 state 훅 — begin/commit/cancel/재진입/Escape 키 동작(`renderHook`). | 신규 |
| `packages/designer-table/src/__tests__/cells.test.tsx` | 5 셀 × {read, edit, commit, cancel} 20 케이스 `@testing-library/preact` 매트릭스. | 신규 |
| `packages/designer-table/src/__tests__/filters.test.tsx` | 3 필터 × {render, change, debounce/boundary} 9 케이스. | 신규 |
| `packages/designer-table/src/__tests__/Table.editing.test.tsx` | 통합: `features.editing=true` 인 Table 에서 셀 클릭 → inline input → Enter commit → `onChange` 호출. | 신규 |
| `packages/designer-table/src/__tests__/Table.filter.test.tsx` | 통합: 3 필터 연동 시 `getFilteredRowModel` 결과 행 수 변화 검증. | 신규 |
| `packages/designer-table/e2e/table.editing.spec.ts` | Playwright 5 케이스 — 셀 5종 각각 클릭 → 입력/선택 → 커밋 → DOM/value 반영 확인. **메뉴 클릭 경로**(팔레트 "Table" 드래그 → 캔버스 드롭 → 편집 모드) 포함, `page.goto(baseUrl)` 후 URL 직접 탐색 금지. | 신규 |
| `packages/designer-table/e2e/table.filter.spec.ts` | Playwright 3 케이스 — text/select/range 각각 입력 → 행 수 감소 확인. | 신규 |
| `packages/designer-table/e2e/table.reorder.spec.ts` | Playwright 2 케이스 — dnd-kit drag (`page.mouse.move` + `down/up` 시퀀스) 로 leaf 컬럼 순서 바꾸고 header text 순서 assert. | 신규 |
| `packages/designer-table/e2e/table.virtualization.spec.ts` | Playwright perf spec — 10,000 행 fixture 로드 → `startFpsMeasurement(scrollContainer)` 호출 → 3초 auto-scroll → `window.__spikeFps ≥ 55` 단언. **headless + visible 두 브라우저 모드** 모두에서 실행(메모리 룰 `feedback_e2e_browser_verify`). 측정 방법은 Q2 spike `measure-fps.ts` 스타일을 본 패키지 `e2e/_fps.ts` 로 이관. | 신규 |
| `packages/designer-table/e2e/_fps.ts` | `startFpsMeasurement` 헬퍼 이관. `window.__fps` 에 저장. | 신규 |
| `packages/designer-table/e2e/fixtures/rows-10k.ts` | 10,000 행 고정 시드 생성기(spike `data.ts` 기반, `generateRows(10000, seed=42)`). | 신규 |
| `packages/designer-table/playwright.config.ts` | `testDir: './e2e'`, `webServer: npm run dev:e2e` (designer-editor-host dev server 5173 재사용). timeout 60s(perf spec 대응). | 수정(또는 TSK-05-01 에서 신규) |
| `packages/designer-i18n/locales/ko.json` | 신규 키 추가: `designer-table.cell.edit.placeholder`, `designer-table.filter.all`, `designer-table.filter.text.placeholder`, `designer-table.filter.range.min`, `designer-table.filter.range.max`, `designer-table.dnd.handle.aria`. 최소 6개. | 수정 |
| `packages/designer-editor-host/src/App.tsx` | 라우터/루트 컴포넌트(단일 페이지). 본 Task 의 Table 컴포넌트가 렌더되는 상위 페이지. E2E `page.goto('/')` 진입점. **코드 수정은 TSK-06-01 범위**(여기서는 연결 확인 파일로만 기록). | — (참조·무수정) |
| `packages/designer-editor-host/src/modules/PaletteModule.ts` | 팔레트 내비게이션 — Table 컴포넌트의 `features.editing/filtering/columnReorder/virtualization` 토글을 propsSchema `boolean` 위젯으로 노출. **코드 수정은 TSK-06-01 범위**(여기서는 Table 공개 props 의 consume 계약만 기록). | — (참조·무수정) |

> `domain=frontend` 이지만 **entry-point=library**(비-페이지 UI 공통 컴포넌트). 라우터/메뉴 파일 수정 주체는 TSK-06-01 이지만, E2E 연결 확인을 위해 **참조·무수정**으로 본 표에 명시한다(dev-test reachability gate 근거). 위 2행은 본 Task 에서 파일을 수정하지 않으며, 본 Task 의 산출물은 `packages/designer-table/src/index.ts` 의 public export 를 통해 TSK-06-01 이 consume 한다.

## 진입점 (Entry Points)

**도메인**: `frontend`, **entry-point**: `library` — 비-페이지 UI(공통 컴포넌트). 본 Task 는 Table 컴포넌트 라이브러리 자체를 만들고, 상위 페이지(`designer-editor-host` 의 에디터 캔버스) 에서 팔레트 드래그·드롭으로 소비됨.

- **사용자 진입 경로**: `designer-editor-host dev server (/) 진입 → 좌측 팔레트에서 'Table' 항목 드래그 → 중앙 캔버스에 드롭 → 캔버스에 렌더된 Table 셀 클릭(편집) / 헤더 필터 입력 / 헤더 핸들 드래그(이동) / 스크롤(가상화)`
- **URL / 라우트**: `http://localhost:5173/` (designer-editor-host dev server, 단일 페이지. 에디터 캔버스는 URL 변경 없음)
- **수정할 라우터 파일**: **본 Task 에서는 없음**. 라우터는 단일 페이지(`packages/designer-editor-host/src/App.tsx`) 이며 TSK-06-01 에서 관리. 본 Task는 `Table` 컴포넌트 export 만 수정.
- **수정할 메뉴·네비게이션 파일**: **본 Task 에서는 없음**. 팔레트 등록(`packages/designer-editor-host/src/modules/PaletteModule.ts` 의 `paletteEntries` 배열) 은 TSK-06-01 범위. 본 Task 는 Table 이 노출해야 할 props/meta 계약을 `packages/designer-table/src/index.ts` public API 로 확정하여 TSK-06-01 이 참조할 수 있게 한다.
- **연결 확인 방법 (E2E)**:
  - `table.editing.spec.ts`: 팔레트 `[data-palette-entry="table"]` 클릭·드래그 → 캔버스 `[data-canvas-drop]` 드롭 → 렌더된 테이블 `[data-testid="designer-table"]` 첫 셀 클릭 → input 노출 → 타이핑 → Enter → 셀 텍스트 반영. `page.goto('/')` 후 모든 네비게이션은 클릭으로만 수행(URL 직접 조작 금지 — `feedback_e2e_browser_verify` 룰).
  - `table.virtualization.spec.ts`: 동일 경로로 Table 로드(10k 행 fixture prop 주입) → 스크롤 container 에 FPS 측정 → visible 브라우저에서도 반복 실행(headless 단독 측정만으로 완료 보고 금지).

> **비-페이지 UI 규정** (template 68-69행): 적용될 상위 페이지 = `designer-editor-host` 의 `/` 에디터 페이지. 해당 페이지 E2E 에서 Table 컴포넌트 렌더링과 4대 상호작용(편집/필터/이동/스크롤) 이 모두 동작함을 검증한다.

## 주요 구조

- **`Table.tsx` (확장, TSK-05-01 베이스)**
  - props: `schema: TableSchema`, `data: unknown[]`, `onChange?: (rowIndex, columnId, newValue) => void`.
  - internal state: `sorting`, `columnOrder`(기존, TSK-05-01), 신규 `columnFilters`, `editingCell: EditingCellState | null`.
  - flow: `features.editing` 이면 `useCellEdit` 활성 → 셀 클릭 시 `beginEdit` → Enter/blur 시 `onChange` 호출 + `commit`. `features.filtering` 이면 `getFilteredRowModel` 등록. `features.columnReorder` 이면 `<DndContext>` + leaf `<SortableContext>` 래핑. `features.virtualization` 이면 row 렌더를 `<VirtualRows>` 로 교체.

- **`cells/*` (5 셀 renderer)**
  - 공통 계약: `(info: CellContext<TRow,TValue>, edit: CellEditAPI) => JSX.Element`. `edit.isEditing` 이면 editor, 아니면 formatted value.
  - commit 트리거: blur, `keydown Enter`(TextCell/NumberCell/DateCell), change 즉시(BooleanCell/EnumCell).
  - cancel 트리거: `keydown Escape`, ESC 시 draft 폐기 후 `edit.cancel()` 호출.
  - 포커스: `beginEdit` 시 `inputRef.current?.focus()` auto-focus (useEffect + cleanup).

- **`filters/*` (3 필터 renderer)**
  - 공통 계약: `(column: Column<TRow,TValue>) => JSX.Element`. 내부적으로 `column.setFilterValue(v)` 호출.
  - `TextFilter`: debounce 200ms(setTimeout + clearTimeout). 빈값 → filter 해제.
  - `SelectFilter`: 옵션 소스 우선순위 `column.meta.selectOptions` > `getFacetedUniqueValues()`.
  - `RangeFilter`: `[min, max]` 둘 중 하나만 있어도 반대 경계 무제한.

- **`filters/filterFns.ts` (pure predicates)**
  - `text`: `String(v).toLowerCase().includes(String(filter).toLowerCase())`. null/undefined → false.
  - `select`: `v === filter`. `filter===''` 또는 `undefined` → pass-through.
  - `range`: `filter=[min,max]`. `min==null ? -∞ : min ≤ v` 및 `max==null ? +∞ : v ≤ max`. 두 값 모두 null → pass-through.

- **`dnd/useColumnReorder.ts` (훅)**
  - 반환: `{ sensors, onDragEnd, SortableWrapper: ({children}) => <SortableContext items={leafIds} strategy={horizontalListSortingStrategy}>{children}</SortableContext> }`.
  - `onDragEnd`: active/over 추출 → `setColumnOrder(moveItem(prev, active, over))`.
  - `moveItem`: `splice` 기반 순수 reducer. leaf 만 이동, group header 불변.

- **`virtualization/useRowVirtualizer.ts` + `VirtualRows.tsx`**
  - `useVirtualizer` 를 `parentRef`/`count`/`estimateSize=36` 으로 구성.
  - `VirtualRows` 는 `rowVirtualizer.getVirtualItems()` 를 `paddingTop/paddingBottom` 로 래핑한 절대 포지셔닝 `<div.tr>` 배열 렌더.
  - `features.virtualization===false` 시 `<VirtualRows>` 대신 `table.getRowModel().rows.map(...)` 일반 렌더(회귀 안전).

## 데이터 흐름

1. `TableSchema` (`columns` 트리, `data` 표현식, `features` 플래그) + raw rows 입력
2. TSK-05-01 `columnDefToTanstack` → flat TanStack `ColumnDef[]` → `useReactTable({ state: stable refs, getCore/Sorted/FilteredRowModel })`
3. `features.filtering` 시 헤더마다 `BUILTIN_FILTER_RENDERERS[column.columnDef.filter]` 로 UI 렌더 → 사용자 입력 → `column.setFilterValue` → 재계산된 rows
4. `features.editing` 시 cell 별 `BUILTIN_CELL_RENDERERS[column.columnDef.type]` 렌더 → 클릭 → `useCellEdit.beginEdit` → commit 시 `props.onChange(rowIdx, colId, newVal)` → 상위가 `data` 갱신 → 재렌더
5. `features.columnReorder` 시 dnd leaf → `moveItem` reducer → `setColumnOrder`
6. `features.virtualization` 시 `useRowVirtualizer` 가 viewport rows 만 추출 → `VirtualRows` 가 top/bottom padding 합쳐 가상 스크롤 구현 → FPS ≥ 55

## 설계 결정 (대안이 있는 경우만)

- **결정 1**: 셀 편집 state 를 Table 내 1 슬롯(`editingCell: {rowIndex, columnId, draft}`) 으로 유지.
  - **대안**: 셀마다 로컬 state(`useState`) + 부모는 commit 콜백만.
  - **근거**: Escape 시 draft 일괄 폐기와 keyboard tab-move(우측 셀로 편집 이동, Phase 2 확장) 를 중앙화하기 쉬움. 메모리 오버헤드 미미(1 슬롯). 셀 렌더는 `info.row.index === editingCell?.rowIndex && info.column.id === editingCell?.columnId` 체크로 순수 분기.

- **결정 2**: 필터 predicate 를 TanStack 내장 `filterFns` 대신 **자체 `filterFns.ts` 에 재정의**(wrapper).
  - **대안**: TanStack `filterFns.includesString`, `filterFns.inNumberRange` 직접 사용.
  - **근거**: 단위 테스트(9 케이스) 에서 TanStack 내부를 mock 하지 않고 pure function 직접 호출 가능. Q2 spike I1 원칙(안정 ref) 과도 일치 — 함수는 module-scope 상수라 매 렌더 동일 ref. 또한 case-insensitive 기본화(한국어 검색 UX) 와 null-safe 처리를 명시적으로 통제.

- **결정 3**: dnd 는 **leaf header 전용** (group header drag 비활성).
  - **대안**: 모든 header 레벨 drag 가능.
  - **근거**: Q2 spike 검증 방식과 동일. 트리 구조 컬럼에서 group 을 옮기면 자식 leaf 들이 함께 이동해야 하는데 `moveItem` 가 복잡해지고 (flat array reducer 로 표현 불가) TanStack `columnOrder` 가 leaf ID 배열이므로 UX·구현·테스트 모두 leaf 만이 자연스럽다. group reorder 는 Phase 2 로 명시 연기.

- **결정 4**: 가상화는 **행 축만**(column virtualization 미적용).
  - **대안**: `useVirtualizer` 를 column 축에도 적용 (`estimateSize` px 기반).
  - **근거**: TRD §5.1 컬럼 수 가정 ≤ 30. 행 가상화만으로 10k 행 FPS 60 달성 증명(Q2 spike). column virtualization 추가 시 header sticky/colspan 계산이 복잡해지고 multiheader 렌더 회귀 리스크가 높아 Phase 1 범위 밖. RSK-MEDIUM 으로 별도 기록.

- **결정 5**: FPS 측정 헬퍼는 Q2 spike `measure-fps.ts` 를 **e2e/_fps.ts 로 이관**(재구현이 아닌 이관).
  - **대안**: Playwright `page.evaluate(() => performance.now())` 기반 새로 작성.
  - **근거**: Q2 spike 가 이미 PD1-A 확정 근거로 사용한 측정 방식 — 동일 컨트랙트 유지 시 "재확인"(WBS acceptance 문구) 의미가 명확. ADR-0003 Q2 의사결정에 FPS 측정 방법이 문서화되어 있어 방법 변경 시 ADR 갱신 필요, 불필요한 ADR 움직임 방지.

## 선행 조건

- **TSK-05-01** 완료 전제 — `packages/designer-table/` 패키지 초기화, `Table.tsx` 골격, `columnDefToTanstack`, 멀티헤더 3단 렌더, `TableSchema`/`ColumnDef` 타입(`types.ts`) 기 이관. 본 Task 는 모두 이 구조를 **확장**만 한다.
- TSK-03-03 완료 (`defineComponent` + ViewerHost/EditorHost, LocaleProvider) — Table 컴포넌트는 `defineComponent` 로 등록되며 i18n `t()` 주입은 LocaleProvider 경유.
- TSK-04-02 완료(designer-i18n ko.json + t 헬퍼) — 신규 6개 키 반영 지점. 없으면 fallback 문자열로 degrade(테스트 가드: `designer-table.filter.all` 미존재 시 `'모두'` fallback, build-time diff 게이트는 TSK-07-02 가 담당).
- 신규 외부 의존성: `@tanstack/react-virtual@^3` (MIT), `@dnd-kit/core@^6` (MIT), `@dnd-kit/sortable@^8` (MIT), `@dnd-kit/utilities@^3` (MIT). 모두 TRD §3 허용 목록에 명시. preact/compat alias 는 TSK-05-01 에서 설정 완료 전제.

## 리스크

- **HIGH** — `table.virtualization.spec.ts` FPS 측정이 CI headless 환경에서 flakey 할 가능성. Q2 spike 에서 59.99 확보했지만 CI runner 가 저사양(예: 2 vCPU)일 경우 < 55 로 떨어질 수 있음. **완화**: ① 로컬 visible 브라우저 + CI headless 2 측정을 모두 수행(`feedback_e2e_browser_verify` 룰), ② 3 회 측정 중앙값 사용, ③ CI 전용 threshold 는 하드 55 로 고정하되 2 회 retry 허용, ④ 실패 시 즉시 실측(Playwright HAR + screenshot) 아티팩트 첨부.

- **HIGH** — preact/compat 에서 `state` 비-stable ref 인한 무한 렌더 루프 재발(Q2 spike I1). **완화**: ① 본 Task 코드 전반에 `state`/`state.*` 로 넘기는 모든 객체를 `useMemo` 로 래핑, ② PR 에서 "state stable ref audit" 체크 1항 추가, ③ `__tests__/Table.editing.test.tsx`/`Table.filter.test.tsx` 에 렌더 카운트 단언(`renders ≤ 3` per user action) 포함하여 루프 회귀 즉시 탐지.

- **MEDIUM** — dnd-kit `PointerSensor` 가 happy-dom 에서 완전 동작하지 않음(`setPointerCapture` 등 미구현). **완화**: ① 단위 테스트는 `moveItem` pure reducer 에 집중(dnd DOM 이벤트는 unit 에서 mock), ② leaf drag 인터랙션은 Playwright E2E 에서만 검증(`page.mouse.move/down/up` 시퀀스), ③ happy-dom `useSortable` 렌더는 "비-drag 상태 DOM 구조만" 검증.

- **MEDIUM** — 편집 중 외부 `data` prop 이 갱신되면 draft 유실. **완화**: ① `editingCell` 이 null 아닐 때 `data` 변경 감지되면 draft 보존한 채 `rowIndex` 재맵핑(컬럼 ID + row ID 페어). ② QA 체크리스트 에 "편집 중 data hot-update → draft 유지" 1항 추가.

- **MEDIUM** — `DateCell` 이 브라우저 date picker native 동작(Chromium vs Firefox) 차이로 E2E flakey. **완화**: ① Playwright 는 Chromium 고정(phase-1 config), ② 직접 타이핑(`page.fill('input[type=date]', '2026-04-17')`) 으로 picker popup 의존 배제.

- **LOW** — 10k 행 fixture 로드 시간이 webServer 기동을 압박할 수 있음. **완화**: fixture 를 lazy-generate (`generateRows(10000, seed=42)` 를 첫 render 직전 `useMemo` 1회만 실행) + Playwright `timeout: 60_000`.

- **LOW** — 신규 ko.json 키 6개 누락 시 TSK-07-02 build-time diff 가 실패 유발. **완화**: 본 Task PR 에 ko.json 수정을 반드시 동봉하고, PR 템플릿에 "i18n key added" 체크박스 확인.

- **LOW** — `EnumCell` 에서 `<select>` 가 기본 포커스 링 없이 렌더되어 접근성 경고(axe-core rule `aria-select-name`). **완화**: `aria-label={column.columnDef.header}` 명시적 주입 + WCAG 2.2 AA 체크 Playwright axe 실행 시 예외 처리.

## QA 체크리스트

dev-test 단계에서 검증할 항목. 각 항목은 pass/fail 로 판정 가능해야 한다.

- [ ] (정상) `npm --prefix packages/designer-table run test:unit` → 단위 테스트 전부 통과. `moveItem.test.ts` 8 + `filterFns.test.ts` 9 + `useCellEdit.test.ts` 5 + `cells.test.tsx` 20 + `filters.test.tsx` 9 = **51 케이스 이상** 통과. 케이스 수 assert 포함.
- [ ] (정상) TextCell 이 `features.editing=true` + `editable:true` + `type:'text'` 컬럼 셀에서 클릭 시 `<input type="text">` 렌더, 타이핑 후 Enter → `onChange(rowIdx, colId, newValue)` 1회 호출.
- [ ] (정상) NumberCell 이 `min=0 max=100 step=1` 메타로 validate 후, `-1` 입력 commit 시 `onChange` 호출 안 되고 `errors` 콜백(혹은 inline 표시).
- [ ] (정상) DateCell 이 ISO 문자열(`'2026-04-17'`) 입력 commit 시 `onChange` 로 ISO 문자열 그대로 전달(Date 객체 변환 X, FEEL 표현식 파이프라인 일관성).
- [ ] (정상) BooleanCell 체크 토글 시 즉시(별도 편집 모드 없이) `onChange(row, col, !prev)` 호출, 표시가 `✓` ↔ `—` 로 전환.
- [ ] (정상) EnumCell select 변경 → `onChange(row, col, selectedValue)` 호출. `aria-label` 이 컬럼 헤더와 일치.
- [ ] (정상) TextFilter 에 `'김'` 입력 → 200ms 후 `column.setFilterValue('김')` 1회 호출, `getFilteredRowModel().rows.length` 감소.
- [ ] (정상) SelectFilter "모두 보기" → 필터 해제, 특정 옵션 선택 → 해당 값만 필터링.
- [ ] (정상) RangeFilter `[min=50, max=80]` → filter 행이 모두 50 ≤ value ≤ 80 범위 내.
- [ ] (정상) dnd leaf column drag → drop → `columnOrder` state 가 `moveItem(prev, active, over)` 결과와 일치. 헤더 DOM 순서 즉시 변경.
- [ ] (정상) 10,000 행 + `features.virtualization=true` 시 `document.querySelectorAll('[data-row-index]').length ≤ overscan_window + viewport_rows` (≈ 30 이내, 전량 렌더되지 않음 증명).
- [ ] (정상) `features.virtualization=false` 시 모든 행이 실제 DOM 에 렌더(회귀: 소량 행 테이블은 가상화 off 여도 정상).
- [ ] (엣지) 빈 데이터(`rows=[]`) + 편집/필터/reorder 모두 on → 크래시 없음, 빈 tbody 렌더.
- [ ] (엣지) 단일 컬럼(leaf 1개) 에서 dnd drag 시도 → no-op (active === over), 에러 없음.
- [ ] (엣지) RangeFilter min 만 입력(max 빈값) → max 무제한으로 동작. 양쪽 빈값 → filter 해제.
- [ ] (엣지) 편집 중 Escape → draft 폐기, `onChange` 호출 안 됨, 셀 값 기존 유지.
- [ ] (엣지) 편집 중 외부 `data` prop 갱신 → 현재 편집 셀의 row/col ID 가 새 데이터에도 존재하면 draft 유지, 아니면 `cancel` 자동 호출.
- [ ] (에러) 알 수 없는 `column.type` ("email" 등) → `BUILTIN_CELL_RENDERERS[type]` 미매칭 시 `TextCell` fallback 렌더(throw 금지), dev-only `console.warn`.
- [ ] (에러) 알 수 없는 `column.filter` ("regex" 등) → 필터 UI 미렌더(header 만 표시), dev-only warn.
- [ ] (에러) `features.editing=false` 인 상태에서 `editable:true` 컬럼 셀 클릭 → 편집 모드 진입 안 됨(읽기 전용 고정).
- [ ] (통합) `Table.editing.test.tsx` — Table 에 editing=true 로 렌더 후 각 셀 5종 시나리오 → `onChange` 호출 카운트·인자 검증.
- [ ] (통합) `Table.filter.test.tsx` — 3 필터 연동 시 `getFilteredRowModel().rows.length` 변화 3단계(min→중간→max filter) 검증.
- [ ] (통합) `import { Table, BUILTIN_CELL_RENDERERS, BUILTIN_FILTER_RENDERERS, moveItem } from '@form-js-designer/designer-table'` 타입 포함 resolve (`npm --prefix packages/designer-table run typecheck` 통과).
- [ ] (회귀) TSK-05-01 단위 테스트(골격/columnDefToTanstack/multiheader colspan) 전부 통과 — 본 Task 변경이 골격을 깨뜨리지 않음.
- [ ] (회귀) `state` 항목 stable-ref 오딧 — Table.tsx 의 `useReactTable({ state: {...} })` 내부 모든 값이 `useState`/`useMemo` 결과임을 code review에서 확인.

**fullstack/frontend Task 필수 항목 (E2E 테스트에서 검증 — dev-test reachability gate):**
- [ ] (클릭 경로) 메뉴/사이드바/버튼을 클릭하여 목표 페이지에 도달한다 (URL 직접 입력 금지)
- [ ] (화면 렌더링) 핵심 UI 요소가 브라우저에서 실제 표시되고 기본 상호작용이 동작한다

**E2E 매트릭스 (phase-1-plan §5.4 기준, AC #8 총 13 케이스 중 본 Task 분 10):**
- [ ] `table.editing.spec.ts` — 5 케이스(5 셀 타입) 통과, 클릭 경로는 팔레트 드래그 → 캔버스 드롭 → 편집 (URL 직접 입력 금지).
- [ ] `table.filter.spec.ts` — 3 케이스(3 필터 타입) 통과.
- [ ] `table.reorder.spec.ts` — 2 케이스(left-to-right, right-to-left leaf 이동) 통과.
- [ ] `table.virtualization.spec.ts` — FPS ≥ 55 단언, **headless + visible 두 모드 모두 통과**(feedback_e2e_browser_verify 룰). 3회 측정 중앙값 55 이상.
