# tabs-tabpanel-refactor - 설계

## 요구사항 확인

현 Tabs 구조(Option B)를 form.io식 **"Tabs → TabPanel 서브필드"** 구조(Option A)로 근본 리팩터한다.

### 현 구조 (문제)
- `Tabs.tsx`는 단일 `tabs` 배열 필드를 갖고 있고, 각 탭의 자식은 `tabs[i].components` 배열에 저장된다.
- 렌더 시점(`Tabs.tsx` L77–80)에서 `tabId_<value>_<fieldId>` 라는 **pseudo field**를 즉석 생성해 `<ChildrenSlot field={pseudoField} />`에 넘긴다.
- 이 pseudo field는 `formFieldRegistry`에 **등록되지 않았다**. 그 결과:
  - form-js 내장 dragula drop routing이 `drop target id`를 `formFieldRegistry.get(id)`로 역조회할 때 실패해 **drop이 누락되거나 1번 탭으로만 라우팅**된다.
  - `formLayouter.getRows(pseudoId)` 역시 실제 row 추적이 불가능해 grid 복구가 부정확하다.
  - `CommandStack`이 field id 기반 undo/redo를 할 수 없어 탭 안 편집 이력이 깨진다.
- 사용자가 "탭 페이지"를 Properties Panel에서 개별 선택·편집하는 UX도 현재는 불가.

### 목표 구조 (Option A)
- `Tabs` 필드의 자식으로 **실제 등록된 `type: 'tabPanel'`** 필드를 두고, 각 tabPanel이 form-js `formFieldRegistry`에 고유 id로 등록된다.
- 각 tabPanel은 `components: []` 배열을 가지며 **커스텀 컨테이너 계약**(`escapeGridRender: false` + `ChildrenSlot` + `DesignerFormLayouter` override)을 만족한다.
- `Tabs.tsx`는 `field.components` (자식 = tabPanel들)를 순회하여 각 탭의 Radix `Trigger`/`Content`를 생성한다. Radix `value`는 **tabPanel.id**를 그대로 사용(단일 ID 정책).
- 결과적으로 form-js 내장 dragula / formFieldRegistry / CommandStack / DesignerFormLayouter / ChildrenSlot 이 **그 어떤 pseudo field 없이도** 자연스럽게 동작한다.

### 요구사항 체크리스트
1. `type: 'tabPanel'` 컴포넌트를 `designer-components`에 신규 추가(`escapeGridRender: false`, `group: 'container'`, `components: []`, `render`는 `<ChildrenSlot field={field} />`).
2. Tabs 스키마를 `tabs: TabItem[]` → **`components: TabPanelField[]`** 로 변경. `defaultValue`, `orientation` 속성 유지.
3. tabPanel field id 형식: `tabPanel_<uuid>`. Radix `Trigger.value` / `Content.value` = `tabPanel.id` (분리 없음, 단일화).
4. Properties Panel: Tabs 선택 시 `+ Add Tab` 버튼 + 각 tabPanel 삭제·순서변경(↑/↓) 버튼. tabPanel 개별 선택 시 `label` 편집 가능.
5. 팔레트: tabPanel은 **노출되지 않는다** (Tabs의 자식 전용 internal component).
6. **마이그레이션**: 기존 `tabs[i].components` 형식을 import 시점(`FormEditor.importSchema` 직전 훅)에 자식 tabPanel 필드로 자동 변환해 하위 호환 보장.
7. 테스트: 단위(create/migration/ChildrenSlot lookup) + E2E Playwright **visible** (각 탭 드롭 → 탭 간 독립 → tabPanel 개별 선택 → label 편집).

## 타겟 앱

- **경로**: `packages/designer-components/src/tabs` + `packages/designer-components/src/tabPanel` (신규) + `packages/designer-core/src/container` (Layouter/Slot 계약) + `packages/designer-editor-host/src/App.tsx` (import schema migration 훅) + properties panel propsSchema 확장
- **근거**:
  - 컴포넌트 구현 변경: `designer-components` (Tabs, 신규 tabPanel)
  - 커스텀 컨테이너 계약: `designer-core`의 DesignerFormLayouter `DESIGNER_CONTAINER_TYPES`에 `'tabPanel'`이 **이미 등록**되어 있음(L11). 구현체만 추가하면 됨.
  - 마이그레이션 훅: `App.tsx`의 `editor.importSchema(DEFAULT_SCHEMA)` 호출부 + 향후 외부 schema import 진입점 — `migrateLegacyTabsSchema(schema)` 함수를 호출자에서 1회 적용.

