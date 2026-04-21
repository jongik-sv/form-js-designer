# TSK-03-02: 어댑터 설계 + 계약 정의 - 설계

## 요구사항 확인
- PRD §6 F4 — 사내 Notion-style 마크다운 뷰어용 custom block 어댑터를 설계하고, VSCode 확장과 동일한 viewer/✏️ 편집 UX를 제공한다 (편집 가능 여부는 호스트 플랫폼 기능에 의존).
- 디자이너 공통 코어(`@form-js-designer/designer-core`, `designer-runtime`, `designer-components`) + `@bpmn-io/form-js-viewer|editor`를 **VSCode 확장과 동일한 조합**으로 재사용하고, 호스트별 차이는 얇은 어댑터 레이어(`adapters/notion-viewer/`)로 격리한다.
- 산출물은 `docs/vscode-ext/features/notion-adapter/adapter-design.md` (viewer/편집 흐름, 번들 전략, CSS 격리). 본 문서는 동 산출물의 **요약·계약 정의**이며, dev-build 시 위 features 문서로 동기 복제한다.

## 타겟 앱
- **경로**: `packages/designer-vscode-extension` (모노레포 단일 패키지에 어댑터 서브트리 추가)
- **근거**: TRD §2 패키지 레이아웃이 `src/adapters/notion-viewer/`를 동일 패키지 안에 두기로 명시. 별도 npm 패키지 분리는 v1 비목표(PRD §3 Non-Goals: 단일 `.vsix` + 동일 번들 산출물 재사용 우선). VSCode preview/editor 코드와 form-js 런타임·컴포넌트 모듈을 **하나의 esbuild 빌드 그래프**에서 공유하기 위함.

## 구현 방향
- **계약 우선 설계**: `FormJsBlockHost`라는 호스트 비종속 인터페이스를 `src/adapters/shared/`에 정의하고, VSCode preview·Notion 어댑터 모두 이 인터페이스를 통해 viewer/editor를 마운트한다. 어댑터는 호스트 플랫폼의 custom block API를 `FormJsBlockHost`로 어댑트하는 **shim 1개 파일**이 책임의 90%.
- **공통 마운트 코어 분리**: 현재 `src/markdown/preview.ts`에 흩어진 viewer 마운트 로직(LRU 캐시, error banner, 테마 동기화, ✏️ 버튼)을 `src/adapters/shared/mountViewer.ts` / `mountEditor.ts`로 추출. `preview.ts`는 VSCode 호스트 어댑터로 위치 변경.
- **플랫폼 분기는 entry script + 매니페스트 2종**: BlockNote/Tiptap/Plate/Lexical/Novel은 모두 React 또는 ProseMirror 위에서 동작하므로 어댑터는 (a) 플랫폼 SDK가 요구하는 등록 함수 호출 + (b) `FormJsBlockHost.mount(rootEl, schema, opts)` 위임 두 단계로 단순화.
- **편집 가능 여부 결정 매트릭스**: 후보 5종 × {viewer, viewer+inline-edit, viewer+modal-edit} 조합에 대해 PoC 게이트 통과 기준을 표로 명시. v1은 호스트 미식별 시 **viewer-only 강제**가 fallback.
- **CSS 격리**: form-js 자체 CSS는 호스트와 충돌하지 않도록 `.form-js-block` scope + ShadowRoot(opt-in) 두 가지 전략을 명시. ShadowRoot 사용 시 form-js base.css를 `<style>` 노드로 inline 주입.
- **번들 전략**: VSCode `.vsix`와 별개로 `dist/notion-adapter/` UMD/ESM 듀얼 번들을 esbuild 멀티 entry로 산출. preact는 single-instance 보장을 위해 **번들 내 포함**(external 금지) — VSCode 웹뷰와 동일 정책.

## 파일 계획

