# TSK-05-01: defineComponent 계약 + 커스텀 모듈 스캐폴드 - 설계

## 요구사항 확인

- `defineComponent({ type, renderer, propsSchema, layout?, i18nKeys?, icon? })` 시그니처 + Zod 런타임 검증을 vscode-extension 패키지 범위에서 노출하고, 해당 계약으로 만들어진 컴포넌트들을 단일 form-js `Module`(FormFields registry contribution)로 묶는다.
- viewer(`src/markdown/preview.ts`)와 editor(`src/editor/customEditor.ts`)가 **동일한 모듈 인스턴스**를 `createForm({ additionalModules })` / `createFormEditor({ additionalModules })`에 주입하도록 single source of truth를 확립한다.
- 신규 컴포넌트 CSS는 `media/form-js-components.css`로 분리해 `contributes["markdown.previewStyles"]`에 추가하며, 빈 스키마 + 모듈 주입 상태에서도 WP-01 M1 fixture 3종(single-block, multi-block-with-invalid, reload-test)이 회귀 0으로 통과해야 한다.

## 타겟 앱

- **경로**: `packages/designer-vscode-extension`
- **근거**: TSK-05-01 요구사항은 `src/components/defineComponent.ts`, `src/components/index.ts`, `src/markdown/preview.ts`, `src/editor/customEditor.ts`의 수정을 명시하며, 파일 위치가 전부 vscode-extension 패키지 내부이다. 디자이너 본체의 `designer-core` / `designer-components`는 재사용 소스로만 참조하고 이번 Task에서는 수정하지 않는다.

## 구현 방향

- `src/components/defineComponent.ts`는 **re-export + Zod 검증 래퍼**로 설계한다. 이미 `@form-js-designer/designer-core`에 purity check를 포함한 `defineComponent` 구현이 존재하므로, vscode-extension은 그 함수를 얇게 감싸 (1) 필수 필드(`type`, `render`, `propsSchema`) Zod 검증 + (2) 선택 메타(`layout`, `i18nKeys`)를 허용하도록 확장한다. 중복 구현 금지(PRD G5) 규약을 준수한다.
- `src/components/index.ts`는 `@form-js-designer/designer-components`의 `CardComponent`/`TabsComponent`/`ModalComponent`/`TabPanelComponent`를 import하여 `createCustomComponentsModule()` 팩토리로 form-js `Module` 1개(`{ __init__, <serviceId>: ['type', Registration] }`)를 합성해 export한다. 이 모듈은 **viewer·editor 양쪽에서 재사용되는 싱글톤**이다.
- viewer(`preview.ts`) 쪽은 `createForm({ container, schema, additionalModules: [customComponentsModule], properties: { readOnly: true } })`로 주입한다. editor 스텁(`customEditor.ts`)은 현재 TSK-02-01이 구현 전이므로, 본 Task에서는 **모듈 import + TODO 주석 + 타입 보장**까지만 하고 실제 `createFormEditor(...)` 호출은 TSK-02-01/TSK-05-04에서 완료한다.
- CSS는 새 파일 `media/form-js-components.css`에 ① `.form-js-block` 내부 커스텀 컴포넌트 토큰(`--vscode-editor-foreground` 등) 바인딩 + ② 최소 높이 40px + ③ 기존 designer-components CSS(`container-base.css`, `Card.css` 등)와의 충돌을 방지하는 scope 셀렉터를 작성한다. `package.json` `contributes.markdown.previewStyles`에 경로 추가 + `scripts/copy-media.mjs`(TSK-00-01)에 복사 대상 추가.
- 계약 위반(필수 필드 누락)은 두 단계에서 탐지: (a) 타입 레벨 — `ComponentDefinition<F>`의 required 필드는 TypeScript `strict`로 빌드 타임에 실패, (b) 런타임 — `defineComponent()` 호출 시 Zod `parse()`가 dev 빌드에서 throw, prod 빌드에서는 `console.warn`(기존 `designer-core` 패턴과 동일).

## 파일 계획