## 진입점 (Entry Points)

- **사용자 진입 경로**: 좌측 팔레트 → **'컨테이너'** 그룹 → **'탭'** 드래그 → 캔버스 드롭 → 상단 Tab 1/Tab 2 Trigger 클릭 시 독립 drop zone 표시 → Properties Panel에서 Tabs 선택 시 `+ Add Tab`로 새 tabPanel 추가, 특정 tabPanel Trigger 선택 시 해당 tabPanel의 `label`만 편집
- **URL / 라우트**: `http://localhost:5174/` (designer-editor-host Vite dev server 단일 route — designer-editor-host는 SPA 단일 페이지)
- **수정할 라우터 파일**: `packages/designer-editor-host/src/App.tsx` (editor host 엔트리, FormEditor 생성/임포트 지점 — importSchema 직전 migration 훅 삽입)
- **수정할 메뉴·네비게이션 파일**: 팔레트 그룹 레이블 정의 `packages/designer-editor-host/src/modules/PaletteModule.ts` (변경 최소, tabPanel은 숨김이므로 메뉴에 새 엔트리 없음 — 기존 container 그룹 유지 검증만)

## 설계 결정

### 결정 1: tabPanel 컴포넌트는 defineComponent로 등록하되 팔레트에서 숨긴다

**방식**: tabPanel은 반드시 `formFieldRegistry`에 존재해야(form-js의 `FormField` 컴포넌트가 `formFields.get('tabPanel')`로 조회) 렌더되지만, **좌측 팔레트 UI에서는 노출되면 안 된다**(사용자가 독립적으로 드롭할 수 없어야 함; Tabs의 자식으로만 생성).

**form-js 내부 동작 (확인됨)**:
- `collectPaletteEntries(formFields)` (`@bpmn-io/form-js-editor` `index.es.js` L1694)는 `Object.entries(formFields._formFields)` 를 열거해 `type !== 'default'` 만 남긴다.
- `groupEntries()`는 `PALETTE_GROUPS = [basic-input|selection|presentation|container|action]` 에 push — **알 수 없는 group이면 `undefined.entries.push` 크래시**.
- `formFields.get(type)` (`form-js-viewer` L6550)는 `this._formFields[type]`를 단순 인덱스 접근 — Proxy의 `get` trap을 통과.

**구현**:
`DesignerComponentsRegistration` (packages/designer-components/src/module.ts) 내부에서 `formFields._formFields`를 **Proxy로 교체**해 `ownKeys` / `getOwnPropertyDescriptor` 트랩에서 `'tabPanel'`을 숨긴다. 동시에 `formFields.get('tabPanel')`는 기본 `get` trap을 통과해 정상 반환된다.

```ts
const HIDDEN_PALETTE_TYPES = new Set(['tabPanel']);
const original = formFields._formFields;
formFields._formFields = new Proxy(original, {
  ownKeys: (t) => Reflect.ownKeys(t).filter((k) => !HIDDEN_PALETTE_TYPES.has(k as string)),
  getOwnPropertyDescriptor: (t, p) =>
    HIDDEN_PALETTE_TYPES.has(p as string) ? undefined : Reflect.getOwnPropertyDescriptor(t, p),
});
```

**대안 검토(기각)**:
- `group: 'hidden'` 사용 → `groupEntries()` 크래시.
- `collectPaletteEntries` 함수 monkey-patch → export 되지 않은 모듈 내부 함수.
- Palette 컴포넌트 전체 재구현 → 과잉 스코프.
- 초기화 시 `_formFields`에서 tabPanel 삭제 후 render 시 재삽입 → race condition & fragile.

### 결정 2: ID 단일화 — tabPanel.id == Radix Tab value

