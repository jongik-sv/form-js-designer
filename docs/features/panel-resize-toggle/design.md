# panel-resize-toggle: Live Preview / Properties 패널 리사이즈 & 토글 - 설계

## 요구사항 확인

- Live Preview 패널과 Properties 패널을 마우스 드래그로 너비를 조절할 수 있어야 한다.
- 각 패널에 토글 버튼을 두어 패널을 닫거나 다시 열 수 있어야 한다.
- 패널 너비 상태는 세션 중 유지되며, 재오픈 시 직전 너비로 복원한다.

## 타겟 앱

- **경로**: `packages/designer-editor-host`
- **근거**: 에디터 호스트 App.tsx / app.css가 side-panel(.side-panel) 레이아웃을 담당하며 Live Preview · Properties 패널이 이 패키지에 위치한다.

## 현재 레이아웃 분석

### DOM 구조 (App.tsx 기준)

```
.app-layout (display:flex, height:100vh)
  ├── .sidebar (width:48px, flex-shrink:0)  ← 탭 전환 사이드바
  ├── .editor-area (flex:1)
  │     ├── .editor-toolbar
  │     └── .editor-main (display:flex)
  │           ├── .outline-container (width:240px)
  │           └── .editor-container (flex:1)
  └── .side-panel (width:300px, flex-shrink:0)  ← 리사이즈/토글 대상
        ├── <PropsPanelContainer> (tab='props')
        └── <LivePreviewPanel>   (tab='preview')
```

현재 `.side-panel`은 `width:300px; flex-shrink:0`으로 고정되어 있으며 별도 splitter 없음.
리사이즈 splitter는 `.editor-area` 우측 끝과 `.side-panel` 좌측 경계(현재 `border-left:1px solid #e0e0e0`) 위치에 삽입한다.

### 리사이즈 Splitter 후보 위치

- `.side-panel` 좌측 엣지(`border-left`) → splitter div를 `.side-panel` 앞에 삽입하거나 `.side-panel` 내부에 절대 위치로 배치.
- 권장: App.tsx의 JSX에서 `<PanelSplitter>` 컴포넌트를 `.editor-area`와 `.side-panel` 사이에 삽입.

## 구현 방향

1. `usePanelResize` 커스텀 훅을 신규 작성해 패널 너비·접힘 상태를 관리한다.
2. `PanelSplitter` 컴포넌트를 신규 작성해 드래그 이벤트를 처리한다.
3. `SidePanelToggle` 버튼 컴포넌트를 신규 작성해 패널 상단에 배치한다.
4. App.tsx에서 `.side-panel`에 CSS variable(`--side-panel-width`)로 너비를 주입하고, `collapsed` 상태일 때 0px(+overflow:hidden)으로 전환한다.
5. 상태는 세션 내 메모리에만 유지하고, 별도 사용자 요청 시 localStorage 영속을 옵션으로 열어둔다(초기 구현에서는 제외).

## 패널 상태 모델

| 속성 | 타입 | 기본값 | 비고 |
|------|------|--------|------|
| `width` | `number` | `300` | px 단위, `.side-panel` CSS variable에 바인딩 |
| `collapsed` | `boolean` | `false` | true이면 너비 0 + 내용 숨김 |
| `prevWidth` | `number` | `300` | 토글로 닫기 직전 너비 보존용 |

**min/max 제약**: `minWidth=180`, `maxWidth=600` (뷰포트 폭의 50% 하드캡).
**persistence**: 세션 내 메모리 유지(React state). localStorage 영속은 Phase-2로 미룬다. 초기화 정책: 페이지 새로고침 시 기본값(300px) 복원.

## 드래그 리사이즈 방식

- `pointer events` 기반 구현: `onPointerDown` → `setPointerCapture` → `onPointerMove` → `onPointerUp`.
- 드래그 중 cursor를 `col-resize`로 변경(global body cursor 오버라이드, drag 종료 시 복원).
- **Keyboard 접근성**: splitter에 `role="separator"` + `aria-orientation="vertical"` + `tabIndex={0}` 부여. `ArrowLeft`(−10px) / `ArrowRight`(+10px) / `Home`(min) / `End`(max) 키 처리.
- **RTL**: 현재 프로젝트 한국어 고정이므로 RTL 미지원. `dir` 속성 확인 후 방향 반전 로직 stub만 남긴다.

## 토글 UI

- **버튼 위치**: `.side-panel` 내 최상단(패널 헤더 우측 끝) 또는 splitter 중앙에 소형 chevron 버튼.
- **아이콘**: 열린 상태 `›` (collapse 방향) / 닫힌 상태 `‹` (expand 방향). SVG 아이콘 또는 CSS transform.
- **a11y 레이블**: `aria-label="속성 패널 닫기"` / `"속성 패널 열기"` (탭별 동적 변경).
- **기본 상태**: 열림(`collapsed=false`).
- **접힘 시 동작**: `prevWidth`에 현재 width 저장 → width=0, collapsed=true. `.side-panel`에 `max-width:0; overflow:hidden; border:none` 적용.
- **재오픈 시 복원**: `width = prevWidth` (저장된 직전 너비 복원).