**경로 기준:** 모든 파일 경로는 **프로젝트 루트 기준**으로 작성한다.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-vscode-extension/src/components/defineComponent.ts` | `designer-core`의 `defineComponent`를 re-export하고, `{ type, render, propsSchema, layout?, i18nKeys?, icon? }` 입력을 Zod로 validate한 뒤 core 함수에 위임하는 얇은 래퍼 + `ExtensionComponentDef` 타입 정의 | 신규 |
| `packages/designer-vscode-extension/src/components/propsSchemaZod.ts` | `designer-core`의 `PropsSchema` 인터페이스를 Zod 스키마로 표현 — `properties`의 `type` enum, `default`, `enum`, `min`/`max` 등을 런타임 검증 | 신규 |
| `packages/designer-vscode-extension/src/components/index.ts` | `@form-js-designer/designer-components`에서 Card/Tabs/Modal/TabPanel을 import → `createCustomComponentsModule()` 팩토리 + 싱글톤 `customComponentsModule` export. `ExtensionComponentDef` / `defineComponent` 재노출 | 신규 |
| `packages/designer-vscode-extension/src/components/__tests__/defineComponent.test.ts` | Zod 검증 unit test — 정상 케이스 1개, 필수 필드 누락 3종(type/render/propsSchema), 선택 필드 포함 케이스 1개 | 신규 |
| `packages/designer-vscode-extension/src/components/__tests__/customComponentsModule.test.ts` | 모듈 형상 검증 — `__init__` 배열, registration 서비스 `$inject: ['formFields']`, `formFields.register`가 4개 타입 호출되는지 mock으로 확인 | 신규 |
| `packages/designer-vscode-extension/src/markdown/preview.ts` | `customComponentsModule` import + `createForm({ ... additionalModules: [customComponentsModule] })`로 주입 | 수정 |
| `packages/designer-vscode-extension/src/editor/customEditor.ts` | `customComponentsModule` import + 타입 보장용 참조만 유지(TODO 주석). `__formJsCustomEditorLoaded` 전역 마킹은 유지 | 수정 |
| `packages/designer-vscode-extension/media/form-js-components.css` | 커스텀 컴포넌트 스코프 CSS — `.form-js-block .dc-card`/`.dc-tabs`/`.dc-modal` 최소 높이 40px, VSCode 테마 토큰 바인딩, HC 테마 대응 | 신규 |
| `packages/designer-vscode-extension/scripts/copy-media.mjs` | 복사 목록에 `form-js-components.css` 추가 (이미 `media/`에 존재하는 파일을 `dist/`로 복사하는 기존 규약과 일치시킨다) | 수정 |
| `packages/designer-vscode-extension/package.json` | `contributes.markdown.previewStyles` 배열에 `./media/form-js-components.css` 추가. `dependencies`에 `zod@^3.23.0`, `@form-js-designer/designer-components` workspace 참조 추가 | 수정 |
| `packages/designer-vscode-extension/test/integration/suite/customComponents.test.ts` | 빈 스키마 + 모듈 주입 마운트 성공 검증 1케이스. WP-01 fixture 3종 회귀는 기존 `preview.test.ts` suite가 커버 | 신규 |
| `packages/designer-vscode-extension/test/fixtures/empty-schema-with-module.md` | 빈 스키마 블록(`{ "type": "default", "components": [] }`) + 본 모듈 주입 상태에서 마운트 성공 검증용 | 신규 |

> 본 Task에서는 Card/Tabs/Modal/TabPanel **렌더러 자체**를 수정하지 않는다. 렌더러는 이미 `designer-components` 패키지에 존재하고, 본 Task는 **계약·모듈·배선**만 담당한다. 렌더러 개선/레이아웃 확장은 TSK-05-02(Tabs/TabPanel), TSK-05-03(Card/Stack/Modal)에서 수행한다.

## 진입점 (Entry Points)

**대상**: domain=frontend — 사용자 진입은 WP-01과 동일하게 Markdown 펜스 블록뿐이며, 본 Task는 기존 진입점을 **유지**하면서 그 배경에서 viewer/editor에 모듈을 주입한다.

- **사용자 진입 경로**: 사용자는 기존과 동일하게 VSCode에서 Markdown 파일을 연 뒤 `Cmd+Shift+V`(macOS) / `Ctrl+Shift+V`(Win/Linux)로 미리보기를 열면, ` ```form-js ` 펜스 블록이 렌더된다. 본 Task가 끝나면 해당 블록에 `type: 'card' | 'tabs' | 'modal' | 'tabPanel'` 필드가 포함된 스키마도 "unsupported type" 오류 없이 마운트 준비가 완료된다(실제 렌더 가시화는 TSK-05-02/03 완료 후).
- **URL / 라우트**: VSCode 명령 `command:markdown.showPreview`. 웹 라우트는 없음. VSCode extension 컨텍스트에서 라우터 역할을 하는 등가물은 `package.json`의 `contributes.markdown.*` 선언이다.
- **수정할 라우터 파일**: VSCode extension에는 React Router/Next.js 라우터 파일이 없다. 진입 등록 역할의 동등물은 `package.json` contribution + `src/extension.ts`이다.
  - `packages/designer-vscode-extension/package.json`의 `contributes.markdown.previewScripts` 배열(이미 `./dist/webview/preview.js` 등록됨, 본 Task에서 변경 없음)
  - `packages/designer-vscode-extension/package.json`의 `contributes.markdown.previewStyles` 배열에 `./media/form-js-components.css` 추가 — 위 파일 계획 표에 포함됨
  - `packages/designer-vscode-extension/src/extension.ts`는 수정하지 않는다(extension host는 customComponentsModule을 직접 참조하지 않음 — 주입 지점은 webview 번들 내부 `preview.ts`/`customEditor.ts`). extension host가 contribution을 통해 webview에 CSS를 로드시키는 것이 "라우팅" 역할
