# TSK-05-02: Tabs / TabPanel 렌더러 - 설계

## 요구사항 확인

- `type: tabs` 컨테이너에 헤더 바(tablist) + 활성 패널 영역을 렌더하고, Arrow Left/Right/Home/End 키보드 탐색 및 ARIA role 완비
- `type: tabPanel` 은 자신의 `components[]`를 form-js 기존 row/columns layout 렌더에 위임하며, inactive 패널 필드도 form data에 포함되어야 함
- 초기 활성 탭은 첫 번째 tabPanel이며 스키마 `activeTab`(string id)으로 override 가능; schemaVersion 19 호환 + WP-01 LRU 캐시 무충돌

## 타겟 앱

- **경로**: `packages/designer-vscode-extension` (단일 앱 모노레포 패키지)
- **근거**: VSCode Extension의 webview 미리보기 스크립트(preview.ts)에서 form-js Viewer를 마운트하며, 커스텀 컴포넌트는 `additionalModules`로 주입됨. 이 Task는 해당 패키지의 `src/components/` 내 Tabs/TabPanel 렌더러를 추가한다.

## 구현 방향

- TSK-05-01이 확정한 `defineComponent` 계약(`{ type, renderer, propsSchema, layout, i18nKeys, icon }`)을 준수하여 `TabsRenderer`와 `TabPanelRenderer`를 구현한다.
- `TabsRenderer`는 Preact `useState(activeIndex)` + `useRef(tabButtonRefs[])` + `useEffect(focus관리)`로 상태를 관리하며 순수 Preact 컴포넌트로 작성한다.
- 탭 헤더는 **scrollable** 방식으로 확정한다(헤더가 overflow 시 가로 스크롤 `overflow-x: auto`). sticky 방식은 webview 폭이 좁아 패널 콘텐츠 영역을 과도하게 잠식하므로 채택하지 않는다. 이 결정은 본 design.md에 문서화된다.
- inactive 패널 필드를 form data에 유지하기 위해 `tabPanel`의 렌더 DOM을 `hidden` 속성(CSS `display:none`)으로 숨기되 Preact 컴포넌트는 항상 마운트 상태를 유지한다.
- ARIA: tablist/tab/tabpanel role 완비, `aria-selected`, `aria-controls`, `id` 연결을 정적으로 생성한다.
- CSS는 `media/form-js-components.css`에 `.fj-tabs-*` 네임스페이스로 분리, VSCode 테마 토큰 사용.

## 파일 계획

**경로 기준:** 모든 파일 경로는 **프로젝트 루트 기준**으로 작성한다.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-vscode-extension/src/components/TabsRenderer.tsx` | `type:tabs` 렌더러 — tablist 헤더, 패널 영역, 키보드 탐색, ARIA | 신규 |
| `packages/designer-vscode-extension/src/components/TabPanelRenderer.tsx` | `type:tabPanel` 렌더러 — 자식 components 위임, 비활성 시 hidden DOM 유지 | 신규 |
| `packages/designer-vscode-extension/src/components/tabs.css` | `.fj-tabs-*` 스코프 스타일 (헤더 indicator 2px, hover, scrollable) | 신규 |
| `packages/designer-vscode-extension/src/components/index.ts` | 커스텀 컴포넌트 Module export (`customComponents`) — Tabs/TabPanel 타입 등록 | 수정 (TSK-05-01 생성 파일) |
| `packages/designer-vscode-extension/media/form-js-components.css` | webview로 주입될 컴포넌트 번들 CSS (`tabs.css` 빌드 산출 포함) | 신규 또는 수정 |
| `packages/designer-vscode-extension/package.json` | `contributes.markdown.previewStyles`에 `./media/form-js-components.css` 추가 | 수정 |
| `packages/designer-vscode-extension/test/unit/TabsRenderer.test.tsx` | TabsRenderer 단위 테스트 (키보드 탐색, ARIA, activeTab override, hidden 패널) | 신규 |
| `packages/designer-vscode-extension/test/fixtures/tabs-3panel.md` | 탭 3개 × 필드 2개 fixture 마크다운 (E2E 기준 파일) | 신규 |

> 이 Task는 페이지 라우터가 없는 Webview 내부 컴포넌트 라이브러리이므로 라우터/메뉴 파일 항목은 해당 없음. 진입점 섹션 참조.

## 진입점 (Entry Points)

이 Task는 **비-페이지 UI** (공통 컴포넌트 라이브러리)이다. 별도 URL 라우트나 메뉴 파일이 없으며, 적용될 상위 컨텍스트는 다음과 같다.

- **적용될 상위 진입점**: VSCode Markdown 미리보기 웹뷰
  - **사용자 진입 경로**: `VSCode에서 .md 파일 열기 → 우클릭 또는 상단 아이콘으로 Markdown 미리보기 패널 오픈 → 문서 내 \`\`\`form-js 블록(type:tabs 포함) 렌더`
  - **URL / 라우트**: N/A (VSCode webview — URL 없음)
  - **수정할 라우터 파일**: N/A (VSCode Extension — 라우터 없음)
  - **수정할 메뉴·네비게이션 파일**: `packages/designer-vscode-extension/package.json` 의 `contributes.markdown.previewStyles` 배열 (위 파일 계획에 포함)
  - **연결 확인 방법**: `test/fixtures/tabs-3panel.md`를 Playwright E2E에서 미리보기 오픈 → `.fj-tabs` 요소가 DOM에 존재하고 탭 버튼 클릭 시 패널이 전환됨 확인 (URL 직접 입력 금지)