form-js field id와 Radix `Trigger.value`/`Content.value`를 **동일 문자열** (`tabPanel_<uuid>`)로 사용한다. 과거 Option B는 tab.value("tab1")와 field id를 분리 관리해 `tabId_<value>_<fieldId>` pseudo id 혼란을 유발했다. 단일화로 다음 이점:
- Radix Content에서 drop 시 drop target id = tabPanel.id → formFieldRegistry 직조회 가능
- outline/selection 이벤트도 단일 id 기준
- UUID 사용: `crypto.randomUUID()` (브라우저 표준 / Node 19+ — Vite dev 환경과 `jsdom` 테스트 모두 동작). fallback으로 `Math.random().toString(36)` 조합.

### 결정 3: Tabs 스키마 모양 & 유지·제거 속성

**신규 TabsSchema**:
```ts
interface TabsSchema {
  id: string;
  type: 'tabs';
  components: TabPanelField[];         // 자식 tabPanel 배열 (기존 tabs[] 대체)
  defaultValue?: string;                // ★ 유지 — 기본 선택 tabPanel.id (마이그레이션 시 첫 tabPanel.id 또는 value 매핑)
  orientation?: 'horizontal' | 'vertical';  // ★ 유지 — Radix orientation
  [key: string]: unknown;
}

interface TabPanelField {
  id: string;                  // 'tabPanel_<uuid>'
  type: 'tabPanel';
  label: string;               // 탭 표시 라벨 (사용자 편집 가능)
  components: FieldSchema[];   // 자식 form field 배열
  // keyed: false, pathed: false  (데이터 바인딩 없음 — 순수 컨테이너)
}
```

- **유지**: `defaultValue` (초기 선택 탭 제어), `orientation` (horizontal/vertical).
- **제거**: `tabs[]` 배열 속성. 기존 `tab.value` 개념은 tabPanel.id로 흡수.
- **tabPanel 자체 속성**: `label` 만 (propsSchema에 i18n string widget).

### 결정 4: 마이그레이션 훅 위치

**선택: `migrateLegacyTabsSchema(schema)` pure function + 호출자(editor-host App.tsx)가 `importSchema` 직전 1회 적용.**

**근거**:
- `FormEditor.importSchema`는 form-js 내부 API라 몽키패치하면 다른 호출 경로(테스트, 외부 통합)에서 누락될 수 있다.
- `DesignerComponentsModule` init에서 importSchema를 가로채기 불가(모듈은 DI 초기화 시점 1회 호출).
- pure function으로 분리하면: (1) 단위 테스트 용이, (2) ViewerHost의 `importSchema` 호출부도 동일 함수 재사용, (3) 하위 호환 로직의 단일 진실 공급원.

**함수 시그니처**:
```ts
// packages/designer-components/src/tabs/migrateLegacyTabsSchema.ts
export function migrateLegacyTabsSchema<T>(schema: T): T;
```
- 재귀적으로 `type: 'tabs'` 노드를 찾아 `tabs[]` 가 있으면 각 `TabItem` → `TabPanelField`로 변환.
- `tabs[i].value`는 tabPanel.id 기본값 후보(빈 것 방지); 정책상 새 `tabPanel_<uuid>` 생성. 단 `defaultValue`가 기존 `tab.value`를 참조하면 매핑 테이블로 교체.
- 이미 `components` 에 `type: 'tabPanel'`이 존재하는 스키마는 no-op (idempotent).
- 반환: 새 객체(mutation 없음).

**호출 지점**:
1. `packages/designer-editor-host/src/App.tsx`: `editor.importSchema(migrateLegacyTabsSchema(DEFAULT_SCHEMA))` (현재 기본 스키마는 비어 있어도 호출 경로 검증 목적).
2. (향후 확장) ViewerHost/EditorHost의 `importSchema` wrapper — 본 기능 범위 밖이나 동일 함수로 적용 가능하도록 export.

### 결정 5: Properties Panel UX

