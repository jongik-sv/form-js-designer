# TSK-06-01: 호스트 앱 골격 + Palette + Outline 모듈 - 설계

## 요구사항 확인
- `packages/designer-editor-host` 신규 패키지를 스캐폴드하고, `@bpmn-io/form-js-editor`의 `FormEditor`를 호스팅하는 `App.tsx`(개발용 예시 페이지)를 구현한다.
- `PaletteModule` — `designer-components` 패키지(Card/Stack/Tabs/Modal/Button)와 `designer-table` 패키지(Table)를 form-js `additionalModules`로 자동 등록하여 팔레트에 표시하고 드래그·드롭 가능하게 한다.
- `OutlineModule` — form-js 내부 schema 트리를 읽어 폼 컴포넌트 계층 구조를 사이드바에 시각화하고, 편집기 선택 상태와 양방향 동기화한다.
- 수락 기준: `editor.dragdrop.spec.ts` Playwright E2E에서 6종 컴포넌트(card/stack/tabs/modal/button/table) 드래그·드롭이 모두 통과한다 (PRD §4 AC #1).

## 타겟 앱
- **경로**: `packages/designer-editor-host` (모노레포 신규 패키지)
- **근거**: WBS WP-06, phase-1-plan §3.4 "designer-editor-host" 명시. form-js-editor 본체는 수정 없이 `additionalModules`로만 확장.

## 구현 방향
- `packages/designer-editor-host`를 신규 생성. `package.json` + `vite.config.ts` + `tsconfig.json` + `index.html`로 Vite dev 환경 구성.
- `src/App.tsx`에서 `FormEditor`(`@bpmn-io/form-js-editor`)를 마운트하고 `additionalModules`에 `PaletteModule`, `OutlineModule`을 주입한다. `designer-components`와 `designer-table`의 모듈 객체도 함께 주입.
- `PaletteModule`은 form-js의 `formFieldRegistry`(또는 `formFields`) 서비스에 신규 컴포넌트들이 `additionalModules`로 이미 등록되면 자동 팔레트 진입이 이루어지므로, 각 컴포넌트의 `config.group`을 기준으로 그룹 라벨을 추가 매핑하는 thin wrapper 모듈이다.
- `OutlineModule`은 form-js `eventBus`의 `import.done`, `selection.changed`, `commandStack.changed` 이벤트를 구독해 스키마 트리를 읽고, Preact 컴포넌트 `OutlinePanel`을 form-js의 slot(renderInjector) 또는 에디터 컨테이너 외부 div에 렌더한다.
- E2E spec은 `packages/designer-editor-host/e2e/editor.dragdrop.spec.ts`에 작성. Playwright로 dev 서버(`http://localhost:5173`)에 접속하여 팔레트 항목 6종을 캔버스에 드래그·드롭하고 폼 JSON에 해당 컴포넌트 type이 존재함을 확인.

## 파일 계획

**경로 기준:** 모든 파일 경로는 **프로젝트 루트 기준**이다.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-editor-host/package.json` | 패키지 정의. name: `@form-js-designer/designer-editor-host`. devDep: `@bpmn-io/form-js-editor`, `@form-js-designer/designer-core`, `@form-js-designer/designer-components`, `@form-js-designer/designer-table`, `vite`, `preact`, `typescript`. scripts: `dev`, `build`, `typecheck`, `test:unit`, `test:e2e`. | 신규 |
| `packages/designer-editor-host/index.html` | Vite HTML 진입점. `<div id="app" />` + `<script type="module" src="/src/main.tsx" />`. | 신규 |
| `packages/designer-editor-host/src/main.tsx` | Preact 앱 부트스트랩. `render(<App />, document.getElementById('app')!)`. | 신규 |
| `packages/designer-editor-host/src/App.tsx` | 핵심 호스트 앱 컴포넌트. `FormEditor` 인스턴스를 `useLayoutEffect`로 생성, `additionalModules: [DesignerComponentsModule, DesignerTableModule, PaletteModule, OutlineModule]` 주입. 에디터 컨테이너 div + 아웃라인 패널 div를 레이아웃으로 배치. schema 변경 시 `editor.saveSchema()`를 `change` 이벤트로 추적. | 신규 |
| `packages/designer-editor-host/src/app.css` | 호스트 앱 레이아웃 CSS (`@layer app`). 2-컬럼(아웃라인 + 에디터) flex 배치. `*.module.css` 금지 (ADR D4). | 신규 |
| `packages/designer-editor-host/src/modules/PaletteModule.ts` | form-js `additionalModules` 규약 모듈 객체. `designer-components`의 5개 컴포넌트와 `designer-table`의 1개 컴포넌트가 이미 `additionalModules`로 등록되어 있으므로, 이 모듈은 그룹 라벨 한국어 i18n 매핑(`designer.palette.group.*`)을 `formFields` 서비스에 추가 등록하는 역할. `__init__: ['paletteGroupLabels']`, `paletteGroupLabels: ['type', PaletteGroupLabels]` DI 서비스. | 신규 |
| `packages/designer-editor-host/src/modules/OutlineModule.ts` | form-js `additionalModules` 규약 모듈 객체. `__init__: ['outlinePanel']`. `OutlinePanel` 서비스가 `eventBus`, `formEditor`, `selection` 서비스를 DI로 주입받아 `import.done`/`commandStack.changed`/`selection.changed` 이벤트에서 트리 상태를 갱신. 아웃라인 패널 Preact 컴포넌트를 외부 컨테이너에 마운트. | 신규 |
| `packages/designer-editor-host/src/modules/OutlinePanel.tsx` | Preact 컴포넌트. `OutlineNode[]` 트리를 렌더. 각 노드 클릭 시 `selection.select(element)` 호출. `selection.changed` 이벤트 수신 시 해당 노드 하이라이트. | 신규 |
| `packages/designer-editor-host/src/modules/outlineTypes.ts` | `OutlineNode { id: string; type: string; label?: string; children: OutlineNode[] }` 타입. form-js schema 트리에서 변환. | 신규 |
| `packages/designer-editor-host/src/modules/schemaToOutline.ts` | form-js schema(JSON) → `OutlineNode[]` 재귀 변환 순수 함수. `field.components` 배열 또는 `field.rows[].cells[]` 패턴 처리. | 신규 |
| `packages/designer-editor-host/src/__tests__/schemaToOutline.test.ts` | `schemaToOutline` 단위 테스트. 플랫 schema, 중첩 schema, 빈 components 케이스. | 신규 |
| `packages/designer-editor-host/src/__tests__/PaletteModule.test.ts` | `PaletteModule` 모듈 객체 형상 검증(키 존재, `__init__` 배열). mock DI container로 서비스 등록 확인. | 신규 |
| `packages/designer-editor-host/src/__tests__/OutlineModule.test.ts` | `OutlineModule` 이벤트 구독 단위 테스트. mock eventBus로 `import.done` 발행 시 `OutlineNode` 트리 갱신 확인. | 신규 |
| `packages/designer-editor-host/e2e/editor.dragdrop.spec.ts` | Playwright E2E. `http://localhost:5173` 접속 → 팔레트에서 card/stack/tabs/modal/button/table 6종 각각 캔버스 드래그·드롭 → `editor.saveSchema()` 결과 JSON에 해당 type 존재 확인. | 신규 |
| `packages/designer-editor-host/vite.config.ts` | Vite 설정. `@preact/preset-vite` plugin. `resolve.alias`에 `react → preact/compat`, `react-dom → preact/compat` 추가 (ADR-0002/0003 규약). port: 5173. | 신규 |
| `packages/designer-editor-host/tsconfig.json` | TypeScript 설정. `designer-core` tsconfig와 동일 옵션. `jsxImportSource: preact`. `paths`에 `@form-js-designer/*` 워크스페이스 패키지 매핑. | 신규 |
| `packages/designer-editor-host/playwright.config.ts` | Playwright 설정. `webServer: { command: 'npm run dev', url: 'http://localhost:5173' }`. `testDir: 'e2e'`. | 신규 |
| `packages/designer-editor-host/vitest.config.ts` | Vitest 설정. `environment: 'happy-dom'`. `include: ['src/**/__tests__/**/*.test.{ts,tsx}']`. | 신규 |

## 진입점 (Entry Points)

- **사용자 진입 경로**: 개발 서버(`npm --prefix packages/designer-editor-host run dev`) 실행 → 브라우저에서 `http://localhost:5173` 접속 → form-js 에디터 UI 자동 표시. 사이드바·메뉴 없음 (개발용 단일 페이지).
- **URL / 라우트**: `http://localhost:5173/` (단일 라우트, SPA. 라우터 없음 — 에디터 단일 페이지)
- **수정할 라우터 파일**: `packages/designer-editor-host/src/main.tsx` — `render(<App />, ...)` 단일 진입점. 라우터 라이브러리 미사용.
- **수정할 메뉴·네비게이션 파일**: `packages/designer-editor-host/src/App.tsx` — 아웃라인 패널(`OutlinePanel`)이 좌측 사이드바 역할. `OutlineModule`이 활성화되면 자동 등록.
- **연결 확인 방법**: E2E `editor.dragdrop.spec.ts`에서 `page.goto('http://localhost:5173')` → 팔레트 항목이 렌더되어 있고 → 캔버스로 드래그 가능 → 드롭 후 schema에 type 존재 확인.

## 주요 구조

- **`App` (Preact 컴포넌트, `src/App.tsx`)**
  - `useLayoutEffect([])`에서 `new FormEditor({ container: editorRef.current, additionalModules: [...] })` 생성, `editor.importSchema(defaultSchema)` 호출.
  - `editor.on('changed', ...)` 로 스키마 변경 구독. cleanup에서 `editor.destroy()`.
  - 레이아웃: `<div class="app-layout"><div class="outline-container" ref={outlineRef}/><div class="editor-container" ref={editorRef}/></div>`
  - `OutlineModule`이 초기화 시 `outlineRef.current`를 받아 `OutlinePanel`을 마운트할 수 있도록 컨테이너를 data 속성으로 노출: `data-outline-container`.

- **`PaletteModule` (DI 모듈 객체, `src/modules/PaletteModule.ts`)**
  - form-js additionalModules 규약 객체: `{ __init__: ['paletteGroupLabels'], paletteGroupLabels: ['type', PaletteGroupLabels] }`.
  - `PaletteGroupLabels` 서비스 생성자: `inject: ['formFields']`. `formFields.getAll()`을 순회하며 `group` 값에 한국어 라벨을 매핑. 이미 `designer-components`/`designer-table`이 `additionalModules`로 함께 주입되면 팔레트에 자동 진입.

- **`OutlineModule` (DI 모듈 객체, `src/modules/OutlineModule.ts`)**
  - `{ __init__: ['outlinePanel'], outlinePanel: ['type', OutlinePanelService] }`.
  - `OutlinePanelService` 생성자: `inject: ['eventBus', 'formEditor', 'selection']`.
  - `eventBus.on('import.done', ...)` + `eventBus.on('commandStack.changed', ...)` → `schemaToOutline(editor.getSchema())` → Preact `render(<OutlinePanel nodes={tree} onSelect={...}/>, container)`.
  - `eventBus.on('selection.changed', e => ...)` → `OutlinePanel`에 선택 ID 전달 및 highlight.

- **`OutlinePanel` (Preact 컴포넌트, `src/modules/OutlinePanel.tsx`)**
  - Props: `{ nodes: OutlineNode[]; selectedIds: string[]; onSelect: (id: string) => void }`.
  - 재귀 렌더. 클릭 시 `onSelect(node.id)` → 서비스가 `selection.select(element)` 호출.

- **`schemaToOutline` (순수 함수, `src/modules/schemaToOutline.ts`)**
  - 입력: form-js schema JSON (`{ components: FieldSchema[] }`).
  - 출력: `OutlineNode[]`.
  - 재귀: `field.components` 배열 존재 시 `children`으로 재귀. `field.id`, `field.type`, `field.label`(또는 `field.text`) 추출.

## 데이터 흐름
입력: 브라우저 접속 → App이 `FormEditor`를 마운트, 기본 빈 schema(`{ type: 'default', components: [] }`)를 `importSchema`로 로드 → 처리: 사용자가 팔레트에서 컴포넌트를 캔버스로 드래그·드롭 → form-js 내부 modeling 서비스가 schema를 업데이트 → `commandStack.changed` 이벤트 → `OutlineModule`이 트리 재생성 → `OutlinePanel` 리렌더 → 출력: 업데이트된 schema를 `editor.saveSchema()`로 직렬화, 아웃라인에 컴포넌트 계층 반영.

## 설계 결정

- **결정 1**: `App.tsx`는 `FormEditor` 인스턴스를 **직접 생성** (class constructor 방식)하고, `useLayoutEffect`로 생명주기를 관리한다.
  - **대안**: `createFormEditor(options)` 팩토리 함수 사용.
  - **근거**: `createFormEditor`는 `Promise<FormEditor>`를 반환하므로 async/await가 필요하고, Preact `useLayoutEffect` 내부에서 비동기 처리 시 cleanup 타이밍 관리가 복잡해진다. `new FormEditor(...)` + 별도 `editor.importSchema(schema)` 순서는 TSK-03-03 ViewerHost에서 검증된 패턴.

- **결정 2**: `OutlinePanel`을 form-js의 renderInjector slot이 아닌 **에디터 컨테이너 외부 div**(`outlineRef`)에 마운트한다.
  - **대안**: form-js `RenderInjector`의 slot-fill 메커니즘으로 에디터 내부에 아웃라인 주입.
  - **근거**: form-js renderInjector slot은 에디터 내부 렌더 영역(폼 캔버스)에 삽입하는 용도로, 사이드바 역할의 아웃라인 패널과 적합하지 않다. 외부 컨테이너 방식은 CSS 레이아웃으로 위치를 자유롭게 제어 가능하고 form-js 내부 구조 변경에 독립적.

- **결정 3**: `PaletteModule`은 form-js 팔레트 렌더러를 **교체하지 않고** 그룹 라벨 i18n 매핑만 추가한다.
  - **대안**: `PaletteRenderer`를 완전히 커스텀 구현.
  - **근거**: form-js 팔레트는 `additionalModules`로 등록된 컴포넌트를 `config.group`에 따라 자동으로 그룹화하여 표시한다. TSK-06-01 범위는 AC #1 드래그·드롭 동작이므로 최소 개입이 적절.

## 선행 조건
- **TSK-03-03 완료** (depends) — `ViewerHost`, `EditorHost`, `LocaleProvider` 계약 확정. 현재 `[xx]` 완료.
- **TSK-04-01 완료** (depends) — `designer-components` 패키지(Card/Stack/Button) + `DesignerComponentsModule` export. 현재 `[ ]` 미착수 — build 단계에서 실 패키지 사용.
- `@bpmn-io/form-js-editor ^1.21.2` 루트 `package.json`에 dependency 존재 (확인 완료).

## 리스크

- **HIGH**: `designer-components` (TSK-04-01)와 `designer-table` (TSK-05-01)가 TSK-06-01 depends에 포함되어 있으나, 두 Task의 완료 시점이 TSK-06-01 착수 일정(2026-05-11)과 겹친다. 골격 구현은 mock 모듈로 선행 가능. 실 패키지 완료 후 import만 교체.
- **HIGH**: form-js `FormEditor`의 DI 컨테이너(`didi`)에 커스텀 서비스를 등록하는 `additionalModules` 패턴이 TypeScript 타입 레벨에서 느슨하게 정의되어 있다 (`Module = any`). 잘못된 서비스 선언이 런타임에야 오류 발생. 완화: 단위 테스트에서 mock DI 주입 검증.
- **MEDIUM**: form-js 팔레트 항목의 HTML 구조는 form-js 내부 구현에 따라 달라질 수 있으므로 E2E drag 타겟 locator가 깨질 수 있다. 완화: `data-testid` 또는 `role` 기반 locator 우선.
- **MEDIUM**: `OutlineModule`이 form-js 내부 서비스(`selection`, `formEditor`)에 의존하므로 form-js 업그레이드 시 서비스 API 변경 위험. 완화: thin wrapper 패턴 + mock 인터페이스 명시.

## QA 체크리스트

- [ ] (정상) `npm --prefix packages/designer-editor-host run dev` 실행 시 `http://localhost:5173`에서 form-js 에디터 UI가 정상 렌더된다 (흰 화면·콘솔 에러 없음).
- [ ] (정상) 브라우저에서 팔레트 패널에 `card`, `stack`, `tabs`, `modal`, `button`, `table` 6종 항목이 모두 표시된다.
- [ ] (정상) `card` 항목을 팔레트에서 에디터 캔버스로 드래그·드롭 시 캔버스에 card 컴포넌트가 추가된다.
- [ ] (정상) 나머지 5종(`stack`, `tabs`, `modal`, `button`, `table`)도 동일하게 드래그·드롭이 동작한다.
- [ ] (정상) 컴포넌트를 캔버스에 추가하면 아웃라인 패널에 해당 컴포넌트 노드가 트리에 나타난다.
- [ ] (정상) 아웃라인 패널의 노드를 클릭하면 캔버스의 해당 컴포넌트가 선택(선택 핸들 표시)된다.
- [ ] (정상) 캔버스에서 컴포넌트를 선택하면 아웃라인 패널의 해당 노드가 하이라이트된다 (양방향 선택 동기화).
- [ ] (정상) `npm --prefix packages/designer-editor-host run test:unit` 실행 시 `schemaToOutline`, `PaletteModule`, `OutlineModule` 단위 테스트가 모두 통과한다.
- [ ] (정상) `npm --prefix packages/designer-editor-host run test:e2e` 실행 시 `editor.dragdrop.spec.ts` 6종 컴포넌트 E2E가 모두 통과한다 (TSK-06-01 수락 기준).
- [ ] (엣지) 빈 schema(`{ type: 'default', components: [] }`)로 시작 시 아웃라인 패널이 "컴포넌트 없음" 상태를 표시하고 에러 없이 렌더된다.
- [ ] (엣지) 중첩 컨테이너(예: card 내부에 stack 드롭) 시 아웃라인 패널이 계층 트리로 올바르게 표시된다.
- [ ] (엣지) 컴포넌트를 캔버스에서 삭제(Delete 키 또는 컨텍스트 메뉴)하면 아웃라인 패널에서도 즉시 제거된다.
- [ ] (에러) `FormEditor` 생성자 실패(container null 등) 시 콘솔 에러가 출력되고 앱이 에러 메시지를 표시한다 (`onError` 처리).
- [ ] (에러) `OutlineModule` 서비스에서 `formEditor.getSchema()` 가 null 반환 시 빈 트리를 반환하고 throw하지 않는다.
- [ ] (통합) `npm --prefix packages/designer-editor-host run typecheck` 가 에러 없이 통과한다.
- [ ] (통합) `@form-js-designer/designer-components`의 `DesignerComponentsModule`과 `@form-js-designer/designer-table`의 `DesignerTableModule`을 `additionalModules`에 추가하면 팔레트에 두 패키지의 컴포넌트가 자동 등록된다.
- [ ] (통합) `*.module.css` 파일이 0건이다 (ADR D4 준수).
- [ ] (클릭 경로) 브라우저에서 `http://localhost:5173` 접속 → 팔레트 항목이 표시된 에디터 UI에 도달한다.
