---
name: form-designer
description: "form-js 호환 JSON 스키마를 생성·수정·검증하는 AI Skill. 자연어 화면 의도를 받아 schemas/drafts/*.form-js을 산출하고 designer-cli validate로 실측 검증한다."
---

# AI Skill: form-designer

자연어 화면 설계 의도를 받아 **form-js 호환 JSON 스키마**를 산출하는 AI Skill이다.

## §1 역할 선언

당신은 form-js 화면 설계 AI다. 입력으로 자연어 화면 의도(컴포넌트 구성, 레이아웃, 데이터 바인딩)를 받아 `schemas/drafts/<name>.form-js` 파일을 생성·수정한다.

### 입출력 계약

| 항목 | 내용 |
|------|------|
| 입력 | 자연어 화면 의도 (command 파일 참조) |
| 출력 | `schemas/drafts/<name>.form-js` (Write 도구) |
| 검증 | 저장 직전 §5 자기검증 + 저장 직후 §6 designer-cli 실측 검증 |

### 금지 사항

- **시안에 보이는 텍스트를 i18n 키로 추상화 금지** — 시안 트레이스 단계에서는 시안에 보이는 그대로의 literal 문자열을 사용한다(§4 참조). `designer.bridge.pagination.previous` 대신 `"Previous"`.
- `schemaVersion` 19 이외의 값 사용 금지
- spec.json을 무시하고 임의 props 작성 금지
- `schemas/drafts/` 외부 경로에 스키마 파일 저장 금지
- 미등록 컴포넌트 type 사용 금지 (§2 표 외)
- **테이블/리스트 시안에 데이터 행이 보이면 dataSource로 그대로 인라인** — 자리표시로 비워두지 말 것 (§9 예시 참조).

---

## §2 사용 가능한 컴포넌트 (Single Source of Truth)

검증의 진실은 `packages/designer-cli/src/registry/cliRegistry.ts`다. 본 저장소에서 사용 가능한 type은 **(A) form-js-viewer 1.21 기본 타입 + (B) designer-components 커스텀 컨테이너** 두 묶음이다.

> 표 외 type은 `UNKNOWN_COMPONENT_TYPE`로 검증 실패.
> **모든 매핑(자연어 → type) 결정은 §2.5 매핑 가이드를 따른다.** 카드 자리표시로 떨어지지 않도록.

### A. form-js 기본 타입 (`@bpmn-io/form-js-viewer@1.21.2`)

`spec.json` 없음 — props는 form-js 공식 schema가 권위. 본 표는 의미 + 핵심 키만 요약.

| type | 그룹 | keyed | 핵심 props | 의미 |
|------|------|:----:|-----------|------|
| `textfield` | input | ✓ | `key`, `label`, `description`, `defaultValue`, `validate` | 한 줄 텍스트 입력 (검색창 포함) |
| `textarea` | input | ✓ | `key`, `label`, `description`, `defaultValue` | 여러 줄 텍스트 입력 |
| `number` | input | ✓ | `key`, `label`, `decimalDigits`, `serializeToString` | 숫자 입력 |
| `checkbox` | input | ✓ | `key`, `label`, `description` | 단일 체크박스 |
| `select` | input | ✓ | `key`, `label`, `values: [{label, value}]`, `valuesExpression`, `searchable` | 드롭다운 선택 |
| `radio` | input | ✓ | `key`, `label`, `values: [{label, value}]` | 라디오 그룹 |
| `datetime` | input | ✓ | `key`, `label`, `subtype` ('date'|'time'|'datetime') | 날짜/시간 입력 |
| `button` | action | ✗ | `label`, `action` ('submit'\|'reset') | 액션 버튼 |
| `text` | presentation | ✗ | `text` (markdown 허용) | 정적 텍스트/제목/설명 |
| `image` | presentation | ✗ | `source`, `alt` | 이미지 |
| `iframe` | presentation | ✗ | `url`, `label`, `height`, `security` | 외부 페이지 임베드 |
| `spacer` | presentation | ✗ | `height` | 빈 공간 |
| `separator` | presentation | ✗ | (없음) | 가로 구분선 |
| `expression-field` | data | ✓ | `key`, `expression`, `computeOn` | FEEL 식 계산 필드 |
| `table` | data | ✗ | `label`, `dataSource`, `columns: [{label, key}]` 또는 `columnsExpression`, `rowCount`, `pagination` | 데이터 테이블 |
| `group` | container | ✗ | `label`, `showOutline`, **`components: []`** | form-js 기본 그룹 컨테이너 |

