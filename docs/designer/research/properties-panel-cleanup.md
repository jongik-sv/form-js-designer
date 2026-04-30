# Properties Panel 정리 — 디자인 표시 전용 항목만 노출하기

**작성일**: 2026-04-30
**대상**: card, chartPlaceholder, modal, tabPanel, tabs, tree (커스텀 컴포넌트 6종)
**목표**: form-js runtime 동작용 항목과 디자이너 표시 전용 항목을 분리하고, 디자이너 패널에는 **레이아웃 표시(label, datasource 등) 관련 항목만** 노출. i18n(ko/en 번역 키), Conditional(조건부 표시), Custom properties는 숨김.

---

## 1. 현재 패널 구조 — 두 갈래로 렌더링되고 있음

선택된 필드의 우측 사이드 패널은 **두 컨테이너가 동시에** 그려진다.

| # | 출처 | 마운트 지점 | 그리는 것 |
|---|------|-------------|-----------|
| 1 | **form-js native bio-properties-panel** | `editor.get('propertiesPanel').attachTo(...)` (`packages/designer-editor-host/src/App.tsx:226`) | form-js 내장 그룹 (General/Condition/Layout/CustomProperties 등) |
| 2 | **PropsPanelContainer (자체 구현)** | `propsPanelService.getGroups(field)` 직접 호출 (`PropsPanelContainer.tsx:57`) | 우리 propsSchema 기반 `designer-props (Properties)` + `designer-layout (Layout)` |

→ 사용자가 본 **"i18n 키 + ko (한국어)" 입력**은 **#2** 에서, **"조건부 표시(Conditional)"** 는 **#1** 에서 옴. 정리하려면 두 곳을 같이 손봐야 함.

---

## 2. form-js 기본 그룹 — 6종 커스텀 컴포넌트에 실제로 노출되는 것

`PropertiesProvider.getGroups`(`form-js-editor/dist/index.es.js:14241`)는 모든 그룹을 만든 뒤 entry별 `isDefaultVisible(field)` 로 필터한다. 빈 그룹은 자동 숨김. `defineComponent`가 `propertiesPanelEntries`를 세팅하지 않으므로 우리 6종은 기본 규칙만 적용된다.

| 그룹 | 6종에 실제 노출? | runtime 영향 | 처리 |
|------|------------------|--------------|------|
| **General** (id, key, label, defaultValue …) | ❌ 모든 entry가 type-specific (default/iframe/datetime/table) → **빈 그룹 자동 숨김** | 각 entry는 form-js binding/초기값 등 직결 | 그대로 |
| Options / Table headers / Security / Serialization / Constraints / Validation / Appearance | ❌ select/iframe/datetime/INPUTS 한정 → **빈 그룹** | runtime | 그대로 |
| **Condition** (`conditional-hide`) | ✅ **무조건 노출** (entry에 `isDefaultVisible` 없음, `type !== 'default'`만 체크) | ✅ form-js viewer가 `field.conditional.hide` FEEL을 실시간 평가 | **숨김 대상** |
| **Layout** (`columns`) | ✅ 노출 | ✅ GridColumns/FormLayouter가 사용 | **유지** (디자이너에 필요) |
| **Custom properties** (`properties[]`) | ✅ 항상 빌드됨 (key/value 추가 버튼) | runtime엔 직접 영향 없음(메타) | **숨김 대상** |

요약: **6종에 form-js native 패널이 실제 노출하는 그룹은 사실상 `Condition` + `Layout(columns)` + `Custom properties` 3개**. 사용자가 "조건 항목 안 쓴다"고 한 건 정확히 `Condition` 그룹 1개, 1 entry(`conditional-hide`).

---

## 3. i18n / ko 입력의 정체 — form-js가 아니라 우리 위젯

form-js native 패널엔 ko/en 다국어 입력 entry가 없다. "ko (한국어)" UI는 **`packages/designer-core/src/panel/widgets/I18nWidget.tsx`** 출처:

- propsSchema에서 `type: 'i18n'` 으로 선언된 prop은 `I18nWidget.edit()`가 그림 → **`i18n key` input + `ko (한국어)` input 두 줄** 고정 UI.
- runtime은 `field.header`/`field.title` 같은 raw 값을 그대로 읽음. **다국어 처리는 외부 i18n 모듈 책임**이고 i18n 키 입력은 디자이너 표시 전용.

→ 즉, i18n 위젯은 우리가 직접 켠 디자인 전용 UI. propsSchema의 type만 바꾸거나 widget을 재정의하면 즉시 사라진다.

