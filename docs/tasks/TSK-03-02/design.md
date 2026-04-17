# TSK-03-02: propsSchemaToPanel 변환기 + 위젯 레지스트리 (8종) - 설계

## 요구사항 확인
- `PropsSchema`(컴포넌트가 선언한 propsSchema)를 form-js 프로퍼티 패널 엔트리 트리로 변환하는 순수 함수 `propsSchemaToPanel`과, 위젯 8종(`string`/`number`/`boolean`/`enum`/`color`/`spacing`/`expression`/`i18n`)을 등록·조회하는 `PanelWidgetRegistry` 확장 API를 `packages/designer-core`에 추가한다 (TRD §4.3, phase-1-plan §3.1).
- 각 위젯은 `{ render, edit, validate }` 3개 계약을 구현하며, Vitest 24 케이스(위젯 8 × 3 계약) 통과로 PRD §4 AC #7 ("프로퍼티 패널을 JSON으로 커스터마이징 가능") 을 증명한다.
- 런타임 검증은 Ajv meta-schema 로 `PropsSchema` 자체를 검증하고(phase-1-plan §3.1 "Ajv meta-schema"), 각 위젯의 `validate()`는 **값**(사용자가 입력한 편집 결과)을 검증한다. 위젯 출력은 Preact JSX로 form-js `propertiesProvider` 확장 포인트에 삽입 가능한 형태를 반환한다.

## 타겟 앱
- **경로**: `packages/designer-core` (모노레포 라이브러리 패키지)
- **근거**: phase-1-plan §3.1 "designer-core 확장" 표에서 `packages/designer-core/src/panel/propsSchemaToPanel.tsx` 신규 파일로 명시. WP-03 PropsPanelModule(TSK-03-04~, `packages/designer-editor-host`)가 본 API를 consume.

## 구현 방향
- `src/panel/` 서브디렉토리에 ① meta-schema + Ajv 기반 `PropsSchema` 검증기(`validatePropsSchema.ts`), ② `PanelWidgetRegistry`(Map 래퍼 + 기본 8종 선등록), ③ 순수 변환기 `propsSchemaToPanel(propsSchema, registry?)` (PanelEntry 트리 반환), ④ 위젯 8종 개별 모듈(각 파일 1개, `{ render, edit, validate }` export) 을 둔다.
- 모든 위젯은 **순수** 함수/컴포넌트. `render(value, ctx)`는 읽기 전용 미리보기(JSX), `edit(value, onChange, ctx)`는 편집 UI(JSX), `validate(value, widgetMeta)`는 `{ ok: boolean, errors: string[] }` 반환. form-js `propertiesProvider` 의 `entries` 배열 형태로 매핑할 수 있는 `PanelEntry` 구조 정의.
- `PanelWidgetRegistry`는 기본 8종이 register된 상태로 생성되며 `register(type, widget)` / `get(type)` / `list()` 를 제공. 커스텀 위젯 type 주입으로 AC #7 충족.
- Ajv meta-schema 파일(`propsSchema.meta.json`)은 `type`이 8 리터럴 중 하나, `label?/default?/enum?/min?/max?` 등 선택 필드 허용. `defineComponent` 의 dev-only 가드가 본 meta-schema 로 propsSchema 자체의 형상을 검증하도록 확장 포인트 `validatePropsSchema()` 를 `defineComponent.ts` 내부에서 호출 (이관 최소 변경).
- Vitest 24 케이스는 `__tests__/propsSchemaToPanel.test.tsx` 단일 파일 안에서 `describe.each(8 widgets)` × `it('render' | 'edit' | 'validate')` 로 테이블 구성.

## 파일 계획