- **수정할 메뉴·네비게이션 파일**: VSCode extension에는 사이드바 네비게이션 파일이 없다. 동등물은 `activationEvents` + `contributes.commands`이다.
  - `packages/designer-vscode-extension/package.json`의 `activationEvents`(이미 `onLanguage:markdown`, `onStartupFinished` 등록됨) — 본 Task에서 변경 없음. 모듈 주입은 preview.ts가 실행되는 시점에 자동으로 함께 로드되므로 신규 activation 이벤트 불필요
  - `packages/designer-vscode-extension/package.json`의 `contributes.markdown.previewStyles` 배열 — 본 Task가 "네비 항목"에 해당하는 리소스 등록을 수행하는 파일(위와 동일, 전통적 웹 사이드바는 없음)
- **연결 확인 방법**: `empty-schema-with-module.md` 또는 WP-01 fixture를 VSCode 에디터에서 연 뒤 `vscode.commands.executeCommand('markdown.showPreview', uri)`로 미리보기를 여는 E2E 시퀀스를 `@vscode/test-electron` suite에서 재연한다(TSK-01-04의 테스트 브리지 `form-js._test.getMountState` 재사용). URL 직접 `page.goto` 사용 금지.

## 주요 구조

- **`defineComponent<F>(def)`** (`src/components/defineComponent.ts`): Zod 스키마(`componentDefSchema`)로 `def` 객체를 `parse()`한 뒤 `@form-js-designer/designer-core`의 `defineComponent`에 위임한다. 반환 타입은 core 동일 — `def & { component: FormJsFieldComponent }`. dev 빌드에서 Zod 검증 실패 시 `throw new Error(...)`, prod에서는 `console.warn(...)` 후 core로 위임(기존 `validatePropsSchema` 패턴과 동형).

- **`componentDefSchema`** (`src/components/propsSchemaZod.ts`): Zod v3 스키마. 필수 필드 `type: z.string().min(1)`, `name: z.string().min(1)`, `group: z.enum(['container','data','input','presentation','action'])`, `propsSchema: propsSchemaZod`, `create: z.function()`, `render: z.function()`. 선택 필드 `icon: z.function().optional()`, `keyed`/`pathed`/`escapeGridRender: z.boolean().optional()`, `layout: z.object({ row: z.number().optional(), columns: z.number().optional() }).optional()`, `i18nKeys: z.array(z.string()).optional()`.

- **`createCustomComponentsModule(): FormJsModule`** (`src/components/index.ts`): `@form-js-designer/designer-components`의 `DesignerComponentsModule` 객체를 재노출한다. vscode-extension 계층에서는 **별칭 export**(`customComponentsModule`)로 이름을 단일화하여 viewer/editor가 `import { customComponentsModule } from '../components'`로 동일하게 참조한다. TabPanel 팔레트 숨김 Proxy 로직은 기존 core 구현 그대로 사용.

- **`preview.ts` 주입 지점**: `mountViewers()` 함수의 `createForm({ ... })` 호출에 `additionalModules: [customComponentsModule]`을 추가한다. viewerCache에 저장된 기존 인스턴스는 schema 재import만 하므로 이번 Task 전후로 import된 스키마의 호환성을 유지한다(Card/Tabs/Modal/TabPanel 타입이 아닌 블록은 그대로 렌더됨).

