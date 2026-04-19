# TSK-04-01: Card · Stack · Button 3종 (기본형) — 설계

## 요구사항 확인

- `defineComponent` API 기반으로 Card/Stack/Button 3종 컴포넌트를 신규 패키지 `packages/designer-components`에 구현한다. 각 컴포넌트는 전역 평문 CSS (`@layer components`, `*.module.css` 금지 ADR-0001 D4), CVA + tailwind-merge variant 패턴, propsSchema + spec.json, i18n 키 `designer.components.{name}.*`를 포함한다.
- 각 컴포넌트는 Playwright 기반 parity(3 viewport) + golden + computed-style 3개 E2E 게이트를 통과해야 하며, `form-js additionalModules` 규약으로 등록 가능한 `DesignerComponentsModule`을 노출해야 한다.
- `entry-point: library` — 직접 사용자 UI 없음. E2E는 컴포넌트 Storybook/호스트 앱 없이 전용 Playwright fixture HTML을 사용한다.

## 타겟 앱

- **경로**: `packages/designer-components` (신규 패키지 — 현재 없음)
- **근거**: TRD §2 패키지 구조에 `designer-components`가 명시되어 있으며, WBS WP-04가 이 패키지 전용 WP임.

## 구현 방향

- `packages/designer-components`를 신규 스캐폴드한다. `package.json`에 `@form-js-designer/designer-core` peer dependency, CVA(`class-variance-authority`), `tailwind-merge`, Preact, Vitest, Playwright를 선언하고, ADR-0002 D6 공유 alias 세트를 `vite.config.ts`에 반영한다.
- Card/Stack/Button 각각 `defineComponent` 계약을 따르는 단일 파일 선언 (`src/{card,stack,button}/index.tsx` + `src/{card,stack,button}/{Card,Stack,Button}.css`)을 작성한다. CSS는 전역 `@layer components` 평문만 사용한다.
- 각 컴포넌트 디렉토리에 `propsSchema.ts`(TypeScript 타입 + `PropsSchema` 객체)와 `spec.json`(AI 참조용 JSON 파일)을 같이 배치한다.
- E2E는 독립 Playwright fixture HTML(`test/fixtures/{card,stack,button}.html`) + `*.parity.spec.ts` + `*.golden.spec.ts` + `*.computed-style.spec.ts`의 3파일 구조를 각 컴포넌트마다 가진다.
- `src/index.ts`에서 `DesignerComponentsModule`(form-js `additionalModules` 규약 객체)을 export한다.

## 파일 계획

