# table-form-js-defaults: 설계

## 요구사항 확인

- `TableComponent.create()` 가 반환하는 초기 시드에 `columns: []` 대신 form-js 원본과 동일한 3개 기본 컬럼(ID/Name/Date)을 포함시킨다.
- 디자이너 캔버스 프리뷰에서 `value`(런타임 데이터)가 없을 때 `tbody`에 데모 3행(`John Doe`, `Erika Muller`, `Dominic Leaf`)이 표시되도록 render 단계 fallback을 추가한다.
- 사용자가 컬럼을 변경하면 데모 데이터는 새 컬럼 키와 일치하는 경우에만 유지되고, 불일치 시 자동 소거된다.

## 타겟 앱

- **경로**: `packages/designer-table`
- **근거**: `TableComponent` 정의(`Table.tsx`)와 관련 타입·테스트가 이 패키지에 집중되어 있으며, 변경 범위가 이 패키지로 국한된다.

## 구현 방향

1. `packages/designer-table/src/demoData.ts` 신규 파일에 `DEFAULT_COLUMNS` 상수, `DEMO_ROWS` 상수, `shouldUseDemoData` 순수 함수를 정의한다.
2. `Table.tsx`의 `create()` 함수에서 `columns: []` 를 `columns: [...DEFAULT_COLUMNS]` (얕은 복사)로 교체한다.
3. `TableRender`에서 `data` 결정 로직에 fallback 조건을 추가한다: `rawData.length === 0 && shouldUseDemoData(field.columns ?? [])` 이면 `DEMO_ROWS` 사용.
4. `Table.create.test.ts` 단위 테스트를 신규 작성하여 `create()` 반환값과 `shouldUseDemoData` 가드를 검증한다.
5. E2E `editor.dragdrop.spec.ts`의 table 드롭 케이스에 3 컬럼 헤더 + tbody 행 가시성 어서션을 추가한다.

## 파일 계획

**경로 기준:** 모든 파일 경로는 프로젝트 루트 기준으로 작성한다.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-table/src/demoData.ts` | `DEFAULT_COLUMNS` 상수, `DEMO_ROWS` 상수, `shouldUseDemoData` 가드 함수 | 신규 |
| `packages/designer-table/src/Table.tsx` | `create()` 기본 컬럼 시드 교체 + `TableRender` 데모 fallback 로직 | 수정 |
| `packages/designer-table/src/__tests__/Table.create.test.ts` | `TableComponent.create()` 반환값 및 `shouldUseDemoData` 단위 테스트 | 신규 |
| `packages/designer-editor-host/e2e/editor.dragdrop.spec.ts` | table 드롭 후 3 컬럼 헤더 + tbody 행 E2E 어서션 추가 | 수정 |

## 진입점 (Entry Points)

- **사용자 진입 경로**: editor-host 개발 서버(`http://localhost:5173/`) 접속 → 좌측 Palette "Presentation" 그룹 → `테이블` 아이템 드래그 → 캔버스 중앙에 드롭
- **URL / 라우트**: `http://localhost:5173/` (packages/designer-editor-host dev server)
- **수정할 라우터 파일**: 해당 없음 — 기존 `App.tsx`가 단일 페이지이므로 라우트 추가 불필요
- **수정할 메뉴·네비게이션 파일**: 해당 없음 — Palette 등록은 `TableComponent.config.group = 'presentation'` 선언으로 이미 자동 처리됨
- **연결 확인 방법**: E2E 에서 `.fjs-palette-field[data-field-type="table"]` 드래그 → 캔버스 드롭 → `[data-testid="designer-table"] thead th` 내 "ID"/"Name"/"Date" 텍스트 가시성 확인 → `tbody tr` 1개 이상 존재 확인

## 주요 구조

- **`demoData.ts` / `DEFAULT_COLUMNS`**: form-js 원본 3 컬럼을 우리 `ColumnDef` 스키마로 표현한 상수. 각 항목은 `{ id, header, accessor, type: 'text' }` 구조이며 `accessor === id` (form-js `key` 와 동일 사용).
- **`demoData.ts` / `DEMO_ROWS`**: form-js `generateInitialDemoData` 반환값과 동일한 3행 객체 배열.
- **`demoData.ts` / `shouldUseDemoData(columns)`**: `extractLeafIds` 패턴으로 리프 컬럼의 `accessor ?? id` 를 수집하고, 전부 `DEMO_ROWS[0]` 의 key 집합에 포함될 때만 `true` 를 반환하는 순수 함수.
- **`Table.tsx` / `create()`**: `columns: [...DEFAULT_COLUMNS]` 얕은 복사를 기본값으로 반환. `options` 에 `columns` 가 있으면 스프레드로 덮어씌워져 기존 저장 스키마에 영향 없음.
- **`Table.tsx` / `TableRender`**: `rawData.length === 0 && shouldUseDemoData(field.columns ?? [])` 조건으로 `DEMO_ROWS` 주입. 한 줄 조건이 fallback 로직의 전부.