- Tabs 필드 선택 시 propsSchema에 **커스텀 `array` widget**(tabs 편집기)을 사용 — 단, 이번엔 `components` 배열(자식 tabPanel 들)을 읽어 list 표시. 각 row:
  - 텍스트(읽기 전용, tabPanel.label 미리보기)
  - ↑ ↓ 순서 변경 버튼 → `field.components` 배열 재정렬(CommandStack 발행)
  - × 삭제 버튼 → 해당 tabPanel 및 하위 자식들 제거
- 하단 `+ Add Tab` 버튼 → `{ id: 'tabPanel_<uuid>', type: 'tabPanel', label: 'Tab N', components: [] }` 를 append.
- 개별 tabPanel을 트리(Outline) 또는 Trigger 클릭으로 선택 시 Panel에 `label` (i18n string) 편집 필드 노출 — tabPanel propsSchema에 `label` 만 정의.

이 영역은 form-js-editor의 `propertiesPanel`이 schema/widget registry 기반으로 동작하므로, 기존 `designer-core/src/panel/` 의 `propsSchemaToPanel` + `PanelWidgetRegistry` 메커니즘을 재사용. 필요 시 새 `tabs-editor` 커스텀 widget 하나만 추가.

### 결정 6: 기존 Radix 렌더 구조는 유지, pseudo field만 제거

`Tabs.tsx`의 렌더 루프를 `field.tabs` → `field.components` 로 치환하고, 각 `TabsPrimitive.Content` 내부에 **자식 tabPanel을 `FormField`로 렌더**하지 않는다(그러면 tabPanel의 render가 또 `ChildrenSlot`을 렌더하여 이중 중첩 + 잘못된 드롭 zone 분리). 대신 Tabs가 **직접** 각 tabPanel의 drop zone을 자신의 Radix Content 안에 배치하기 위해, tabPanel 필드에 대해서도 `<ChildrenSlot field={tabPanel} />`를 Tabs 내부에서 호출한다. tabPanel은 여전히 registry에 등록되어 있으므로 `formLayouter.getRows(tabPanel.id)` 가 정상 작동.

**주의**: tabPanel의 `render` 함수도 `<ChildrenSlot field={field} />` 를 반환하지만, Tabs 가 tabPanel을 독립 field로 `FormField` 렌더하지 않고 직접 ChildrenSlot만 호출하므로 이중 렌더가 일어나지 않는다. tabPanel의 `render`는 outline/독립 편집 등 다른 경로(예: `formFieldRegistry.get`으로 외부가 직접 렌더)에서의 안전장치로 남긴다.

## 데이터 흐름

```
[팔레트 drag: '탭']
  ↓
Tabs.create() → { type: 'tabs', components: [tabPanel_A, tabPanel_B], defaultValue: tabPanel_A.id }
  ↓
importSchema → form-js가 재귀적으로 field를 formFieldRegistry.register
  ↓  (DESIGNER_CONTAINER_TYPES: 'tabs','tabPanel' 포함 → DesignerFormLayouter가 group으로 치환해 row 추적)
  ↓
Tabs.render(field):
  - field.components 를 Radix Trigger/Content로 매핑
  - 각 <Content value={tabPanel.id}>
      <ChildrenSlot field={tabPanel} />  ← tabPanel.id 기준 rows/formFieldRegistry 조회
    </Content>
  ↓
[사용자 drop into Tab B]
  ↓
dragula drop target = Content의 .fjs-drop-container-vertical (tabPanel_B.id 기준)
  ↓  form-js formEditor가 parent = tabPanel_B 로 child field insert → formFieldRegistry.register
  ↓  DesignerFormLayouter.calculateLayout(tabPanel_B) 재계산 → getRows(tabPanel_B.id)
  ↓
ChildrenSlot Rows 재렌더 → 새 자식이 Tab B 안에만 나타남
```

**Properties Panel**:
```
selection: tabs 필드 → array widget이 field.components (tabPanel[]) 조작
  + Add Tab → CommandStack: append to field.components
  × Delete / ↑↓ Reorder → CommandStack: splice/reorder

selection: tabPanel 필드 → string widget(label) 편집
```

## 파일 계획

