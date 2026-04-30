# simple-props-followup — 설계

> **단일 소스:** `~/.claude/plans/simple-properties-elegant-metcalfe.md` (사용자 승인). 본 design.md는 plan을 dev-build가 소비 가능한 형태로 정규화한다.
> **선행:** sunny-meteor plan Tasks 1~9 완료 (`99869ff` ~ `17223cd`)
> **Worktree:** `/Users/jji/project/form-js-designer-simple-props` (branch `feat/simple-props-panel`)

## 요구사항 확인

1. Properties 패널의 height entry는 Spacer만 노출, 나머지는 ResizeHandle로만 조절. 핸들 노출 대상 17종으로 확장.
2. 캔버스 form-field 라벨 더블클릭 → 인라인 편집 (web/tiptap/vscode 3타겟 동일 동작).
3. vscode/tiptap에서 디폴트 simple 보장 + custom-props 그룹 collapse 제거 + form-js native와 동일 CSS + 신규 i18n 라벨 보충 + 사용자 호소("매번 회귀") 차단을 위한 변경 전후 3타겟 visible Playwright 회귀 검증.

## 타겟 앱

- **경로**: 모노레포 5 패키지 동시 수정 — `packages/designer-runtime`, `packages/designer-editor-host`, `packages/designer-vscode-extension`, `packages/designer-tiptap`, `packages/designer-i18n`
- **근거**: Simple Properties 패널이 위 5개 패키지에 걸쳐 분산되어 있고(LayoutHeightApplier·PropsPanelService·embedded modal·webview·locale), follow-up 7건은 모두 cross-package임.

## 구현 방향

7개 commit-segment(FU-A~G)로 분리해 각 segment마다 단위 테스트 + mini-회귀(3타겟 시나리오 ①~③)로 게이트한다. 핵심 단일소스 변경:
- `LAYOUT_HEIGHT_TARGET_TYPES`(designer-runtime)는 ComponentResizeOverlay·PropsPanelService 양쪽이 동일 import → 한 곳만 고치면 자동 전파.
- `_buildLayoutGroup`은 `field.type === 'spacer'` 분기로 Spacer 외 height entry 제거.
- `InlineLabelEditModule`(신규)은 form-js DI 모듈로 정의 후 host App.tsx + embeddedDesigner.tsx + vscode customEditor.ts의 `additionalModules` / `EDITOR_MODULES`에 모두 등록(tiptap는 embeddedDesigner를 재사용하므로 자동).
- vscode/tiptap는 `readStoredPanelMode()` fallback을 'simple'로 강제하는 옵션 또는 entry-point에서 `setMode('simple')` 명시 호출로 디폴트 보장.

## 파일 계획