## 주요 구조

- **`TabsRenderer`** (`src/components/TabsRenderer.tsx`): `useState(activeIndex)`, `useRef(tabButtonRefs[])`, `useEffect(focus)`, `onKeyDown(ArrowLeft/Right/Home/End)`, ARIA tablist/tab/tabpanel 마크업. Props: `{ field: TabsField, ChildrenRenderer, formId }`.
- **`TabPanelRenderer`** (`src/components/TabPanelRenderer.tsx`): `isActive` prop으로 `hidden` 속성 토글. `ChildrenRenderer`를 항상 마운트하여 form data 보존. Props: `{ field: TabPanelField, ChildrenRenderer, isActive }`.
- **`customComponents` Module** (`src/components/index.ts`): `FormFields` registry에 `tabs`/`tabPanel` 타입을 등록하는 Module 객체. `preview.ts`와 `customEditor.ts`가 `additionalModules: [customComponents]`로 공유.
- **`tabs.css`** (`src/components/tabs.css`): `.fj-tabs-header` (scrollable flex + `overflow-x: auto`), `.fj-tabs-tab` (button reset + `2px solid` bottom indicator), `.fj-tabs-tab[aria-selected="true"]` (bold + indicator 활성화), `.fj-tabs-panel[hidden]` (display:none 명시), hover 색상 `--vscode-list-hoverBackground`.
- **fixture** (`test/fixtures/tabs-3panel.md`): `type:tabs` 스키마 블록 2개 — `activeTab` 없는 케이스 + `activeTab` 지정 케이스.

## 데이터 흐름

입력: form-js Viewer가 `type:tabs` 스키마 노드를 `FormFields` registry에서 `TabsRenderer`로 dispatch → `TabsRenderer`가 `components[]`를 순회하여 각 tabPanel을 `TabPanelRenderer`로 렌더 + 비활성 패널은 hidden 처리 → `TabPanelRenderer`가 `ChildrenRenderer`에 자식 components 위임

출력: 완전한 ARIA tablist DOM, 활성 패널만 visible, 비활성 패널은 hidden이지만 form-js 내부 상태(form data)에는 포함됨

## 설계 결정 (대안이 있는 경우만)

### 탭 헤더 레이아웃 방식

- **결정**: scrollable (`overflow-x: auto`)
- **대안**: sticky (`position: sticky; top: 0`)
- **근거**: webview 폭이 좁아 sticky header는 패널 콘텐츠 영역을 과도하게 잠식함; scrollable이 더 많은 탭을 지원하며 모바일·좁은 패널에도 적합

### 비활성 패널 처리 방식

- **결정**: CSS `hidden` 속성(display:none)으로 숨기되 Preact 컴포넌트는 항상 마운트
- **대안**: 조건부 렌더 (Preact 마운트/언마운트 토글)
- **근거**: form-js 기본 동작 — inactive 패널 필드 값을 form data에 포함해야 함. 언마운트 시 form-js 내부 상태가 소실되어 데이터 유실 가능성

### activeIndex 상태 관리 위치

- **결정**: `TabsRenderer` 내부 `useState`로 로컬 관리
- **대안**: 상위 form-js FormState에 위임
- **근거**: form-js 공식 FormFields API는 UI 상태 커스텀 저장을 지원하지 않음; 탭 활성 인덱스는 순수 UI 상태이므로 로컬 관리가 적절

## 선행 조건

- **TSK-05-01 완료 필수**: `defineComponent` 계약 + `src/components/index.ts` 스캐폴드가 완료되어야 `TabsRenderer`의 타입 연결이 가능
  - `defineComponent({ type, renderer, propsSchema, layout, i18nKeys, icon })` API 사용
  - `customComponents` Module이 `additionalModules`로 주입 가능해야 함