- **`customEditor.ts` 주입 준비**: WP-02가 구현 전이므로 stub은 `import { customComponentsModule } from '../components';`를 추가하고 `__formJsCustomEditorLoaded = true` 마킹 직전에 `void customComponentsModule;` 참조로 tree-shaking을 방지하는 최소 연결만 둔다. TSK-02-01에서 `createFormEditor({ additionalModules: [customComponentsModule] })`로 승격한다.

- **`form-js-components.css` 스코프**: 모든 셀렉터는 `.form-js-block` 루트 내부로 scope한다(`.form-js-block .dc-card { ... }` 형태). 테마 토큰은 `color: var(--vscode-editor-foreground); background: var(--vscode-editor-background);`으로 바인딩하며, HC 테마 대응으로 `border: 1px solid var(--vscode-panel-border);` 기본값 제공. 각 컴포넌트 `min-height: 40px;` 선언.

## 데이터 흐름

입력: `createForm({ additionalModules: [customComponentsModule], schema })` — webview preview.ts / customEditor.ts에서 호출
처리: form-js didi IoC 컨테이너가 `designerComponentsRegistration` 서비스를 construct → `formFields.register('card'|'tabs'|'modal'|'tabPanel', Component)` 4회 호출 → TabPanel만 `_formFields` Proxy로 팔레트 숨김 → createForm 완료 시 스키마 필드들이 해당 타입 registry로 라우팅되어 렌더
출력: Card/Tabs/Modal/TabPanel 타입 필드가 포함된 스키마가 "field not supported" 오류 없이 마운트. 빈 스키마 또는 타입이 없는 스키마도 기존과 동일하게 동작(하위 호환)

## 설계 결정 (대안이 있는 경우만)

- **결정**: vscode-extension의 `src/components/defineComponent.ts`는 `designer-core`의 구현을 얇게 감싸고 Zod 검증만 추가한다
- **대안**: vscode-extension 내부에서 `defineComponent`를 새로 구현하여 독립 유지
- **근거**: PRD G5("디자이너 본체의 커스텀 컴포넌트·런타임 모듈을 재사용 — 중복 구현 금지")와 TRD §2 패키지 레이아웃(designer-* workspace 패키지 재사용)을 정면으로 위반하지 않기 위함. core 구현은 이미 `assertPureRender` + `validatePropsSchema` + `DefaultPaletteIcon` fallback까지 갖추고 있어 재구현 가치가 없다

---

- **결정**: `customComponentsModule`은 **싱글톤**(module-scope const)으로 export하여 viewer/editor 양쪽에서 동일 객체 참조 공유
- **대안**: 호출 시마다 `createCustomComponentsModule()`을 factory로 호출
- **근거**: form-js didi 컨테이너는 모듈 객체 식별에 참조 동등성을 쓰지 않으므로 factory여도 기능은 동일하지만, 싱글톤이면 (1) webview 번들 내 중복 코드 제거, (2) 디버깅 시 "어떤 모듈이 주입됐는지" 추적 용이. factory export 역시 함께 제공하여 테스트에서 격리 인스턴스가 필요한 경우 활용 가능

---

- **결정**: CSS는 `media/form-js-components.css` 단일 파일로 통합하여 `contributes.markdown.previewStyles`에 추가
- **대안**: 컴포넌트별 CSS(`card.css`, `tabs.css`, `modal.css`, `tabPanel.css`)를 각각 `previewStyles`에 4개 등록
- **근거**: VSCode가 previewStyles를 webview에 주입하는 순서가 명시적으로 결정되지 않아 구성이 많을수록 flaky 증가. 단일 파일 1개가 번들 크기(≤5MB)와 로드 순서 안정성 양쪽에서 유리. 컴포넌트별 CSS 분리는 번들러(esbuild)의 책임이 아니며 webview는 정적 경로 등록만 가능

---

- **결정**: Zod 검증 실패 시 dev는 throw, prod는 console.warn으로 graceful degrade
- **대안**: 언제나 throw
- **근거**: `designer-core`의 `validatePropsSchema`가 이미 동일한 dev/prod 비대칭 패턴을 쓰고 있어 일관성 유지. prod에서 throw하면 단일 컴포넌트 계약 위반이 전체 markdown preview를 깨뜨리므로, PRD §10 리스크 "JSON 파싱 실패 한 블록이 전체 preview를 깨지 않음" 원칙과 정합