---

## 4. 컴포넌트별 prop 카탈로그 — 분류 결과

> **용어**: `propsSchema.properties[*].type` 의 `'i18n'` 은 "form-js properties-panel 위젯 종류"(번역 키 편집 UI를 엶). 값 자체는 runtime 렌더에 그대로 출력되는 텍스트 → 의미상 layout 입력. i18n 기능을 쓰지 않으면 `'string'` 으로 바꾸는 게 맞다.

### 4.1 card (`container`, escapeGridRender:false)

| prop | type | runtime | 분류 | 처리 |
|------|------|---------|------|------|
| padding | enum (none/sm/md/lg) | ✅ cva variant | layout | 표시 |
| elevation | number 0-3 | ✅ cva variant | layout | 표시 |
| header | i18n → `<HeaderTag>{header}</HeaderTag>` | ✅ | layout | **type → 'string'** |
| headerTag | enum h1-h6 | ✅ JSX tag | layout | 표시 |

### 4.2 chartPlaceholder (`presentation`, escapeGridRender:false)

| prop | type | runtime | 분류 | 처리 |
|------|------|---------|------|------|
| chartType | enum (11종) | ✅ getChart() | layout | 표시 |
| title | i18n → `<div class="...title">` | ✅ | layout | **type → 'string'** |
| description | i18n → `<div class="...description">` | ✅ | layout | **type → 'string'** |

### 4.3 modal (`container`, escapeGridRender:false)

| prop | type | runtime | 분류 | 처리 |
|------|------|---------|------|------|
| title | i18n → `<DialogPrimitive.Title>` | ✅ (필수, throw) | layout | **type → 'string'** |
| description | i18n → `<DialogPrimitive.Description>` | ✅ aria-describedby | layout | **type → 'string'** |
| triggerLabel | i18n → `<button>{triggerLabel}</button>` | ✅ (default 'Open') | layout | **type → 'string'** |
| size | enum sm/md/lg | ✅ class & data-size | layout | 표시 |
| portalContainerRef | string CSS selector | ✅ document.querySelector | other (개발자 옵션) | **숨김 검토** |

### 4.4 tabPanel (`container`, palette 숨김, internal-only)

| prop | type | runtime | 분류 | 처리 |
|------|------|---------|------|------|
| label | string '탭 이름' | ✅ `<TabsPrimitive.Trigger>{label}` | layout | 표시 (이미 string) |

### 4.5 tabs (`container`, escapeGridRender:false)

| prop | type | runtime | 분류 | 처리 |
|------|------|---------|------|------|
| defaultValue | string (=tabPanel.id) | ✅ 초기 active tab | layout (자동 보정됨) | **숨김 검토** (validateAndSanitize가 fallback) |
| orientation | enum horizontal/vertical | ✅ Radix orientation | layout | 표시 |
| (form-js layout.height) | layout 그룹 | ✅ LayoutHeightModule | form-js 표준 layout | (별도 그룹, 유지) |

### 4.6 tree (`presentation`, escapeGridRender:false)

| prop | type | runtime | 분류 | 처리 |
|------|------|---------|------|------|
| label | i18n '트리' | ❌ **render에서 사용 안 함** | dead | **제거** 또는 type → 'string' |
| dataSource | expression (FEEL) | ✅ useExpressionEvaluation | datasource | 표시 (핵심) |
| labelKey | string (default 'label') | ✅ node[labelKey] | datasource | 표시 |
| childrenKey | string (default 'children') | ✅ node[childrenKey] | datasource | 표시 |
| expandedByDefault | boolean (default true) | ✅ initial open state | layout | 표시 |
| showGuides | boolean (default false) | ✅ class modifier | layout | 표시 |

---

## 5. 처리 전략

### 5.1 #2 PropsPanelContainer (i18n 위젯) — 두 가지 옵션

- **(A) propsSchema 변경**: 각 컴포넌트의 `propsSchema.ts`에서 `type: 'i18n'` → `type: 'string'`. 단순 라벨 입력 한 줄로 바뀜. 호환성 OK (값 자체는 동일한 raw string).
- **(B) Widget 재정의**: `widgetRegistry.register('i18n', PlainStringLikeWidget, { overwrite: true })` — 스키마는 그대로 두고 위젯 UI만 string과 동일 스타일로 교체. 표 일관성/롤백 측면에서 깨끗함.

→ **권장**: (B). 컴포넌트 스키마 안정성을 깨지 않고 designer-core 한 곳에서 일괄 적용 가능. 추후 i18n을 다시 켤 때도 propsSchema는 그대로.