**경로 기준:** 모든 파일 경로는 프로젝트 루트 기준.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `docs/vscode-ext/features/notion-adapter/adapter-design.md` | **acceptance 산출물**. 본 design.md의 풀버전 (viewer/편집 흐름 다이어그램, 번들 전략 표, CSS 격리 결정 트리). dev-build에서 본 design.md와 동일 내용을 features 경로에 복사 + 다이어그램·표 추가. | 신규 |
| `docs/vscode-ext/features/notion-adapter/contract.md` | **호스트 비종속 계약 명세**: `FormJsBlockHost` 인터페이스, 메시지 프로토콜, 에러 코드, 라이프사이클 시퀀스. TSK-03-03 PoC가 참조. | 신규 |
| `docs/vscode-ext/features/notion-adapter/platform-matrix.md` | **후보 플랫폼 비교 매트릭스**: BlockNote / Tiptap / Plate / Lexical / Novel / AFFiNE / 자체 × {custom block API 형태, 편집 지원 가능성, CSS 격리 가능성, 번들 형식 요구사항, 위험도}. TSK-03-01 platform-identification.md를 입력으로 받음. | 신규 |
| `packages/designer-vscode-extension/src/adapters/shared/FormJsBlockHost.ts` | **호스트 비종속 인터페이스**(타입 only). `mount(root, schema, opts) → Disposable`, `requestEdit(handler)`, `applySchemaUpdate(schema)`, `dispose()`. 본 design.md만으로는 코드 미작성, dev-build에서 생성. | 신규(설계 명세) |
| `packages/designer-vscode-extension/src/adapters/shared/mountViewer.ts` | viewer 마운트 코어. 현재 `src/markdown/preview.ts:54-119`의 `mountViewers` 로직을 호스트 비종속으로 추출. LRU 캐시, error banner, theme observer, `additionalModules: [DesignerContainerModule, customComponentsModule]` 조합 그대로 유지. | 신규(설계 명세) |
| `packages/designer-vscode-extension/src/adapters/shared/mountEditor.ts` | editor 마운트 코어. `@bpmn-io/form-js-editor` 인스턴스 생성 + `applySchemaUpdate` / `requestSave` 콜백 노출. VSCode `customEditor.ts`에서 사용 가능하도록 재사용 면 정의. | 신규(설계 명세) |
| `packages/designer-vscode-extension/src/adapters/notion-viewer/index.ts` | Notion-style 뷰어 어댑터의 **router·menu 등록 entry**. 호스트 플랫폼 SDK가 요구하는 router 등록 함수(예: BlockNote `createReactBlockSpec` / Tiptap `Node.create`) 1개 + `FormJsBlockHost.mount` 호출. **TSK-03-01 결과로 플랫폼이 정해진 후 구체 구현은 TSK-03-03**, 본 Task는 entry 시그니처만 확정. | 신규(설계 명세) |
| `packages/designer-vscode-extension/src/adapters/notion-viewer/blockMenu.ts` | 호스트 측 **블록 추가 menu/sidebar nav** 항목 메타데이터(name="form-js", icon, group="Embed", slashCommand="/form-js")를 `formJsBlockMenuItem`으로 export. `index.ts`의 router 등록 함수가 이 spec을 호스트 SDK에 전달하여 사이드바·슬래시 메뉴에 노출시킨다. | 신규(설계 명세) |
| `packages/designer-vscode-extension/src/adapters/notion-viewer/css-isolation.ts` | CSS 격리 유틸. ShadowRoot 모드 + scoped class 모드 분기. form-js base.css를 string으로 import해 inline `<style>` 주입(esbuild `loader: { '.css': 'text' }`). | 신규(설계 명세) |
| `packages/designer-vscode-extension/esbuild.config.mjs` | 멀티 entry 추가: `src/adapters/notion-viewer/index.ts` → `dist/notion-adapter/index.js` (esm) + `dist/notion-adapter/index.umd.js` (iife/umd). preact는 internal. | 수정(설계 명세) |
| `packages/designer-vscode-extension/src/markdown/preview.ts` | 기존 `mountViewers` / `disposeAll` / `applyTheme` 로직을 `adapters/shared/mountViewer.ts`로 위임하는 thin wrapper로 축소. 동작 변경 없음 (refactor 안전망: TSK-01-04 testBridge 메시지 호환 유지). | 수정(설계 명세) |

> 본 Task는 **설계 단계**이며 위 `.ts` 파일들의 실제 코드 생성은 TSK-03-03(PoC) 시점에 이뤄진다. 본 design.md는 dev-build에서 **문서 3종**(adapter-design.md / contract.md / platform-matrix.md)만 산출하고, `.ts` 파일은 시그니처만 contract.md에 기록한다.

## 진입점 (Entry Points)

**WBS entry-point**: 사내 뷰어의 블록 추가 메뉴 → "form-js" 항목

본 Task의 산출물은 **설계 문서**이므로 사용자 진입은 어댑터가 PoC(TSK-03-03)에서 적용된 이후 발생한다. 설계 단계에서 명시할 진입점은 다음과 같다.