## 선행 조건

- **TSK-01-04 완료** (WBS depends): `@vscode/test-electron` 통합 테스트 하네스가 동작해야 WP-01 fixture 3종 회귀 + 신규 빈 스키마 fixture 검증이 가능
- **TSK-00-01 완료**: esbuild 이중 타깃 빌드, `scripts/copy-media.mjs`, package.json contribution 선언이 이미 존재
- **`@form-js-designer/designer-core` / `@form-js-designer/designer-components`** workspace 패키지가 빌드 가능 상태 — 각 패키지의 `defineComponent`, `DesignerComponentsModule`, `CardComponent`, `TabsComponent`, `ModalComponent`, `TabPanelComponent`, `ChildrenSlot`를 import해야 함. 빌드가 안 되면 본 Task는 실패
- **Zod ^3.23.0** 신규 의존성 추가 (runtime dep). `@form-js-designer/designer-components`는 workspace dep(`"*"`)으로 추가
- **Preact 10.x single-instance**: 루트 `package.json` overrides가 유지되어 `designer-components`가 쓰는 Preact와 vscode-extension이 쓰는 Preact가 동일 인스턴스여야 한다(이미 WP-00에서 확립)

## 리스크

- **HIGH**: `@form-js-designer/designer-components`는 `@radix-ui/react-dialog`, `@radix-ui/react-tabs`, `class-variance-authority`, `tailwind-merge`를 의존한다. 그러나 TSK-05-01 제약 "외부 UI lib 금지 — Preact + form-js primitives만 사용"과 정면 충돌한다. **결론**: 본 Task에서는 `designer-components`의 **컴포넌트 인스턴스만 import**하여 form-js에 register한다. Radix 등은 designer-components 내부 렌더링에만 쓰이고 vscode-extension 코드가 직접 import하지 않으므로 제약을 "vscode-extension 자체 구현체"에 국한 해석한다. 만약 WP 리더가 더 엄격한 해석을 적용하면 TSK-05-02/03에서 Radix 의존을 제거한 별도 렌더러를 요구할 수 있어, 이 해석 경계를 design.md에 명시해 팀 확인을 받는다

- **HIGH**: `designer-components`의 CSS(`container-base.css`, `Card.css`, `Tabs.css`, `Modal.css`, `TabPanel.css`)는 Vite/번들러에 의해 JS에 인라인 import되어 있다. webview(esbuild iife) 빌드에서 `.css` import가 에러 없이 처리되려면 esbuild.config.mjs에 `loader: { '.css': 'css' }` 또는 `loader: { '.css': 'text' }` + 수동 주입이 필요하다. 현재 esbuild 설정은 CSS 로더 명시가 없어 import 실패 가능 — build 검증 필수

- **HIGH**: `designer-components`는 `tailwindcss`, `autoprefixer`, `class-variance-authority`의 런타임 심볼이 bundle에 들어가야 한다. `.vsix` 크기 ≤5MB 예산(TSK-04-03) 위반 위험. `size-limit` 사전 스모크 권장 — bundle analysis로 실제 증가량 측정 후 Tree-shaking 불가한 경우 TSK-05-02/03에서 vscode-extension 전용 경량 렌더러 재구현 결정

- **MEDIUM**: Zod v3는 런타임 크기 ~50KB gzip. preview.ts가 매번 로드되므로 번들에 포함될 시 첫 렌더 p95 < 500ms 예산(PRD §8)을 소량 잠식. dev 빌드에만 검증을 수행하고 prod에서는 `if (process.env.NODE_ENV !== 'production') ...` 가드로 tree-shaking 유도(esbuild `define`이 이미 NODE_ENV를 치환하므로 dead-code 제거 가능)

- **MEDIUM**: form-js `additionalModules` 배열 순서에 따라 동일 타입이 이중 등록되면 나중 것이 이김. `customComponentsModule`이 viewer 기본 모듈보다 뒤에 위치해야 `card`/`tabs` 타입이 올바르게 라우팅됨. `additionalModules: [customComponentsModule]`는 createForm 내부에서 유저 모듈로 취급되어 기본 모듈 다음에 주입되므로 안전하나, customEditor에서는 Palette 모듈과의 순서에 주의 필요