| 파일 경로 | 역할 | 신규/수정 |
|---|---|---|
| `packages/designer-runtime/src/modules/LayoutHeightApplier.ts` | `LAYOUT_HEIGHT_TARGET_TYPES` 17종 확장 (`+filepicker, +checklist, +radio, +separator, +expression, +chartPlaceholder, +tree`) | 수정 |
| `packages/designer-runtime/src/modules/__tests__/LayoutHeightApplier.test.ts` | 17종 포함·미포함 케이스 단위테스트 | 수정 (없으면 신규) |
| `packages/designer-editor-host/src/modules/PropsPanelService.ts` | `_buildLayoutGroup` 호출 분기: `spacer`만 entry 생성, 나머지는 layoutEntries=[] | 수정 |
| `packages/designer-editor-host/src/modules/__tests__/PropsPanelService.test.ts` | spacer는 entry 노출, 그 외 17종은 layoutEntries 빈 배열 검증 | 수정 |
| `packages/designer-editor-host/src/modules/InlineLabelEditService.ts` | 인라인 라벨 편집 서비스 (DI 가능, eventBus + modeling + formFieldRegistry 의존) | **신규** |
| `packages/designer-editor-host/src/modules/InlineLabelEditModule.ts` | form-js DI 모듈 wrapper (`__init__: ['inlineLabelEdit']`) | **신규** |
| `packages/designer-editor-host/src/modules/__tests__/InlineLabelEditService.test.ts` | dblclick → input mount → Enter/Esc/IME composition 케이스 | **신규** |
| `packages/designer-editor-host/src/App.tsx` | `additionalModules` 배열에 `InlineLabelEditModule` 등록 | 수정 |
| `packages/designer-editor-host/src/embeddedDesigner.tsx` | 동일하게 `additionalModules`에 등록 (tiptap이 이를 재사용) | 수정 |
| `packages/designer-editor-host/src/components/PropsPanelContainer.tsx` | (이미 collapse 코드 없음) `mode='simple'` 기본값 점검 + designer-simple-merged 헤더 미렌더 보존 | 수정 (검증성) |
| `packages/designer-editor-host/src/app.css` | designer-custom-props/designer-simple-merged 그룹 CSS를 `.bio-properties-panel-group` 토큰 기반으로 통일 (padding/border/font/hover) | 수정 |
| `packages/designer-vscode-extension/src/editor/customEditor.ts` | `EDITOR_MODULES`에 `InlineLabelEditModule` 등록 + entry에서 `service.setMode('simple')` 또는 `readStoredPanelMode` fallback 'simple' 강제 | 수정 |
| `packages/designer-vscode-extension/src/editor/propsPanel/PropsPanelService.ts` | (재export 또는 host와 동일 InlineLabelEditModule 노출 경로 정합성 확인) | 수정 (필요 시) |
| `packages/designer-tiptap/src/editor/withDesigner.ts` | `mountEmbeddedEditorModal` 호출 옵션에 `panelMode: 'simple'` 전달(또는 디폴트 simple 보장 확인) | 수정 |
| `packages/designer-i18n/locales/ko.json` | `designer.components.image.imageSource`, `image.altText`, `chartPlaceholder.title`, `chartPlaceholder.description`, `table.staticColumns` 등 누락 키 보충 | 수정 |
| `packages/designer-i18n/locales/en.json` | 동일 키 영문 보충 (i18n:check 통과 위함) | 수정 |
| `docs/features/simple-props-followup/regression-baseline.md` | FU-G 변경 전 캡처 결과 (스크린샷 경로 + 통과/실패 표) | **신규** |
| `docs/designer/수정대기.md` | Simple Properties 섹션 항목 close 표시 | 수정 |

## 진입점 (Entry Points)

- **사용자 진입 경로 (web)**: `npm --prefix packages/designer-editor-host run dev` → `http://localhost:5173` 접속 → 좌측 팔레트의 `Spacer` / `Text area` / `Card` / `Image View` / `Table` / `Chart` 등을 캔버스로 drag → 컴포넌트 클릭 선택 → 우측 Properties 패널에서 항목 확인. 캔버스 라벨 더블클릭 → 인라인 입력박스.
- **사용자 진입 경로 (vscode)**: VSIX 패키징 후 VS Code Insiders/Stable에 `code --install-extension` → `.form-js-designer` 파일 open → 동일 시나리오. (메모리 `project_vsix_packaging_unscoped`: unscoped name rename 패턴 유지)
- **사용자 진입 경로 (tiptap)**: `packages/designer-tiptap/e2e/` 데모 페이지 (또는 `pnpm --filter @form-js-designer/designer-tiptap dev`) → 본문의 `formJsBlock` 더블클릭 → embedded modal 오픈 → 동일 시나리오.
- **URL / 라우트**:
  - web: `http://localhost:5173/`
  - tiptap: `http://localhost:<tiptap-dev-port>/` (e2e harness가 띄우는 포트)
  - vscode: `vscode://` 파일 open
- **수정할 라우터 파일**:
  - web: `packages/designer-editor-host/src/App.tsx` (단일 SPA, 라우터 없음 — App 자체가 진입점). `additionalModules` 배열에 InlineLabelEditModule 등록.
  - vscode: `packages/designer-vscode-extension/src/editor/customEditor.ts` (`EDITOR_MODULES` 배열).
  - tiptap: `packages/designer-tiptap/src/editor/withDesigner.ts` (`mountEmbeddedEditorModal` 호출 — host의 embeddedDesigner.tsx가 실제 라우팅 역할).
- **수정할 메뉴·네비게이션 파일**:
  - 본 follow-up은 **신규 페이지/메뉴 추가가 없다.** 기존 Properties 패널의 entry 목록과 Layout 핸들 노출 정책만 변경.
  - 단, "신규 항목 진입 가시성"(image/table/chart의 Properties)은 좌측 팔레트(`packages/designer-editor-host/src/components/Palette.tsx` 또는 동등 파일)와 우측 패널(`PropsPanelContainer.tsx`)이 진입점 역할을 한다.