- **사용자 진입 경로** (PoC 시점 가정): 사내 Notion-style 뷰어 페이지 열기 → 본문 영역에서 `/` 슬래시 명령(또는 `+` 블록 추가 버튼) 클릭 → 블록 메뉴에서 `form-js` 또는 `Form` 항목 선택 → 빈 form-js 블록이 본문에 삽입됨 → 우상단 ✏️ 버튼 클릭 시 편집기 패널 오픈 (편집 지원 호스트인 경우)
- **URL / 라우트**: 사내 뷰어 도메인 (TSK-03-01에서 식별). 본 설계는 라우트 비종속.
- **수정할 라우터 파일**: `packages/designer-vscode-extension/src/adapters/notion-viewer/index.ts` — 호스트 플랫폼의 custom block router 등록 API에 self-register하는 plugin entry. 호스트의 라우터 파일은 어댑터가 직접 변경하지 않으며, 본 entry가 호스트 측 router 등록 코드(예: BlockNote `BlockNoteSchema.create({ blockSpecs })`)에서 import되어 호스트 routes 트리에 form-js 블록 타입을 추가한다.
- **수정할 메뉴·네비게이션 파일**: `packages/designer-vscode-extension/src/adapters/notion-viewer/blockMenu.ts`의 `formJsBlockMenuItem` export — 호스트 측 블록 추가 menu / sidebar nav 등록은 호스트 플랫폼 SDK 호출로 이뤄지며, 어댑터는 메뉴 항목 메타데이터(name="form-js", icon, group="Embed", slashCommand="/form-js")를 객체에 담아 export한다. 호스트의 sidebar/nav 파일 직접 수정은 PoC(TSK-03-03) 통합 단계에서 이뤄진다.
- **연결 확인 방법** (PoC E2E, TSK-03-03/03-04에서 작성): Playwright로 사내 뷰어 PoC 환경 접속 → `/form-js` 슬래시 명령 입력 → 블록 메뉴 항목이 표시되는지 assert → 클릭 시 본문에 빈 form-js 블록 DOM(`.form-js-block`)이 등장하는지 assert → form-js viewer가 `[role="form"]` 또는 `.fjs-form` 셀렉터로 렌더되는지 assert. URL 직접 입력 금지(reachability gate).

> **본 Task의 dev-test 범위**는 문서 산출물의 형식 검증(linkcheck, mdformat)만 포함한다. 실제 클릭 경로 검증은 TSK-03-03(PoC) / TSK-03-04(E2E)에서 수행한다 — features 산출물 design.md에 그대로 기록.

## 주요 구조

- **`FormJsBlockHost` 인터페이스 (계약 핵심)**
  ```ts
  export interface FormJsBlockHost {
    mount(root: HTMLElement, schema: unknown, opts: MountOpts): FormJsHandle;
  }
  export interface FormJsHandle {
    applySchemaUpdate(schema: unknown): Promise<void>;
    requestEdit(handler: (current: unknown) => Promise<unknown | null>): void;
    dispose(): void;
  }
  export interface MountOpts {
    schemaId: string;            // LRU 캐시 키
    readOnly?: boolean;          // viewer-only 모드 강제
    theme?: 'light' | 'dark' | 'auto';
    cssIsolation?: 'shadow' | 'scoped' | 'none';
    onError?(err: Error): void;  // 호스트 측 에러 표시 위임
  }
  ```
- **`mountViewer(root, schema, opts)` 함수**: VSCode preview의 `mountViewers` 루프 1회분을 호스트 비종속으로 추출. `createForm({ container, schema, additionalModules: [DesignerContainerModule, customComponentsModule], properties: { readOnly: opts.readOnly ?? true } })` 호출. LRU 캐시(cap=20)는 어댑터 모듈 스코프에서 공유.
- **`mountEditor(root, schema, opts, onSave)` 함수**: `@bpmn-io/form-js-editor` 인스턴스 생성 + 저장 버튼 콜백을 `onSave(schema)`로 위임. VSCode `customEditor.ts:saveSchemaController`와 Notion 어댑터의 모달 둘 다 동일 함수 사용.
- **`createNotionAdapter(platformSDK)` 팩토리** (호스트별 1줄 진입점): 플랫폼 식별 결과에 따라 `BlockNoteAdapter` / `TiptapAdapter` / `LexicalAdapter` 중 하나를 export. 각 어댑터는 호스트 SDK가 요구하는 형식(BlockNote `createReactBlockSpec`, Tiptap `Node.create({ atom: true })` 등)으로 wrapping만 수행.
- **`isolateCss(root, mode)` 유틸**: `mode=shadow`이면 `root.attachShadow({ mode: 'open' })` + form-js base.css를 string-import한 `<style>` inline 주입. `mode=scoped`이면 모든 form-js CSS 셀렉터에 `.form-js-block` prefix가 적용됐는지 빌드타임 검증(esbuild plugin은 v2). `mode=none`이면 호스트가 CSS를 책임진다는 의미로 placeholder.

