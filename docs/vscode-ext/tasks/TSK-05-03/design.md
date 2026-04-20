# TSK-05-03: Card / Stack / Modal 렌더러 - 설계

## 요구사항 확인

- **Card**: 상단 `label` 헤더 + 본문 `components[]` + 선택적 하단 `actions[]` action row. border 1px `--vscode-panel-border`, radius 4px, padding 12px.
- **Stack**: `direction` (vertical/horizontal), `gap` (px), `wrap` (boolean) flex 레이아웃 컨테이너. 자식 components를 form-js 기존 row/columns 레이아웃에 위임.
- **Modal**: trigger 버튼/링크 + Preact `createPortal` + native `<dialog showModal()>` 조합. Esc/backdrop 닫기, focus trap, 복귀 시 trigger로 포커스 반환. `.form-js-block` 내부 portal root 사용(body 누출 금지).

## 타겟 앱

- **경로**: `packages/designer-vscode-extension`
- **근거**: VSCode 확장 패키지 내 Webview Preact UI 레이어(frontend domain)에서 form-js 커스텀 컴포넌트를 구현하는 Task이므로.

## 구현 방향

- TSK-05-01에서 수립된 `defineComponent` 계약(`src/components/defineComponent.ts`)을 따라 세 컴포넌트(Card, Stack, Modal)를 각각 `FormFieldsModule` 기여자로 구현한다.
- Card와 Stack은 단순 Preact 함수 컴포넌트로, form-js `FormContext`에서 `ChildrenSlot`/`FormLayouter`를 활용해 하위 components를 렌더한다.
- Modal은 블록 내 portal root (`<div class="fjs-portal-root">`)에 `createPortal`로 native `<dialog>`를 마운트한다. `showModal()` / `close()` + 포커스 트랩을 직접 구현하며, `document.body` scroll lock은 적용하지 않는다.
- 모든 컴포넌트는 `media/form-js-components.css`에 CSS를 분리하며, VSCode High Contrast 테마 토큰(`--vscode-panel-border`, `--vscode-button-background` 등)을 사용해 테마 가시성을 보장한다.
- TSK-05-02(Tabs)와 병렬 진행이므로 `src/components/index.ts` 등록만 본 Task에서 추가하고, TSK-05-04가 preview.ts 주입을 담당한다.

## 파일 계획

**경로 기준:** 모든 파일 경로는 프로젝트 루트 기준으로 작성한다.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-vscode-extension/src/components/CardRenderer.tsx` | Card 컴포넌트 렌더러 — label 헤더, components 슬롯, actions row | 신규 |
| `packages/designer-vscode-extension/src/components/StackRenderer.tsx` | Stack 컴포넌트 렌더러 — flex container, direction/gap/wrap props | 신규 |
| `packages/designer-vscode-extension/src/components/ModalRenderer.tsx` | Modal 컴포넌트 렌더러 — trigger button, portal + dialog, focus trap | 신규 |
| `packages/designer-vscode-extension/src/components/index.ts` | 세 컴포넌트를 FormFieldsModule에 등록해 export | 신규/수정 |
| `packages/designer-vscode-extension/src/components/portalRoot.ts` | `.form-js-block` 내 portal root DOM 노드를 lazy 생성·반환하는 유틸 | 신규 |
| `packages/designer-vscode-extension/media/form-js-components.css` | Card/Stack/Modal 전용 CSS (VSCode 테마 토큰 기반) | 신규 |
| `packages/designer-vscode-extension/package.json` | `contributes.markdown.previewStyles`에 `form-js-components.css` 추가 | 수정 |
| `packages/designer-vscode-extension/test/unit/cardRenderer.test.ts` | Card 단위 테스트 | 신규 |
| `packages/designer-vscode-extension/test/unit/stackRenderer.test.ts` | Stack 단위 테스트 | 신규 |
| `packages/designer-vscode-extension/test/unit/modalRenderer.test.ts` | Modal 단위 테스트 — 포커스 트랩, Esc 닫기, 포커스 반환 | 신규 |
| `packages/designer-vscode-extension/test/unit/portalRoot.test.ts` | portalRoot 유틸 단위 테스트 | 신규 |
| `packages/designer-vscode-extension/test/fixtures/card-single.md` | Card 단일 블록 fixture | 신규 |
| `packages/designer-vscode-extension/test/fixtures/stack-single.md` | Stack 단일 블록 fixture | 신규 |
| `packages/designer-vscode-extension/test/fixtures/modal-single.md` | Modal 단일 블록 fixture | 신규 |
| `packages/designer-vscode-extension/test/fixtures/mixed-layout.md` | Tabs × Card × Stack × Modal 혼합 fixture | 신규 |
| `packages/designer-vscode-extension/test/e2e/card-stack-modal.test.ts` | E2E: 각 컴포넌트 렌더 + axe 검사 + 혼합 회귀 | 신규 |

## 진입점 (Entry Points)

form-js 블록 내 `type: card|stack|modal` 스키마가 Markdown 미리보기에서 렌더될 때 진입한다. 라우트·메뉴 시스템이 없는 VSCode 웹뷰 구조이므로 진입 경로는 다음과 같다.

- **사용자 진입 경로**: Markdown 파일에 ` ```form-js ` 블록을 작성 → VSCode Markdown 미리보기 열기(`Cmd+Shift+V`) → `preview.ts`가 `createForm({ additionalModules: [customComponents] })`로 블록 마운트 → schema의 `type: card|stack|modal` 필드를 CustomComponents 모듈이 처리
- **URL / 라우트**: VSCode webview 내부 (`vscode-webview://` 프로토콜) — 외부 라우트 없음
- **수정할 라우터 파일**: 해당 없음(라우팅 없는 웹뷰 구조). 컴포넌트 등록은 `packages/designer-vscode-extension/src/components/index.ts`의 `FormFieldsModule` export가 담당하며, TSK-05-04에서 `packages/designer-vscode-extension/src/markdown/preview.ts`의 `additionalModules`에 주입된다.
- **수정할 메뉴·네비게이션 파일**: 해당 없음. 사용자는 Markdown 펜스 블록 타입을 변경하는 방식으로 컴포넌트를 선택한다.
- **연결 확인 방법**: E2E 테스트에서 card-single.md / stack-single.md / modal-single.md fixture를 열고 `.fjs-card`, `.fjs-stack`, `.fjs-modal-trigger` 요소가 DOM에 존재하는지 확인. Modal은 trigger 버튼 클릭 → `dialog[open]` 출현 → Esc 키 → `dialog[open]` 소멸 순서로 검증.

