# TSK-06-02: PropsPanel + LivePreview + Validate + Export 모듈 - 설계

## 요구사항 확인
- `packages/designer-editor-host`(TSK-06-01에서 생성되는 호스트 앱 패키지) 안에 **PropsPanelModule · LivePreviewModule · ValidateModule · ExportModule** 4종을 추가하여 PRD §4 AC #3(JSON 저장·불러오기) / #4(round-trip 무손실) / #4-1(WYSIWYG 픽셀 파리티) / #7(propsSchema 기반 자동 패널)을 충족한다. form-js-editor 본체는 수정하지 않고(TRD §7.3, phase-1-plan §3.4) `additionalModules` 및 Preact 상위 래퍼로만 확장한다.
- `PropsPanelModule`은 form-js-editor의 `propertiesProvider` 확장 포인트에 `designer-core`의 `propsSchemaToPanel` + 기본 8종 `PanelWidgetRegistry`를 어댑터로 연결하여, 컴포넌트 정의가 선언한 `propsSchema`만으로 패널이 자동 생성되도록 만든다(TRD §4.3, TSK-03-02 산출물 소비). `LivePreviewModule`은 `EditorHost`의 형제 또는 별도 슬롯에 `ViewerHost`를 임베드하고 에디터의 `changed`(또는 form-js-editor 이벤트버스 `formEditor.view.change` 상당) 이벤트 구독으로 스키마 변경을 즉시 반영하며, ADR-0001 §3 D5(Viewport·Theme·Data·Locale 패리티)를 준수한다.
- `ValidateModule`은 designer-core의 Ajv 의존을 재사용(packages/designer-core/package.json dep)하여 form-js 스키마 + 신규 컴포넌트 `propsSchema`를 런타임 검증하고, `ExportModule`은 현재 스키마를 JSON 파일 다운로드로 내보내거나 `designer-cli publish` 호출을 위한 입력(파일 경로 + target)을 생성한다. Playwright E2E `editor.propspanel.spec.ts` + `editor.livepreview.spec.ts` 통과, AC #4-1 픽셀 파리티(pixelmatch diff ≤ 0.1%) 유지가 수용 기준.

## 타겟 앱
- **경로**: `packages/designer-editor-host` (모노레포 신규 호스트 앱 패키지, TSK-06-01에서 골격 생성).
- **근거**: WBS §WP-06 및 phase-1-plan §3.4 "designer-editor 확장" 표가 4 모듈의 파일 경로를 `packages/designer-editor-host/src/modules/*.ts`로 명시. TSK-06-01이 `package.json`·`tsconfig.json`·`vite.config.ts`·`App.tsx`·`index.ts`·`PaletteModule`·`OutlineModule`을 생성하므로, 본 Task는 그 위에 4개 모듈을 증분 추가하고 `App.tsx`에 배선한다.

## 구현 방향
- **모듈 구성 — form-js additionalModules 패턴 통일**: form-js-editor의 DI(didi) 컨테이너에 각 모듈을 `[ 'type', ServiceClass ]` 또는 `{ __init__, ServiceClass }` 매니페스트로 선언한다. 4개 모듈 모두 `{ __init__: [...], <serviceName>: [ 'type', Implementation ] }` 매니페스트를 export하여 `new FormEditor({ additionalModules: [ PropsPanelModule, LivePreviewModule, ValidateModule, ExportModule ] })`에 묶어 넣는다. form-js 본체 수정 0건 원칙(TRD §7.3, phase-1-plan §5 D-P1-1).
- **PropsPanelModule 어댑터**: form-js-editor의 `propertiesProvider` 확장 포인트를 프록시한다.
  - 호스트 앱이 선택된 필드를 감지 → 해당 필드의 `type`으로 `formFieldRegistry.get(type)`의 컴포넌트 정의를 조회 → 정의의 `propsSchema`를 `propsSchemaToPanel(schema, registry)`로 변환 → 결과 `PanelEntry[]`를 form-js-editor의 패널 entry 스펙(`{ id, component, isEdited, set, ... }`)으로 매핑하는 **`panelEntryAdapter(entry, fieldCtx)`** 어댑터 헬퍼로 1:1 변환. 어댑터는 `designer-editor-host/src/modules/PropsPanelModule.ts`에 함께 위치.
  - 위젯 `edit`/`validate` 호출 결과 → form-js가 기대하는 `{ isEdited: boolean, set: (value, field) => void }` 훅으로 연결. `set`은 form-js-editor의 `modeling.editFormField(field, { [propKey]: value })`를 호출하여 스키마를 갱신한다.
  - LocaleProvider 컨텍스트는 호스트 앱 상위에서 이미 주입되므로 PropsPanel widget은 `useT()`로 `designer-core/i18n`의 기본 fallback을 쓰며, WP-07 `designer-i18n` 머지 후 ko 실사전으로 교체된다(계약은 TSK-03-03에서 고정).