**경로 기준:** 프로젝트 루트 (`/Users/jji/project/form-js-designer`)

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-components/src/tabPanel/index.tsx` | tabPanel 컴포넌트 정의 (defineComponent, `escapeGridRender: false`, `group: 'container'`, render: `<ChildrenSlot field={field} />`, create: `{ id: 'tabPanel_<uuid>', type: 'tabPanel', label, components: [] }`) | 신규 |
| `packages/designer-components/src/tabPanel/propsSchema.ts` | tabPanel propsSchema (`label`: i18n string only) + TabPanelField 타입 export | 신규 |
| `packages/designer-components/src/tabPanel/TabPanel.css` | tabPanel 기본 스타일 (대부분 container-base.css 재사용, 필요시 최소 wrapper) | 신규 |
| `packages/designer-components/src/tabs/Tabs.tsx` | pseudo field 로직 제거. `field.components` (tabPanel[]) 순회하여 Radix Trigger/Content + `<ChildrenSlot field={tabPanel} />` 사용. create() 시그니처 변경 (components: [tabPanel_A, tabPanel_B]) | 수정 |
| `packages/designer-components/src/tabs/propsSchema.ts` | TabsSchema에서 `tabs: TabItem[]` 제거, `components: TabPanelField[]` 추가. propsSchema에서 `tabs` 속성 제거, 신규 `tabs-editor` 커스텀 widget 참조 메타 추가 | 수정 |
| `packages/designer-components/src/tabs/migrateLegacyTabsSchema.ts` | pure 재귀 변환 함수. `tabs[]` → `components: tabPanel[]` + `defaultValue` 매핑, idempotent | 신규 |
| `packages/designer-components/src/tabs/uuid.ts` | `tabPanelId()` helper — `crypto.randomUUID()` + fallback | 신규 |
| `packages/designer-components/src/module.ts` | COMPONENTS 배열에 TabPanelComponent 추가. `DesignerComponentsRegistration` 내부에서 등록 후 `formFields._formFields`를 Proxy로 감싸 'tabPanel' 팔레트 숨김 | 수정 |
| `packages/designer-core/src/panel/widgets/TabsEditorWidget.tsx` | Tabs 필드용 array widget (자식 tabPanel 추가/삭제/순서변경 UI) | 신규 |
| `packages/designer-core/src/panel/PanelWidgetRegistry.ts` | `createDefaultRegistry`에 `tabs-editor` widget 등록 | 수정 |
| `packages/designer-editor-host/src/App.tsx` | `importSchema(DEFAULT_SCHEMA)` → `importSchema(migrateLegacyTabsSchema(DEFAULT_SCHEMA))` 로 migration 훅 삽입 | 수정 |
| `packages/designer-components/src/tabs/__tests__/Tabs.test.tsx` | 기존 테스트 업데이트 — pseudo field 기반 단언 제거, tabPanel child 기반으로 전환 | 수정 |
| `packages/designer-components/src/tabPanel/__tests__/TabPanel.test.tsx` | tabPanel.create()가 올바른 id 생성, render가 ChildrenSlot만 반환, keyed/pathed false | 신규 |
| `packages/designer-components/src/tabs/__tests__/migrateLegacyTabsSchema.test.ts` | legacy `tabs[]` → `tabPanel[]` 변환 검증, idempotent, defaultValue 매핑, 비-tabs 필드는 무변경 | 신규 |
| `packages/designer-components/test/module.unit.spec.ts` | tabPanel 등록 + Proxy로 팔레트 숨김 검증(`Object.entries(formFields._formFields)` 에 tabPanel 없음, `formFields.get('tabPanel')` 는 반환) | 수정 |
| `packages/designer-editor-host/e2e/tabs-tabpanel.spec.ts` | Playwright **visible** E2E: (1) Tabs 드롭, (2) Tab 1에 Text input 드롭, (3) Tab 2 Trigger 클릭 후 Text input 드롭 → Tab 1/2 각자 독립, (4) Tabs 선택 → `+ Add Tab`로 Tab 3 추가, (5) Tab 2 Trigger 선택 → label을 'Custom Tab'으로 편집 후 리렌더 확인 | 신규 |
| `packages/designer-core/src/container/DesignerFormLayouter.ts` | (확인만 — `'tabPanel'` 이미 DESIGNER_CONTAINER_TYPES에 포함, 수정 불필요) | 무변경 |
| `docs/features/tabs-tabpanel-refactor/design.md` | 본 설계 문서 | 신규 |
| `docs/features/tabs-tabpanel-refactor/state.json` | DFA 상태 `[dd]` 로 전이 (스크립트 자동 갱신) | 수정 |

## 리스크 & 완화

| # | 리스크 | 영향 | 완화 |
|---|------|------|-----|
| R1 | **Proxy 기반 팔레트 숨김이 form-js 버전 업그레이드 시 깨질 수 있음** (`_formFields` 내부 속성 접근) | Mid | 단위 테스트(`Object.entries(formFields._formFields)`)로 계약 명시화. form-js 버전 lock + version check README. 실패 시 대안: Palette 컴포넌트 override로 전환 |
| R2 | 기존 스키마를 사용 중인 저장된 form이 마이그레이션 함수 누락 경로로 import되면 "빈 Tabs" 렌더 | High (데이터 유실 아니지만 표시 오류) | `migrateLegacyTabsSchema`를 `@form-js-designer/designer-components`에서 export하고, 모든 `importSchema` 호출부(App.tsx, 향후 Viewer/Editor Host 래퍼)에서 의무 적용. idempotent 보장으로 다중 호출 안전 |
| R3 | tabPanel이 keyed=false라도 `formFieldRegistry`에 등록되어 outline/data path 수집에 노출됨 | Low | outline은 container 타입을 tree로 표시하는 것이 정상 동작. data path는 pathed=false로 suppress. 단위 테스트에서 tabPanel.pathed=false 검증 |
| R4 | Radix Tabs의 `defaultValue`가 tabPanel.id(uuid)라 사용자가 URL로 deep-link하기 어려움 | Low | Tabs 스펙상 내부 선택 상태는 URL과 무관. 필요 시 향후 별도 alias 속성 추가 |
| R5 | Tabs가 자식 tabPanel을 직접 ChildrenSlot으로 렌더 → tabPanel의 `render`는 실질적으로 호출되지 않을 수 있음 | Low | tabPanel.render는 outline 독립 렌더, 테스트, 추후 다른 소비자를 위한 안전장치로 유지. 문서화 |
| R6 | TabsEditorWidget이 CommandStack을 제대로 통합하지 않으면 undo/redo 깨짐 | High | 기존 array widget pattern(`designer-core/src/panel/widgets/`) 재사용하여 form-js propertiesPanel의 CommandStack API로만 변경을 발행. 단위 테스트에서 `editFormField` 액션 발행 검증 |
| R7 | Proxy 적용 타이밍: DesignerComponentsRegistration이 다른 모듈보다 늦게 초기화되면 Palette 첫 렌더에 tabPanel이 보일 수 있음 | Mid | `DesignerComponentsModule.__init__`이 form-js 내부 모듈보다 뒤에 실행됨을 App.tsx의 `additionalModules` 순서로 보장(이미 DesignerContainerModule 먼저 로드). Palette 컴포넌트는 React state로 초기값 캐싱하므로 **`formFields._formFields`를 모듈 init에서 즉시 Proxy 교체**하면 Palette mount 전에 적용됨 |
| R8 | `crypto.randomUUID()` 미지원 환경(구형 브라우저, 일부 jsdom 버전) | Low | fallback 구현 + unit test에 `vi.stubGlobal('crypto', undefined)` 분기 커버 |
| R9 | E2E Playwright에서 Radix Tab Trigger의 aria-orientation 변경 시 hit-testing 실패 | Low | `data-testid` 부여 + `page.locator('[role=tab]').nth(n).click()` 로 안정화 |

## QA 체크리스트

### 단위 테스트
- [ ] `tabPanel.create({ label: 'X' })` 가 `{ id: /^tabPanel_[0-9a-f-]+$/, type: 'tabPanel', label: 'X', components: [] }` 를 반환한다
- [ ] `tabPanel` 의 `keyed: false`, `pathed: false`, `escapeGridRender: false` 가 설정되어 있다
- [ ] `migrateLegacyTabsSchema({ type: 'tabs', tabs: [{value:'a', label:'A', components:[{id:'x', type:'textfield'}]}] })` 가 `components: [{ id: 'tabPanel_*', type:'tabPanel', label:'A', components:[{id:'x',...}] }]` 로 변환된다
- [ ] `migrateLegacyTabsSchema`가 이미 신포맷 스키마에 대해 **no-op** (idempotent) 이다
- [ ] `migrateLegacyTabsSchema`가 `defaultValue`를 구 `tab.value`에서 새 tabPanel.id 로 매핑한다 (없으면 첫 tabPanel.id fallback)
- [ ] `DesignerComponentsRegistration`이 tabPanel 등록 후 `Object.entries(formFields._formFields)`에서 'tabPanel'이 **빠져** 있다
- [ ] 동시에 `formFields.get('tabPanel')` 은 정상적으로 TabPanelComponent를 반환한다
- [ ] `Tabs.create()`는 2개의 기본 tabPanel 자식을 포함한 `{ type:'tabs', components: TabPanelField[], defaultValue: <첫 tabPanel.id>, orientation:'horizontal' }` 를 반환한다
- [ ] Tabs render는 `field.tabs`가 아닌 `field.components` 를 순회한다 (`Tabs.test.tsx` 스냅샷 변경)

### E2E 테스트 (Playwright **visible** 필수)
- [ ] Dev server 기동 → `playwright` headed 모드 진입, profile lock 방지 위해 `pkill chrome` 선행
- [ ] 팔레트에서 '탭' 을 캔버스에 드롭 → 기본 2개 Tab Trigger (Tab 1 / Tab 2) 렌더
- [ ] **팔레트에 'tabPanel'이 노출되지 않음** (locator `[data-field-type=tabPanel]` 개수 = 0 in palette)
- [ ] Tab 1 활성 상태에서 텍스트 input을 드롭 → Tab 1 Content 내부에만 나타남
- [ ] Tab 2 Trigger 클릭 → 활성 전환 → 텍스트 input 드롭 → Tab 2 Content 내부에만, Tab 1에는 영향 없음
- [ ] Tabs 필드 선택 후 Properties Panel `+ Add Tab` 버튼 클릭 → Tab 3 추가됨, Trigger 3개
- [ ] Tab 2 Trigger 선택 (individual tabPanel selection) → Properties Panel에 `label` 필드만 노출 → 'Custom Tab' 입력 후 리렌더 시 Trigger 텍스트 업데이트
- [ ] Tab 3 삭제 버튼 → Trigger 2개로 복귀, 자식 필드도 제거됨
- [ ] undo (Ctrl/Cmd+Z) → 삭제 취소 검증 (CommandStack 통합)
- [ ] **brw-test 스크린샷 1장** (`docs/features/tabs-tabpanel-refactor/brw-test.png`) 저장 — WP 리더 브라우저 검증 규칙 준수
- [ ] 완료 보고에 `brw-test OK` 한 줄 시그널 포함

### 회귀 방지
- [ ] 기존 `packages/designer-components/src/__tests__/Tabs.test.tsx` 의 pseudo field 단언은 제거되고 신규 구조 단언으로 교체
- [ ] `DesignerFormLayouter` 단위 테스트(또는 스모크)에서 `tabPanel` 타입이 `DESIGNER_CONTAINER_TYPES`에 포함되어 커스텀 container 경로를 탄다는 것 재확인
- [ ] `packages/designer-editor-host/e2e/editor.dragdrop.spec.ts` 기존 E2E 실행 시 Tabs 시나리오 green 유지 (pseudo field 의존 없음 확인)

## 동작 보존 계약 (behavior preservation)

본 설계의 "파일 계획" 표와 "QA 체크리스트"에 기술된 동작은 이후 Build/Test/Refactor 단계에서 변경되지 않는다. 특히 Refactor는 이 설계의 기능/동작을 바꾸지 않고 품질만 개선하며, dev-build가 생성한 단위 테스트(migrateLegacyTabsSchema idempotency, Proxy 기반 팔레트 숨김, tabPanel.create 계약)가 동작 보존 검증의 기준선이 된다.