- **연결 확인 방법 (E2E)**:
  - 팔레트에서 `Spacer` drag → drop → 클릭 선택 → Properties 패널에 height 입력 entry 가시(스크린샷)
  - 팔레트에서 `Text area` drag → drop → 클릭 선택 → Properties 패널에 height entry 부재 확인 + 컴포넌트 하단 ResizeHandle 가시
  - 팔레트에서 `Image View`/`Table`/`Chart` drag → drop → 클릭 선택 → Properties 패널에서 한국어 라벨(`이미지 소스`/`대체 텍스트`/`제목`/`설명`/`정적 컬럼`) 가시
  - 캔버스의 textfield 라벨 더블클릭 → 인라인 input 표시 → `새 라벨` 입력 → Enter → 라벨 변경 반영
  - `page.goto` 로 직접 URL 입력 가능 (단일 SPA이므로 dev-test reachability gate의 "URL 직접 입력 금지"는 SPA-내부 클릭 경로에 한정 — 본 디자이너는 외부 메뉴 없음)

## 주요 구조

- **`InlineLabelEditService`** — `dblclick` 이벤트 캡처 → `event.target.closest('.fjs-form-field-label')` 검증 → `field-id` 추출 → fixed-position `<input>` overlay mount → `Enter` 시 `modeling.editFormField(field, { label })` / `Esc` 시 noop / blur 시 commit / IME `compositionstart`~`compositionend` 동안 Enter 무시.
- **`InlineLabelEditModule`** — form-js DI 모듈 wrapper. `__init__: ['inlineLabelEdit']`, `inlineLabelEdit: ['type', InlineLabelEditService]`.
- **`PropsPanelService._buildLayoutGroup`** — Spacer 분기 추가. `getGroups()` 단계에서 `field.type === 'spacer'`이면 호출, 아니면 layoutEntries=[] 유지.
- **`LAYOUT_HEIGHT_TARGET_TYPES`** — 17종으로 확장. `as const` 튜플 유지.
- **`PropsPanelContainer`** — 변경 최소: `mode` 기본값 'simple'로 변경 검토(현재 'full'). designer-simple-merged 그룹 헤더 미렌더 동작 보존.

## 데이터 흐름

(FU-A) field 선택 → `selection.changed` → ComponentResizeOverlay·PropsPanelService 모두 `LAYOUT_HEIGHT_TARGET_TYPES` 단일 소스 참조 → ResizeHandle은 17종에 노출 / Properties height entry는 Spacer만 노출.

(FU-B) DOM `dblclick` → InlineLabelEditService 캡처 → `field-id` 추출 → input overlay mount → Enter → `modeling.editFormField` → form-js redraw.

(FU-C) editor 마운트 → PropsPanelService 생성 → vscode/tiptap는 `setMode('simple')` 강제 → 첫 `selection.changed`부터 simple 모드.

(FU-E) form-field render → `t(label_key)` → designer-i18n locales/{ko,en}.json 조회 → 모든 신규 키 한국어 라벨 노출.

## 설계 결정 (대안이 있는 경우만)

- **결정 1 (FU-A 단일 소스)**: `LAYOUT_HEIGHT_TARGET_TYPES`를 designer-runtime에서 단일 export, ResizeHandle/PropsPanelService 모두 import.
  - **대안**: 별도 PROPERTIES_HEIGHT_TARGET_TYPES를 PropsPanelService에 두고 분리. 사용자 요구가 "Properties는 Spacer만, 핸들은 17종"으로 비대칭이라 분리 매력 있음.
  - **근거**: 사용자 요구 매핑상 핸들 17종 = Properties 0종 + Spacer라서 `[type === 'spacer']` 한 줄로 분리 가능. 별도 상수 도입은 불필요한 인지부담.

- **결정 2 (FU-B InlineLabelEdit DI 모듈)**: form-js DI 모듈로 정의 → `additionalModules`에 등록.
  - **대안**: 캔버스 컴포넌트(App.tsx)에서 직접 dblclick 리스너 등록.
  - **근거**: form-js editor 내부 라이프사이클(eventBus.fire('selection.changed') 등)과 같은 컨텍스트에서 동작해야 modeling 호출이 안전. 또한 vscode/tiptap에서도 동일 모듈 등록만으로 자동 적용.

- **결정 3 (FU-C 디폴트 simple)**: vscode/tiptap entry에서 `service.setMode('simple')` 명시 호출.
  - **대안**: PropsPanelService 생성자가 환경 감지 (NODE_ENV / userAgent / process.env.VSCODE).
  - **근거**: 환경 감지는 fragile, 명시적 setMode 호출이 명확.