## 데이터 흐름

호스트 플랫폼의 블록 메뉴 → `formJsBlockSpec` 등록 콜백 호출 → `createNotionAdapter().mount(root, schema, opts)` → `mountViewer`/`mountEditor`가 form-js 인스턴스 생성 → 호스트가 schema를 자체 저장소(예: BlockNote `block.props.schema`)에 보관 → `requestEdit` 콜백을 통해 modal/drawer로 editor 마운트 → 저장 시 `applySchemaUpdate`로 viewer를 즉시 갱신 + 호스트 저장소에 새 schema 반영.

## 설계 결정 (대안이 있는 경우만)

### §1. 어댑터 위치: 같은 패키지 vs 신규 패키지
- **결정**: `packages/designer-vscode-extension/src/adapters/notion-viewer/`로 동일 패키지에 둠.
- **대안**: `packages/designer-notion-adapter/` 신규 워크스페이스 패키지 분리.
- **근거**: TRD §2가 동일 패키지 레이아웃을 명시. v1은 코어 코드(`mountViewer`/`mountEditor`)를 두 어댑터(VSCode preview / Notion)가 공유하므로 한 빌드 그래프에서 esbuild 멀티 entry로 산출하는 편이 단순하고 preact single-instance 보장도 자연스럽다. 사내 npm 배포 요구가 생기면 v2에서 패키지 분리.

### §2. CSS 격리: ShadowRoot 기본 vs scoped class 기본
- **결정**: **호스트 결정**(`MountOpts.cssIsolation`)이며 기본값은 `shadow`. 단, BlockNote처럼 ShadowRoot 안에서 React 이벤트 위임이 깨지는 플랫폼은 `scoped`로 fallback.
- **대안**: 항상 scoped class만 사용.
- **근거**: form-js base.css의 `*` 셀렉터 / global font-family 재정의가 호스트 본문 텍스트를 침범한 사례를 디자이너 host에서 이미 관찰(memory: form-js editor host 필수 의존성). ShadowRoot가 가장 강한 격리지만 호스트 React 이벤트 시스템과 충돌 가능성이 있어 호스트별 검증 필요. 따라서 옵션화하되 안전한 기본값(`shadow`)을 강제하고 fallback 경로를 계약에 포함.

### §3. 편집 지원 결정: 어댑터 자체 결정 vs 호스트 capability 검사
- **결정**: 어댑터는 `MountOpts.readOnly`로 viewer-only를 받고, 편집 활성화는 **호스트 어댑터 entry가 capability 검사 후 결정**.
- **대안**: 어댑터가 호스트 SDK API를 런타임 inspect하여 자동 결정.
- **근거**: 자동 inspect는 false positive 위험이 크고(예: BlockNote는 props 변경 가능하지만 useState 패턴 강제), 명시적 capability 표가 contract.md에 있으면 PoC 단계에서 의사결정이 빠르다. v1 fallback은 "viewer-only" (PRD §6 F4 명시).

### §4. 번들 형식: ESM only vs ESM+UMD 듀얼
- **결정**: ESM + UMD/IIFE 듀얼. preact는 internal bundle.
- **대안**: ESM only (호스트가 모두 modern bundler 사용 가정).
- **근거**: 사내 뷰어가 자체 구현(legacy webpack 4 등)일 가능성이 TSK-03-01 결과 전까지 배제 불가. UMD 추가 비용은 esbuild 1줄 entry이고 번들 크기 증분도 미미하다.

### §5. form-js viewer 인스턴스 LRU 캐시: 공유 vs 어댑터별 분리
- **결정**: 어댑터별로 분리(VSCode preview용 + Notion 어댑터용 각각 cap=20).
- **대안**: 글로벌 단일 LRU.
- **근거**: 두 호스트가 동시에 활성화될 일이 없고(다른 프로세스/페이지), 캐시 키 충돌 위험 없이 단순화된다.