> **비-페이지 UI**: 상위 적용 컨텍스트는 mixed-layout.md fixture이며, 해당 fixture E2E에서 Card/Stack/Modal 렌더링을 통합 검증한다.

## 주요 구조

1. **`CardRenderer`** — Preact FC. `{ id, label?, components, actions? }` props. label 유무에 따라 `<header>` 조건부 렌더. actions 배열은 `<footer>` row에 버튼 목록으로 렌더. 하위 components는 form-js `FormContext`에서 공급받은 `FormLayouter`에 위임.

2. **`StackRenderer`** — Preact FC. `{ id, direction, gap, wrap?, components }` props. CSS `flex-direction`, `gap`, `flex-wrap` 인라인 스타일 적용. `min-height: 0` overflow 방지. 하위 components는 `FormLayouter`에 위임.

3. **`ModalRenderer`** — Preact FC. `{ id, trigger, components }` props. 상태: `isOpen: boolean`. trigger 버튼 클릭 → `dialogRef.current.showModal()` + `isOpen=true`. Esc keydown / backdrop mousedown → `close()` + `isOpen=false` + trigger ref로 포커스 반환. `createPortal`로 `portalRoot()` DOM에 `<dialog>` 마운트.

4. **`portalRoot(blockEl: Element): Element`** — `.form-js-block` 조상 요소 내에서 `.fjs-portal-root` div를 lazy 생성 및 반환. Modal이 body로 누출되지 않도록 portal 컨테이너를 블록 내부에 한정.

5. **`focusTrap(dialogEl: HTMLDialogElement)`** — dialog 내 focusable 요소들을 쿼리하여 Tab / Shift+Tab을 가로채는 keydown 핸들러를 반환. `dialog.addEventListener('keydown', ...)` 패턴.

## 데이터 흐름

스키마 JSON (`type: 'card'|'stack'|'modal'` + 각 필드) → form-js FormFields registry가 타입 매칭 → 해당 Renderer FC 호출 → DOM 렌더 (Card/Stack: 동기, Modal: createPortal 동기 마운트) → form-js root에 응답.

## 설계 결정 (대안이 있는 경우만)

**Modal portal 범위**
- **결정**: `.form-js-block` 내부에 `.fjs-portal-root` div를 추가하고 그 안에 portal 마운트
- **대안**: `document.body`에 portal 마운트 (전통적 modal 패턴)
- **근거**: PRD 제약("Modal 포털이 `.form-js-block` 루트 밖으로 새지 않음") 준수. `<dialog>` top-layer는 viewport 기준이므로 portal target이 block 내부여도 시각적 중앙 배치에 영향 없음.

**Modal 구현: `<dialog>` vs div overlay**
- **결정**: native `<dialog showModal()>` 사용
- **대안**: div + z-index overlay
- **근거**: 제약 조건("`<dialog>` 요소만 사용")에 명시됨. Electron Chromium이 `showModal()`을 지원하며 top-layer 동작으로 z-index 관리 불필요.

**focus trap 구현: 자체 vs 라이브러리**
- **결정**: 자체 구현 (인라인 `focusTrap` 유틸 함수)
- **대안**: `focus-trap` npm 패키지
- **근거**: 제약 조건("외부 포털·다이얼로그 라이브러리 추가 금지"). dialog 내 focusable 선택자 + Tab cycle로 충분.