- **결정 4 (FU-G 회귀 베이스라인)**: 변경 **전** 3타겟 visible Playwright 캡처 → `regression-baseline.md`에 기록 후 FU-A 시작.
  - **대안**: 변경 후만 검증.
  - **근거**: 사용자 호소 "매번 회귀" 차단. 베이스라인 없으면 회귀가 발생해도 어디서 깨졌는지 모름.

## 선행 조건

- worktree `/Users/jji/project/form-js-designer-simple-props` 활성, branch `feat/simple-props-panel` 체크아웃 상태
- sunny-meteor commit `17223cd` 이후 깨끗한 작업 트리
- form-js editor 의존성 install 완료 (`packages/designer-editor-host/node_modules/@bpmn-io/form-js-editor` 존재)
- plugin_playwright MCP 사용 가능 (메모리 `feedback_playwright_mcp_env`)

## 리스크

- **HIGH**: InlineLabelEditModule이 form-js native dblclick handler(form-element-template 편집 등)와 충돌 시 캔버스 동작 회귀. **완화**: selector 엄격화(`.fjs-form-field-label` only) + `event.stopPropagation()` + 단위테스트에서 dblclick on 비-라벨 시 noop 검증.
- **HIGH**: `LAYOUT_HEIGHT_TARGET_TYPES` 확장 후 ResizeHandle이 추가 17종 모두에서 정상 동작하는지 검증 미흡 시 회귀. **완화**: FU-A mini-회귀에서 17종 중 sample 5종(textarea, filepicker, checklist, image, chartPlaceholder)을 visible Playwright로 확인.
- **MEDIUM**: vscode webview 디폴트 simple 강제 시 sessionStorage 보존되어 reload 후 full로 점프 가능. **완화**: vscode entry에서 매 마운트 시 `setMode('simple')` 명시 호출 (sessionStorage 무시).
- **MEDIUM**: tiptap이 host의 embeddedDesigner.tsx를 재사용하므로 host 변경이 자동 적용되나 modal lifecycle 차이로 InlineLabelEditModule가 두 번 등록될 가능성. **완화**: 모듈 한 번만 등록되도록 `additionalModules` 단일 출처 유지.
- **MEDIUM**: i18n locale 추가 시 form-js native 번역 키와 designer 키가 충돌. **완화**: 모든 designer 키는 `designer.` prefix 강제, i18n:check 통과.
- **LOW**: VSIX 패키징 시 unscoped name rename 누락 (메모리 `project_vsix_packaging_unscoped`). **완화**: 기존 패키징 스크립트 그대로 사용.
- **LOW**: tiptap profile lock으로 Playwright 시작 실패 (메모리 `feedback_playwright_mcp_env`). **완화**: 시작 전 `pkill -f "Google Chrome.*playwright"`.

## QA 체크리스트

dev-test 단계에서 검증할 항목. 각 항목은 pass/fail로 판정 가능.

**FU-A 높이 핸들/entry 정책:**
- [ ] (정상) `Spacer` drop → Properties 패널에 height 숫자 입력 entry 1개 가시, 값 변경 시 캔버스 spacer 높이 즉시 반영
- [ ] (정상) `Text area` drop → Properties 패널에 height entry 부재, 컴포넌트 하단에 ResizeHandle 가시, 드래그 시 높이 변경
- [ ] (정상) `Chart Placeholder` drop → 동일하게 ResizeHandle 가시 + Properties에는 height entry 부재
- [ ] (엣지) 17종 외 컴포넌트(textfield, button, checkbox, select 등)는 ResizeHandle 부재
- [x] (단위) `LAYOUT_HEIGHT_TARGET_TYPES.length === 19` 그리고 19종 각각 포함 검증 (design.md 목록 기준 실제 19종)

**FU-B 더블클릭 인라인 편집:**
- [ ] (정상) textfield 라벨 더블클릭 → `<input>` 가시 → "새 라벨" 입력 → Enter → 라벨 변경 + input unmount
- [ ] (엣지) Esc 누르면 변경 취소 + input unmount
- [ ] (엣지) IME 한글 조합 중 Enter는 무시(commit 미발생)
- [ ] (에러) 라벨 외 영역(value, helper text) 더블클릭 시 input mount 안 됨
- [ ] (회귀) form-js native dblclick 동작(예: form-element-template 편집)과 충돌 없음
- [ ] (3타겟) web/tiptap/vscode 모두 동일 동작 — visible Playwright 스크린샷 3장

**FU-C vscode/tiptap 디폴트 simple:**
- [x] (정상) vscode webview 첫 오픈 시 props panel 모드 = 'simple' (PropsPanelModeToggle의 simple 버튼 active)
- [x] (정상) tiptap embedded modal 첫 오픈 시 동일
- [x] (정상) web은 sessionStorage 영속 동작 유지 (회귀 없음)