## 선행 조건
- **TSK-03-01** (`status [ ]`): 사내 뷰어 플랫폼 식별. 미완 시 `platform-matrix.md`는 후보 5종 비교만 채우고 "선택" 컬럼은 `TBD`로 두는 형태로 진행 가능. 단, contract.md의 `FormJsBlockHost` 시그니처와 `mountViewer`/`mountEditor` 분리는 플랫폼 무관하게 확정 가능하므로 본 Task 진행에 차단 요소 아님.
- **TSK-01-02 / TSK-01-03 / TSK-02-01** (`[dd]` 가정): VSCode preview의 viewer 마운트 + Custom Editor 구조가 실제로 동작해야 `mountViewer` / `mountEditor` 추출 대상이 명확하다. 현재 worktree 상태(WP-01/WP-02/WP-05 머지됨)로 충족.
- 외부 라이브러리: `@bpmn-io/form-js-viewer` ^1.13, `@bpmn-io/form-js-editor` ^1.13, `@form-js-designer/designer-core`, `designer-runtime`, `designer-components` (workspace 패키지 — 모두 VSCode 확장이 이미 사용).

## 리스크

- **HIGH — TSK-03-01 미완 시 플랫폼 종속 결정 차단**: 편집 지원 가능성, ShadowRoot 호환성, custom block 등록 API 형태가 모두 플랫폼 결정 후 확정 가능. 본 설계는 **계약 + 추상화 + 매트릭스**로 결정 지연을 흡수했지만, PoC(TSK-03-03)는 TSK-03-01 결과 없이는 사실상 시작 불가. 완화: contract.md / mountViewer-Editor 분리는 플랫폼 무관하게 진행하여 TSK-03-01 완료 즉시 TSK-03-03이 entry 1파일 + capability 표만 채우면 PoC 가능하도록 사전 준비.
- **HIGH — preact dual-instance 위험**: 사내 뷰어가 React 18 사용 시 preact/compat alias가 호스트 React와 충돌할 수 있음. VSCode 확장은 webview sandbox로 격리됐지만 Notion 어댑터는 호스트 페이지에서 직접 실행. 완화: ShadowRoot 격리 + preact internal bundle + 호스트 React를 건드리지 않는 entry 구조 (`createNotionAdapter`는 호스트 SDK가 요구하는 React 컴포넌트만 export, 내부에서 preact 인스턴스는 shadow 안에 갇힘).
- **HIGH — form-js CSS 호스트 침범**: form-js base.css의 `*`/`html`/`body` global 셀렉터가 호스트 본문 텍스트를 깨뜨릴 수 있음(memory: form-js-base.css 누락 시 drop container h=0 사례). 완화: ShadowRoot 기본 + scoped class fallback + base.css를 string-import해 `<style>` inline 주입(외부 CSS link 의존 제거).
- **MEDIUM — 호스트별 schema 저장 형식 불일치**: BlockNote는 JSON props, Tiptap은 ProseMirror node attrs, Lexical은 SerializedLexicalNode. 어댑터는 이를 추상화하지 않고 호스트 entry에서 변환 책임을 가짐(설계 단순화). PoC에서 변환 로직이 손실 없이 round-trip 가능한지 별도 케이스 필요.
- **MEDIUM — single-editor lock 의미 차이**: VSCode는 한 문서당 1개 editor 패널이지만 Notion-style 뷰어는 한 페이지에 form-js 블록 여러 개가 동시 존재 가능. 어댑터는 블록당 독립 lock으로 정의(VSCode와 의미적으로 다름)하고 contract.md에 명시.
- **MEDIUM — 번들 크기 폭증**: `.vsix`는 5MB 한도(PRD §8)이지만 Notion 어댑터까지 한 패키지에 들어가면 esbuild output이 dist/extension + dist/webview + dist/notion-adapter로 3종이 됨. `.vsix`에는 dist/notion-adapter를 포함하지 않도록 `.vscodeignore` 갱신 필요. 완화: `.vscodeignore`에 `dist/notion-adapter/**` 추가를 dev-build 산출물 가이드에 포함.
- **LOW — TSK-03-01 결과가 "자체 구현"일 경우**: custom block API가 미정이므로 PoC가 어댑터 entry부터 신규 설계해야 함. 본 설계의 `FormJsBlockHost` 계약은 그대로 유효 — 호스트 자체 구현 측에 동 인터페이스 호출자만 새로 만들면 됨.