> `keyed: ✓` 컴포넌트는 **반드시 `key` 필드**를 가져야 데이터 바인딩이 동작한다. 키 컨벤션: 소문자 dot.path(`user.email`).
> `text` 의 `text` 값에는 form-js가 markdown을 그대로 렌더하므로 한국어/영어 직접 기재 대신 i18n 키 또는 placeholder 토큰을 사용한다 (§4 참고).

### B. designer-components 커스텀 컨테이너

| type | 그룹 | spec.json | 자식 슬롯 | 비고 |
|------|------|-----------|-----------|------|
| `card` | container | `packages/designer-components/src/card/spec.json` | `components: []` | 헤더 + 자식 컨테이너 (자식 영역 자체에 그리드 배치) |
| `modal` | container | `packages/designer-components/src/modal/spec.json` | `components: []` | trigger 버튼 + 본문 |
| `tabs` | container | `packages/designer-components/src/tabs/spec.json` | `tabs[]` 메타 + `components: []`(tabPanel 자식) | 자식은 tabPanel로 분리 |
| `tabPanel` | container | (없음 — `propsSchema.ts`만) | `components: []` | tabs 내부 자식. `label`만 props |
| `chartPlaceholder` | presentation | `packages/designer-components/src/chartPlaceholder/spec.json` | (자식 없음) | 데이터 바인딩 없는 시각 stub. `chartType`(11종 카탈로그) + `title` + `description`. 카탈로그 SoT: `packages/designer-components/src/chartPlaceholder/chartCatalog.ts` |

**propsSchema 직접 참조 (spec.json 없음):**
- `packages/designer-components/src/tabPanel/propsSchema.ts`

> ⚠️ 현 시점 `cliRegistry`는 `tabPanel`이 누락되어 있다(`packages/designer-cli/src/registry/cliRegistry.ts`). tabs 사용 시 검증이 `UNKNOWN_COMPONENT_TYPE`로 실패할 수 있으니 사용자에게 함께 보고한다.

### 컴포넌트 props 생성 절차

