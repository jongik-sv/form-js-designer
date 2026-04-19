# TSK-04-02: Tabs · Modal 2종 (Radix 래퍼) - 설계

## 요구사항 확인
- Phase 1 `designer-components` 5종 중 Tabs/Modal 2종을 `@radix-ui/react-tabs` · `@radix-ui/react-dialog` + `preact/compat` 래퍼로 `defineComponent` 계약에 흡수한다 (ADR-0002 D1 1순위 경로, PRD §4 AC #1/#4-1/#7).
- 파리티/골든/computed-style 3종 게이트(ADR-0001 D4/D6)를 통과하되, Modal 파리티는 **열린 상태** 캡처. axe-core 0 위반 + 키보드 경로(Tab/Shift-Tab/ArrowLeft/ArrowRight/Esc) 전수 통과.
- `overrides.preact` + `npm ls preact` 단일 인스턴스 강제(R3), Radix Portal.container `<main>` 주입(ADR-0002 D1 조건 3), Radix 미합격 시 Zag 2순위 fallback 트리거 절차(ADR-0002 D2).

## 타겟 앱
- **경로**: `packages/designer-components` (신규 패키지, 모노레포 workspace 멤버). 본 Task에서 패키지 스캐폴드까지 포함 — TSK-04-01에서 동일 패키지 스캐폴드가 선행되었다면 Tabs/Modal 파일만 추가한다.
- **근거**: `depends: TSK-04-01` + phase-1-plan §3.2 "packages/designer-components/src/<name>/" 경로 규정. `designer-core`의 `defineComponent`/`FormJsFieldComponent` 계약을 소비하는 자매 패키지.

## 구현 방향
1. **패키지 스캐폴드** — `packages/designer-components`에 `package.json`(workspace), `tsconfig.json`, `vite.config.ts`(ADR-0002 D6 공유 alias 5개 + `react-dom/test-utils`→`preact/test-utils`), `playwright.config.ts`, `src/index.ts` 배럴을 배치. TSK-04-01 선행 시 중복분은 skip.
2. **Radix 래퍼 2종** — `src/tabs/Tabs.tsx`·`src/modal/Modal.tsx`를 `defineComponent({ type, name, group, propsSchema, create, render })` 계약으로 작성. `render()` 내부에서 `@radix-ui/react-tabs`·`@radix-ui/react-dialog` compound 컴포넌트를 합성하되, preact/compat alias가 이미 React import를 preact로 치환하므로 추가 어댑터 불필요.
3. **a11y 강제** — propsSchema에서 Tabs는 `tabs[].label`(i18n 필수, 빈 문자열 금지), Modal은 `title`(i18n 필수) + `aria-label` fallback 검증. ADR-0002 D1 조건 2 "Dialog Content는 `aria-label` 또는 `Title` 필수"를 propsSchema 런타임 validator로 내장.
4. **Portal.container 계약** — Modal은 `Dialog.Portal container={...}` prop을 외부에서 주입받도록 `render()` 시그니처에 `portalContainer?: Element` 필드 확장 (PureRenderProps 외 field-level 옵션, `field.portalContainerRef` 키 regex로 host 앱이 DOM node resolve). host 미주입 시 `<body>` 기본값 → axe region 2건은 editor-host TSK 범위에서 해소되므로 본 Task는 주입 인터페이스만 노출.
5. **테스트 3종** — `*.parity.spec.ts`(열린 상태 캡처, 1024/1440/1920 3 viewport), `*.golden.spec.ts`(절대 기준, Tabs 기본/disabled/vertical 3컷 · Modal sm/md/lg 3컷), `*.computed-style.test.tsx`(happy-dom + `getComputedStyle` snapshot). + `*.a11y.spec.ts`(axe-core 0 위반, 열림·포커스·Tab 순환 매트릭스) + 키보드 E2E(Esc/Overlay/Tab/Shift-Tab/ArrowLeft/ArrowRight).

## 파일 계획

**경로 기준**: 프로젝트 루트 기준. 본 프로젝트는 단일 app(모노레포 내 workspace)이며 `packages/designer-components/` 접두어 필수.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-components/package.json` | workspace 패키지 manifest. `@radix-ui/react-tabs`, `@radix-ui/react-dialog`, `@preact/preset-vite` deps. peer: `preact@^10.29` | 신규 (TSK-04-01 선행 시 의존성 add만 수정) |
| `packages/designer-components/tsconfig.json` | jsx=preact, `paths` aliasing | 신규 (선행 시 skip) |
| `packages/designer-components/vite.config.ts` | ADR-0002 D6 공유 alias 5종 (`react`, `react-dom`, `react-dom/test-utils`, `react/jsx-runtime`, `react/jsx-dev-runtime`) | 신규 (선행 시 skip) |
| `packages/designer-components/playwright.config.ts` | viewport matrix `[1024, 1440, 1920]`, projects: chromium | 신규 (선행 시 skip) |
| `packages/designer-components/src/index.ts` | `DesignerComponentsModule = { components: [Tabs, Modal, ...] }` export (form-js `additionalModules` 규약) | 신규/수정 (Tabs/Modal entry 추가) |
| `packages/designer-components/src/tabs/Tabs.tsx` | `defineComponent` 기반 Radix Tabs 래퍼. `List`/`Trigger`/`Content` 합성 | 신규 |
| `packages/designer-components/src/tabs/Tabs.css` | `@layer components` 전역 평문 CSS (module 금지 — ADR-0001 D4) | 신규 |
| `packages/designer-components/src/tabs/propsSchema.ts` | `tabs: array(label:i18n, value:string)`, `defaultValue: string`, `orientation: enum(horizontal\|vertical)` | 신규 |
| `packages/designer-components/src/tabs/spec.json` | AI Read용 요약 (TRD §6.4) | 신규 |
| `packages/designer-components/src/modal/Modal.tsx` | `defineComponent` 기반 Radix Dialog 래퍼. `Trigger`/`Portal`/`Overlay`/`Content`/`Title`/`Description`/`Close` 합성 | 신규 |
| `packages/designer-components/src/modal/Modal.css` | `@layer components` 전역 평문 CSS | 신규 |
| `packages/designer-components/src/modal/propsSchema.ts` | `title: i18n`(필수), `description: i18n`, `triggerLabel: i18n`, `size: enum(sm\|md\|lg)`, `portalContainerRef?: string` | 신규 |
| `packages/designer-components/src/modal/spec.json` | AI Read용 요약 | 신규 |
| `packages/designer-components/src/__tests__/Tabs.test.tsx` | Vitest + happy-dom, 순수 렌더 + propsSchema 검증 + `defineComponent` 계약 | 신규 |
| `packages/designer-components/src/__tests__/Modal.test.tsx` | 열린 상태 렌더 + Title/aria-label 검증 + propsSchema 필수 필드 reject | 신규 |
| `packages/designer-components/src/__tests__/tabs.computed-style.test.tsx` | `getComputedStyle` 스냅샷 (orientation별 flex-direction, gap) | 신규 |
| `packages/designer-components/src/__tests__/modal.computed-style.test.tsx` | Modal overlay/content padding·border-width·z-index 스냅샷 (size별) | 신규 |
| `packages/designer-components/e2e/tabs.parity.spec.ts` | viewer↔editor pixel diff ≤ 0.1% at 1024/1440/1920 | 신규 |
| `packages/designer-components/e2e/tabs.golden.spec.ts` | 기본/disabled/vertical 3컷 절대 기준 | 신규 |
| `packages/designer-components/e2e/tabs.a11y.spec.ts` | axe-core 0 위반 + 키보드(ArrowLeft/ArrowRight/Home/End/Tab) 매트릭스 | 신규 |
| `packages/designer-components/e2e/modal.parity.spec.ts` | **열린 상태** 캡처 파리티 at 3 viewport | 신규 |
| `packages/designer-components/e2e/modal.golden.spec.ts` | sm/md/lg 3 size 절대 기준 | 신규 |
| `packages/designer-components/e2e/modal.a11y.spec.ts` | axe-core 0 위반 + focus trap + Esc/Overlay close + focus return | 신규 |
| `packages/designer-components/e2e/fixtures/host.html` | 파리티·골든 스펙용 공통 host. `<main>` 내부 Portal.container anchor 포함 | 신규 |
| `package.json` (monorepo root) | `overrides.preact: "10.29.x"` 단일 인스턴스 고정 (R3). TSK-04-01 선행 시 확인만 | 수정 |
| `scripts/ci/assert-single-preact.mjs` | `npm ls preact` 출력 파싱 → 2+ 인스턴스 감지 시 exit 1 (R3 CI 게이트) | 신규 |
| `.github/workflows/ci.yml` | `lint:single-preact` 잡 추가 (기존 파일에 step 추가) | 수정 |

> 비-페이지 UI(공통 컴포넌트 라이브러리)이므로 "진입점" 섹션에는 **적용될 상위 페이지**로 `designer-editor-host`의 Palette(드롭 대상)와 Live Preview 영역을 명시한다. 호스트 앱 자체의 라우터·메뉴 파일은 WP-06(editor-host) 범위로 본 Task에서 수정하지 않되, **Palette 등록 계약**(`DesignerComponentsModule`의 `additionalModules` export)이 라우팅과 등가한 "연결 배선"이므로 이를 파일 계획에 포함.

## 진입점 (Entry Points)

- **사용자 진입 경로**: editor-host 기동 → 좌측 Palette에서 `Tabs` 또는 `Modal` 컴포넌트 카드 클릭/드래그 → 중앙 캔버스에 드롭 → 선택 상태에서 우측 Properties Panel에서 propsSchema 필드 편집 → Live Preview에 반영 확인.
- **URL / 라우트**: `http://localhost:5173/` (editor-host dev 서버, wbs.md Dev Config frontend e2e-url). 단일 페이지 앱이며 라우트는 `/`. Palette 내 컴포넌트 선택은 URL 변경 없이 선택 상태 query(`?selected=tabs|modal`) 또는 in-memory state.
- **수정할 라우터 파일**: 본 Task는 **라이브러리 패키지**이므로 자체 라우터 파일 없음. 대신 form-js `additionalModules` 계약을 통한 컴포넌트 등록이 라우팅과 등가:
  - `packages/designer-components/src/index.ts`의 `DesignerComponentsModule` export 배열에 `Tabs`/`Modal` 추가 — 위 "파일 계획" 표에 포함
  - 상위 페이지 배선: `packages/designer-editor-host/src/modules/PaletteModule.ts`(WP-06 범위, 본 Task 수정 금지)가 `DesignerComponentsModule`을 import하여 Palette에 자동 등록. 본 Task의 acceptance는 "import 가능한 module export" 수준까지이며 editor-host 통합 E2E는 WP-06 TSK-06-02 완료 후.
- **수정할 메뉴·네비게이션 파일**: 동일하게 본 Task 범위 밖이나 컴포넌트가 표시될 Palette 그룹:
  - 각 컴포넌트의 `create()`에서 `group: 'container'` (Tabs/Modal 모두) 지정 → `packages/designer-editor-host/src/modules/PaletteModule.ts`의 `navItems` 등가 영역(`components.container` 그룹 배열)에 자동 렌더됨
  - 본 Task의 컨트랙트: `Tabs.component.config.group === 'container'` 및 `Modal.component.config.group === 'container'` 단위 테스트로 고정
- **연결 확인 방법**: editor-host E2E(WP-06 범위)에서 검증:
  - Palette에서 `Tabs` 카드 클릭 → 캔버스 드롭 영역 클릭 → 캔버스에 Tabs 렌더 → Properties Panel `tabs` 배열에 1행 추가 → Preview 갱신
  - 동일 시퀀스 Modal: `triggerLabel` 편집 → canvas trigger 버튼에 반영 → trigger 클릭 → Portal.container 내부에 overlay/content 렌더
  - 본 Task 자체 E2E는 컴포넌트 **단독 fixture host**(`e2e/fixtures/host.html`)에서 import + render하는 단위 검증이며, editor-host 통합은 TSK-06-02 acceptance에서 수행

> **비-페이지 UI 명시**: `Tabs`/`Modal`은 공통 컴포넌트 라이브러리이므로 "적용될 상위 페이지"는 **designer-editor-host의 Palette 및 Live Preview 영역**이며, 해당 페이지 E2E(WP-06)에서 컴포넌트 렌더링을 검증한다.

## 주요 구조
- **`Tabs` (`packages/designer-components/src/tabs/Tabs.tsx`)**: `defineComponent({ type: 'tabs', name: 'Tabs', group: 'container', propsSchema, create, render })`. `render({ field, value, domId })`에서 `<TabsPrimitive.Root>` + `<TabsPrimitive.List>` + `field.tabs.map(t => <TabsPrimitive.Trigger value={t.value}>{t(t.label)}</TabsPrimitive.Trigger>)` + `<TabsPrimitive.Content>` 합성. 자식 content slot은 form-js 기본 컨테이너 렌더 delegate.
- **`Modal` (`packages/designer-components/src/modal/Modal.tsx`)**: `defineComponent({ type: 'modal', name: 'Modal', group: 'container', ... })`. `render()`에서 `<DialogPrimitive.Root>` + `<DialogPrimitive.Trigger>` + `<DialogPrimitive.Portal container={resolvePortalContainer(field.portalContainerRef)}>` + `<DialogPrimitive.Overlay>` + `<DialogPrimitive.Content data-size={field.size}>` + `<DialogPrimitive.Title>{t(field.title)}</DialogPrimitive.Title>` + `<DialogPrimitive.Close>` 합성.
- **`propsSchema` (각 컴포넌트별)**: `PropsSchema` 타입 준수. 런타임 validator로 Modal `title` 필수 + 빈 문자열 reject (ADR-0002 D1 조건 2 강제).
- **`resolvePortalContainer(ref?: string): Element | null`** (modal 내 내부 함수): `ref` 미지정 시 `null`(기본 `<body>`). `ref`가 CSS selector 문자열이면 `document.querySelector` lookup, 실패 시 `console.warn` + `null` fallback.
- **`DesignerComponentsModule` (`src/index.ts`)**: `{ components: [Tabs.component, Modal.component, ...] }` — form-js `additionalModules` 규약. TSK-04-01의 Card/Stack/Button export와 병합.

## 데이터 흐름
editor-host가 `FormSchema`에서 `type: 'tabs'|'modal'` 필드 만남 → form-js renderer가 `DesignerComponentsModule`에서 매칭 컴포넌트 조회 → sanitized `PureRenderProps` 전달 → `render()`에서 Radix primitive 합성 → preact/compat alias가 React import를 preact로 치환 → DOM 트리에 Tabs/Modal 렌더 → Modal의 경우 Portal.container로 지정된 `<main>` 내부 anchor에 overlay/content 포털 → 사용자 상호작용(ArrowKey/Esc/Tab) → Radix 내부 state → `onChange({ value })` propagate.

## 설계 결정 (대안이 있는 경우만)
- **결정 1 — Radix primitive 직접 사용, 별도 어댑터 레이어 없음**
  - **대안**: `@radix-ui/react-*`를 감싸는 공통 어댑터(e.g., `createRadixWrapper(primitive, propsSchema)`) 추상화.
  - **근거**: ADR-0002 spike에서 Radix + preact/compat이 workaround 0줄로 동작 확인. 추상화 레이어는 인터페이스 복잡도만 증가(2개 컴포넌트에 비해 일반화 이익 < 비용). Phase 2 Popover 추가 시 재평가.

- **결정 2 — Modal Portal.container는 propsSchema의 `portalContainerRef: string` CSS selector로 노출**
  - **대안**: (a) 전역 Context에서 container DOM ref 주입 / (b) Portal.container 미노출(Radix 기본 `<body>` 고수).
  - **근거**: (a)는 designer-core 의존 증가로 단일 패키지 경계 위반. (b)는 ADR-0002 D1 조건 3(axe region 해소) 불충족. CSS selector 문자열은 JSON 직렬화 가능 → schema 저장 안전 + host 앱이 자유롭게 anchor 결정.

- **결정 3 — Tabs orientation은 `horizontal`/`vertical` 2값만 (Radix의 orientation prop 그대로)**
  - **대안**: 추가 variant(`pill`, `underline` 등) 지원.
  - **근거**: Phase 1 AC #1은 배치·렌더만 요구. 시각적 variant는 Phase 2 범위(TRD §13 미결). propsSchema 단순 유지로 골든 이미지 셀 수 3컷(기본/disabled/vertical) 고정.

- **결정 4 — ADR-0002 D2 Zag fallback 트리거 문서화만 포함, 본 Task 구현 대상 아님**
  - **대안**: Tabs/Modal을 Zag adapter로도 병행 구현.
  - **근거**: ADR-0002 D1이 Accepted. Zag는 "조건 4개 중 하나 차단 시 1주 내 전환" 발동형. 본 Task QA 체크리스트에 "ADR-0002 조건 4개 위반 시 중단 후 ADR-0002 D2 경로 재설계 요청" 항목만 포함.

## 선행 조건
- **TSK-04-01**(Card·Stack·Button 3종): `packages/designer-components` 패키지 스캐폴드, `vite.config.ts` alias, `index.ts` 배럴, `playwright.config.ts`가 선행 커밋되어 있어야 한다. 미완 시 본 Task 착수 시점에 스캐폴드를 본 Task 범위로 편입(추가 공수 ~1일).
- **ADR-0002 D1 Accepted** (2026-04-17) — 완료.
- **monorepo root `overrides.preact`** (R3): 본 Task Build 단계에서 root `package.json`에 `overrides.preact: "10.29.x"` 추가 후 `npm ls preact`로 단일 인스턴스 확인. CI 게이트 스크립트 `scripts/ci/assert-single-preact.mjs` 신설.
- 외부 라이브러리: `@radix-ui/react-tabs@^1.1.x`, `@radix-ui/react-dialog@^1.1.x`, `@axe-core/playwright@^4.11.x`.

## 리스크
- **HIGH — ADR-0002 D1 조건 4개 회귀 감지**: Radix 1.1.x 또는 preact 10.29 마이너 업데이트가 `radix-ui/primitives#1056` 또는 `preactjs/preact#3297`을 재발시킬 수 있음. **완화**: Build 직전 `npm ls preact` + spike 기반 3 시나리오 smoke test(`packages/designer-core/spike/phase1-q1q2/q1-radix/scripts/smoke.mjs`)를 1회 재실행하여 현재 lockfile에서 미재현 재확인. 재현 시 즉시 ADR-0002 D2(Zag fallback) 경로 전환 요청.
- **HIGH — preact/compat 중복 인스턴스(R3)**: monorepo root `overrides` 누락 시 `@radix-ui/*` transit deps가 별도 React/Preact 인스턴스 발생 → Hooks 미들웨어 오동작. **완화**: `scripts/ci/assert-single-preact.mjs` CI 게이트 + Build 직전 로컬 `npm ls preact` 사전 확인. Refactor phase까지 통과 시 해소.
- **MEDIUM — axe region moderate 2건 잔존**: Portal이 `<body>` 직속으로 렌더될 때 "All page content contained by landmarks" 규칙 위반. 본 Task 범위에서는 propsSchema `portalContainerRef` 인터페이스만 노출, 실 주입은 editor-host(WP-06) 책임. **완화**: `*.a11y.spec.ts`에서 fixture host에 `<main id="portal-anchor">` 선언 + `portalContainerRef: '#portal-anchor'` 세팅으로 본 Task 내 0 위반 달성 → editor-host는 동일 앵커 계약을 WP-06에서 재사용.
- **MEDIUM — Modal 파리티 "열린 상태" 캡처의 불안정성**: Radix animation이 `data-state="open"` 전이 중 캡처되면 픽셀 diff 증가. **완화**: `.parity.spec.ts`에서 `await expect(content).toHaveAttribute('data-state', 'open')` + `await page.waitForTimeout(200)` (animation end 후) gate. CSS에서 `prefers-reduced-motion` + `@layer components` 레벨 motion off 옵션 포함.
- **MEDIUM — Tabs `defaultValue` 미일치 시 빈 Content 렌더**: `defaultValue`가 `tabs[].value` 집합에 없으면 Tabs.Content 모두 미렌더. **완화**: propsSchema 런타임 validator로 `defaultValue ∈ tabs.map(t => t.value)` assertion, 위반 시 `console.warn` + 첫 번째 tab으로 fallback.
- **LOW — i18n 키 네임스페이스 충돌**: `designer.components.tabs.*`/`designer.components.modal.*` 네임스페이스가 다른 패키지와 충돌할 가능성. **완화**: TSK-04-01과 동일 prefix 규약 합의 확인.
- **LOW — spec.json AI Read 포맷 미확정**: TRD §6.4의 spec.json 스키마가 Phase 1 중 변동 가능. **완화**: TSK-04-01 산출물의 spec.json 구조를 그대로 답습. 구조 변경 시 2 파일만 갱신으로 처리 가능.

## QA 체크리스트

**정상 케이스:**
- [ ] `defineComponent({ type: 'tabs', ... })` 반환값의 `.component.config` 메타데이터 5개 필드(type/name/group/keyed/pathed)가 정확히 노출된다.
- [ ] `defineComponent({ type: 'modal', ... })` 반환값의 `.component.config.group === 'container'`이다.
- [ ] `DesignerComponentsModule`의 `components` 배열에 Tabs/Modal entry가 포함되어 form-js `additionalModules`로 등록 가능하다.
- [ ] Tabs 초기 렌더 시 `defaultValue`에 해당하는 Content만 `data-state="active"`로 표시된다.
- [ ] Modal `triggerLabel` 클릭 시 Portal.container 내부에 `<div role="dialog" aria-modal="true">`가 렌더되고, Title이 `aria-labelledby`로 연결된다.
- [ ] Tabs.css·Modal.css가 `@layer components` 내부에 위치하며, `*.module.css` 파일이 `packages/designer-components/` 하위에 0개 존재한다(ADR-0001 D4).

**엣지 케이스:**
- [ ] Tabs `tabs: []` (빈 배열) 입력 시 `<TabsPrimitive.List>`가 빈 요소로 렌더되고 에러 없음.
- [ ] Tabs `defaultValue`가 `tabs[].value` 집합에 없을 때 `console.warn` 1회 + 첫 번째 tab으로 fallback.
- [ ] Modal `portalContainerRef`가 존재하지 않는 selector일 때 `console.warn` + `<body>` fallback, 렌더 실패 없음.
- [ ] Modal `size="sm"|"md"|"lg"` 3값 외(예: `"xl"`) 전달 시 propsSchema validator에서 reject(dev mode) 또는 `"md"` fallback(prod).
- [ ] Tabs `orientation="vertical"` + 5+ 탭 overflow 상황에서 scroll 혹은 wrap 동작(computed-style 테스트로 flex-direction/flex-wrap 확인).

**에러 케이스:**
- [ ] Modal `title` 누락 또는 빈 문자열 시 propsSchema validator가 error throw (ADR-0002 D1 조건 2). dev mode에서 assert, prod에서 `aria-label` fallback 강제.
- [ ] Tabs `tabs[i].label` 빈 문자열 시 validator warn + `tabs[i].value`로 label fallback.
- [ ] preact 2+ 인스턴스 감지 시(`scripts/ci/assert-single-preact.mjs`) CI exit 1.
- [ ] Radix 1.1.x 업데이트가 사전 조사 버그(`#1056`, `#3297`) 재현 시 Build 중단 + ADR-0002 D7 재평가 요청(Refactor phase까지 지연 금지).

**통합 케이스:**
- [ ] `*.parity.spec.ts` — Tabs/Modal(열린 상태) 각각 1024/1440/1920 3 viewport × 3 variant = 9~18컷 픽셀 diff ≤ 0.1%(ADR-0001 D4 게이트).
- [ ] `*.golden.spec.ts` — Tabs 3컷(기본/disabled/vertical) + Modal 3컷(sm/md/lg) 절대 기준 PNG 비교 pass.
- [ ] `*.computed-style.test.tsx` — Tabs orientation별 `flex-direction` + Modal size별 `max-width`/`padding`/`border-width` 스냅샷 일치.
- [ ] `*.a11y.spec.ts` — axe-core 위반 0 건(`<main>` 내 Portal.container 주입 fixture). 검사 상태: 닫힘·열림·포커스 내부·포커스 Tab 순환 후 4가지.
- [ ] Tabs 키보드: ArrowRight/ArrowLeft/Home/End 4 키로 탭 순환, Enter/Space로 Trigger 활성화, Tab으로 Trigger→Content focus 이동.
- [ ] Modal 키보드: Esc로 close + Trigger로 focus return, Tab/Shift-Tab focus trap 내부 순환, Overlay click close, focus-visible 표시.
- [ ] `npm ls preact` 단일 인스턴스 확인 (R3 CI 게이트 녹색).

**fullstack/frontend Task 필수 항목 (E2E 테스트에서 검증 — dev-test reachability gate):**
- [ ] (클릭 경로) fixture host의 `<button data-testid="open-tabs">`/`<button data-testid="open-modal">`을 클릭하여 컴포넌트 렌더 상태에 도달하는 시퀀스. editor-host 통합 E2E는 WP-06 범위.
- [ ] (화면 렌더링) Tabs ArrowKey 순환, Modal Trigger→Content open→Esc close 실브라우저(headed Playwright) 1회 + headless matrix 통과.