- `@bpmn-io/form-js-viewer` FormFields 타입 (`ChildrenRenderer`, `FormFields`) — TSK-05-01에서 이미 확인 예정

## 리스크

- **HIGH**: TSK-05-01이 완료되지 않으면 `defineComponent` 계약을 알 수 없어 `TabsRenderer` 타입 연결이 불가능. TSK-05-01 먼저 완료 필수.
- **HIGH**: `ChildrenRenderer`가 form-js 내부 API라서 버전별 시그니처 차이가 있을 수 있음. 실제 패키지 타입을 확인하고, 없으면 직접 타입 선언 필요.
- **MEDIUM**: `@bpmn-io/form-js-viewer`의 FormFields registry에 커스텀 타입을 등록하는 방식이 공식 문서에 충분히 명시되지 않음. TSK-05-01 구현 결과를 보고 패턴 확정 필요.
- **MEDIUM**: inactive 패널을 항상 마운트할 때 초기 렌더 비용 증가 (패널 수 비례). v1은 "실용적 범위 내"로 허용하되 10개 이상 시 측정 권장.
- **LOW**: axe 검사 시 `aria-controls`가 가리키는 tabpanel `id`가 DOM에 실제 존재해야 함. 렌더 순서/id 생성 로직을 테스트로 검증.
- **LOW**: 탭 헤더 scrollable 시 키보드 포커스된 탭이 스크롤 영역 밖에 있을 수 있음 — `scrollIntoView` 호출로 해결.

## QA 체크리스트

dev-test 단계에서 검증할 항목. 각 항목은 pass/fail로 판정 가능해야 한다.

### 정상 케이스

- [ ] 탭 3개 × 각 패널 필드 2개 fixture에서 첫 번째 탭이 기본 활성화된다 (`aria-selected="true"` + 패널 visible)
- [ ] `activeTab` 스키마 속성으로 두 번째 탭 id를 지정하면 두 번째 탭이 초기 활성화된다
- [ ] 탭 버튼 클릭 시 해당 패널이 visible, 나머지 패널은 hidden 처리된다
- [ ] inactive 패널의 텍스트 입력 필드에 값을 입력 후 탭 전환 시 form data에 해당 값이 유지된다

### 키보드 탐색

- [ ] 첫 번째 탭에 포커스 후 `ArrowRight` → 두 번째 탭으로 이동 및 활성화
- [ ] 마지막 탭에서 `ArrowRight` → 첫 번째 탭으로 wrap-around
- [ ] `ArrowLeft`로 역방향 탐색이 정상 동작한다
- [ ] `Home` 키 → 첫 번째 탭으로 이동 및 활성화
- [ ] `End` 키 → 마지막 탭으로 이동 및 활성화
- [ ] 포커스된 탭이 scrollable 헤더 영역 밖이면 `scrollIntoView`가 호출되어 화면에 보인다

### ARIA

- [ ] tablist 컨테이너에 `role="tablist"` 존재
- [ ] 각 탭 버튼에 `role="tab"`, `aria-selected`, `aria-controls` 속성 존재
- [ ] 각 패널에 `role="tabpanel"`, `aria-labelledby` 속성 존재
- [ ] `aria-controls` 값이 해당 tabpanel의 `id`와 일치한다
- [ ] axe-core 검사 결과 serious/critical violation 0

### 엣지 케이스

- [ ] `components: []` (탭 없음) 스키마: 에러 없이 빈 tablist 렌더
- [ ] `activeTab`이 존재하지 않는 id를 가리킬 때 첫 번째 탭으로 fallback
- [ ] 탭 1개짜리 스키마: 탭 전환 없이 단일 패널 렌더

### round-trip

- [ ] 스키마 → render → form-js `exportSchema()` import 결과가 원본과 동일 (무손실)
- [ ] WP-01 기존 fixture 3종 회귀: Tabs 모듈 주입 후 기존 블록 렌더에 에러 없음
- [ ] WP-01 LRU 캐시(viewerCache cap=20)가 `type:tabs` 스키마 재등장 시 정상 재사용되고 충돌 없음

### 통합 케이스 (E2E — dev-test reachability gate)

- [ ] (클릭 경로) VSCode Markdown 미리보기에서 `test/fixtures/tabs-3panel.md` 파일 미리보기 오픈 → `.fj-tabs` 컴포넌트가 렌더됨 (URL 직접 입력 금지)
- [ ] (화면 렌더링) 탭 헤더 버튼이 브라우저에서 실제 표시되고, 클릭 시 패널 전환이 동작한다