## 상태 유지

- **세션 내**: React state(`usePanelResize` 훅)에서 관리. 패널 전환(props↔preview) 시에도 너비 유지됨(App.tsx 상위에 상태 보유).
- **localStorage 영속**: 미구현(Phase-2). 충돌/초기화 정책: 새로고침 시 기본 300px. localStorage 구현 시 `panel-resize-toggle:sidePanel` 키 사용, 파싱 실패 시 기본값으로 fallback.

## 파일 계획

**경로 기준:** 프로젝트 루트 기준으로 작성.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-editor-host/src/hooks/usePanelResize.ts` | 패널 width·collapsed·prevWidth 상태 관리 커스텀 훅 | 신규 |
| `packages/designer-editor-host/src/components/PanelSplitter.tsx` | 드래그 리사이즈 splitter UI 컴포넌트 | 신규 |
| `packages/designer-editor-host/src/components/SidePanelToggle.tsx` | 패널 열기/닫기 토글 버튼 컴포넌트 | 신규 |
| `packages/designer-editor-host/src/App.tsx` | usePanelResize 훅 적용, CSS variable 바인딩, PanelSplitter·SidePanelToggle 삽입 | 수정 |
| `packages/designer-editor-host/src/app.css` | .side-panel 너비 CSS variable화, splitter 스타일, collapsed 상태 스타일 추가 | 수정 |
| `packages/designer-editor-host/src/__tests__/usePanelResize.test.ts` | usePanelResize 훅 단위 테스트 | 신규 |
| `packages/designer-editor-host/src/__tests__/PanelSplitter.test.tsx` | PanelSplitter 컴포넌트 단위 테스트 | 신규 |
| `packages/designer-editor-host/e2e/editor.panel-resize.spec.ts` | E2E: 드래그 리사이즈 / 토글 / 너비 복원 시나리오 | 신규 |
| `packages/designer-editor-host/src/components/LivePreviewPanel.tsx` | 패널 헤더에 SidePanelToggle 삽입(tab='preview') | 수정 |
| `packages/designer-editor-host/src/components/PropsPanelContainer.tsx` | 패널 헤더에 SidePanelToggle 삽입(tab='props') | 수정 |

## 진입점 (Entry Points)

- **사용자 진입 경로**: 에디터 앱 접속(`http://localhost:5173`) → 사이드바 'Properties' 또는 'Live Preview' 클릭 → 패널 표시 → splitter 드래그로 너비 조절 또는 토글 버튼 클릭으로 패널 닫기/열기
- **URL / 라우트**: `http://localhost:5173/#/props` 또는 `http://localhost:5173/#/preview` (단일 페이지 에디터, 해시 라우팅)
- **수정할 라우터 파일**: `packages/designer-editor-host/src/router.tsx` — `SidePanelTab` 타입은 변경 없음. `useSidePanelTab` 훅 그대로 사용. App.tsx에서 `usePanelResize`와 함께 조합하여 상태 통합.
- **수정할 메뉴·네비게이션 파일**: `packages/designer-editor-host/src/components/Sidebar.tsx` — `navItems` 배열 변경 없음. 단, 패널 토글 상태를 Sidebar 가시성과 연동할 경우 추후 수정 대상. 현재는 수정 불필요.
- **연결 확인 방법**: E2E에서 `sidebar-props` 클릭 → `.side-panel` 표시 확인 → splitter 드래그 → `.side-panel` 너비 변경 확인 → 토글 버튼 클릭 → `.side-panel` 너비=0 확인 → 재클릭 → 너비 복원 확인.

## 주요 구조

- **`usePanelResize(options)`**: `{ width, collapsed, prevWidth, setWidth, toggleCollapse, startDrag }` 반환. App.tsx에서 호출하여 `.side-panel`에 CSS variable 주입.
- **`PanelSplitter`**: `onDragStart` prop 수신, pointer capture 방식 드래그 구현. `role="separator"`, keyboard 핸들러 포함.
- **`SidePanelToggle`**: `collapsed`, `onToggle`, `panelLabel` prop. `aria-label` 동적 생성.
- **App.tsx 통합**: `style={{ '--side-panel-width': `${width}px` }}` CSS variable → `.side-panel { width: var(--side-panel-width, 300px) }` 패턴.
- **CSS 전환**: `transition: width 0.15s ease` (접힘/열림 애니메이션), `overflow: hidden`으로 내용 클리핑.

## 데이터 흐름

사용자 드래그/토글 입력 → `usePanelResize` 훅 상태 갱신 → App.tsx가 CSS variable로 `.side-panel` 너비 주입 → CSS transition으로 시각적 변화.

## 설계 결정 (대안이 있는 경우만)

