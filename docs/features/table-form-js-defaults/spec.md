# Feature: table-form-js-defaults

## 요구사항

form-js 원본 `Table` 컴포넌트가 제공하는 **기본 콘텐츠 시드(default seed)** 를
designer-table 에서도 재현한다. 현재 사용자가 Palette 에서 Table 을 드롭하면
`columns: []` 로 생성되어 본문이 완전히 비어 있는 상태가 된다.
form-js 원본처럼 드롭 즉시 기본 컬럼(ID / Name / Date) 과 데모 행이 보여야 한다.

## 배경 / 맥락

form-js-viewer 의 `Table.config.create()` 는 다음을 기본값으로 반환한다
(`node_modules/@bpmn-io/form-js-viewer/dist/index.es.js` L5626~L5666 참조):

```js
{
  label: 'Table',
  rowCount: 10,
  columns: [
    { label: 'ID',   key: 'id'   },
    { label: 'Name', key: 'name' },
    { label: 'Date', key: 'date' },
  ],
}
```

또한 `Table.config.generateInitialDemoData(field)` 는
`columns` 가 기본 3종이고 `dataSource === '=' + field.id` 일 때 다음 3행을 반환한다:

```js
[
  { id: 1, name: 'John Doe',     date: '31.01.2023' },
  { id: 2, name: 'Erika Muller', date: '20.02.2023' },
  { id: 3, name: 'Dominic Leaf', date: '11.03.2023' },
]
```

반면 현재 구현(`packages/designer-table/src/Table.tsx` L416~L422):

```ts
create: (options?) => ({
  type: 'table',
  columns: [],   // ← 비어 있음
  data: '',
  features: {},
  ...options,
}),
```

때문에 designer 캔버스에 드롭한 직후에는 컬럼이 0개라서
`<thead>` 와 `<tbody>` 모두 empty 로 렌더되고, 사용자 눈에 띄는 콘텐츠가 없다.

이 Feature 의 목적은 **드롭 즉시 form-js 원본과 시각적으로 동일한 테이블** 이
보이도록 default seed 를 맞추는 것이다.

## 도메인

frontend

## 진입점 (Entry Points)

- 사용자 진입 경로: editor-host 캔버스(`App.tsx`) → 왼쪽 Palette "Presentation" 그룹
  → `Table` 드래그 → 캔버스에 드롭
- URL / 라우트: `/` (editor-host dev server, `packages/designer-editor-host`)
- 수정할 컴포넌트 파일:
  - `packages/designer-table/src/Table.tsx` — `TableComponent.create()` 시드
  - `packages/designer-table/src/types.ts` — (필요 시) ColumnDef 필드 확인
- 영향 범위: Palette → drop 시 생성되는 initial `TableSchema` 기본값만 변경.
  form-js 런타임 동작(value 바인딩, cell/filter 렌더러) 은 그대로.

## 수용 기준 (Acceptance Criteria)

1. Palette 에서 Table 을 새로 드롭하면 `<thead>` 에 `ID / Name / Date` 3개 컬럼이 보인다.
2. 드롭 직후 `<tbody>` 에 **원본 form-js 데모 행 3개**
   (`John Doe`, `Erika Muller`, `Dominic Leaf`) 가 보인다.
   - designer 캔버스는 form-js 런타임이 `value` 를 채워주지 않는 preview 모드이므로,
     `generateInitialDemoData` 와 동등한 샘플 데이터를 designer-table 내부에서
     제공해야 한다 (구현 방식은 Design Phase 에서 확정).
3. 기본 seed 는 `create()` 호출 시에만 적용되며, 기존 저장된 form 스키마
   (`columns` 가 이미 존재하는 필드) 에는 영향이 없다.
4. 사용자가 Props Panel 에서 컬럼을 바꾸면 기본 데모 데이터는 자동으로 사라지거나
   새 컬럼 키와 맞는 경우에만 유지된다 (form-js 원본 `generateInitialDemoData`
   가드 규칙과 동일: 모든 column.key 가 demoData key 에 포함될 때만 사용).
5. 단위 테스트로 `TableComponent.create()` 가 3 컬럼 + 비어 있지 않은 시드를
   반환함을 보장한다. (정확한 테스트 범위는 Build Phase 에서 결정)
6. 실제 브라우저(Playwright visible) 에서 Palette → drop → 테이블 3컬럼+3행
   이 렌더되는 것을 확인한다 (`feedback_wp_leader_browser_test.md` 정책).

## 비고

- designer-table 의 `ColumnDef` 는 form-js 의 `{label,key}` 와 달리
  `{id, header, type, accessor, ...}` 구조이다. 기본 seed 는 우리 구조에 맞게
  변환하되, 런타임 키(`accessor`)는 form-js 의 `key` 와 동일한
  `id`/`name`/`date` 를 사용해야 demo data 가 정상 매핑된다.
- `data: string` 필드는 form-js 의 FEEL 표현식 입력이다. 디자이너 프리뷰에서
  실제 런타임이 없는 경우 `value` 를 빈 배열로 받으므로, 데모 데이터 주입은
  render 단계에서 `value` 가 비어 있을 때의 fallback 으로 처리하는 것이 무난하다
  (Design Phase 에서 결정).
- 기존 테스트 (`packages/designer-table/src/__tests__/*`) 가 `columns: []` 을
  전제로 작성되어 있을 수 있으므로 spec 변경에 따른 fixture 조정이 필요할 수 있다.