## 데이터 흐름

```
Palette 드롭 → create() → { columns: DEFAULT_COLUMNS, data:'', features:{} }
  → form-js가 TableComponent.component(field, value=undefined) 렌더
  → TableRender: rawData=[] + shouldUseDemoData(DEFAULT_COLUMNS)=true → data=DEMO_ROWS
  → TableCore: 3 컬럼 헤더 + 3 데모 행 렌더
```

사용자가 컬럼 변경 시: `field.columns` 갱신 → `shouldUseDemoData` 재평가 → 불일치이면 `data=[]` → 빈 테이블.

## 설계 결정 (대안이 있는 경우만)

**결정 1: 데모 데이터를 render 단계 `TableRender` fallback 으로 주입한다.**
- **대안 A**: `create()` 시점에 `demoData` 필드를 스키마에 포함시키는 방식.
- **대안 B**: `TableCore` 내 `rows.length === 0` 조건으로 TanStack 레이어에서 처리.
- **근거**: render 단계 fallback 은 저장 스키마를 오염시키지 않으며, `value` prop 변경에 즉각 반응한다. 대안 B는 TanStack 변환 이후 레이어이므로 복잡도 증가.

**결정 2: 컬럼 `header` 에 raw string (`'ID'`, `'Name'`, `'Date'`) 사용 (LocaleKey 등록 없음).**
- **근거**: `LocaleKey = string` alias 이고 form-js 원본도 raw string. WP-07 전까지 불필요한 i18n 계층 추가 없음.

**결정 3: `DEFAULT_COLUMNS` 를 `create()` 에서 얕은 복사로 반환 (`[...DEFAULT_COLUMNS]`).**
- **근거**: form-js 호스트가 반환값을 mutate 할 경우 원본 상수 오염 방지.

## 선행 조건

- `packages/designer-table/src/types.ts` 의 `ColumnDef` 인터페이스 `{ id, header, accessor?, type? }` 구조 — 충족됨.
- `columnDefToTanstack` 이 리프 컬럼에 `accessor` 없으면 throw 하므로 `DEFAULT_COLUMNS` 각 항목에 `accessor` 필수 — 설계에서 보장.

## 리스크

- **MEDIUM**: 디자이너 캔버스가 `value` 를 `null`/`undefined`/`[]` 중 어떤 형태로 전달하는지 버전에 따라 다를 수 있음. 기존 `Array.isArray(value) ? value : []` 패턴은 세 경우 모두 `rawData=[]` 로 처리하므로 안전.
- **LOW**: WP-07 i18n 키 강제화 시 raw string `header` 가 타입 불일치 발생 가능. `LocaleKey = string` 기간에는 무영향.
- **LOW**: `[data-testid="designer-table"]` selector 는 `TableCore` 의 `<table>` 에 이미 부착되어 있음 (Table.tsx L277). 팔레트 버튼과 구분 가능.

## QA 체크리스트

- [ ] (정상) `TableComponent.create()` 호출 시 반환값의 `columns` 길이가 3 이고 `accessor` 가 각각 `'id'`, `'name'`, `'date'` 이다.
- [ ] (정상) `TableComponent.create({ columns: [] })` 호출 시 반환값의 `columns` 가 빈 배열이다 (options 스프레드 덮어쓰기 보장).
- [ ] (정상) `TableComponent.create()` 를 두 번 호출하여 각각의 `columns` 배열 참조가 서로 다르다 (복사본 독립성).
- [ ] (정상) `shouldUseDemoData(DEFAULT_COLUMNS)` → `true`.
- [ ] (정상) `shouldUseDemoData([{ id:'foo', header:'Foo', accessor:'foo' }])` → `false`.
- [ ] (정상) `shouldUseDemoData([])` → `false`.
- [ ] (정상) `value=undefined` 인 Table 렌더 시 `tbody tr` 가 3개 표시된다.
- [ ] (정상) `value=[{ id:99, name:'Test', date:'01.01.2024' }]` 인 Table 렌더 시 데모가 아닌 실제 값 1행만 표시된다.
- [ ] (엣지) 그룹 헤더 포함 멀티헤더 트리에서 `shouldUseDemoData` 가 리프만 추출하여 판정한다.
- [ ] (엣지) 컬럼을 `[{ id:'foo', accessor:'foo' }]` 로 변경 후 `value=[]` 상태이면 `tbody` 가 비어 있다.
- [ ] (클릭 경로) 팔레트 "테이블" 아이템을 드래그하여 캔버스에 드롭하면 테이블이 추가된다.
- [ ] (화면 렌더링) 드롭 후 `thead` 에 `ID`, `Name`, `Date` 텍스트가 표시되고 `tbody` 에 1행 이상 행이 렌더된다.
- [ ] (화면 렌더링) 드롭 후 `tbody tr:first-child` 셀 중 하나에 `John Doe` 텍스트가 포함된다.