### 5.2 #1 form-js native 패널 (Condition / Custom properties) — 두 단계

`packages/designer-editor-host/src/modules/PropsPanelService.ts:78-87` 주석에 이미 단서 있음 — `registerProvider`의 `getGroups`는 **`(groups) => groups` updater 함수를 반환**해야 하며, 이걸 안 지키면 패널 전체가 깨졌음.

- **(즉시) 전략 B — DOM/CSS 차단**: `App.tsx:226` `attachTo` 직후 + `propertiesPanel.changed` 이벤트에서 `[data-group-id="condition"]`, `[data-group-id="customProperties"]`에 `display:none`. PropsPanelService 재구조화 없이 즉효. **단점**: form-js 업그레이드 시 selector 깨짐 가능.
- **(정공) 전략 A — Provider updater**: `PropsPanelService` 생성자에서

  ```ts
  this.propertiesPanel.registerProvider(2000, {  // priority > 1000(form-js 기본)
    getGroups: (field) => (groups) => {
      const HIDDEN = new Set(['condition', 'customProperties']);
      return groups.filter(g => !HIDDEN.has(g.id));
    },
  });
  ```
  form-js 표준 hook. `:14241` 의 빈 그룹 자동 필터링이 부수효과로 이득. **Layout(columns)는 유지**(디자이너에 필요).

→ **권장 순서**: B로 즉시 가시 차단 → A로 정공 마이그레이션. 비용/리스크 낮음.

### 5.3 컴포넌트별 prop 정리

- **type 변경 (i18n → string)**: card.header, chartPlaceholder.{title, description}, modal.{title, description, triggerLabel}, tree.label
  - 단, 5.1 (B) widget 재정의를 택하면 propsSchema 변경 불필요.
- **숨김/제거 검토**:
  - `modal.portalContainerRef` — CSS selector 입력은 디자이너 사용자에게 부적절. dev-only로 propsSchema에서 제거하거나 advanced 토글 뒤로.
  - `tabs.defaultValue` — validateAndSanitize가 자동 fallback하므로 일반 사용자에겐 노출 부담. 숨김 권고.
  - `tree.label` — runtime에서 사용 안 함(dead prop). 제거 또는 form-js 표준 label 그룹으로 위임.

---

## 6. 결론 (한 페이지 요약)

| 영역 | 현재 노출 | 정리 후 | 수정 위치 |
|------|-----------|---------|-----------|
| **form-js General** | (빈) | (빈) — 변동 없음 | — |
| **form-js Condition** | `conditional-hide` 1줄 | **숨김** | `PropsPanelService` provider updater |
| **form-js Layout (columns)** | columns | **유지** | — |
| **form-js Custom properties** | properties[] | **숨김** | `PropsPanelService` provider updater |
| **PropsPanelContainer designer-props** | propsSchema 그대로 + i18n 위젯(ko/en) | propsSchema 그대로 + **string 위젯**으로 통일 | `widgetRegistry.register('i18n', ..., {overwrite:true})` |
| **PropsPanelContainer designer-layout** | row/columns/height | 유지 | — |
| **prop 카탈로그 (각 컴포넌트)** | 일부 dead/dev-only 포함 | 표 4.1~4.6의 "처리" 컬럼대로 정리 | 각 `propsSchema.ts` |

---

## 7. 컴포넌트별 "표시할 속성" 최소 권고

원칙:
- **그게 없으면 컴포넌트 의미가 무너지는 항목만** 표시.
- `key` / `description` / `id` / `versionTag` 는 모두 숨김 (디자이너 표시 의도와 무관, 개발자 메타).
- Validation 그룹은 **`required` entry만 노출**, 나머지(min/max/length/pattern/validationType)는 숨김.
- Condition / Appearance(adorner) / Serialization / Constraints / Security / Custom properties 그룹 전부 숨김.
- form-js Layout(columns) 그룹은 그리드 배치에 필수 → 유지 (별도 layout 섹션, 컴포넌트별 표에는 미기재).

### 7.1 form-js 기본 컴포넌트