**FU-D CSS 통일 + collapse:**
- [x] (정상) designer-simple-merged 그룹 헤더 미렌더 (sunny-meteor 동작 보존)
- [x] (정상) 모든 그룹이 항상 펼침 상태 (collapse toggle UI 부재) — PropsPanelContainer에 collapse 코드 없음 확인 + negative test 추가
- [x] (시각) form-js native 그룹과 designer 그룹의 padding/border/font/hover 시각 일치 — bio-properties-panel 토큰으로 맞춤 (app.css 갱신)

**FU-E i18n 라벨:**
- [x] (정상) Image View 선택 → Properties에 `이미지 소스`, `대체 텍스트` 한국어 라벨
- [x] (정상) Chart Placeholder 선택 → `차트 종류`, `제목`, `설명` 한국어 라벨
- [x] (정상) Table 선택 → `라벨`, `데이터 소스`, `정적 컬럼` 한국어 라벨
- [x] (자동) `npm --prefix packages/designer-i18n run i18n:check` exit 0
- [x] (회귀) 기존 라벨(card.header, modal.title 등) 변경 없음
- [x] 라벨 실제 노출 보강 (identityT → live t) — PropsPanelService에 createKoT() 주입, WP-07 placeholder 제거
- [x] hotfix: avoid fs in browser bundle — index.ts에서 scripts/* value-export 제거 (bin은 직접 import 유지)

**FU-G 3타겟 회귀:**
- [ ] (베이스라인) 변경 전 web/tiptap/vscode 12개 시나리오 visible Playwright 스크린샷 캡처 → `regression-baseline.md` 기록
- [ ] (검증) 변경 후 동일 12개 시나리오 재실행 → 베이스라인과 비교 → 회귀 0건
- [ ] (메모리 정책) headless 단독 검증으로 done 선언 금지 — 3타겟 모두 visible Playwright 통과 필수

**fullstack/frontend Task 필수 항목 (E2E 테스트에서 검증 — dev-test reachability gate):**
- [ ] (클릭 경로) 메뉴/사이드바/버튼을 클릭하여 목표 페이지에 도달한다 (URL 직접 입력 금지)
- [ ] (화면 렌더링) 핵심 UI 요소가 브라우저에서 실제 표시되고 기본 상호작용이 동작한다

## Implementation Steps

dev-build/dev-test 단계에서 실행할 commit-segment 순서. 각 segment 완료 후 mini-회귀 (3타겟 시나리오 ①~③) 통과해야 다음으로 진행.

- [ ] **FU-G(전반부, 베이스라인)** — 변경 전 web/tiptap/vscode 12개 시나리오 visible Playwright 캡처 → `docs/features/simple-props-followup/regression-baseline.md` 기록
- [x] **FU-A** — `LAYOUT_HEIGHT_TARGET_TYPES` 19종 확장 + 단위테스트 + `_buildLayoutGroup` Spacer 분기 + ComponentResizeOverlay 회귀 확인 → commit `feat(props-panel): align height handle target types + hide layout entry except Spacer`
- [ ] **FU-B** — `InlineLabelEditService` + `InlineLabelEditModule` 신규 + 단위테스트 + App.tsx/embeddedDesigner.tsx/customEditor.ts 등록 + CSS → mini-회귀 → commit `feat(designer): inline label edit on canvas dblclick (host + vscode + tiptap)`
- [x] **FU-C** — vscode customEditor.ts/tiptap withDesigner.ts entry에서 `setMode('simple')` 강제 → mini-회귀 → commit `feat(props-panel): force default Simple in vscode/tiptap (toggle still available)`
- [x] **FU-D** — PropsPanelContainer 점검(현재 collapse 코드 없음 확인) + app.css 토큰 통일 → negative test 추가 → commit `style(props-panel): match form-js native CSS + always-expanded groups`
- [ ] **FU-E** — designer-i18n locales/{ko,en}.json 누락 키 보충 + `i18n:check` 통과 → mini-회귀 → commit `i18n(designer): add missing ko labels for image/table/chart simple-mode entries`
- [ ] **FU-G(후반부, 최종 회귀)** — 변경 후 web/tiptap/vscode 12개 시나리오 visible Playwright 재실행 → 베이스라인 비교 → 회귀 0건 확인 → `docs/designer/수정대기.md` Simple Properties 섹션 close → commit `docs(designer): close Simple Properties follow-up backlog`