**경로 기준:** 모든 파일 경로는 프로젝트 루트 기준으로 작성한다.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-components/package.json` | 패키지 선언 (name, deps, scripts) | 신규 |
| `packages/designer-components/tsconfig.json` | TypeScript 설정 (Preact JSX transform) | 신규 |
| `packages/designer-components/vite.config.ts` | Vite 빌드 + ADR-0002 D6 preact/compat alias + Playwright용 dev 서버 | 신규 |
| `packages/designer-components/playwright.config.ts` | E2E 설정 (3 viewport 매트릭스, fixture HTML 서버) | 신규 |
| `packages/designer-components/tailwind.config.ts` | Tailwind CSS 로컬 설정 (designer-theme 분리 전 임시) | 신규 |
| `packages/designer-components/src/index.ts` | public export — `DesignerComponentsModule`, 3 컴포넌트 re-export | 신규 |
| `packages/designer-components/src/module.ts` | `DesignerComponentsModule` — form-js `additionalModules` 규약 등록 객체 | 신규 |
| `packages/designer-components/src/card/index.tsx` | Card `defineComponent` 선언 (propsSchema, create, render) | 신규 |
| `packages/designer-components/src/card/Card.css` | Card 전역 평문 CSS `@layer components` | 신규 |
| `packages/designer-components/src/card/propsSchema.ts` | Card `PropsSchema` 객체 + TypeScript 타입 `CardSchema` | 신규 |
| `packages/designer-components/src/card/spec.json` | Card AI 참조용 spec (type, propsSchema JSON 직렬화) | 신규 |
| `packages/designer-components/src/stack/index.tsx` | Stack `defineComponent` 선언 | 신규 |
| `packages/designer-components/src/stack/Stack.css` | Stack 전역 평문 CSS `@layer components` | 신규 |
| `packages/designer-components/src/stack/propsSchema.ts` | Stack `PropsSchema` + `StackSchema` | 신규 |
| `packages/designer-components/src/stack/spec.json` | Stack AI 참조용 spec | 신규 |
| `packages/designer-components/src/button/index.tsx` | Button `defineComponent` 선언 | 신규 |
| `packages/designer-components/src/button/Button.css` | Button 전역 평문 CSS `@layer components` | 신규 |
| `packages/designer-components/src/button/propsSchema.ts` | Button `PropsSchema` + `ButtonSchema` | 신규 |
| `packages/designer-components/src/button/spec.json` | Button AI 참조용 spec | 신규 |
| `packages/designer-components/test/fixtures/card.html` | Card E2E 독립 fixture HTML (Vite dev 서버 제공) | 신규 |
| `packages/designer-components/test/fixtures/stack.html` | Stack E2E 독립 fixture HTML | 신규 |
| `packages/designer-components/test/fixtures/button.html` | Button E2E 독립 fixture HTML | 신규 |
| `packages/designer-components/test/fixtures/card-entry.tsx` | Card fixture 진입점 tsx (viewer/editor 두 루트 렌더) | 신규 |
| `packages/designer-components/test/fixtures/stack-entry.tsx` | Stack fixture 진입점 tsx | 신규 |
| `packages/designer-components/test/fixtures/button-entry.tsx` | Button fixture 진입점 tsx | 신규 |
| `packages/designer-components/test/card.parity.spec.ts` | Card viewer↔editor 픽셀 diff ≤ 0.1%, 3 viewport | 신규 |
| `packages/designer-components/test/card.golden.spec.ts` | Card 골든 스크린샷 (절대 기준) | 신규 |
| `packages/designer-components/test/card.computed-style.spec.ts` | Card `getComputedStyle` 스냅샷 게이트 | 신규 |
| `packages/designer-components/test/stack.parity.spec.ts` | Stack parity 3 viewport | 신규 |
| `packages/designer-components/test/stack.golden.spec.ts` | Stack 골든 스크린샷 | 신규 |
| `packages/designer-components/test/stack.computed-style.spec.ts` | Stack computed-style 게이트 | 신규 |
| `packages/designer-components/test/button.parity.spec.ts` | Button parity 3 viewport | 신규 |
| `packages/designer-components/test/button.golden.spec.ts` | Button 골든 스크린샷 | 신규 |
| `packages/designer-components/test/button.computed-style.spec.ts` | Button computed-style 게이트 | 신규 |
| `packages/designer-components/test/module.unit.spec.ts` | Vitest — `DesignerComponentsModule` 등록 단위 테스트 | 신규 |
| `package.json` | root `overrides.preact` 단일 인스턴스 고정 (ADR-0002 D1 조건) 추가 | 수정 |

> 이 Task는 `entry-point: library`이며 라우터/네비게이션 파일이 없는 라이브러리 패키지이므로 라우터/메뉴 파일 행은 해당 없음.

## 진입점 (Entry Points)

- **사용자 진입 경로**: 이 Task는 `entry-point: library`이다. 직접 페이지/메뉴 진입 경로가 없다. 컴포넌트는 form-js `additionalModules`로 등록되어 `designer-editor-host`(TSK-06-01)에서 Palette에 자동 노출된다.
- **URL / 라우트**: 해당 없음 (library). E2E는 `test/fixtures/*.html` Vite dev 서버 (예: `http://localhost:5173/card.html`)를 사용한다.
- **수정할 라우터 파일**: 해당 없음. `DesignerComponentsModule`을 `additionalModules`에 등록하는 연결은 TSK-06-01(editor-host)에서 수행된다.
- **수정할 메뉴·네비게이션 파일**: 해당 없음.
- **적용될 상위 페이지**: `packages/designer-editor-host/src/App.tsx` (TSK-06-01에서 구현). E2E parity/golden 게이트는 이 패키지 자체 fixture HTML에서 독립 검증한다.

## 주요 구조

- **`CardComponent`** (`src/card/index.tsx`): `defineComponent` 호출로 생성. `CardSchema`(padding, elevation, header 텍스트, headerTag)를 `propsSchema`로 선언. `render(props)`는 CVA variant + `twMerge`로 class를 조합해 Preact `<div>` 트리를 반환한다. CSS import로 `Card.css` 포함.
- **`StackComponent`** (`src/stack/index.tsx`): direction(horizontal/vertical), gap(0~8), align, justify를 variant로 가진 Flexbox 컨테이너. CVA `display: flex` 기반.
- **`ButtonComponent`** (`src/button/index.tsx`): variant(primary/secondary/ghost), size(sm/md/lg), disabled 처리, `onChange` 대신 action 바인딩을 위한 propsSchema `action` 필드 포함.
- **`DesignerComponentsModule`** (`src/module.ts`): `{ __init__: [...], ...(FormFieldRegistry에 Card/Stack/Button을 register하는 didi service) }` 형태로 form-js `additionalModules` 규약 충족.
- **parity/golden/computed-style spec 3종** (`test/*.spec.ts`): 각각 `pixelmatch`(diff ≤ 0.1%), Playwright 스크린샷 비교, `page.evaluate(() => getComputedStyle(...))` 스냅샷으로 3 게이트를 독립 검증.

## 데이터 흐름

입력: form-js `PureRenderProps<CardSchema | StackSchema | ButtonSchema>` (field, value, domId, errors, disabled, readonly, onChange) → 처리: `defineComponent` 래퍼가 designer-only 키 스트립 후 `render()` 호출, CVA + twMerge로 className 계산 → 출력: Preact JSX Element (viewer/editor 동일 DOM 트리).

## 설계 결정

### E2E fixture 독립 구성
- **결정**: E2E fixture를 Storybook 없이 독립 HTML + Vite entry tsx로 구성한다.
- **대안**: Storybook 또는 `designer-editor-host` 앱에 의존하는 E2E.
- **근거**: TSK-03-03(editor-host 기반)이 아직 미완이고 TSK-04-01이 선행 구현이므로, 호스트 앱 없이 독립 fixture로 3 게이트를 통과해야 블로킹 없이 진행 가능하다.

### spec.json 관리 방식
- **결정**: spec.json을 TypeScript `propsSchema.ts`의 `export const cardPropsSchema`를 JSON 직렬화한 정적 파일로 관리 (초기 수동, 추후 CLI 자동화).
- **대안**: spec.json을 수동 유지하거나, propsSchema.ts만 두고 spec.json은 생략.
- **근거**: TRD §6.4 "AI는 `packages/designer-components/*/spec.json`을 Read로 직접 참조"라는 요건이 명시적이므로 자동 생성 + 커밋이 일관성을 보장한다.

### root overrides 추가 시점
- **결정**: root `package.json`의 `overrides.preact`를 이 Task에서 추가한다.
- **대안**: TSK-04-02(Radix 래퍼)에서 추가 (Radix 실제 필요 시점까지 지연).
- **근거**: ADR-0002 D1 조건 1이 "monorepo root overrides로 단일 인스턴스 고정"을 필수화하며, Card/Stack/Button이 Preact를 직접 사용하므로 이 시점에 추가하는 것이 자연스럽다.

## 선행 조건

- TSK-03-03 완료 — `ViewerHost/EditorHost/LocaleProvider` 계약 확정. 단, 이 Task의 E2E fixture는 editor-host를 직접 임포트하지 않으므로 TSK-03-03 완료 전에도 Card/Stack/Button 컴포넌트 구현 + 자체 E2E 게이트는 진행 가능하다. `DesignerComponentsModule`의 editor-host 통합 검증은 TSK-06-01까지 대기한다.
- `packages/designer-core`의 `defineComponent`, `PropsSchema`, `ComponentDefinition` 타입이 `src/index.ts`에서 export됨 (현재 확인 완료).
- ADR-0002 D6 공유 alias 세트 (`react → preact/compat` 등) — `vite.config.ts`에 반영 필요.
- 외부 의존성: `class-variance-authority`, `tailwind-merge` (Apache-2.0/MIT — 라이선스 게이트 통과).

## 리스크

- **HIGH**: parity 스펙에서 "viewer 렌더"를 비교할 대상이 없음. fixture HTML에 `data-mode="viewer"` / `data-mode="editor"` 두 루트를 나란히 렌더하고 두 스크린샷을 `pixelmatch`로 비교하는 방식으로 parity를 측정한다. 이 접근이 ADR-0001 D6 "디자이너↔viewer 픽셀 diff ≤ 0.1%" 의도와 일치하는지 dev-build 시 재확인 필요.
- **MEDIUM**: Tailwind CSS 설정 부재 — 현재 monorepo에 Tailwind config가 없다. `packages/designer-components/tailwind.config.ts`를 신규 생성하여 로컬 처리. `designer-theme` 패키지(P1 예정) 생성 시 분리 이전 계획.
- **MEDIUM**: `DesignerComponentsModule`의 form-js `FormFieldRegistry.register()` 호출 방식 — form-js didi 컨테이너 기반 모듈 등록 패턴을 실제 코드에서 확인해야 한다 (`packages/form-js-viewer/src/` 내부 참조 필요). 잘못된 모듈 구조는 TSK-06-01 통합 시 드래그·드롭 비동작으로 이어진다.
- **LOW**: `spec.json` 자동 생성 스크립트 — `propsSchema.ts` TypeScript → JSON 변환은 초기에 수동 직렬화로 시작하고 TSK-08 이후 CLI 통합 시 자동화.
- **LOW**: golden baseline 초기 생성 후 CI에서 diff 발생 (폰트 렌더링 환경 차이) — `toHaveScreenshot` threshold (`maxDiffPixelRatio: 0.01`) 설정, CI Docker 환경 고정 폰트 사용.

## QA 체크리스트

dev-test 단계에서 검증할 항목.

- [ ] **Card 정상 케이스**: `type:"card"`, `padding:"md"`, `elevation:1`, `header:"제목"` field로 렌더 시 `<div class="dc-card ...">` 요소가 DOM에 존재하고 `header` 텍스트가 표시된다.
- [ ] **Card parity (1024px)**: fixture HTML의 viewer 모드 스크린샷과 editor 모드 스크린샷의 pixelmatch diff가 ≤ 0.1%이다.
- [ ] **Card parity (1440px)**: 동일 조건, 1440px viewport.
- [ ] **Card parity (1920px)**: 동일 조건, 1920px viewport.
- [ ] **Card golden**: `card.golden.spec.ts` 스크린샷이 golden baseline과 일치한다 (초기 실행 시 baseline 생성).
- [ ] **Card computed-style**: `getComputedStyle(cardRoot).padding`이 `padding:"md"` 설정에 대응하는 픽셀 값과 일치하는 스냅샷이 저장되고 재실행 시 동일하다.
- [ ] **Card 엣지 케이스**: `header` 미설정 시 헤더 DOM 요소가 렌더되지 않는다 (조건부 렌더).
- [ ] **Card 에러 케이스**: `errors:["필수 입력"]` 전달 시 에러 표시 영역이 렌더된다.
- [ ] **Stack 정상 케이스**: `direction:"vertical"`, `gap:4` 설정으로 자식 요소들이 flex-direction:column + 적절한 gap으로 배치된다.
- [ ] **Stack parity (3 viewport)**: 1024/1440/1920 각각 viewer↔editor diff ≤ 0.1%.
- [ ] **Stack golden**: golden baseline과 일치.
- [ ] **Stack computed-style**: `getComputedStyle(stackRoot).flexDirection`이 `direction` prop에 따라 정확히 반영된다.
- [ ] **Stack 엣지 케이스**: `direction:"horizontal"`, `align:"center"`, `justify:"space-between"` 조합이 올바른 CSS를 생성한다.
- [ ] **Button 정상 케이스**: `variant:"primary"`, `size:"md"` 설정 시 `<button>` 요소가 primary 스타일로 렌더된다.
- [ ] **Button parity (3 viewport)**: 1024/1440/1920 각각 diff ≤ 0.1%.
- [ ] **Button golden**: golden baseline과 일치.
- [ ] **Button computed-style**: `getComputedStyle(buttonEl).backgroundColor`가 primary variant 색상 토큰과 일치한다.
- [ ] **Button 엣지 케이스**: `disabled:true` 시 `<button disabled>` 속성이 DOM에 반영된다.
- [ ] **Button 엣지 케이스**: `variant:"ghost"` 시 배경색이 투명이다.
- [ ] **defineComponent 순수 렌더 계약**: 3종 모두 `assertPureRender` 경고 없이 렌더된다 (편집/selection/isPreview 패턴 부재).
- [ ] **DesignerComponentsModule 등록**: `module.unit.spec.ts`에서 `DesignerComponentsModule`을 임포트하고 mock `FormFieldRegistry`에 `register`를 호출하면 `card`, `stack`, `button` 3종이 등록된다.
- [ ] **i18n 키 규칙**: 각 컴포넌트의 `name` 필드가 `designer.components.card.name`, `designer.components.stack.name`, `designer.components.button.name` 키 형식을 따른다.
- [ ] **spec.json 존재**: `src/card/spec.json`, `src/stack/spec.json`, `src/button/spec.json`이 존재하고 유효한 JSON이며 `type`, `propsSchema` 필드를 포함한다.
- [ ] **CSS Module 금지**: `packages/designer-components/**/*.module.css` 파일이 0개이다 (CI `lint:no-css-modules` 통과).
- [ ] **라이선스 게이트**: `class-variance-authority`(Apache-2.0), `tailwind-merge`(MIT)가 CI license-gate 허용 목록에 포함된다.