## 선행 조건

- **TSK-05-01**: `src/components/defineComponent.ts` + `FormFieldsModule` 계약 + `src/components/index.ts` 뼈대 완성 필요. CardRenderer / StackRenderer / ModalRenderer는 이 계약에 따라 등록된다.
- **preact**: 루트 `package.json`의 `overrides: { preact: "10.29.x" }` — Preact 단일 인스턴스 규약 준수.

## 리스크

- **HIGH**: `<dialog showModal()>` + `createPortal`의 Electron(VSCode) 환경 호환성. `showModal()` top-layer가 webview iframe 경계에서 예상대로 동작하지 않을 수 있음. → 구현 초기에 Playwright visible 모드로 실제 webview에서 확인 필요.
- **HIGH**: portal root를 `.form-js-block` 내부로 한정하면 `<dialog>` top-layer 동작과 충돌 가능성. → `<dialog>`는 `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%)`로 viewport 중앙 배치; portal target은 block 내부 노드로만 지정.
- **MEDIUM**: form-js FormFields registry에서 `ChildrenSlot` / `FormLayouter` 주입 방식이 TSK-05-01 확정 전까지 불확실. → TSK-05-01 design.md 확인 후 API 조정.
- **MEDIUM**: High Contrast 테마에서 `<dialog>` native backdrop 색이 예상치 못한 값일 수 있음. → `::backdrop` CSS + `forced-colors` 미디어 쿼리로 fallback 처리.
- **LOW**: Stack `gap` prop에 단위 없는 숫자(px)가 전달될 경우 CSS 변환 필요. → 렌더러에서 `${gap}px` 문자열로 변환.

## QA 체크리스트

### Card

- [ ] label 있는 Card 스키마가 viewer에서 `.fjs-card__header` 요소와 label 텍스트를 렌더한다
- [ ] label 없는 Card 스키마가 헤더 없이 본문만 렌더한다 (`.fjs-card__header` 부재)
- [ ] `actions` 배열이 있는 Card는 `.fjs-card__footer` + 버튼 목록을 렌더한다
- [ ] `actions` 없는 Card는 footer를 렌더하지 않는다
- [ ] Card 내 `components`가 form-js 기존 row/columns로 정상 렌더된다
- [ ] Card 단일 블록 fixture에 대해 axe violation 0 (serious/critical)
- [ ] High Contrast 테마에서 Card border가 `--vscode-panel-border` 색으로 가시적이다

### Stack

- [ ] `direction: 'horizontal'` Stack이 flex-direction: row로 렌더된다
- [ ] `direction: 'vertical'` Stack이 flex-direction: column으로 렌더된다
- [ ] `gap: 16` 설정 시 CSS gap이 `16px`로 적용된다
- [ ] `wrap: true` 설정 시 flex-wrap: wrap이 적용된다
- [ ] Stack에 `min-height: 0`이 적용되어 overflow가 발생하지 않는다
- [ ] Stack 단일 블록 fixture에 대해 axe violation 0

### Modal

- [ ] trigger 버튼이 렌더되고 키보드 Tab으로 포커스 가능하다
- [ ] trigger 버튼 클릭(또는 Enter/Space) → `<dialog>` open 상태가 된다
- [ ] Modal이 열렸을 때 포커스가 dialog 내 첫 번째 focusable 요소로 이동한다
- [ ] dialog 열린 상태에서 Tab 키가 dialog 내부에서만 순환한다 (focus trap)
- [ ] dialog 열린 상태에서 Shift+Tab 키가 역방향 순환한다
- [ ] Esc 키 → dialog가 닫히고 trigger 버튼으로 포커스가 반환된다
- [ ] backdrop 영역 클릭 → dialog가 닫힌다
- [ ] Modal portal DOM이 `.form-js-block` 내부의 `.fjs-portal-root`에 마운트된다 (document.body 직접 자식 없음)
- [ ] `document.body` scroll lock이 걸리지 않는다 (Modal open 전후 body overflow-y 변화 없음)
- [ ] Modal 단일 블록 fixture에 대해 axe violation 0
- [ ] High Contrast 테마에서 dialog outline/border가 가시적이다

### 통합

- [ ] (클릭 경로) Markdown 미리보기에서 ` ```form-js ` card 스키마 블록을 열면 `.fjs-card` 요소가 DOM에 나타난다
- [ ] (화면 렌더링) 핵심 UI 요소가 브라우저에서 실제 표시되고 기본 상호작용이 동작한다
- [ ] Tabs × Card × Stack × Modal 혼합 fixture(mixed-layout.md)가 렌더 오류 없이 표시된다
- [ ] 혼합 fixture에서 기존 layout.row/columns 요소가 정상 렌더된다 (회귀 0)
- [ ] 혼합 fixture에서 axe violation 0 (serious/critical)
- [ ] TSK-05-01 WP-01 M1 fixture 3종이 card/stack/modal 모듈 추가 후에도 동일하게 렌더된다 (회귀 0)