- **LivePreviewModule**: 호스트 앱 레이아웃의 우측 패널 영역에 별도 root(`#live-preview-root`)를 두고, `ViewerHost` 인스턴스를 `preact.render`로 마운트한다.
  - form-js-editor의 이벤트 버스에서 `formEditor.changed` (또는 현재 버전 이벤트명; form-js-editor 1.21.x 기준 `formEditor.view.change`/`commandStack.changed`를 구독)를 구독하여 디바운스 없이 즉시 `viewerHost.setProps({ schema: editor.getSchema() })`를 호출. 디바운스를 쓰지 않는 이유는 픽셀 파리티(#4-1)는 **같은 스키마**에 대한 동기 렌더가 필요하기 때문. 편집기가 `changed` 이벤트를 빈번 발화하더라도 Preact의 시차 re-render로 버블링 커스트는 낮다.
  - ADR D5 패리티는 ① **Viewport**: `useViewportWidth` 훅으로 에디터 캔버스 폭을 측정 → LivePreview에 동일 `viewport` prop으로 전달, ② **Theme**: 에디터와 LivePreview가 동일 ThemeProvider wrapping(본 앱에서는 `designer-core/host/shellStyles.css` + global `@layer components`만 공유하므로 추가 Provider 불필요), ③ **Data**: `onChange` 이벤트의 `data`를 `ViewerHost`에 동시 주입(에디터의 `formEditor._update({ data })` 상당), ④ **Locale**: 상위 `LocaleProvider` 하나를 양쪽이 동시에 상속. 각 축을 단위 테스트 + E2E에서 개별 검증.
  - LivePreview의 root는 **에디터 캔버스와 같은 stacking container**가 아닐 수도 있으므로(#4-1 픽셀 파리티는 "디자이너 캔버스 vs 운영 viewer" 동일성을 의미) OverlayLayer 공유는 불필요. 단, LivePreview subtree는 `designer-*` 컴포넌트 CSS를 동일하게 import해야 파리티가 성립 → `main.css` 공통 import.
- **ValidateModule (Ajv)**: `validate(schema): { ok, errors }` 서비스를 DI 컨테이너에 등록하고 호스트 앱 툴바의 "Validate" 버튼에서 호출.
  - 검증 내용: ① form-js JSON schema 구조(`@bpmn-io/form-json-schema`의 draft 19), ② 스키마에 포함된 컴포넌트 `type`이 `formFieldRegistry`에 등록되었는지, ③ 각 필드의 props가 해당 컴포넌트 정의의 `propsSchema`를 충족하는지(`validatePropsSchema` + Ajv `compile(propsSchema).validate(fieldProps)`).
  - 오류는 호스트 앱의 에디터 상태바에 `count: N` + 상세 툴팁으로 표시. ExportModule이 호출 전에 이 서비스를 invoke하여 `ok=false`면 export 차단(AC #3과 AC #4의 무손실 round-trip 전제).
  - designer-cli `validate` 커맨드와 **동일 로직**을 공유하기 위해 검증 코어를 `packages/designer-core/src/validate/validateSchema.ts`에 추출한다(본 Task 범위에 포함). host/editor 측은 이 함수를 직접 호출하고, WP-08 `designer-cli`도 동일 함수를 재사용(WP 간 로직 중복 방지).
- **ExportModule (파일 다운로드 + CLI publish 연계)**: 호스트 앱 툴바의 "Export" 드롭다운에서 두 경로 제공.
  - ① **JSON 다운로드**: 현재 스키마를 `JSON.stringify(schema, null, 2)` 직렬화 → `Blob` + `URL.createObjectURL` + `<a download>` 클릭 트리거. 파일명은 `schema.id || 'form'`.schema.json. 브라우저 다운로드 API만 사용(node 의존 없음).
  - ② **Clipboard/CLI Snippet**: `designer-cli publish <path> --target <static|api>` 명령 문자열을 생성하여 clipboard에 복사(네비게이터 권한이 있을 때) + 안내 메시지 토스트. 실제 publish는 CLI(WP-08)에서 수행. 본 Task는 "연계 진입점"만 제공.
  - Export 전에 ValidateModule을 1회 호출. `ok=false`면 confirm 다이얼로그 노출 후 사용자 동의 시 export.
- **로컬 패키지 구조**: 모든 신규 파일은 `packages/designer-editor-host/src/modules/*`에 위치하며 `index.ts`에서 barrel export. `App.tsx`(TSK-06-01 생성)는 module 목록에 4개를 추가 + 툴바 버튼 + 우측 패널 레이아웃 확장.

## 파일 계획

**경로 기준:** 모든 파일 경로는 프로젝트 루트 기준이다. 모노레포 타겟 앱이 `packages/designer-editor-host`이므로 모든 경로에 해당 접두어가 포함된다.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-editor-host/src/modules/PropsPanelModule.ts` | form-js-editor `additionalModules` 매니페스트. `{ __init__: ['propsPanel'], propsPanel: ['type', PropsPanelService] }` export. | 신규 |
| `packages/designer-editor-host/src/modules/PropsPanelService.ts` | DI 주입(`eventBus`, `formFieldRegistry`, `propertiesPanel`, `modeling`) 후 `propertiesPanel.registerProvider(DESIGNER_PROVIDER_PRIORITY, this)`. `getGroups(field)`에서 `propsSchemaToPanel(defintion.propsSchema)` 호출 + `panelEntryAdapter`로 form-js entry 스펙 생성. 8종 위젯 레지스트리는 기본값 사용, 필요 시 `options.registry` 주입. | 신규 |
| `packages/designer-editor-host/src/modules/panelEntryAdapter.ts` | `(entry: PanelEntry, ctx: { field, modeling, t }) => FormJsPanelEntry` 어댑터. `isEdited(node)` / `set(value)` 구현. `widget.render/edit`을 form-js `component: preact.Component` 슬롯에 연결. | 신규 |
| `packages/designer-editor-host/src/modules/LivePreviewModule.ts` | `{ __init__: ['livePreview'], livePreview: ['type', LivePreviewService] }` export. 모듈 옵션: `{ mountRef?: { current: HTMLElement | null } }`. | 신규 |
| `packages/designer-editor-host/src/modules/LivePreviewService.ts` | DI: `eventBus`, `formEditor` 주입. mount 시 `ViewerHost`를 `mountRef.current`(= `#live-preview-root`)에 `preact.render`. `eventBus.on('commandStack.changed', ...)` 및 `formEditor.on('changed', ...)` 리스너가 최신 `schema`/`data`를 ViewerHost prop으로 업데이트. `useViewportWidth` 훅으로 캔버스 폭 측정 → ViewerHost viewport prop 동기화. unmount 시 `render(null, mountRef.current)` + 리스너 off. | 신규 |
| `packages/designer-editor-host/src/modules/ValidateModule.ts` | `{ __init__: ['validate'], validate: ['type', ValidateService] }` export. | 신규 |
| `packages/designer-editor-host/src/modules/ValidateService.ts` | DI: `formFieldRegistry`, `formEditor`. 메서드 `validate(schema?): ValidationResult`. 내부 구현은 `packages/designer-core/src/validate/validateSchema.ts` 호출(공용). UI 통합 hook `useValidationState()` 별도 파일. | 신규 |
| `packages/designer-core/src/validate/validateSchema.ts` | **공용 검증 로직**. `validateFormSchema(schema, fieldDefinitions): { ok, errors, warnings }`. Ajv meta-schema(`propsSchema.meta.json`) + form-js JSON schema + 각 필드의 `propsSchema` compile. designer-cli와 공유. | 신규 |
| `packages/designer-core/src/validate/types.ts` | `ValidationResult`, `ValidationError` 타입. | 신규 |
| `packages/designer-core/src/validate/__tests__/validateSchema.test.ts` | 12 케이스. 정상/누락 컴포넌트 type/잘못된 propsSchema/중첩 필드/빈 스키마/Ajv 오류 포맷팅. | 신규 |
| `packages/designer-core/src/validate/index.ts` | barrel export. | 신규 |
| `packages/designer-core/src/index.ts` | `validateFormSchema`, `ValidationResult`, `ValidationError` public export 추가. | 수정 |
| `packages/designer-core/package.json` | `exports`에 `"./validate"` 서브패스 추가. | 수정 |
| `packages/designer-editor-host/src/modules/ExportModule.ts` | `{ __init__: ['exportService'], exportService: ['type', ExportService] }` export. | 신규 |
| `packages/designer-editor-host/src/modules/ExportService.ts` | DI: `formEditor`, `validate`. 메서드 `downloadJson()`, `buildPublishCommand(target: 'static'\|'api', url?): string`. 다운로드 전에 `validate.validate()` 호출, `ok=false`면 `confirm` 프롬프트. | 신규 |
| `packages/designer-editor-host/src/modules/index.ts` | 4 모듈 barrel export. TSK-06-01 생성본에 2줄 추가. | 수정 |
| `packages/designer-editor-host/src/components/PropsPanelContainer.tsx` | 선택된 필드를 `eventBus.on('selection.changed', ...)` 로 추적하여 PropsPanelService.getGroups(field)를 호출 → `PanelEntry` 트리를 Preact로 렌더. 그룹별 collapsible UI. | 신규 |
| `packages/designer-editor-host/src/components/LivePreviewPanel.tsx` | LivePreviewService의 mountRef를 부여하는 `<div id="live-preview-root" ref>` 래퍼. 제목 + toggle button(표시/숨김). | 신규 |
| `packages/designer-editor-host/src/components/ToolbarButtons.tsx` | "Validate" / "Export JSON" / "Copy CLI" 버튼 3개. 각각 ValidateService/ExportService 호출. 결과 토스트 표시. | 신규 |
| `packages/designer-editor-host/src/components/ValidationBadge.tsx` | 상태바 뱃지. `useValidationState()` 훅 구독 → `ok` true면 녹색 체크, false면 빨강 카운트. | 신규 |
| `packages/designer-editor-host/src/App.tsx` | TSK-06-01이 생성한 App에 LivePreviewPanel/PropsPanelContainer/ToolbarButtons/ValidationBadge 마운트, additionalModules에 4개 모듈 추가. 좌(Palette) / 중(EditorHost) / 우(PropsPanelContainer + LivePreviewPanel) 3-column grid 레이아웃 확장. | 수정 |
| `packages/designer-editor-host/src/router.tsx` | TSK-06-01이 생성한 라우터. `/` (에디터 메인)과 `/` 하위 사이드 패널 탭(`props`, `preview`) 전환 훅 `useSidePanelTab`. form-js-editor는 단일 페이지이므로 해시 기반 탭 전환. | 수정 |
| `packages/designer-editor-host/src/components/Sidebar.tsx` | TSK-06-01이 생성한 네비게이션 컴포넌트. 사이드바 내 메뉴 항목 배열 `navItems`에 "Properties" / "Live Preview" 엔트리 추가 (에디터 내 사이드 패널 탭 전환과 동기화). | 수정 |
| `packages/designer-editor-host/src/modules/__tests__/PropsPanelService.test.ts` | Vitest 10 케이스. DI spy 기반: `registerProvider` 호출 여부, `getGroups(field)` 반환, `propsSchemaToPanel` 호출, 미등록 type 시 throw. | 신규 |
| `packages/designer-editor-host/src/modules/__tests__/panelEntryAdapter.test.ts` | 6 케이스. `isEdited(node)` / `set(value)` 의 modeling.editFormField 호출, component slot JSX 반환. | 신규 |
| `packages/designer-editor-host/src/modules/__tests__/LivePreviewService.test.ts` | 8 케이스. 마운트·언마운트, `changed` 이벤트 수신 시 ViewerHost 업데이트 spy, viewport 변경 시 prop 전파, locale 상속. | 신규 |
| `packages/designer-editor-host/src/modules/__tests__/ValidateService.test.ts` | 6 케이스. `validate(schema)` 호출 결과 ok/errors, 미등록 컴포넌트 type 에러 포맷, designer-core `validateFormSchema` 위임 확인. | 신규 |
| `packages/designer-editor-host/src/modules/__tests__/ExportService.test.ts` | 6 케이스. Blob 생성 + URL.createObjectURL mock, validate 실패 시 confirm 경로, `buildPublishCommand('static')`/`'api'` 문자열. | 신규 |
| `packages/designer-editor-host/src/components/__tests__/PropsPanelContainer.test.tsx` | 5 케이스. 선택 변경 시 렌더 갱신, 값 편집 → modeling.editFormField 호출 확인. | 신규 |
| `packages/designer-editor-host/e2e/editor.propspanel.spec.ts` | Playwright E2E. AC #7. (1) palette에서 card 드롭 → 필드 선택 → props 패널에 자동 생성된 패널 노출. (2) `title` 필드 편집 → 에디터 스키마와 LivePreview에 즉시 반영. | 신규 |
| `packages/designer-editor-host/e2e/editor.livepreview.spec.ts` | Playwright E2E. AC #4-1. (1) 에디터에 card+stack 구성. (2) 에디터 캔버스 스크린샷 vs LivePreview 스크린샷 pixelmatch diff ≤ 0.1%. (3) viewport 폭 변경 시 양쪽 동일 breakpoint 반응. | 신규 |
| `packages/designer-editor-host/e2e/editor.validate-export.spec.ts` | Playwright E2E. AC #3/#4. Validate 버튼 클릭 시 상태 뱃지 갱신, Export JSON 클릭 시 파일 다운로드 트리거, Copy CLI 클릭 시 clipboard 내용 확인. | 신규 |
| `packages/designer-editor-host/e2e/fixtures/app-router.ts` | 테스트용 라우터 고정 fixture(이미 TSK-06-01에서 제공 가능 — 없으면 신규). | 수정 또는 신규 |
| `packages/designer-editor-host/package.json` | dependencies에 `@bpmn-io/form-js-editor`, `@form-js-designer/designer-core`, `preact` 추가(없으면). devDependencies에 `@playwright/test`, `vitest`, `happy-dom`. | 수정 |

## 진입점 (Entry Points)

- **사용자 진입 경로**: `form-js-designer` 에디터 앱 로드(`http://localhost:5173`) → 상단 툴바에서 "Validate" · "Export JSON" · "Copy CLI" 버튼 클릭 → 좌측 **사이드바(Sidebar)** "Properties" 항목 클릭하여 우측 사이드 패널에 PropsPanel 표시 → 사이드바 "Live Preview" 항목 클릭하여 우측 사이드 패널에 LivePreview 표시. 팔레트에서 컴포넌트를 드롭하여 필드를 선택하면 PropsPanel이 자동 업데이트된다.
- **URL / 라우트**: `/` (에디터 메인 페이지). 사이드 패널 탭은 해시로 구분 — `#/props` / `#/preview`. 별도 SPA 라우터 분기 없음.
- **수정할 라우터 파일**: `packages/designer-editor-host/src/router.tsx` — TSK-06-01이 생성한 `AppRouter` 컴포넌트에 `useSidePanelTab()` 훅 추가 + `#/props`/`#/preview` 해시 파싱 로직 추가. `packages/designer-editor-host/src/App.tsx` — 우측 패널에 탭 내용을 조건부 렌더(`tab === 'props' ? <PropsPanelContainer/> : <LivePreviewPanel/>`).
- **수정할 메뉴·네비게이션 파일**: `packages/designer-editor-host/src/components/Sidebar.tsx` — TSK-06-01이 생성한 `navItems` 배열에 `{ id: 'props', labelKey: 'designer.editor.sidebar.props', hash: '#/props' }`, `{ id: 'preview', labelKey: 'designer.editor.sidebar.preview', hash: '#/preview' }` 두 엔트리 추가. `packages/designer-editor-host/src/components/ToolbarButtons.tsx` — 툴바 영역에 Validate/Export/Copy CLI 3 버튼 추가(파일 계획 표에 포함됨).
- **연결 확인 방법**: Playwright에서 `await page.goto('/')` 후 `await page.getByRole('navigation').getByText('Properties').click()` → URL 해시가 `#/props`로 변경 + 우측 패널에 `[data-testid="props-panel"]`이 visible 상태로 표시됨. 이어서 `await page.getByRole('navigation').getByText('Live Preview').click()` → 해시 `#/preview`로 변경 + `[data-testid="live-preview"]`가 visible. Export 플로우는 `await page.getByRole('button', { name: /Validate/i }).click()` → 상태바 `[data-testid="validation-badge"]`가 `ok` 또는 `N errors` 텍스트 노출. URL 직접 입력은 사용하지 않는다(dev-test reachability gate).

> 본 Task는 비-페이지 UI가 아니라 에디터 메인 페이지(`/`)의 **사이드 패널 + 툴바 확장**이다. 에디터 페이지 전체는 TSK-06-01에서 만들고, 본 Task는 우측 사이드 패널 탭 2종(Properties/Live Preview)과 툴바 버튼 3종을 추가한다.

## 주요 구조

- **`PropsPanelService`** (class, DI 주입: `eventBus`, `formFieldRegistry`, `propertiesPanel`, `modeling`)
  - `constructor` → `propertiesPanel.registerProvider(500, this)` (priority 500: designer > form-js 기본).
  - `getGroups(field: FormField): GroupDefinition[]` — `formFieldRegistry.get(field.type)`에서 `propsSchema` 추출 → `propsSchemaToPanel(propsSchema, this.registry)` → `entries.map(entry => panelEntryAdapter(entry, { field, modeling: this.modeling, t: this.t }))` → form-js 스펙 그룹 1개(향후 group 메타 지원 시 N개)로 묶어 반환.
  - `this.registry`: `createDefaultRegistry()` 결과(8종 위젯 선등록). `options.registry`로 override 가능.
  - 주의: form-js-editor의 `propertiesPanel` 서비스는 1.21.x에서 `registerProvider(priority, provider)` API를 제공한다(버전별 검증 필요 — Risk HIGH 참조).

- **`panelEntryAdapter(entry, ctx): FormJsPanelEntry`** (함수)
  - 반환 객체 형태:
    ```ts
    {
      id: entry.key,
      component: (props) => entry.widget.edit(
        props.value ?? entry.defaultValue,
        (v) => ctx.modeling.editFormField(ctx.field, { [entry.key]: v }),
        { t: ctx.t, domId: `props-${entry.key}`, label: entry.label, disabled: false },
        entry.meta,
      ),
      isEdited: (node) => ctx.field[entry.key] !== entry.defaultValue,
      element: ctx.field,
    }
    ```
  - `widget.validate()` 결과는 `isEdited` 뒤 오류 표시 훅으로 연결(ValidationBadge에 반영).

- **`LivePreviewService`** (class, DI 주입: `eventBus`, `formEditor`)
  - `mount(target: HTMLElement)` — `preact.render(<ViewerHost schema={editor.getSchema()} data={{}} locale={locale} viewport={currentViewport} />, target)` + `eventBus.on('commandStack.changed', this.onEditorChange)`. 캔버스 폭은 별도 `ResizeObserver`(useViewportWidth의 non-hook 버전)로 측정.
  - `onEditorChange(e)` — `editor.getSchema()` 재획득 → `preact.render` 재호출. `e.context.formField`가 있으면 subtree만 invalidate(최적화는 후속, 본 Task는 전체 재렌더로도 OK — spike에서 60fps 유지 확인).
  - `destroy()` — `preact.render(null, target)`, `eventBus.off(...)`, ResizeObserver disconnect.

- **`ValidateService`** (class, DI 주입: `formFieldRegistry`, `formEditor`)
  - `validate(schema?): ValidationResult` — schema 생략 시 `formEditor.getSchema()` 사용. `validateFormSchema(schema, formFieldRegistry)` 호출하여 공용 로직 위임. 결과를 `eventBus.fire('designer.validate.done', result)`로 발화하여 UI 배지가 구독.

- **`ExportService`** (class, DI 주입: `formEditor`, `validate`)
  - `downloadJson()` — `const schema = formEditor.getSchema()`. `validate.validate(schema)`로 사전 검증. `ok=false`면 `window.confirm` 프롬프트. 확인 시 `new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' })` + `URL.createObjectURL` + `<a download>` 클릭 트리거.
  - `buildPublishCommand(target, url?): string` — `designer-cli publish ${filename} --target ${target}${url ? ` --url ${url}` : ''}` 문자열 반환. Clipboard API는 컴포넌트 레이어에서 호출(서비스는 순수 문자열 생성만).

- **`validateFormSchema(schema, registry): ValidationResult`** (함수, `designer-core`)
  - 단계: ① Ajv로 form-js JSON schema 구조 검증(초기 구현은 `schema.components` 배열과 각 필드 `type` 존재 여부 중심, 추후 `@bpmn-io/form-json-schema` v19 meta-schema import로 확장), ② 각 필드의 `type`이 `registry`에 등록되었는지 확인, ③ 등록된 정의의 `propsSchema`를 `validatePropsSchema`(TSK-03-02)로 검증, ④ 필드의 props 값을 각 위젯 `validate(value, meta)`로 검증.
  - 결과: `{ ok: boolean, errors: Array<{ path: string; code: string; message: string }>, warnings: [...] }`.

## 데이터 흐름

입력: 사용자가 form-js-editor 캔버스에서 필드를 선택(`eventBus.fire('selection.changed')`) → 처리: `PropsPanelContainer`가 이벤트 구독하여 `PropsPanelService.getGroups(field)` 호출 → `propsSchemaToPanel(propsSchema)` → `panelEntryAdapter`로 form-js 패널 entry 배열 생성 → 위젯 `edit()`이 렌더되고 사용자 변경 시 `modeling.editFormField(field, patch)`로 스키마 갱신 → form-js-editor가 `commandStack.changed` 발화 → `LivePreviewService`가 구독하여 `ViewerHost`를 새 스키마로 재렌더 + `useViewportWidth`로 측정한 폭을 `viewport` prop으로 전파. 병렬로 `ValidateService`가 동일 이벤트에 반응(옵션) 또는 툴바 버튼 클릭으로 실행되어 `validateFormSchema` 호출 → `eventBus.fire('designer.validate.done')` → `ValidationBadge`가 배지 갱신. Export 버튼 → `ExportService.downloadJson` → validate 선행 후 Blob 다운로드. 출력: 사용자 브라우저 내에서 에디터 캔버스 + LivePreview 픽셀 파리티 동시 업데이트 + JSON 파일 다운로드 + CLI 명령 clipboard.

## 설계 결정 (대안이 있는 경우만)

- **결정 1**: PropsPanelService는 form-js-editor의 `propertiesPanel.registerProvider` API를 직접 호출하여 provider를 등록한다.
  - **대안**: form-js-editor 본체를 수정하지 않고 호스트 앱에서 별도 Preact 컴포넌트(`PropsPanelContainer`)가 선택 이벤트만 구독하여 자체 패널을 렌더(form-js-editor 기본 패널을 숨김).
  - **근거**: TRD §4.3 + phase-1-plan §3.4 표가 "**form-js의 `propertiesProvider` 확장 포인트**에 §3.1 `propsSchemaToPanel` 결합"을 명시. form-js-editor 기본 API를 재사용해야 피어 확장 모듈과 충돌이 없고 panel DOM 구조(groups/entries/badges)를 재활용해 CSS 중복을 막을 수 있다. 단, 본 설계는 `PropsPanelContainer`도 함께 제공하여 "form-js-editor 1.21.x에서 `registerProvider` API가 실제 어떻게 노출되는가"에 대한 리스크(HIGH 참조)를 병행 커버 — 실 API와 비호환이면 Container 패턴으로 fallback(결정 1b).

- **결정 1b**: `registerProvider` API가 form-js-editor 1.21.2에서 불안정하거나 제네릭 entry 스펙이 호환되지 않을 경우, `PropsPanelContainer` 단독 렌더 경로를 활성화한다(내부 기본 패널 숨김 CSS + 본 앱 패널로 교체).
  - **근거**: form-js-editor의 공개 API는 bpmn-js와 유사한 didi 기반이지만 properties-panel 확장 포인트는 `@bpmn-io/properties-panel`(BPMN)의 패턴과 완전 동일하지 않을 수 있다. Spike에서 실 확인 후 결정을 잠금. dev-build 단계 초기에 "form-js-editor 1.21.2 registerProvider 시그니처 + entry 형식 프로빙" 테스트를 먼저 작성(TDD red → 결과에 따라 1a/1b 분기).

- **결정 2**: 검증 로직(`validateFormSchema`)을 `designer-core/src/validate/`에 두고 editor-host와 designer-cli가 공유한다.
  - **대안**: editor-host에만 두고 designer-cli는 자체 구현.
  - **근거**: AC #3(파일 저장/불러오기)와 AC #4(round-trip 무손실)는 에디터 저장 경로와 CLI publish 경로에서 **동일 검증 결과**를 내야 의미가 있다. DRY + 단일 진실 원천. designer-cli는 별도 WP에서 개발되므로 core에 공통 모듈을 선배치하면 후속 WP의 설계·구현이 간결해진다.

- **결정 3**: LivePreview의 `changed` 이벤트 처리에 **디바운스를 적용하지 않는다**.
  - **대안**: 50-100ms 디바운스로 렌더 부하 완화.
  - **근거**: AC #4-1 픽셀 파리티는 에디터와 Preview가 "같은 순간의 스키마"에서 동일하게 렌더되는 것이 조건. 디바운스가 개입하면 파리티 테스트 시점과 내부 상태가 어긋난다. Preact의 `render()` reconcile은 idle 시 배치되므로 버블링 cost는 허용치.

- **결정 4**: Validate와 Export를 **독립 버튼**으로 분리하고 Export가 Validate를 내부 선행 호출한다(자동 차단은 하지 않고 confirm으로 사용자 판단).
  - **대안**: Export 버튼을 항상 Validate pass 상태에서만 활성화(disable 처리).
  - **근거**: Validate 실패 상태에서도 사용자가 작업 중 임시 export로 백업하고 싶을 수 있다. AC #3은 "저장/불러오기 가능"일 뿐 "validate pass 시에만 저장"이 아니다. UX: confirm 1 step + 실패 항목 미리보기로 경고만 수행.

- **결정 5**: 4 모듈을 모두 **단일 파일로 export하지 않고** 각 모듈별 manifest + service 파일 2분할.
  - **대안**: 각 모듈 1파일(manifest + service 합본).
  - **근거**: Vitest 단위 테스트가 service 클래스를 직접 import해서 DI 없이 mock 주입으로 테스트하기 위함. manifest와 service가 분리되면 테스트 코드가 `new PropsPanelService(eventBus, registry, panel, modeling)`로 간결하게 호출 가능. form-js DI 초기화 경로를 Vitest에서 재현하는 비용이 높다.

## 선행 조건

- **TSK-06-01 완료 필수**: `packages/designer-editor-host` 패키지 골격 + `App.tsx` + `router.tsx` + `Sidebar.tsx` + `PaletteModule` + `OutlineModule`이 존재해야 본 Task가 증분 수정/신규 파일을 둘 수 있다.
- **TSK-05-01 완료 필수**: `designer-table` 패키지의 `TableSchema`·`ColumnDef`가 정의되어 있어야 PropsPanel이 table 컴포넌트의 `propsSchema`(특히 `columns` array 위젯)를 정상 변환한다. 없으면 PropsPanel 단위 테스트에서 `columns` 케이스가 빠짐.
- **TSK-03-02 완료 (있음, dev 가능)**: `propsSchemaToPanel`, `PanelWidgetRegistry`, 위젯 8종이 `designer-core`에서 이미 export됨.
- **TSK-03-03 완료 (있음, dev 가능)**: `ViewerHost`, `EditorHost`, `LocaleProvider`, `useViewportWidth`가 export됨.
- **TSK-03-01 완료 (있음)**: `OverlayLayer`, `assertSharedOrigin`이 export됨.
- **`@bpmn-io/form-js-editor ^1.21.2`**: 루트 package.json dependencies에 이미 포함. 본 Task에서 `packages/designer-editor-host/package.json`에 명시.
- **`ajv ^8.18.0`**: `designer-core` dependencies에 이미 포함. `validate/validateSchema.ts`에서 재사용.
- **`preact ^10.19.3`**: peerDependency로 이미 포함.

## 리스크

- **HIGH — form-js-editor `propertiesPanel.registerProvider` API 불확실성**: form-js-editor 1.21.2의 공개 `propertiesProvider` 확장 포인트 시그니처가 명확하지 않다. `@bpmn-io/properties-panel`의 패턴(`registerProvider(priority, provider)`, `getGroups(element)`)과 유사할 가능성이 높지만 form-js-editor가 해당 라이브러리를 얼마나 차용했는지는 코드 확인 필요. 완화 — dev-build 단계 Step 1에서 `node_modules/@bpmn-io/form-js-editor/dist/*.esm.js`의 `PropertiesPanel` 모듈 grep + dev 서버에 실제 모듈을 주입한 스모크 테스트 먼저 수행. API 불일치 시 **결정 1b** (PropsPanelContainer 단독 렌더) 경로로 즉시 전환 가능하도록 양쪽 구현을 parallel로 설계. 본 Task의 테스트 매트릭스가 양쪽을 모두 커버하도록 `registerProvider` 호출 경로 2종(공식 API / container fallback)을 분기 처리.

- **HIGH — form-js-editor changed 이벤트명/페이로드 변동**: `commandStack.changed` / `formEditor.view.change` / `elements.changed` 등 후보 이벤트 중 어느 것이 스키마 변경 전파에 적합한지 버전별 상이. 완화 — LivePreviewService에 **다중 이벤트 구독**을 허용하는 `changeEvents: string[]` 옵션을 두고 기본값을 `['commandStack.changed', 'elements.changed']`로 설정. dev-build 초기 프로빙 테스트로 실제 발화 이벤트를 확정한 뒤 기본값을 좁힌다.

- **MEDIUM — LivePreview 픽셀 파리티 회귀**: 에디터 캔버스와 LivePreview가 다른 stacking container에 렌더되므로 CSS cascade 차이(@layer 우선순위, container query 적용 여부)로 diff가 발생할 수 있다. 완화 — 양쪽이 **완전히 동일한 CSS 파일**만 import하도록 `designer-editor-host/src/main.css`를 단일 entry로 고정. 에디터 전용 CSS(`fjs-designer-chrome-*`)는 ADR D4 규칙대로 컴포넌트 스타일에 영향을 주지 않도록 격리. `editor.livepreview.spec.ts`가 1024/1440 2개 뷰포트에서 diff ≤ 0.1%를 검증.

- **MEDIUM — happy-dom의 form-js 호환성**: Spike는 form-js-viewer만 happy-dom에서 검증했다. form-js-editor는 DI 컨테이너·이벤트버스·CommandStack 등 더 많은 서비스를 초기화하므로 happy-dom 환경에서 `new FormEditor({...})`가 예외 없이 초기화되는지 확인 필요. 완화 — `PropsPanelService.test.ts`는 **FormEditor 초기화를 Mock**하고 DI 주입을 직접 수행(생성자 주입). 실 통합은 Playwright e2e에서 커버. 이는 결정 5의 동기이기도 하다.

- **MEDIUM — `modeling.editFormField` API 존재 여부**: form-js-editor 1.21.x에 modeling 서비스가 있는지 확인. 없으면 `commandStack.execute('formField.edit', { formField, properties })` 패턴으로 대체. 완화 — Service 내부에서 `modeling?.editFormField ?? commandStack.execute`를 런타임 분기.

- **MEDIUM — Ajv `compile` 성능**: 매 validate 호출 시 propsSchema를 recompile하면 편집 세션당 수십 회 반복 compile로 TTI 저하 가능. 완화 — `validateFormSchema` 내부에 컴포넌트 type별 `Map<string, ValidateFunction>` 캐시. 캐시 invalidation은 `formFieldRegistry.register` 시점에 강제 flush.

- **LOW — Blob 다운로드의 브라우저 호환성**: `URL.createObjectURL` + `<a download>` 트리거는 Chrome/Firefox에서 모두 OK이지만 headless Playwright는 실제 다운로드 대신 `download` 이벤트 캡처로 검증해야 한다. 완화 — e2e 테스트에서 `page.waitForEvent('download')`를 사용하고 JSON 내용은 `download.path()` 후 파일 읽기로 확인.

- **LOW — Clipboard API 권한**: `navigator.clipboard.writeText`는 사용자 제스처 + HTTPS(또는 localhost)에서만 동작. 완화 — fallback으로 `document.execCommand('copy')` + textarea를 구현. e2e는 localhost이므로 기본 경로 검증.

- **LOW — sidebar 해시 탭 vs 실 SPA 라우트**: 본 Task는 `#/props`/`#/preview` 해시만 쓰고 진짜 SPA 라우트는 추가하지 않는다. URL이 검색엔진·북마크에서 직접 열릴 가능성은 거의 없으므로 수용.

## QA 체크리스트

dev-test 단계에서 검증할 항목. 각 항목은 pass/fail로 판정 가능해야 한다.

**PropsPanel (정상/편집)**
- [ ] (정상) `PropsPanelService.getGroups(field)`가 `propsSchemaToPanel` 호출 결과를 form-js entry 형식으로 반환하며, 반환 그룹이 최소 1개(default 그룹) 포함된다.
- [ ] (정상) 위젯 `edit()` UI에서 값을 변경하면 `modeling.editFormField(field, { [key]: newValue })`가 1회 호출된다 (spy 검증).
- [ ] (정상) 선택된 필드가 없는 상태에서 `PropsPanelContainer`는 빈 상태 placeholder(`data-testid="props-empty"`)만 렌더한다.
- [ ] (엣지) `propsSchema`가 비어 있는 컴포넌트(`card` 의 최소 정의)에서는 그룹 0개 반환 + "no editable properties" placeholder 표시.
- [ ] (에러) 컴포넌트 정의의 `propsSchema.properties.foo.type`이 레지스트리 미등록 위젯이면 `UnknownWidgetError`가 throw되고 PropsPanelContainer가 에러 경고 박스를 렌더한다(전체 panel crash 방지).

**LivePreview (정상/파리티)**
- [ ] (정상) 에디터 필드 추가/삭제/속성 변경 시 LivePreview가 300ms 이내에 재렌더되어 최신 스키마를 반영한다(spy로 `ViewerHost` re-render 횟수 검증).
- [ ] (정상) 에디터 캔버스 폭 변경(`useViewportWidth` callback) 시 LivePreview의 `viewport` prop이 동일 값으로 업데이트된다.
- [ ] (엣지) 에디터에 빈 스키마(`components: []`)가 있을 때 LivePreview는 빈 form 상태를 에러 없이 렌더.
- [ ] (통합, E2E) **AC #4-1 픽셀 파리티**: 1024×768, 1440×900 두 뷰포트에서 에디터 캔버스 스크린샷 vs LivePreview 스크린샷의 pixelmatch diff가 0.1% 이하 (10000 중 10 픽셀 이하).
- [ ] (통합, E2E) Locale이 `ko`로 주입된 상태에서 LivePreview 내부 폼 validation 메시지가 ko 번들의 키를 참조한다(WP-07 사전이 주입된 후에만 실 문자열 비교, 본 Task는 `useT` 호출 여부까지).

**Validate**
- [ ] (정상) 유효한 스키마 + 등록된 컴포넌트 type만 사용 시 `ValidateService.validate()`가 `{ ok: true, errors: [] }` 반환.
- [ ] (에러) 미등록 컴포넌트 type 포함 시 `errors[].code === 'UNKNOWN_COMPONENT_TYPE'`, path가 해당 필드 id를 가리킨다.
- [ ] (에러) 필드의 props가 위젯 `validate()` 실패 시 오류가 path(`components[0].title`)와 함께 수집된다.
- [ ] (통합) designer-core `validateFormSchema`와 designer-cli validate 커맨드의 출력이 **같은 schema input에 대해 동일**함(본 Task에선 cli 미구현, designer-core 공용 함수의 단위 테스트 12 케이스로 계약 증명).

**Export**
- [ ] (정상) "Export JSON" 버튼 클릭 시 브라우저에 `<schema-id-or-form>.schema.json` 이름의 파일이 다운로드된다(Playwright `page.waitForEvent('download')` 검증).
- [ ] (정상) 다운로드 JSON의 내용이 현재 에디터 스키마와 완전 일치(round-trip용, AC #4).
- [ ] (정상) "Copy CLI" 버튼 클릭 시 `navigator.clipboard.readText()`가 `designer-cli publish ...` 문자열을 반환한다.
- [ ] (엣지) Validate 실패 상태에서 Export 클릭 시 confirm 다이얼로그가 노출되고, 사용자가 취소하면 다운로드가 발생하지 않는다.
- [ ] (에러) 에디터 스키마를 의도적으로 깨뜨린 상태(수동으로 undefined 주입)에서 Export 클릭 시 `try/catch`로 잡혀 사용자에게 에러 토스트 노출, 앱 crash 없음.

**통합 / 회귀**
- [ ] (통합) `packages/designer-editor-host`에 4 모듈을 `additionalModules`에 추가한 에디터가 실 브라우저 `npm run dev`에서 `new FormEditor` 초기화 에러 없이 startup한다 (Playwright smoke: 첫 진입 후 `#form-root` 렌더 확인).
- [ ] (통합) TSK-06-01의 Palette/Outline 기능이 본 Task 변경으로 회귀하지 않는다(`editor.dragdrop.spec.ts` 통과 유지).
- [ ] (회귀) `packages/designer-core`의 기존 46+ Vitest 케이스(TSK-03-01/02/03) 전부 통과.
- [ ] (회귀) designer-core의 `validate/__tests__/` 12 신규 케이스 통과, 기존 parity Playwright(TSK-03-01 3 뷰포트) 통과.

**fullstack/frontend Task 필수 항목 (E2E 테스트에서 검증 — dev-test reachability gate):**
- [ ] (클릭 경로) 메뉴/사이드바/버튼을 클릭하여 목표 페이지에 도달한다 (URL 직접 입력 금지)
- [ ] (화면 렌더링) 핵심 UI 요소가 브라우저에서 실제 표시되고 기본 상호작용이 동작한다