## QA 체크리스트
dev-test 단계에서 검증할 항목. 본 Task 산출물은 문서이므로 docs lint + 계약 일관성 검증 위주.

- [ ] (정상 케이스) `docs/vscode-ext/features/notion-adapter/adapter-design.md` 파일이 생성되어 있고, viewer 흐름·편집 흐름·번들 전략·CSS 격리 방안 4개 섹션이 모두 비어있지 않다 (각 ≥ 100자).
- [ ] (정상 케이스) `docs/vscode-ext/features/notion-adapter/contract.md`에 `FormJsBlockHost` / `FormJsHandle` / `MountOpts` 3개 인터페이스의 TypeScript 시그니처 코드 블록이 모두 포함된다.
- [ ] (정상 케이스) `docs/vscode-ext/features/notion-adapter/platform-matrix.md`의 비교 표에 BlockNote / Tiptap / Plate / Lexical / Novel / AFFiNE / 자체 7개 행이 있고, 각 행마다 `custom block API`, `편집 지원`, `CSS 격리`, `번들 형식`, `위험도` 5개 컬럼이 채워져 있다 (`TBD` 허용은 "선택" 컬럼만).
- [ ] (엣지 케이스) TSK-03-01이 미완(`platform-identification.md` 부재)인 상태에서도 본 산출물 3종이 일관되게 작성된다 — `platform-matrix.md`의 "선택" 컬럼은 `TBD`로 표기되며, contract.md/adapter-design.md는 플랫폼 무관 부분만 확정.
- [ ] (엣지 케이스) `MountOpts.cssIsolation` 기본값이 `shadow`임이 contract.md에 명시되고, scoped fallback 발동 조건이 1줄 이상 기술된다.
- [ ] (에러 케이스) 편집 지원 불가 호스트(viewer-only)일 때 어댑터가 `requestEdit` 호출에 어떻게 반응해야 하는지(no-op + console.warn vs throw) contract.md에 명시된다.
- [ ] (에러 케이스) `mountViewer`/`mountEditor` 추출이 기존 `src/markdown/preview.ts`의 동작 호환을 깨지 않음을 명시 — testBridge 메시지(`test-mount-complete`) 발신 책임이 어디로 이동했는지 adapter-design.md에 기록 (TSK-01-04 회귀 방지).
- [ ] (통합 케이스) 본 design.md의 "파일 계획"에 나열된 9개 신규/수정 파일이 contract.md / platform-matrix.md / adapter-design.md 셋에 모두 일관되게 참조된다 (cross-link 검증).
- [ ] (통합 케이스) `FormJsBlockHost` 계약이 VSCode 측 `src/markdown/preview.ts:mountViewers`와 Custom Editor 측 `src/editor/customEditor.ts`의 동작을 모두 표현 가능함을 adapter-design.md에서 매핑표로 보인다 (VSCode 호스트 = 첫 번째 어댑터 구현체).
- [ ] (도구 검증) `docs/vscode-ext/features/notion-adapter/*.md` 3종이 markdownlint(`md-lint`) 통과 + 깨진 내부 링크 없음(linkcheck).

**fullstack/frontend Task 필수 항목 (E2E 테스트에서 검증 — dev-test reachability gate):**
- [ ] (클릭 경로) 메뉴/사이드바/버튼을 클릭하여 목표 페이지에 도달한다 (URL 직접 입력 금지) — 본 Task는 설계 문서 산출이므로 실제 검증은 TSK-03-03(PoC) / TSK-03-04(E2E)에서 수행하며, 어댑터 entry가 호스트 블록 메뉴에 등록될 때 `/form-js` 슬래시 명령 → 메뉴 항목 클릭 → 빈 form-js 블록 삽입까지의 클릭 시퀀스를 features/notion-adapter/adapter-design.md에 기록한다.
- [ ] (화면 렌더링) 핵심 UI 요소가 브라우저에서 실제 표시되고 기본 상호작용이 동작한다 — 본 Task는 설계 문서 산출이므로 실제 검증은 TSK-03-03/03-04에서 수행하며, viewer 마운트 후 `.form-js-block` DOM과 form-js viewer 입력 필드가 호스트 페이지에서 렌더되어야 함을 features/notion-adapter/adapter-design.md의 "검증 시나리오" 섹션에 명시한다.