- **A 타입**: 본 §2 A표 + form-js 공식 docs(https://docs.camunda.io/docs/components/modeler/form/form-elements/) 기반으로 키만 사용. 모르는 키 추가 금지.
- **B 타입**: 해당 spec.json 또는 propsSchema.ts를 Read 도구로 읽어 `propsSchema.properties` 정의 키와 `default`만 사용.

---

## §2.5 자연어 시안 → 컴포넌트 매핑 가이드

이미지/시안 해석 시 **반드시 이 표를 거쳐서** type을 결정한다. 모든 요소를 카드로 떨어뜨리지 말 것.

| 시안 요소 | 매핑 type | 보조 메모 |
|-----------|-----------|-----------|
| 페이지 제목 / 섹션 제목 / 헤더 라벨 | `text` (markdown `# `/`## `) 또는 부모 컨테이너의 `header` prop | 단순 텍스트 라벨에 카드 사용 금지 |
| 본문 안내 문구 / 설명 / 카운트(예: "Active Batches (13)") | `text` | |
| 검색 입력창 ("Search by …") | `textfield` (`description`로 placeholder 의도 표현) | placeholder 정확 prop은 form-js 미지원 — `description` 또는 `label` 활용 |
| 일반 입력창 / 이메일 / 비밀번호 | `textfield` | `validate.pattern`, `key` 필수 |
| 멀티라인 메모 / 주소 | `textarea` | |
| 숫자 / 가격 / 수량 | `number` | |
| 체크박스 단일 | `checkbox` | |
| 라디오 그룹 | `radio` | `values` 명시 |
| 드롭다운 / 콤보박스 / "All statuses" 필터 | `select` | `values` 또는 `valuesExpression`. 검색 가능 시 `searchable: true` |
| 날짜 / 기간 / 마감일 | `datetime` (`subtype` 명시) | |
| 액션 버튼 ("+ Produce New Batch", "Submit", "View", "Enable Pickup") | `button` | `action` 미지정 시 일반 액션, submit/reset만 form-js 기본 지원 |
| 페이지네이션 컨트롤 ("Previous" / "Next") | `button` x N | 화살표 아이콘은 라벨 텍스트로 흡수 |
| 데이터 그리드 / 행 목록 / 배치 테이블 | `table` | `columns: [{label, key}]` 명시. 행 데이터는 `dataSource: =배열식` |
| 좌/우 분할, 카드형 묶음, 헤더가 있는 그룹 | `card` | 시안의 시각적 카드/패널/박스에만 사용 |
| 모달 / 다이얼로그 / 팝업 | `modal` | trigger 버튼 라벨 i18n 키 |
| 탭 네비게이션 | `tabs` + `tabPanel` | |
| 좌측 사이드바 메뉴 항목 (단순 링크 텍스트) | `text` (한 줄 마크다운) — 그룹은 `card` 또는 `group` | 메뉴 항목마다 카드 만들지 말 것 |
| 사이드바 아이콘 / 아바타 / 배지 / 상태 칩 | (미지원) — 가장 가까운 시각 컴포넌트로 자리표시 후 보고 | 아이콘 컴포넌트 없음 |
| 가로 구분선 / 섹션 시각 분리 | `separator` | |
| 단순 빈 간격 | `spacer` (`height: <px>`) | |
| 외부 컨텐츠 임베드 | `iframe` | |
| 차트 / 그래프 / 시각화 자리 / 막대 차트 / 파이 차트 / "여기에 차트" 등 | `chartPlaceholder` | `chartType` 11종(`bar`/`line`/`pie`/`donut`/`area`/`scatter`/`stackedBar`/`horizontalBar`/`gauge`/`heatmap`/`treemap`) 중 시안에 가까운 것 선택. 데이터 바인딩 없는 시각 stub. 실데이터 차트 필요 시 별도 컴포넌트 검토 |

**체크리스트:**
1. 시안의 모든 클릭 가능한 요소 → `button` 우선 검토
2. 시안의 입력 가능한 모든 요소 → `textfield`/`textarea`/`number`/`select`/`radio`/`checkbox`/`datetime` 중 매핑
3. 시안의 데이터 그리드 → `table`
4. 단순 라벨/제목/설명 → `text` (카드 X)
5. 시각적으로 박스가 있는 패널/그룹 → `card`
6. 위 매핑에서 부재한 요소(아이콘, 배지, 트리)만 자리표시 카드/text로 처리하고 사용자에게 보고

---

## §3 스키마 구조 규칙

### 최상위 골격

```json
{
  "schemaVersion": 19,
  "type": "default",
  "components": []
}
```

### 컴포넌트 필수 필드

```json
{
  "type": "<registered-type>",
  "id": "<type>-<n>",
  "...props...": "(spec.json properties)"
}
```

- `type`: §2 표의 등록 type만 사용
- `id` 패턴: `<type>-<n>` — `n`은 스키마 내 단조 증가 정수(1부터). type별 독립 카운터.
  - 예: `card-1`, `card-2`, `tabs-1`, `tabPanel-1`, `tabPanel-2`, `modal-1`
  - **시각/난수 사용 금지** — 결정적 생성을 위함
  - `design-add` 시: 기존 스키마 id를 재귀 수집 후 충돌 시 다음 정수로 증분
- 컨테이너(card / modal / tabPanel)는 자식을 `components: []` 필드로 갖는다 (비어 있어도 명시)

### props 기본값

spec.json의 `default` 값을 사용한다. 명시적 지시가 없으면 기본값 적용.

### 컨테이너 런타임 계약 (참고)

본 저장소의 커스텀 컨테이너(card/modal/tabPanel)는 form-js 런타임에서 다음 4조건을 동시 만족하도록 구현되어 있다 — **스키마 작성 시에는 (4)만 보장하면 된다.**

1. ComponentDefinition에 `escapeGridRender: false`
2. 자식 렌더는 `<ChildrenSlot field={field} />` 사용
3. `formLayouter` override (DesignerFormLayouter)
4. **컨테이너 필드의 `components: []` 필드 존재** ← LLM 책임

비어 있어도 `"components": []`로 명시할 것 (누락 시 `MISSING_COMPONENTS`).

---

## §3.5 컴포넌트 배치 (row / columns / height)

form-js는 **Carbon 16-column Grid** 위에서 `layout` 객체로 가로/세로 배치를 결정한다 (`packages/designer-core/src/types.ts:17`, `ChildrenSlot.tsx:37`의 `cds--grid cds--grid--condensed`).

### layout 형태

```json
{
  "type": "<type>",
  "id": "<...>",
  "layout": {
    "row": "row-1",
    "columns": 8,
    "height": 200
  }
}
```

| 키 | 의미 | 비고 |
|----|------|------|
| `row` | 가로 그룹 식별자(문자열) | 같은 값 → 같은 한 줄, 다르거나 생략 → 새 줄 |
| `columns` | Carbon 16-col 기준 가로 폭(span, 1..16) | 미지정 시 form-js가 row 안에서 균등 분배 |
| `height` | 픽셀 높이 | `card`, `textarea`, `group`, `table`, `html` 등 사이즈 의미가 있는 타입에만 부여 |

### 배치 규칙

1. **한 row 내 `columns` 합 ≤ 16** — 초과 시 줄바꿈/깨짐 가능.
2. **row id 명명** — 스키마 내 단조 증가 문자열: `row-1`, `row-2`, ... 컨테이너별 독립 네임스페이스 허용 (`card-1.row-1`처럼 prefix 가능).
3. **세로 배치만 필요하면 `layout` 자체를 생략한다** — 각 컴포넌트가 자기만의 새 row가 됨.
4. **컨테이너 자식의 `layout`** — card/modal/tabPanel 내부 `components[]`도 동일 규칙을 부모 grid 스코프 안에서 독립 적용.
5. **height는 라인 컴포넌트에 부여 금지** — 의미가 없거나 비주얼이 깨질 수 있음.
6. **form-js viewer는 unknown layout 키를 무시**(types.ts:15 주석) — 잘못된 키를 추가해도 즉시 깨지진 않지만 만들지 말 것.

### 배치 예시

**가로 2분할 (카드 2개):**
```json
"components": [
  { "type": "card", "id": "card-1", "layout": { "row": "row-1", "columns": 8 }, "components": [] },
  { "type": "card", "id": "card-2", "layout": { "row": "row-1", "columns": 8 }, "components": [] }
]
```

**대시보드 4-up + 본문:**
```json
"components": [
  { "type": "card", "id": "card-1", "layout": { "row": "row-1", "columns": 4 }, "components": [] },
  { "type": "card", "id": "card-2", "layout": { "row": "row-1", "columns": 4 }, "components": [] },
  { "type": "card", "id": "card-3", "layout": { "row": "row-1", "columns": 4 }, "components": [] },
  { "type": "card", "id": "card-4", "layout": { "row": "row-1", "columns": 4 }, "components": [] },
  { "type": "card", "id": "card-5", "layout": { "row": "row-2", "columns": 16, "height": 400 }, "components": [] }
]
```

---

## §4 라벨·텍스트·데이터 규약 (literal 우선)

### 4.1 가시 텍스트는 시안에 보이는 그대로 literal 사용

`label` / `header` / `title` / `description` / `text` / `triggerLabel` / `values[].label` / `columns[].label` 등 **모든 가시 문자열은 시안에 보이는 텍스트를 그대로 기재한다.** 한국어·영어·이모지·특수문자 모두 허용.

- 시안: `Previous` 버튼 → `"label": "Previous"`
- 시안: `Search by name, ID, etc.` placeholder → `"description": "Search by name, ID, etc."`
- 시안: `+ Produce New Batch` → `"label": "+ Produce New Batch"`
- 시안: `Active Batches (13)` 타이틀 → `"text": "## Active Batches (13)"` (text 컴포넌트는 markdown 허용)

### 4.2 i18n 키는 다음 두 경우에만 사용한다

(a) 시안에 텍스트가 비어있거나 placeholder가 의도적 추상인 경우 → `""` 또는 `designer.<page>.<element>.<key>`
(b) 사용자가 명시적으로 i18n 키 등록을 요청한 경우

> 시안 트레이스 단계의 기본 동작은 (a)/(b)가 아니라 §4.1의 literal이다.

### 4.3 테이블·리스트의 데이터 행 (필수)

시안 또는 입력 자료에 **데이터 행이 보이면 반드시 `dataSource`에 그대로 인라인**한다. 자리표시·빈 테이블 금지.

- form-js `table.dataSource`는 FEEL 표현식 — 인라인 배열 리터럴이 가능.
- column `key`가 데이터 객체의 property와 매핑되도록 작성.

```json
{
  "type": "table",
  "id": "table-1",
  "label": "Active Batches",
  "rowCount": 10,
  "columns": [
    { "label": "Name", "key": "name" },
    { "label": "Price", "key": "price" }
  ],
  "dataSource": "= [{name:\"Emerald Green Tea Leaves\", price:\"$44.10\"}, {name:\"Dragon Fruit Powder\", price:\"$112.30\"}]"
}
```

### 4.4 (선택) i18n 사전

폼이 다국어 production용으로 승격될 때만 `packages/designer-i18n/locales/ko.json`(또는 `en.json`)에 키를 등록한다. 시안 트레이스 산출물은 사전 수정을 트리거하지 않는다.

---

## §5 저장 전 자기검증 체크리스트

스키마를 Write 도구로 저장하기 **직전** 다음 항목을 모두 확인한다. 하나라도 실패하면 수정 후 재저장.

1. `schemaVersion` === 19 확인
2. 모든 `type` 값이 §2 A/B 표(form-js 기본 + designer-components)에 있는지 확인
3. **시안 → 컴포넌트 매핑(§2.5)을 거쳤는지 확인** — 시안의 입력/버튼/테이블/드롭다운을 카드 자리표시로 처리하지 않았는지
4. **가시 문자열은 시안 그대로 literal** — 시안에 텍스트가 보이면 i18n 키 (`designer.*`) 사용 금지(§4.1). 시안에 없는 경우만 `""` 또는 i18n 키.
4-1. **시안에 데이터 행이 있는 table/list는 `dataSource`에 인라인 데이터** (§4.3). 자리표시 금지.
5. 동일 스키마 내 `id` 중복 없음 확인 (재귀 순회)
6. `design-add` 실행 시: 기존 schema의 id 목록과 신규 id 충돌 없음 확인
7. **layout 합 검증** — 같은 부모 안에서 같은 `layout.row` 값을 공유하는 컴포넌트들의 `columns` 합이 16 이하인지 확인
8. 컨테이너(card/modal/tabPanel/group, tabs)에 `components`(또는 tabs의 `tabs/components`) 필드가 누락되지 않았는지 확인 (비어 있어도 `[]`로 명시)
9. **`keyed` 입력 컴포넌트(`textfield/number/select/checkbox/radio/textarea/datetime/expression-field`)는 `key` 필드 필수** — dot.path 컨벤션
10. spec.json/propsSchema.ts (custom) 또는 §2 A 표 (form-js 기본)에 정의되지 않은 prop 키를 추가하지 않았는지 확인

---

## §6 designer-cli 실측 검증 (의무)

자기검증(§5) 통과 후 반드시 designer-cli로 실측 검증을 수행한다. 자기보고만으로 완료 보고하지 않는다.

```bash
# 최초 1회 또는 src 변경 후
npm run build -w @form-js-designer/designer-cli

# 검증 실행
./packages/designer-cli/bin/designer-cli.mjs validate schemas/drafts/<name>.form-js
```

또는 `/design-validate <path>` command로 위임 호출.

> 빌드 산출물(`packages/designer-cli/dist/`)이 없으면 ERR_MODULE_NOT_FOUND가 난다. `npm run build -w @form-js-designer/designer-cli`(또는 `prepare` 훅)로 한 번만 빌드해 두면 이후 호출은 한 줄로 끝난다.

- `result.ok === true` → 완료 보고
- `result.ok === false` → 오류 코드별로 §5 항목과 매핑하여 수정 후 재실행

검증 코드 매핑 (요약 — `/design-validate` 참조):

| 코드 | 매핑된 §5 항목 |
|------|----------------|
| `INVALID_SCHEMA_VERSION` | 1 |
| `UNKNOWN_COMPONENT_TYPE` | 2 |
| `MISSING_COMPONENTS` | 7 |
| `MISSING_TYPE` | 2, 8 |
| `INVALID_FIELD_PROPS` | 8 (warning) |

---

## §7 실행 흐름

```
입력 수신
  ↓
spec.json / propsSchema Read (해당 type별)
  ↓
JSON 조립 (§3 구조 + §3.5 layout + §4 i18n)
  ↓
§5 자기검증
  ↓
schemas/drafts/<name>.form-js Write
  ↓
§6 designer-cli 실측 검증
  ↓
완료 보고 (검증 결과 포함)
```

---

## §8 산출물 경로 및 파일명 규칙

- 경로: `schemas/drafts/`
- 파일명: `<kebab-case-page-name>.form-js`
- 예: `login-page.form-js`, `dashboard.form-js`, `user-profile.form-js`

---

## §9 골든 예시

### 예시 1 — 단일 카드 페이지

```json
{
  "schemaVersion": 19,
  "type": "default",
  "components": [
    {
      "type": "card",
      "id": "card-1",
      "padding": "md",
      "elevation": 1,
      "header": "Welcome",
      "headerTag": "h3",
      "components": []
    }
  ]
}
```

### 예시 2 — 가로 2분할 (좌/우 카드)

```json
{
  "schemaVersion": 19,
  "type": "default",
  "components": [
    {
      "type": "card",
      "id": "card-1",
      "padding": "md",
      "elevation": 1,
      "header": "Profile",
      "headerTag": "h3",
      "layout": { "row": "row-1", "columns": 8 },
      "components": []
    },
    {
      "type": "card",
      "id": "card-2",
      "padding": "md",
      "elevation": 1,
      "header": "Activity",
      "headerTag": "h3",
      "layout": { "row": "row-1", "columns": 8 },
      "components": []
    }
  ]
}
```

### 예시 3 — 입력·버튼·테이블 + 인라인 데이터가 포함된 데이터 페이지

라벨/columns/values는 시안 그대로 literal, table은 시안에 보이는 행 수만큼 `dataSource`에 인라인.

```json
{
  "schemaVersion": 19,
  "type": "default",
  "components": [
    {
      "type": "card",
      "id": "card-1",
      "padding": "md",
      "elevation": 1,
      "header": "Active Batches",
      "headerTag": "h2",
      "components": [
        {
          "type": "text",
          "id": "text-1",
          "text": "## Active Batches (13)",
          "layout": { "row": "row-1", "columns": 10 }
        },
        {
          "type": "button",
          "id": "button-1",
          "label": "+ Produce New Batch",
          "action": "submit",
          "layout": { "row": "row-1", "columns": 6 }
        },
        {
          "type": "textfield",
          "id": "textfield-1",
          "key": "filters.search",
          "label": "Search",
          "description": "Search by name, ID, etc.",
          "layout": { "row": "row-2", "columns": 12 }
        },
        {
          "type": "select",
          "id": "select-1",
          "key": "filters.status",
          "label": "Status",
          "values": [
            { "label": "All statuses", "value": "all" },
            { "label": "Produced", "value": "produced" },
            { "label": "Picked up", "value": "pickedUp" },
            { "label": "Ready for pickup", "value": "ready" }
          ],
          "layout": { "row": "row-2", "columns": 4 }
        },
        {
          "type": "table",
          "id": "table-1",
          "label": "Batches",
          "rowCount": 10,
          "columns": [
            { "label": "Name", "key": "name" },
            { "label": "Product ID", "key": "productId" },
            { "label": "Price", "key": "price" },
            { "label": "Status", "key": "status" }
          ],
          "dataSource": "= [{name:\"Emerald Green Tea Leaves\",productId:\"#134239GGUW\",price:\"$44.10\",status:\"Produced\"}, {name:\"Dragon Fruit Powder\",productId:\"#4467KCCHY8Z\",price:\"$112.30\",status:\"Produced\"}, {name:\"Cold-Pressed Virgin Maruia Oil\",productId:\"#7813HGBWMM\",price:\"$124.00\",status:\"Ready for pickup\"}]",
          "layout": { "row": "row-3", "columns": 16, "height": 480 }
        }
      ]
    }
  ]
}
```

### 예시 4 — tabs + tabPanel 구조

```json
{
  "schemaVersion": 19,
  "type": "default",
  "components": [
    {
      "type": "tabs",
      "id": "tabs-1",
      "defaultValue": "tab1",
      "orientation": "horizontal",
      "tabs": [
        { "label": "designer.profile.tab.basic", "value": "tab1" },
        { "label": "designer.profile.tab.security", "value": "tab2" }
      ],
      "components": [
        {
          "type": "tabPanel",
          "id": "tabPanel-1",
          "label": "designer.profile.tab.basic",
          "components": [
            { "type": "card", "id": "card-1", "header": "", "components": [] }
          ]
        },
        {
          "type": "tabPanel",
          "id": "tabPanel-2",
          "label": "designer.profile.tab.security",
          "components": [
            { "type": "card", "id": "card-2", "header": "", "components": [] }
          ]
        }
      ]
    }
  ]
}
```

---

## §10 마크다운 첨부 규약

스키마를 마크다운(보고서/문서/리뷰)에 인용할 때는 반드시 ```` ```form-js ```` 펜스를 사용한다 — `json` 펜스 사용 금지.

이유:
- VS Code form-js preview 확장(`packages/designer-vscode-extension`)은 `form-js` 펜스를 인식하여 라이브 렌더 미리보기를 제공한다 (`json` 펜스는 그냥 코드 블록).
- 검색·grep으로 스키마 인용 위치를 빠르게 찾기 위함.

```form-js
{
  "schemaVersion": 19,
  "type": "default",
  "components": [
    { "type": "card", "id": "card-1", "header": "designer.example.title", "components": [] }
  ]
}
```

마크다운 산출물에 스키마 본문을 포함시킬 때(예: `schemas/drafts/<name>.md`)도 동일하게 적용한다.

---

## §11 참조 파일 목록

| 파일 | 용도 |
|------|------|
| `packages/designer-components/src/card/spec.json` | card props |
| `packages/designer-components/src/modal/spec.json` | modal props |
| `packages/designer-components/src/tabs/spec.json` | tabs props |
| `packages/designer-components/src/tabPanel/propsSchema.ts` | tabPanel props (TypeScript) |
| `packages/designer-core/src/types.ts` | `FormFieldLayout`, `ComponentDefinition` 정의 |
| `packages/designer-core/src/container/ChildrenSlot.tsx` | Carbon Grid 렌더 (cds--grid 16-col) |
| `packages/designer-cli/src/commands/validate.js` | §6 실측 검증 진입점 |
| `packages/designer-i18n/locales/ko.json` | i18n 사전 (한국어) |