- **결정**: pointer capture 방식 splitter (순수 Preact 구현)
- **대안**: `react-resizable-panels` 등 외부 라이브러리 도입
- **근거**: 외부 의존성 최소화, Preact 환경에서 compatibility 이슈 없이 경량 구현 가능

---

- **결정**: CSS variable(`--side-panel-width`)로 너비 주입
- **대안**: inline style `width` 직접 바인딩 또는 className 교체
- **근거**: CSS variable은 transition과 자연스럽게 결합되며, 자식 컴포넌트까지 theme-like로 전파 가능. CSS `@layer app` 규칙과 충돌 없음.

---

- **결정**: 세션 내 메모리 상태 유지 (localStorage 미구현)
- **대안**: localStorage에 즉시 영속
- **근거**: 요구사항에 영속 명시 없음. 복잡도 최소화 우선, Phase-2에서 선택적 추가.

## 선행 조건

- Preact + Vite + TypeScript 환경 (이미 구축됨).
- `@bpmn-io/form-js-viewer/dist/assets/form-js.css` import (기존 메모리: form-js-base.css 의존) — 이미 App.tsx에서 import 중이므로 충족.

## 리스크

- **HIGH**: `.side-panel`이 현재 `flex-shrink:0; width:300px` 고정값이므로, CSS variable 방식으로 전환 시 `flex-shrink`와의 상호작용 검증 필요. 특히 패널 접힘 시 `.editor-area`(flex:1)가 남은 공간을 채우는지 확인.
- **HIGH**: `form-js-base.css` 의존 — Live Preview 내부 drop container 높이가 0이 되는 현상(기존 메모리 참조). splitter 리사이즈로 `.live-preview-panel__content` 높이 변경 시 재현 가능성. CSS 변경 전후 Live Preview 동작 확인 필수.
- **MEDIUM**: outline-container(240px 고정)와 editor-container(flex:1)의 레이아웃이 side-panel 너비 변경과 독립적으로 동작해야 함. editor-area flex:1이 정상 작동하는지 검증.
- **MEDIUM**: pointer capture API가 Playwright headless 환경에서 드래그 시뮬레이션과 호환되는지 확인 필요. E2E에서 `page.mouse.move` 기반 드래그 테스트 시 `pointerdown`/`pointermove`/`pointerup` 이벤트 발화 여부 확인.
- **LOW**: RTL 미지원 stub 처리. 현재 한국어 고정이므로 영향 없음.
- **LOW**: SidePanelToggle 버튼과 form-js-editor 내부 버튼 스타일 충돌 가능성. `@layer app` 내 스코핑으로 격리.

## QA 체크리스트

- [ ] (정상) splitter를 마우스로 드래그하면 `.side-panel` 너비가 180~600px 범위 내에서 실시간 변경된다.
- [ ] (정상) 토글 버튼 클릭 시 `.side-panel`이 접히며(width→0) 내용이 숨겨진다.
- [ ] (정상) 접힌 상태에서 토글 버튼 재클릭 시 직전 너비(prevWidth)로 복원된다.
- [ ] (정상) Properties / Live Preview 탭 전환 후에도 너비 상태가 유지된다.
- [ ] (엣지) 패널 너비를 minWidth(180px) 미만으로 드래그해도 180px에서 멈춘다.
- [ ] (엣지) 패널 너비를 maxWidth(600px) 초과로 드래그해도 600px에서 멈춘다.
- [ ] (엣지) splitter에 포커스 후 ArrowLeft 키 입력 시 너비가 10px 감소한다.
- [ ] (엣지) splitter에 포커스 후 ArrowRight 키 입력 시 너비가 10px 증가한다.
- [ ] (에러) 패널이 접힌 상태에서 prevWidth가 0인 경우(방어) 재오픈 시 기본값(300px)으로 복원된다.
- [ ] (통합) Live Preview 패널 리사이즈 후 내부 form-js live preview 콘텐츠가 정상 렌더된다(drop container 높이 0 미발생).
- [ ] (통합) Properties 패널 리사이즈 후 필드 선택 시 속성 목록이 정상 표시된다.
- [ ] (a11y) splitter의 `role="separator"`, `aria-orientation="vertical"`, `aria-valuenow` 속성이 올바르게 설정된다.
- [ ] (a11y) 토글 버튼 `aria-label`이 상태에 따라 "패널 닫기"/"패널 열기"로 동적 변경된다.

**fullstack/frontend Task 필수 항목 (E2E 테스트에서 검증 — dev-test reachability gate):**
- [ ] (클릭 경로) 사이드바 'Properties' 버튼 클릭 → Properties 패널 표시 → splitter 드래그 → 너비 변경 확인 → 토글 버튼 클릭 → 패널 접힘 확인 (URL 직접 입력 금지)
- [ ] (화면 렌더링) splitter가 브라우저에서 실제 표시되고 드래그 기본 상호작용이 동작한다