- **MEDIUM**: TabPanel 팔레트 숨김 Proxy는 `formFields._formFields` 속성 접근 타이밍에 민감하다. `designer-components/module.ts`가 이미 처리하지만, viewer-only 모드에서는 팔레트가 존재하지 않으므로 Proxy가 무의미하게 적용된다. 성능 영향은 없으나 design.md에 명시하여 TSK-05-02/03 리뷰 시 주목

- **LOW**: 빈 스키마 + 모듈 주입 상태에서 form-js가 경고 로그(`Unknown form field of type …`)를 출력하지 않는지 확인. 현재 fixture 스키마는 Card/Tabs 등 커스텀 타입을 포함하지 않으므로 경고 없음이 예상됨

- **LOW**: `media/form-js-components.css` 신규 파일이 `scripts/copy-media.mjs`의 복사 대상에 없으면 `.vsix`에 포함되지 않는다. package.json의 `previewStyles` 선언만으로는 패키징되지 않으므로 copy-media.mjs 수정이 필수

## QA 체크리스트

dev-test 단계에서 검증할 항목. 각 항목은 pass/fail로 판정 가능해야 한다.

- [ ] (정상 — 계약) `defineComponent({ type: 'card', name: 'Card', group: 'container', propsSchema: {...}, create: () => ({type:'card'}), render: () => <div/> })`가 예외 없이 반환되고 `.component.config.type === 'card'`가 확인된다
- [ ] (정상 — 모듈 형상) `customComponentsModule.__init__`이 1개 서비스 이름 배열이며, 해당 서비스가 `['type', Function]` 튜플로 정의되어 있다
- [ ] (정상 — 주입) `preview.ts`가 `createForm({ container, schema, additionalModules: [customComponentsModule] })`을 호출하고, formFields mock에서 `register('card'|'tabs'|'modal'|'tabPanel', Component)`가 각각 1회 호출된다
- [ ] (정상 — WP-01 회귀) `single-block.md`, `multi-block-with-invalid.md`, `reload-test.md` 3종 fixture가 모듈 주입 후에도 기존 기대값(`hasError === false` 또는 기대하는 `true`)을 그대로 반환한다
- [ ] (정상 — 빈 스키마) `empty-schema-with-module.md`(빈 `components: []`)가 모듈 주입 상태에서 `hasError === false`로 마운트된다
- [ ] (엣지 — Zod dev) 필수 필드 `type` 누락 상태로 `defineComponent({ name, group, ... })` 호출 시 dev 빌드에서 `Error`가 throw되고 에러 메시지에 `"type"` 문자열이 포함된다
- [ ] (엣지 — Zod prod) `NODE_ENV=production` 번들에서는 위 동일 입력이 `console.warn`만 출력하고 throw하지 않는다
- [ ] (엣지 — 빈 추가 모듈) `createForm({ additionalModules: [] })`와 `additionalModules: [customComponentsModule]` 두 경로 모두에서 기본 스키마 마운트가 성공한다
- [ ] (에러 — render 누락) `defineComponent({ type, name, group, propsSchema, create })` (render 누락) dev 빌드에서 throw + 에러 메시지에 `"render"` 문자열 포함
- [ ] (에러 — propsSchema shape) `propsSchema`가 `{ properties: {...} }` 형상이 아니면(예: 배열) dev 빌드에서 throw
- [ ] (통합 — CSS 로드) `.vsix` 번들에 `media/form-js-components.css`가 포함되어 있고, 미리보기 DOM에서 `.form-js-block .dc-card`에 적용된 `min-height`가 40px 이상이다(computed style)
- [ ] (통합 — single Preact) `npm -w @form-js-designer/designer-vscode-extension run build` 후 `scripts/ci/assert-single-preact.mjs`가 통과한다 (preact 2개 이상 버전 감지 시 실패)
- [ ] (통합 — 타입) `npm -w @form-js-designer/designer-vscode-extension run typecheck`가 에러 없이 완료되어 defineComponent 계약 위반이 빌드 타임에 탐지됨을 검증

**fullstack/frontend Task 필수 항목 (E2E 테스트에서 검증 — dev-test reachability gate):**
- [ ] (클릭 경로) 메뉴/사이드바/버튼을 클릭하여 목표 페이지에 도달한다 (URL 직접 입력 금지)
- [ ] (화면 렌더링) 핵심 UI 요소가 브라우저에서 실제 표시되고 기본 상호작용이 동작한다
