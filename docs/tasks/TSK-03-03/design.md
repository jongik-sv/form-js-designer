# TSK-03-03: ViewerHost/EditorHost + LocaleProvider 계약 - 설계

## 요구사항 확인
- `packages/designer-core/src/host/ViewerHost.tsx`, `host/EditorHost.tsx`, `i18n/LocaleProvider.tsx` 세 모듈을 WBS TSK-03-03 요구사항·phase-1-plan §3.1 "Viewer/Editor 합성 유틸" 표 그대로 `designer-core`에 정식 추가한다. ViewerHost는 `@bpmn-io/form-js-viewer`의 `Form` 인스턴스를 감싸는 Preact 컴포넌트 래퍼이고, EditorHost는 ViewerHost + TSK-03-01에서 이관한 `OverlayLayer`를 **동일 stacking container 내에서 형제 요소**로 합성한다 (ADR-0001 §3 D1/D3/D5, PRD §4 AC #4·#4-1).
- LocaleProvider는 `t(key, params?) => string` 함수를 주입하는 **계약 전용 Preact Context**다. 실구현(ko 사전·extract 스크립트·Intl 어댑터)은 WP-07 `designer-i18n`에서 수행하고, 본 Task는 "`designer-i18n` 연동 가능한 t 함수의 시그니처/Provider API/`useT` 훅"만 확정한다 (PRD §4 AC #5, phase-1-plan §3.1 "i18n 계약 인터페이스 — t 함수 주입 계약만").
- 단위 테스트(Vitest + happy-dom + `@testing-library/preact`)로 다음을 검증한다: ① ViewerHost가 schema/data 변경 시 form-js `importSchema`/`_update`를 올바른 순서로 호출, ② EditorHost가 OverlayLayer를 `#overlay-root` 형제에 렌더하고 `overlayContainer` prop으로 D3 assert를 활성화, ③ LocaleProvider 미설치 시 `useT()`가 fallback t (key 반환 + dev `console.warn`)를 반환, ④ Provider 주입 시 `useT()`가 주입된 t를 그대로 노출. `designer-i18n` 실구현과의 연동은 WP-07 머지 시점에 동일 타입으로 호환됨을 타입 레벨에서 보장한다 (`LocaleT` 타입 공유).

## 타겟 앱
- **경로**: `packages/designer-core` (모노레포 라이브러리 패키지)
- **근거**: phase-1-plan §3.1 "designer-core 확장" 표에서 `src/host/{ViewerHost,EditorHost}.tsx` 및 `src/i18n/LocaleProvider.tsx`를 `designer-core` 아래로 명시. WP-06 `designer-editor-host`의 LivePreviewModule/EditorApp이 본 API를 소비한다 (WBS §WP-06, phase-1-plan §3.4 "Live Preview" 행).

## 구현 방향
- `src/host/` 신규 서브디렉토리에 ① `ViewerHost.tsx` (`<Form>` 래퍼, props: `schema/data?/viewport?/locale?/additionalModules?/onChange?/onImport?`) ② `EditorHost.tsx` (ViewerHost + OverlayLayer, 단일 stacking container 강제) ③ `hostTypes.ts` (Props/Context 타입) ④ `__tests__/ViewerHost.test.tsx` (14 케이스) ⑤ `__tests__/EditorHost.test.tsx` (12 케이스) 를 둔다.
- `src/i18n/` 신규 서브디렉토리에 ① `LocaleProvider.tsx` (Preact `createContext` + `LocaleProvider` 컴포넌트 + `useT()`/`useLocale()` 훅) ② `localeTypes.ts` (`LocaleT`, `LocaleContextValue`, `LocaleKey` 타입) ③ `fallbackT.ts` (기본 fallback: key 그대로 반환 + dev 전용 `console.warn`) ④ `__tests__/LocaleProvider.test.tsx` (10 케이스) 를 둔다.
- ViewerHost는 `useLayoutEffect`로 `Form` 인스턴스를 create→`importSchema(schema)` 하고, `useEffect` 의존성 `[schema]`에서 다시 `importSchema`, `[data]`에서 `_update({ data })`, `[locale.lang]` 변경 시 `LocaleProvider`는 위쪽이고 form-js 내부 locale은 form-js 모듈 옵션으로 전달한다. unmount 시 `form.destroy()` 호출. ADR-0001 D5 Viewport parity는 캔버스 div에 `ResizeObserver`를 붙여 측정치를 `viewport` prop으로 공급받은 부모에게 callback으로 보고하는 훅(`useViewportWidth`)을 동일 모듈에 포함한다(form-js에 직접 주입할 수 없으므로 반응형 컴포넌트는 CSS container query 또는 호스트 prop을 사용 — ADR D5 규약 유지).
- EditorHost는 ViewerHost를 내부에서 사용하는 대신 **동일 stacking container**(`#fjs-designer-shell`)에 `#form-root`(ViewerHost 마운트 대상)와 `#overlay-root`를 형제로 렌더하고, `ref` 바인딩 후 `render(h(OverlayLayer, { formRoot, selectedIds, overlayContainer: shellRef }), overlayRoot)` 를 수행. TSK-03-01 `OverlayLayer`가 dev 빌드에서 `assertSharedOrigin`을 자동 호출하도록 `overlayContainer` prop을 명시적으로 전달한다.
- `LocaleProvider`는 `value={{ lang: 'ko', t: userT }}` 형태를 받으며 **미설치 시 fallback t를 반환**. `designer-i18n`은 WP-07에서 `import { LocaleProvider, type LocaleT } from '@form-js-designer/designer-core'` 후 자체 `t` 구현을 주입하므로 본 Task에서 타입 시그니처(`LocaleT = (key: string, params?: Record<string, string | number>) => string`)를 **고정**한다.
- Vitest는 happy-dom에서 `new Form({ container })` 호출이 DOM 조작만 수행하므로 실행 가능(spike editor/viewer에서 이미 검증). `@bpmn-io/form-js-viewer`는 이미 designer-core devDependency에 포함되어 있다 (package.json L32).

## 파일 계획

**경로 기준:** 모든 파일 경로는 **프로젝트 루트 기준**이다.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-core/src/host/ViewerHost.tsx` | `<Form>` 생명주기 관리 Preact 컴포넌트. props: `{ schema, data?, locale?, viewport?, additionalModules?, onChange?, onImport?, onError?, containerRef? }`. `useLayoutEffect`로 `new Form({ container, additionalModules })` 생성 → `importSchema(schema)` → `form.on('changed', ...)` → unmount 시 `form.destroy()`. schema/data 갱신은 각각 `importSchema`/`_update({ data })`. 내부적으로 `<LocaleProvider>` 래퍼 지원(이미 상위에 있으면 중첩 허용하되 새 value 교체). | 신규 |
| `packages/designer-core/src/host/EditorHost.tsx` | ViewerHost + OverlayLayer 합성. DOM 구조: `<div id="fjs-designer-shell"><div id="form-root" /><div id="overlay-root" /></div>` (ADR-0001 §6.3 이슈3 해결 구조). ViewerHost를 `#form-root`에 마운트, `preact.render(<OverlayLayer .../>)`를 `#overlay-root`에 마운트. dev 빌드에서 `overlayContainer={shellRef}`로 assertSharedOrigin 자동 활성화. props: ViewerHost props + `{ selectedIds: readonly string[], onSelect?: (id: string) => void, renderContextSlots?: Partial<FormRenderContextSlots> }`. | 신규 |
| `packages/designer-core/src/host/hostTypes.ts` | `ViewerHostProps`, `EditorHostProps`, `HostOnChangeEvent`, `HostViewportInfo`, `FormRenderContextSlots` 타입. OverlayLayer·defineComponent의 기존 타입에 의존. | 신규 |
| `packages/designer-core/src/host/useViewportWidth.ts` | `ResizeObserver` 기반 hook. `(ref, cb) => void`. 캔버스 너비 변동을 마이크로태스크로 디바운스 후 callback. ADR-0001 §3 D5 Viewport parity 구현 유틸. | 신규 |
| `packages/designer-core/src/host/shellStyles.css` | `#fjs-designer-shell` layout CSS. spike의 `layers.css:26-43` 패턴을 그대로 이관하여 `#form-root`·`#overlay-root`가 동일 bounding box origin/width를 공유. `@layer designer-shell` 네임스페이스. | 신규 |
| `packages/designer-core/src/host/__tests__/ViewerHost.test.tsx` | 14 케이스. schema/data/locale prop reactivity + form-js lifecycle 계약 + `onChange`·`onImport`·`onError` 호출 + `form.destroy` cleanup. | 신규 |
| `packages/designer-core/src/host/__tests__/EditorHost.test.tsx` | 12 케이스. shell DOM 구조, `#form-root` vs `#overlay-root` origin 일치 시 정상 (assert 통과), origin 불일치 시 `SharedOriginViolation` throw, selectedIds 반영, `onSelect` 콜백, unmount 시 overlay render cleanup. | 신규 |
| `packages/designer-core/src/host/__tests__/useViewportWidth.test.ts` | 4 케이스. 초기 width 리포트, ResizeObserver 트리거, cleanup, width=0 (layout 전) skip. | 신규 |
| `packages/designer-core/src/i18n/LocaleProvider.tsx` | `LocaleContext = createContext<LocaleContextValue>(defaultLocale)`, `<LocaleProvider lang t>` 컴포넌트, `useT(): LocaleT`, `useLocale(): LocaleContextValue` 훅. Provider 미설치 시 `fallbackT` 반환. | 신규 |
| `packages/designer-core/src/i18n/localeTypes.ts` | `LocaleT = (key: string, params?: Record<string, string \| number>) => string`, `LocaleContextValue = { lang: string; t: LocaleT }`, `LocaleKey = string` (현재는 별칭, WP-07에서 literal union으로 좁힐 수 있도록 alias 유지). | 신규 |
| `packages/designer-core/src/i18n/fallbackT.ts` | `createFallbackT(): LocaleT`. 호출 시 첫 호출만 `console.warn('[designer-i18n] LocaleProvider not installed; returning key as-is')` (1회성). 이후 호출은 `key` 그대로 반환. dev 빌드에서만 warn, prod에선 조용히 반환(`isProductionEnv()` 재사용). params가 있으면 `{{name}}` placeholder 최소 치환. | 신규 |
| `packages/designer-core/src/i18n/__tests__/LocaleProvider.test.tsx` | 10 케이스. 기본 Provider 없음 → fallback t; Provider 주입 → 주입 t 반환; `useT()` 훅이 Provider 하위에서만 주입된 t 반환; params 치환; nested Provider 재정의; lang prop 변경 시 re-render; dev 경고 1회성. | 신규 |
| `packages/designer-core/src/index.ts` | `ViewerHost`, `EditorHost`, `LocaleProvider`, `useT`, `useLocale`, `createFallbackT` + 관련 타입 public export 추가. | 수정 |
| `packages/designer-core/package.json` | `exports`에 `"./host"` (→ `./src/host/index.ts` barrel), `"./i18n"` (→ `./src/i18n/index.ts` barrel), `"./host/shellStyles.css"` 서브패스 추가. `@bpmn-io/form-js-viewer`는 이미 devDependency로 존재하지만, ViewerHost/EditorHost가 런타임 의존하므로 `peerDependencies`로 승격(`"^1.21.2"`). | 수정 |
| `packages/designer-core/src/host/index.ts` | `ViewerHost`, `EditorHost`, `useViewportWidth` 및 타입 barrel re-export. | 신규 |
| `packages/designer-core/src/i18n/index.ts` | `LocaleProvider`, `useT`, `useLocale`, `createFallbackT`, `LocaleT`, `LocaleContextValue`, `LocaleKey` barrel re-export. | 신규 |

## 진입점 (Entry Points)
- **N/A** (domain=library, UI 페이지 없음). 본 Task는 `@form-js-designer/designer-core`에서 Preact 컴포넌트·훅·타입만 public API로 노출한다. 실제 페이지 진입 경로/사이드바는 **WP-06** (`designer-editor-host/src/App.tsx`, `TSK-06-02` EditorHost 통합)과 **WP-04** (LivePreviewModule) 설계에서 다룬다. 본 Task 범위는 계약 + 단위 테스트까지.

## 주요 구조

- **`ViewerHost` (Preact 컴포넌트, `ViewerHost.tsx`)**
  - Props: `{ schema: FormSchema; data?: Record<string, unknown>; locale?: { lang: string; t: LocaleT }; viewport?: 'sm'|'md'|'lg'|{ width: number }; additionalModules?: ModuleDeclaration[]; onChange?: (e: HostOnChangeEvent) => void; onImport?: (e: { warnings: unknown[] }) => void; onError?: (e: unknown) => void; containerRef?: Ref<HTMLDivElement>; }`
  - Lifecycle:
    - `useLayoutEffect([])` — 컨테이너 `<div ref={containerRef ?? internal}>` DOM이 paint 이전에 mount되면 `new Form({ container: el, additionalModules })` 생성. `form.on('changed', (e) => onChange?.({ data: e.data, schema: e.schema, errors: e.errors }))`, `importSchema(schema, data)` 후 결과 Promise resolve 시 `onImport?.` 호출.
    - `useEffect([schema])` — 마운트 이후 schema 변경 시 `form.importSchema(schema, data ?? {})` 재호출.
    - `useEffect([data])` — data만 바뀐 경우 `form._update({ data })` (form-js 내부 API이지만 editor도 동일하게 사용, spike에서 검증됨).
    - cleanup — `form.destroy()` 호출. 중복 호출 방지 ref 플래그.
  - 위쪽에 `<LocaleProvider lang={locale.lang} t={locale.t}>`로 감싸서 subtree에서 `useT()` 접근 가능하게 함. `locale` 미지정 시 Provider 생략(상위 Provider 상속).
  - `additionalModules`에는 `designer-components`, `designer-table`이 export하는 module이 삽입되어 form-js formFields에 신규 컴포넌트가 register됨(WP-04/02).

- **`EditorHost` (Preact 컴포넌트, `EditorHost.tsx`)**
  - Props: ViewerHostProps + `{ selectedIds: readonly string[]; onSelect?: (id: string) => void; renderContextSlots?: Partial<FormRenderContextSlots>; }`
  - DOM 구조:
    ```
    <div id="fjs-designer-shell" ref={shellRef}>
      <div id="form-root" ref={formRootRef} />
      <div id="overlay-root" ref={overlayRootRef} />
    </div>
    ```
  - `useLayoutEffect([])`에서:
    1. `ViewerHost`를 `formRootRef.current`에 `preact.render(<ViewerHost .../>, formRootRef.current)` (nested render — host 앱 통합 패턴, spike editor.tsx와 동일 구조)
    2. `preact.render(<OverlayLayer formRoot={formRootRef.current!} selectedIds={selectedIds} overlayContainer={shellRef.current!} />, overlayRootRef.current!)` — `overlayContainer` prop이 dev 빌드에서 assertSharedOrigin 자동 호출 트리거 (TSK-03-01 build-report의 주의사항).
    3. click 이벤트 위임: shell 범위 내 `[data-fjs-id]` 요소 클릭 시 해당 id로 `onSelect?.(id)` 호출.
  - cleanup: 두 서브트리에 `preact.render(null, node)` 호출 + DOM 참조 해제.

- **`LocaleProvider` + `useT` + `useLocale` (`LocaleProvider.tsx`)**
  ```tsx
  const defaultCtx: LocaleContextValue = { lang: 'ko', t: createFallbackT() };
  const LocaleContext = createContext<LocaleContextValue>(defaultCtx);
  export function LocaleProvider({ lang, t, children }: PropsWithChildren<LocaleContextValue>) {
    const value = useMemo(() => ({ lang, t }), [lang, t]);
    return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
  }
  export const useLocale = (): LocaleContextValue => useContext(LocaleContext);
  export const useT = (): LocaleT => useContext(LocaleContext).t;
  ```
  - `LocaleT` 타입은 `(key: string, params?: Record<string, string|number>) => string`.
  - `createFallbackT()`는 내부 클로저 `warned` 플래그로 dev 빌드에서 1회만 warn.

- **`useViewportWidth(ref, cb)` (`useViewportWidth.ts`)**
  - `useLayoutEffect`로 `new ResizeObserver(entries => cb(entries[0].contentRect.width))` 생성, `ref.current` observe. cleanup 시 disconnect. EditorHost의 D5 viewport parity에서 `cb`를 통해 ViewerHost.viewport prop을 상위로 전파하는 용도.

## 데이터 흐름
입력: 호스트 앱(WP-06)이 `schema`, 선택 상태(`selectedIds`), locale, viewport를 prop으로 전달 → 처리: EditorHost가 `#fjs-designer-shell` stacking container를 만들고 ViewerHost(= form-js `<Form>`)를 `#form-root`에, OverlayLayer를 `#overlay-root`에 형제로 마운트. `LocaleProvider`가 tree 전역에 `t` 주입. ADR D3 `assertSharedOrigin`이 dev 빌드에서 shell을 overlayContainer로 검증하여 원점 불일치 시 즉시 throw. → 출력: form-js가 정상 렌더한 `#form-root` 서브트리 + OverlayLayer 선택 박스 DOM. form-js `changed` 이벤트는 `onChange` 콜백으로 상위로 전파(WP-06 LivePreviewModule 소비). locale subtree는 `useT()`로 접근하는 모든 컴포넌트(PanelWidget ctx.t 포함)에 동일 t 함수를 공급.

## 설계 결정 (대안이 있는 경우만)

- **결정 1**: EditorHost는 ViewerHost를 **nested preact.render**로 `#form-root`에 마운트하고, OverlayLayer는 `#overlay-root`에 **별도 render**로 마운트한다 (spike editor.tsx 패턴 그대로 정식화).
  - **대안**: 단일 Preact 트리에서 ViewerHost와 OverlayLayer를 형제 JSX로 렌더하고, form-js `Form` 생성자에 `#form-root`를 `container`로 건네는 방식.
  - **근거**: form-js `Form` 생성자는 외부 DOM 엘리먼트를 container로 받아 내부에서 자체 Preact 트리를 구축하므로, 상위 Preact 컴포넌트가 `#form-root` 내부 DOM을 관리할 수 없다. spike `editor.tsx`는 이미 `Form` + 별도 `preact.render(OverlayLayer, overlayRoot)` 패턴으로 픽셀 diff 0을 달성했다(ADR-0001 §6.1). 정식 모듈도 동일 구조를 유지해야 D1/D3/D6 회귀 방지. 단일 트리는 form-js 내부 구조(Didi DI + 자체 render) 변경을 요구하므로 "form-js 본체 수정 0건" 제약(phase-1-plan §5 D-P1-1) 위반.

- **결정 2**: `LocaleProvider` 본 Task 범위를 **Context + t 시그니처 + fallback t**까지로 한정하고, ko 사전·extract·Intl 어댑터는 WP-07 `designer-i18n`으로 미룬다.
  - **대안**: 본 Task에서 ko.json 골격도 같이 구축.
  - **근거**: WBS/phase-1-plan이 두 패키지를 명시적으로 분리 (§3.1 "i18n 계약 인터페이스 — **t 함수 주입 계약만**"). 계약을 먼저 굳혀야 WP-04 PanelWidget ctx.t, WP-06 EditorApp, WP-07 사전 모두 동일 타입을 참조할 수 있다. 사전 구축은 Task 범위가 다르고(CI 게이트 추가 필요) 공수 증가 위험.

- **결정 3**: `t` 시그니처를 `(key: string, params?: Record<string, string | number>) => string`로 **고정**하고 `LocaleKey`는 현재는 `string` 별칭으로 둔다.
  - **대안**: `LocaleKey`를 literal union(`'designer.core.loading' | 'designer.components.card.title' | ...`)으로 즉시 좁혀서 타입 안전성 확보.
  - **근거**: literal union은 WP-07 `extract.ts` 스크립트가 생성한 번들에서 도출되어야 정확. 본 Task 시점엔 각 WP의 i18n 키가 미정이므로 literal 강제 시 컴파일 불가 lock-in 발생. alias로 남겨두면 WP-07 머지 때 `LocaleKey = keyof typeof koLocale` 로 교체해도 기존 호출부는 무영향.

- **결정 4**: ADR D5 Viewport parity를 **`useViewportWidth` 훅 + 호스트 prop 전파**로 구현하고, form-js 내부에는 ViewerHost가 viewport 값을 직접 주입하지 않는다.
  - **대안**: form-js container에 `data-viewport` attribute를 쓰거나 CSS container query만 사용.
  - **근거**: ADR-0001 D5 표 첫 행이 "ResizeObserver → ViewerHost에 prop 주입 → 반응형 컴포넌트가 동일 breakpoint로 평가"를 명시. 훅 + prop 전파가 ADR 문구 그대로. `designer-*` 컴포넌트는 `defineComponent`의 `render(props)`에서 viewport prop을 받도록 이후 확장하며, 본 Task는 **훅만 제공**하고 prop consumption은 WP-02/04 컴포넌트 구현에서 수행.

- **결정 5**: EditorHost의 선택 click 처리(`onSelect`)를 shell 범위 `[data-fjs-id]` 이벤트 위임으로 구현한다.
  - **대안**: OverlayLayer에 click handler를 붙여 핸들 클릭만 선택으로 처리.
  - **근거**: OverlayLayer의 핸들은 이미 `pointer-events: auto`이지만 **선택 자체**는 오버레이가 아직 그려지지 않은 요소(새로 드래그된 필드)에도 필요하다. ADR D3 "DOM 비-침투"를 지키면서도 form-js 필드 자체에 click을 감지하려면 shell 범위 위임이 유일한 방법. form-js 필드 DOM은 위임 가능한 bubble 이벤트를 정상 발생.

## 선행 조건
- TSK-03-02 완료 (depends 필드). 실제로 같은 `designer-core` 트리의 독립 서브디렉토리(`host/`, `i18n/` vs `panel/`)이므로 구조 충돌은 없지만, WBS DAG상 PropsPanelWidget ctx가 `useT`를 소비하므로 순차 머지로 일관성 보장.
- TSK-03-01 완료 — OverlayLayer 정식 이관 + `overlayContainer` prop + `assertSharedOrigin` 자동 호출 (본 Task에서 이 prop을 실제로 전달한다, build-report L47 가이드).
- `@bpmn-io/form-js-viewer ^1.21.2` 이미 devDependency 존재 (package.json L32) — 본 Task에서 peerDependencies 승격.
- `preact ^10.19.3` + `@testing-library/preact ^3.2.4` 이미 존재.
- ADR-0001 §3 D1·D3·D5 Accepted 상태 (커밋 `2e36d6a`).
- `isProductionEnv()` 헬퍼가 `src/envUtils.ts`에 존재 (TSK-02-06 Remove Duplication, `overlay/OverlayLayer.tsx` L18에서 이미 재사용 중).

## 리스크

- **HIGH**: `form._update({ data })` 는 form-js-viewer 내부 API(public API 아님). Phase 0 spike editor에서도 사용했으나 form-js 1.22+ 릴리스에서 시그니처 변경 가능. 완화 — ViewerHost 내부에서 try/catch + `form._update` 존재성 `typeof === 'function'` 체크 후 fallback으로 `form.importSchema(schema, data)` 재호출. `ViewerHost.test.tsx`에 이 fallback 경로 케이스 1건 포함. 향후 form-js 업그레이드 시 단일 지점 수정으로 대응.

- **HIGH**: EditorHost의 nested `preact.render` 2회(`#form-root`, `#overlay-root`)는 Preact의 root 단위 생명주기 관리 복잡도 증가. 특히 부모가 EditorHost를 unmount할 때 두 내부 root를 반드시 `preact.render(null, node)` 로 cleanup해야 한다. 완화 — cleanup을 단일 `useLayoutEffect` 반환 함수로 집중시키고, `EditorHost.test.tsx`에 "unmount 시 overlay node innerHTML이 ''이고 observer leak 없음" 케이스 2종 추가. 테스트에서 `ResizeObserver` 호출 횟수를 spy로 측정.

- **MEDIUM**: happy-dom은 `ResizeObserver`를 polyfill 제공하지만 실제 resize 이벤트를 발생시키지 않는다. `useViewportWidth` 훅의 resize callback 경로는 해피 패스만 커버 가능. 완화 — 테스트에서 `vi.spyOn(global, 'ResizeObserver').mockImplementation(...)`로 callback을 수동 invoke하여 resize 시나리오 검증. 실 브라우저 resize는 WP-06 `editor.livepreview.spec.ts` Playwright에서 커버.

- **MEDIUM**: `assertSharedOrigin`은 `getBoundingClientRect()` 기반이므로 happy-dom에서 모든 rect가 `{0,0,0,0}`을 반환한다. EditorHost.test.tsx에서 origin 일치/불일치 시나리오는 `vi.spyOn(Element.prototype, 'getBoundingClientRect')`로 rect를 요소별 mock해야 한다. 완화 — TSK-03-01의 `src/overlay/__tests__/` 테스트가 이미 같은 패턴을 사용. 동일 헬퍼(`rectStub`)를 `src/host/__tests__/_fixtures/rectStub.ts`에 복제하지 말고, TSK-03-01에서 만든 fixtures가 export되어 있다면 재사용(build-report 확인 — 없으면 본 Task에서 공통 fixture로 승격). 본 Task 완료 시 spike fixtures 중복 제거를 **후속 TSK-03-06(refactor)**에 기록.

- **MEDIUM**: `LocaleProvider` 미설치 시 fallback t의 `console.warn`이 단위 테스트에서 노이즈 발생. 완화 — `warned` 플래그를 `createFallbackT()`가 반환하는 t의 closure에 두고, 테스트는 각 테스트 내부에서 새 fallback 인스턴스를 만들어 warn 1회 검증 + `vi.spyOn(console, 'warn')`. Provider 주입 케이스에선 fallback 인스턴스가 생성되지 않으므로 warn 미발생.

- **LOW**: `@bpmn-io/form-js-viewer`를 peerDependencies로 승격하면 `designer-core` 단독 설치 시 경고. 완화 — `designer-core` 는 호스트 앱(`designer-editor-host`)에서만 소비되며, 해당 앱은 이미 form-js-viewer 의존성을 명시할 것이므로 실 사용 시나리오엔 영향 없음. README에 "peer: `@bpmn-io/form-js-viewer ^1.21.2`" 명시.

- **LOW**: `params` placeholder 치환(`{{name}}` → params.name)은 초기 구현을 **단순 문자열 replace**로 한다. ICU MessageFormat/복수 처리는 본 Task 범위 밖. 완화 — WP-07 `designer-i18n`이 실 t를 주입하면 고급 치환을 대체. fallback t는 dev 경고이므로 프로덕션 경로가 아님.

- **LOW**: `EditorHost`가 `renderContextSlots`를 받도록 prop을 열어두었지만 본 Task에서 실 slot 주입은 하지 않는다 (form-js `FormRenderContext`는 Context이며 form-js 내부에서 생성되므로 host가 `additionalModules`의 서비스로만 slot을 교체할 수 있다). 본 Task는 **타입 surface**만 확정하고, 실제 slot override는 WP-06 `PaletteModule`/`OutlineModule`에서 구현한다.

## QA 체크리스트

dev-test 단계에서 검증할 항목. 각 항목은 pass/fail로 판정 가능해야 한다.

- [ ] (정상) `npm --prefix packages/designer-core run test:unit` 실행 → `host/__tests__/` 30 케이스 + `i18n/__tests__/` 10 케이스 + 기존 TSK-03-01/02 회귀 = 모두 통과.
- [ ] (정상) ViewerHost 마운트 시 `new Form({ container })` 1회 호출되고, `form.importSchema(schema, data)` 가 useLayoutEffect 첫 실행에서 호출된다 (mock spy로 검증).
- [ ] (정상) ViewerHost의 `schema` prop이 참조 변경되면 `form.importSchema(newSchema, data)` 가 재호출된다.
- [ ] (정상) ViewerHost의 `data` prop이 참조 변경되면 `form._update({ data: newData })` 가 호출된다 (schema 재import는 호출되지 않음).
- [ ] (정상) ViewerHost unmount 시 `form.destroy()` 가 정확히 1회 호출된다 (중복 호출 방지).
- [ ] (정상) ViewerHost의 `onChange` 콜백이 form-js `changed` 이벤트 발화 시 호출된다 (`{ data, schema, errors }` 페이로드 포함).
- [ ] (정상) EditorHost 렌더 결과에서 `#fjs-designer-shell > #form-root` 및 `#fjs-designer-shell > #overlay-root` 가 존재한다 (형제 DOM).
- [ ] (정상) EditorHost가 `overlayContainer={shellRef.current}` 를 OverlayLayer에 전달하여, 원점 일치 케이스에서 `assertSharedOrigin` 이 throw하지 않는다.
- [ ] (정상) `LocaleProvider` 하위의 컴포넌트에서 `useT()('designer.core.loading')` 가 주입된 t 함수를 그대로 실행하고 반환값이 "불러오는 중..." 등 주입된 문자열과 일치 (mock 주입).
- [ ] (정상) `LocaleProvider` 하위의 `useLocale()` 가 `{ lang: 'ko', t: <주입된 t> }` 를 반환한다.
- [ ] (정상) nested `LocaleProvider` 에서 내부 Provider 의 t/lang이 외부를 override한다.
- [ ] (엣지) `schema` 가 `undefined` → ViewerHost는 `form.importSchema({})` 호출 없이 빈 컨테이너만 렌더 + dev 경고 1회.
- [ ] (엣지) `selectedIds=[]` 일 때 EditorHost는 OverlayLayer를 마운트하되 선택 박스 0개 렌더, `assertSharedOrigin` 은 여전히 호출되고 통과.
- [ ] (엣지) `LocaleProvider` 미설치 환경에서 `useT()` 호출 → fallback t 반환, 첫 호출 시 `console.warn('[designer-i18n] LocaleProvider not installed...')` 1회 발생, 두 번째 호출부터 warn 미발생 (동일 fallback 인스턴스 기준).
- [ ] (엣지) fallback t에 params 전달: `fallbackT('greeting', { name: 'Ada' })` → `'greeting'` 반환(key 우선, placeholder 치환 생략 — key가 실제 문자열이 아니므로). 키가 `'Hello {{name}}'` 처럼 평문이면 `'Hello Ada'` 로 치환.
- [ ] (엣지) `useViewportWidth` 에서 `ref.current === null` 시 observer 생성 없이 즉시 cleanup 가능.
- [ ] (에러) form-js `new Form()` 이 throw 하면 ViewerHost 의 `onError` 콜백이 호출되고 내부 상태는 "destroyed" 로 남아 이후 cleanup에서 `destroy()` 중복 호출이 일어나지 않는다.
- [ ] (에러) EditorHost 에서 `#form-root`와 `#overlay-root`의 getBoundingClientRect 가 2px 초과 diff를 갖도록 mock → dev 빌드에서 `SharedOriginViolation` throw 되어 `onError` 로 전파되며 렌더 실패(테스트에서 `expect(() => render(...)).toThrow(SharedOriginViolation)` 또는 `onError` spy 호출 확인).
- [ ] (에러) `LocaleProvider` 에 `t`가 function이 아닌 값으로 전달되면 dev 빌드에서 `console.warn` + fallback 으로 대체된다 (prop validation).
- [ ] (통합) `import { ViewerHost, EditorHost, LocaleProvider, useT, useLocale, createFallbackT, type LocaleT, type ViewerHostProps, type EditorHostProps } from '@form-js-designer/designer-core'` 가 TypeScript 에서 타입 포함하여 resolve 됨 (`npm --prefix packages/designer-core run typecheck` 통과).
- [ ] (통합) `@form-js-designer/designer-core/host` 서브패스 import로 `ViewerHost`, `EditorHost` 에 접근 가능 (package.json `exports` 검증). `@form-js-designer/designer-core/i18n` 로 LocaleProvider 접근 가능.
- [ ] (통합) `@form-js-designer/designer-core/host/shellStyles.css` 를 host 앱이 import 하면 `#fjs-designer-shell` 스타일이 적용된다 (CSS 클래스 정의 존재 확인).
- [ ] (통합) EditorHost 가 내부 ViewerHost 에 `locale={{ lang, t }}` 를 전달하면, 그 subtree의 form-js 컴포넌트가 `useT()` 를 통해 동일 t 를 resolve (mocked component spy로 검증). ADR-0001 §3 D5 "동일 LocaleProvider" 규약 충족.
- [ ] (통합) TSK-03-02 `propsSchemaToPanel` 결과의 PanelWidget `ctx.t` 슬롯이 `useT()` 반환 타입과 호환됨 (타입 테스트: `expectTypeOf<PanelWidgetCtx['t']>().toEqualTypeOf<LocaleT>()` 혹은 동등한 tsd 검사).
- [ ] (회귀) 기존 `packages/designer-core/src/overlay/__tests__/` 18 케이스 + `panel/__tests__/` 테스트(TSK-03-02 머지 후 24+α) + `defineComponent`/`assertPureRender`/`browserEnvContract` 테스트 모두 그대로 통과 — 본 Task 변경이 다른 모듈을 깨뜨리지 않음.
- [ ] (회귀) Phase 0 spike `npm --prefix packages/designer-core run test:e2e:spike` 실행 시 5/5 여전히 통과 — spike editor.tsx/viewer.tsx 파일 미변경 확인.