| 카테고리 | 타입 | 표시 항목 | 비고 |
|---|---|---|---|
| 입력 | **textfield** | `label`, `defaultValue`, `required` | placeholder는 description이 담당하므로 생략 |
| 입력 | **textarea** | `label`, `defaultValue`, `required` | |
| 입력 | **number** | `label`, `defaultValue`, `required` | decimalDigits/step은 숨김 |
| 입력 | **checkbox** | `label`, `defaultValue`, `required` | |
| 입력 | **checklist** (Checkbox group) | `label`, `staticOptions`, `defaultValue`, `required` | defaultValue는 `values` 정의 후 노출됨 |
| 입력 | **radio** | `label`, `staticOptions`, `defaultValue`, `required` | |
| 입력 | **select** | `label`, `staticOptions`, `defaultValue`, `required` | searchable 숨김 |
| 입력 | **taglist** | `label`, `staticOptions`, `defaultValue`, `required` | defaultValue는 `values` 정의 후 노출됨 |
| 입력 | **datetime** | `subtype`, `date-label` 또는 `time-label`, `required` | 24h 토글/constraints 숨김 |
| 입력 | **filepicker** | `label`, `accept`, `multiple`, `required` | |
| 액션 | **button** | `label`, `action` | |
| 컨테이너 | **group** | `label` | path/showOutline/verticalAlignment 숨김 |
| 컨테이너 | **dynamiclist** | `label`, `defaultRepetitions` | allowAddRemove/disableCollapse/path 숨김 |
| 임베드 | **iframe** | `label`, `url`, `iframe-height` | sandbox는 dev-only, 숨김 |
| 데이터 | **table** | `label`, `dataSource`, `staticColumns` | pagination/rowCount 숨김 |
| 데이터 | **documentPreview** | `label`, `dataSource` | maxHeight 숨김 |
| 표시 | **text** (Text view) | `text` | |
| 표시 | **html** | `content` | |
| 표시 | **image** | `imageSource`, `altText` | |
| 레이아웃 | **spacer** | `spacer-height` | |
| 레이아웃 | **separator** | — | 표시할 항목 없음(빈 패널) |
| 표현식 | **expression** | `expression-expression` | computeOn 숨김 |
| 루트 | **default** (form root) | `id` | versionTag 숨김 |

### 7.2 우리 커스텀 컴포넌트 6종

| 타입 | 표시 항목 | 비고 |
|---|---|---|
| **card** | `header`, `headerTag`, `padding`, `elevation` | header는 string 위젯으로 표시 |
| **chartPlaceholder** | `chartType`, `title`, `description` | 둘 다 string 위젯 |
| **modal** | `title`, `triggerLabel`, `size` | description은 a11y용 보조라 숨김(필요 시 추가). `portalContainerRef` 숨김(개발자용) |
| **tabPanel** | `label` (탭 이름) | 이미 string |
| **tabs** | — | 표시 항목 없음(빈 패널). `defaultValue`는 자동 보정. `orientation`도 미사용이면 숨김. orientation 노출이 필요하면 1개만 추가. |
| **tree** | `dataSource`, `expandedByDefault`, `showGuides` | `label` dead prop 제거. `labelKey`/`childrenKey`는 dataSource 스키마와 1:1 결합 → 숨기고 기본값(`label`/`children`)으로 고정 권장 (필요 시 advanced 토글) |

### 7.3 노출 정책 한 줄 요약

> **"label + 그 컴포넌트의 본질을 결정짓는 1~3개의 데이터/시각 변수"** 만 노출. 나머지는 기본값 fallback에 맡기고 advanced 토글 또는 코드 편집기로 미룸.

---

## 8. 다음 액션 (제안)

1. **whitelist 기반 entry 필터** — 7장 표를 데이터(JSON/TS)로 빼고, `PropertiesProvider` updater에서 `groups → groups.map(g => ({...g, entries: g.entries.filter(e => WHITELIST[field.type]?.has(e.id))}))`. 빈 그룹은 form-js가 자동 숨김. 한 곳만 손대면 form-js 기본 + 커스텀 모두 일괄 적용.
2. **i18n 위젯 통일**: 5.1 (B) PlainStringLikeWidget을 `widgetRegistry`에 `overwrite` 등록 — propsSchema 손 안 댐.
3. **propsSchema 정리**: 4장 "숨김 검토" 항목 (modal.portalContainerRef, tabs.defaultValue, tree.label) 제거 또는 internal 표시.
4. **정공 마이그레이션**: `PropsPanelService.ts:78-87` 주석 부분 살려서 `registerProvider(2000, { getGroups: (field) => (groups) => filter(...) })` updater 계약으로 정식 등록.

각 단계는 단독 PR로 분리 가능. 1번이 가장 큰 효과 — 7장 표 그대로 적용하면 사용자가 원한 "표시 항목만" 상태가 즉시 완성됨.