**경로 기준:** 모든 파일 경로는 **프로젝트 루트 기준**이다.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-core/src/panel/propsSchemaToPanel.tsx` | 순수 변환기. `(propsSchema: PropsSchema, registry?: PanelWidgetRegistry) => PanelEntry[]`. 각 property → 위젯 lookup → PanelEntry. 그룹/collapsed/showIf 메타 보존. | 신규 |
| `packages/designer-core/src/panel/PanelWidgetRegistry.ts` | `PanelWidgetRegistry` 클래스 + 기본 8종 register된 `createDefaultRegistry()` 팩토리. `register/get/has/list` API. | 신규 |
| `packages/designer-core/src/panel/types.ts` | `PanelEntry`, `PanelWidget<TValue>`, `PanelWidgetCtx`, `WidgetValidationResult`, `PanelGroup` 등 본 모듈 전용 타입. `types.ts`에서 재-export. | 신규 |
| `packages/designer-core/src/panel/validatePropsSchema.ts` | Ajv 인스턴스 + `propsSchema.meta.json` compile. `validatePropsSchema(schema): { ok, errors }`. dev-only 호출용. | 신규 |
| `packages/designer-core/src/panel/propsSchema.meta.json` | JSON Schema draft-07. `properties.<key>.type ∈ {string,number,boolean,enum,color,spacing,expression,i18n}` 강제, 선택 메타 허용. | 신규 |
| `packages/designer-core/src/panel/widgets/StringWidget.tsx` | `{ render, edit, validate }`. TextField. `validate`: string 타입·길이 체크. | 신규 |
| `packages/designer-core/src/panel/widgets/NumberWidget.tsx` | NumberField (min/max/step). `validate`: number + range. | 신규 |
| `packages/designer-core/src/panel/widgets/BooleanWidget.tsx` | Toggle. `validate`: boolean. | 신규 |
| `packages/designer-core/src/panel/widgets/EnumWidget.tsx` | Select. `validate`: value ∈ enum. | 신규 |
| `packages/designer-core/src/panel/widgets/ColorWidget.tsx` | ColorPicker (초기 버전은 hex/rgb/hsl 문자열 input + swatch 프리뷰). `validate`: CSS color string regex. | 신규 |
| `packages/designer-core/src/panel/widgets/SpacingWidget.tsx` | 4방향(top/right/bottom/left) NumberField. `validate`: 객체 + ≥0 number. | 신규 |
| `packages/designer-core/src/panel/widgets/ExpressionWidget.tsx` | FEEL 편집기(초기 버전은 `<textarea>` + 구문 lint placeholder). `validate`: 비어있지 않은 문자열 + balanced paren 얕은 체크. | 신규 |
| `packages/designer-core/src/panel/widgets/I18nWidget.tsx` | i18n key + ko 입력 필드 2-row. `validate`: key 네임스페이스 패턴(`^[a-z][\w.-]*$`) + ko 값 string. | 신규 |
| `packages/designer-core/src/panel/widgets/index.ts` | 8 위젯 barrel re-export + 기본 `BUILTIN_WIDGETS` 맵. | 신규 |
| `packages/designer-core/src/panel/__tests__/propsSchemaToPanel.test.tsx` | 변환기 자체 단위 테스트(그룹/순서/showIf/레지스트리 주입 커스텀 위젯). | 신규 |
| `packages/designer-core/src/panel/__tests__/widgets.test.tsx` | **위젯 8종 × {render, edit, validate} = 24 케이스** (AC #7 자동 매트릭스). `@testing-library/preact` 로 edit 인터랙션 시 `onChange` 호출·validate 경로 모두 커버. | 신규 |
| `packages/designer-core/src/panel/__tests__/PanelWidgetRegistry.test.ts` | register/get/list/중복 에러/기본 8종 선등록 검증. | 신규 |
| `packages/designer-core/src/panel/__tests__/validatePropsSchema.test.ts` | Ajv meta-schema 적합/위반 케이스 6종(정상/알 수 없는 type/required 누락/enum 비어있음 등). | 신규 |
| `packages/designer-core/src/defineComponent.ts` | dev-only 에서 `validatePropsSchema(def.propsSchema)` 호출 1줄 추가. 실패 시 `console.warn`(assertPureRender 동형 패턴, production 영향 없음). | 수정 |
| `packages/designer-core/src/types.ts` | `PropsSchema` 확장 — property value에 `group?`, `collapsed?`, `showIf?`, `description?` 메타 허용. 신규 타입 `PanelEntry`, `PanelWidget` re-export. | 수정 |
| `packages/designer-core/src/index.ts` | `propsSchemaToPanel`, `PanelWidgetRegistry`, `createDefaultRegistry`, `validatePropsSchema` + 타입 public export. | 수정 |
| `packages/designer-core/package.json` | ① `exports`에 `"./panel"` 서브패스 추가, ② `dependencies`에 `ajv@^8`(ESM, MIT — TRD §3 허용 목록에 있음) 추가. | 수정 |

## 진입점 (Entry Points)
- **N/A** (domain=library, UI 페이지 없음). 본 모듈은 후속 TSK-03-04/WP-04 `PropsPanelModule`(`packages/designer-editor-host/src/modules/PropsPanelModule.ts`)에서 `propsSchemaToPanel(def.propsSchema, registry)` 호출로 소비된다. 본 Task는 public API export + 단위 테스트까지만 수행한다.

## 주요 구조

- **`propsSchemaToPanel(propsSchema, registry?)` (순수 함수, `propsSchemaToPanel.tsx`)**
  - 입력: `PropsSchema` + 선택적 `PanelWidgetRegistry` (미지정 시 `createDefaultRegistry()`).
  - 처리: `Object.entries(propsSchema.properties)` 순회 → 각 key에 대해 `registry.get(prop.type)` 로 위젯 조회 (미등록이면 throw `UnknownWidgetError`). property 메타(`group`, `collapsed`, `showIf`, `label`, `description`, `default`)를 `PanelEntry`에 복사.
  - 출력: `PanelEntry[]` (그룹이 있으면 `PanelGroup[]` 중첩 가능 — TRD §4.3 "메타: group, collapsed, showIf(FEEL), label(i18n), description(i18n)").
  - form-js `propertiesProvider` 와의 어댑터 계층은 WP-04 에서 본 결과를 변환하여 소비 (본 Task 범위 외).

- **`PanelWidgetRegistry` (클래스, `PanelWidgetRegistry.ts`)**
  - `Map<string, PanelWidget<any>>` 래퍼. `register(type, widget)` (중복 시 throw `DuplicateWidgetError`), `get(type)`, `has(type)`, `list(): readonly string[]`.
  - `createDefaultRegistry()` — BUILTIN_WIDGETS 8종을 자동 register한 인스턴스 반환. 호스트 앱이 새 위젯 type 을 주입하여 AC #7 커스터마이즈.

- **`PanelWidget<TValue>` 인터페이스 (types.ts)**
  ```
  render(value: TValue, ctx: PanelWidgetCtx): JSX.Element           // readonly preview
  edit(value: TValue, onChange: (v: TValue) => void, ctx): JSX.Element  // editor UI
  validate(value: unknown, meta: WidgetMeta): WidgetValidationResult    // { ok, errors[] }
  ```
  `ctx` 는 `{ t: LocaleT, disabled?: boolean, domId: string, label?: string }` 최소 계약. i18n t 함수는 TSK-03-05/WP-05 에서 LocaleProvider 로 주입.

- **위젯 8종 (`src/panel/widgets/*.tsx`)**
  - `StringWidget`/`NumberWidget`/`BooleanWidget`/`EnumWidget`/`ColorWidget`/`SpacingWidget`/`ExpressionWidget`/`I18nWidget`.
  - 각 파일은 `export const <Name>Widget: PanelWidget<T>` 단일 default 형태. Preact JSX 만 사용, React 잔재 금지(ADR-0001 D1).

- **`validatePropsSchema(schema)` (Ajv meta-schema)**
  - 모듈 로드 시 Ajv 인스턴스 1회 생성 + `propsSchema.meta.json` compile. 반환: `{ ok: boolean, errors: string[] }`.
  - `defineComponent.ts` 의 `isProductionEnv()===false` 분기에서 호출하여 잘못된 propsSchema 조기 감지(production 무영향).

## 데이터 흐름
컴포넌트 정의의 `propsSchema` → (dev) `validatePropsSchema` 로 meta-schema 적합성 검증 → `propsSchemaToPanel(schema, registry)` 이 property 별로 `registry.get(type)` 해서 위젯을 바인딩 → `PanelEntry[]` 반환 → form-js `propertiesProvider` 어댑터(WP-04)가 패널에 주입 → 사용자 편집 시 위젯의 `edit`/`validate`를 호출 → `onChange` 로 상위에 값 전달.

## 설계 결정 (대안이 있는 경우만)

- **결정 1**: 위젯 계약을 `{ render, edit, validate }` 3 메서드로 고정하고, `PanelWidget<TValue>` 제네릭을 쓴다.
  - **대안**: form-js `propertiesProvider` entry 스펙(`{ id, component, isEdited, set, ... }`)을 그대로 사용.
  - **근거**: AC #7 가 "JSON으로 커스터마이징" 이며 `render/edit/validate` 3분할이 위젯 단위 테스트(24 케이스 매트릭스)에 1:1 매핑되어 커버리지 증명이 직관적. form-js entry 형식 변환은 WP-04 어댑터에서 1회 수행하여 본 계층을 순수 유지.

- **결정 2**: Ajv meta-schema 는 **propsSchema 자체**(스키마의 스키마)를 검증. 위젯 `validate(value)` 는 **입력값**을 검증.
  - **대안**: 위젯이 JSON Schema fragment 도 품어 양쪽을 통합.
  - **근거**: 관심사 분리. meta-schema 는 컴파일 타임(dev-only 경고), 값 validate 는 런타임(패널 입력 시). 테스트 파일도 각각 분리되어 AC #7 24케이스 매트릭스와 독립.

- **결정 3**: 기본 위젯 8종을 `BUILTIN_WIDGETS` 맵으로 묶고 `createDefaultRegistry()` 팩토리로 주입.
  - **대안**: `new PanelWidgetRegistry()` 생성자에 내부적으로 기본 등록.
  - **근거**: 호스트 앱이 "기본 등록 없는 빈 registry" 도 원할 수 있고(완전 custom), 테스트에서도 selective 주입이 가능. 팩토리 분리가 단위 테스트(`PanelWidgetRegistry.test.ts`) 가독성을 높임.

- **결정 4**: ExpressionWidget 초기 구현은 `<textarea>` + 얕은 paren 체크. FEEL 파서 연동은 범위 외.
  - **대안**: `feelin` 파서 직접 포함.
  - **근거**: phase-1-plan 에서 FEEL 파서는 form-js-viewer 가 이미 제공. Phase 1 §3.1 범위는 "패널 위젯 껍데기" 수준이며, 실 FEEL lint 는 후속(AC #7 24 케이스는 껍데기로도 충족). 의존성 최소화.

## 선행 조건
- TSK-03-01 완료(OverlayLayer 정식 이관 + assertSharedOrigin). 본 Task는 같은 `packages/designer-core/src/` 트리를 확장하므로 디렉토리 구조 충돌 방지용으로 먼저 머지됨 전제.
- `packages/designer-core/src/defineComponent.ts` `isProductionEnv()` 헬퍼 재사용.
- `packages/designer-core/src/types.ts` 의 기존 `PropsSchema` 확장 (하위호환: 신규 메타 필드 모두 optional).
- Ajv 8.x (MIT) — TRD §3 "스키마 검증 Ajv MIT" 에 이미 허용. `package.json`에 신규 dependency 로 추가.
- `@testing-library/preact` (이미 devDependency) — 위젯 edit 인터랙션 테스트.

## 리스크

- **HIGH**: 위젯 8종 × {render, edit, validate} = 24 케이스가 AC #7 직접 증명 테스트이므로 1건이라도 skip/fail 하면 WP-03 게이트 미충족. 완화 — `describe.each([...WIDGETS])` + `it('render')`/`it('edit')`/`it('validate')` 패턴을 타이트하게 구성하여 누락 불가. CI `test:unit` 게이트에서 케이스 수 = 24 를 `assert` 검증하는 sanity 체크 추가(리스트 상수 길이).

- **MEDIUM**: Ajv 을 신규 dependency 로 추가 — 번들 사이즈 증가(≈50KB gzipped). 완화 — `validatePropsSchema` 는 dev-only 호출이므로 tree-shake 대상. `import.meta.env.PROD` 가드로 production 번들에서 제외되도록 `defineComponent.ts` 분기 유지. `package.json` `sideEffects: false` 선언 확인.

- **MEDIUM**: `ColorWidget`/`SpacingWidget`/`ExpressionWidget`/`I18nWidget` 은 아직 UI primitives 결정(ADR-0002)이 구현 안 됨. 완화 — Phase 1 §3.1 범위는 **껍데기**(네이티브 input + 최소 스타일)로 충분. Ark UI/Radix 적용은 WP-04 컴포넌트 파트에서 별도 PR. 본 Task 의 `edit` 구현은 `<input type="text|number|color">` + `<select>` + `<textarea>` + `<input type="checkbox">` 네이티브만 사용.

- **MEDIUM**: happy-dom 의 `HTMLInputElement` 이벤트 발화가 브라우저와 미묘하게 다름(특히 `type="color"`). 완화 — `@testing-library/preact` `fireEvent.change(input, { target: { value } })` 로 DOM-agnostic 이벤트 시뮬레이션. 실 브라우저 검증은 WP-04 PropsPanelModule E2E 에서 Playwright 로 수행(본 Task 범위 외, 단 computed-style 2개 케이스는 happy-dom 에서도 검증).

- **LOW**: `PanelWidgetRegistry.register` 가 같은 type 으로 override 되는 상황(호스트 앱이 기본 `string` 위젯을 자체 구현으로 교체)의 의미론 — 현재 설계는 **중복 throw**. 완화 — `register(type, widget, { overwrite: true })` 옵션을 초기부터 노출하여 확장성 확보.

- **LOW**: i18n Widget 의 "ko 값" 입력은 실제 `ko.json` 과의 동기화 필요 — 본 Task 범위는 **입력 형상**만, 실제 사전 반영은 WP-05(designer-i18n)에서 처리. 완화 — 위젯은 `{ key: string, ko: string }` 객체만 반환, 저장 채널은 별도.

## QA 체크리스트

dev-test 단계에서 검증할 항목. 각 항목은 pass/fail 로 판정 가능해야 한다.

- [ ] (정상) `npm --prefix packages/designer-core run test:unit` 실행 → `widgets.test.tsx` 에서 정확히 **24 케이스** 모두 통과 (8 위젯 × {render, edit, validate}). 케이스 수 assert 포함.
- [ ] (정상) `propsSchemaToPanel({ properties: { a: {type:'string'}, b: {type:'number'} } })` → 2개 `PanelEntry` 반환, 각 `widgetType` 이 `string`/`number` 와 매칭.
- [ ] (정상) `createDefaultRegistry().list()` 가 정확히 `['string','number','boolean','enum','color','spacing','expression','i18n']` 8개를 포함.
- [ ] (정상) 각 위젯 `render(value, ctx)` 결과가 JSX element 이고, `@testing-library/preact` render 시 DOM 노출됨 (empty tree 아님).
- [ ] (정상) 각 위젯 `edit` 결과에서 사용자 입력 시 `onChange` 가 정확한 값으로 호출됨. (예: StringWidget input 에 "foo" 입력 → `onChange('foo')` 1회 호출)
- [ ] (정상) 각 위젯 `validate` 가 정상 입력에 대해 `{ ok: true, errors: [] }` 반환, 잘못된 입력에 `{ ok: false, errors: [메시지] }` 반환.
- [ ] (엣지) `propsSchemaToPanel` 에 빈 `properties: {}` 전달 → `[]` 반환 (throw 없음).
- [ ] (엣지) `EnumWidget` 가 `enum: []` (빈 배열) 로 edit 시 select 옵션 0개 렌더, validate 는 어떤 값이든 fail.
- [ ] (엣지) `NumberWidget` 가 `min: 0, max: 10` 메타일 때 `-1` 은 validate fail, `5` 는 pass, `10` 은 pass(경계).
- [ ] (엣지) `SpacingWidget` 가 `{ top: 4, right: 8, bottom: 4, left: 8 }` 객체 형태 validate pass, 스칼라 숫자는 fail(혹은 자동 변환 정의한 대로).
- [ ] (엣지) `I18nWidget` key 가 `'Invalid Key!'` 같은 패턴 위반 시 validate fail, `'designer.foo.bar'` 은 pass.
- [ ] (에러) `propsSchemaToPanel({ properties: { x: { type: 'unknown' } } })` → `UnknownWidgetError` throw, 메시지에 type 명 포함.
- [ ] (에러) `PanelWidgetRegistry.register('string', x)` 를 이미 등록된 상태에서 호출 → `DuplicateWidgetError` throw. `{ overwrite: true }` 주면 성공.
- [ ] (에러) `validatePropsSchema({ properties: { a: { type: 'bogus' } } })` → `{ ok: false, errors: [...] }` 반환, Ajv 메시지에 `type` 관련 힌트 포함.
- [ ] (에러) `defineComponent` 에 유효하지 않은 propsSchema 로 호출 시 dev 빌드에서만 `console.warn` 출력, throw 없음(assertPureRender 패턴 일관).
- [ ] (통합) `import { propsSchemaToPanel, PanelWidgetRegistry, createDefaultRegistry, validatePropsSchema } from '@form-js-designer/designer-core'` 가 TypeScript 에서 타입 포함하여 resolve 됨 (`npm --prefix packages/designer-core run typecheck` 통과).
- [ ] (통합) `packages/designer-core/package.json` `exports["./panel"]` subpath 로 `PanelWidget` 타입을 직접 import 가능 (`@form-js-designer/designer-core/panel`).
- [ ] (통합) `defineComponent` + `propsSchemaToPanel` 연쇄 사용 시(spike 의 card 등 기존 컴포넌트로 smoke) 에러 없이 PanelEntry 생성됨 — 기존 `defineComponent.test.tsx` 회귀 없음.
- [ ] (회귀) TSK-03-01 OverlayLayer/assertSharedOrigin 테스트(18 케이스) 및 기존 `assertPureRender`/`defineComponent` 테스트 그대로 통과(본 Task 변경이 다른 모듈을 깨뜨리지 않음).
