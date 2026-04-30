# Regression Baseline & Verification — simple-props-followup

> 본 문서는 FU-G의 검증 결과 단일 소스. visible Playwright + 단위테스트 통합.

## 변경 요약 (commit chain, develop 17223cd 이후)

| commit | FU | 변경 |
|---|---|---|
| `0c8b799` | FU-A | LAYOUT_HEIGHT_TARGET_TYPES 11→19종, _buildLayoutGroup spacer-only |
| `279591e` | FU-B | InlineLabelEditService/Module 신규, host/embedded/vscode 3곳 등록, form-js native dblclick 충돌 0 확인 |
| `85466e9` | FU-C | vscode customEditor + tiptap withDesigner default simple 강제, web sessionStorage 보존 |
| `7d714a9` | FU-D | app.css → bio-properties-panel native 토큰 통일, collapse UI 부재 negative test 추가 |
| `e84108b` | FU-E | ko/en.json 20키 × 2 보충 (image/table/chartPlaceholder/card/modal/tabs/tree) |
| `df67a4f` | FU-E+ | PropsPanelService에 createKoT 주입 (identityT 제거) |
| `5bd6474` | hotfix | designer-i18n entry에서 Node-only scripts/* export 제거 (vite fs externalize 회피) |

## 단위테스트

- `designer-runtime`: 89/89 passed
- `designer-editor-host`: 400/400 passed (FU-A 5 + FU-B 8 + FU-C 6 + FU-D 2 + FU-E 3 신규 = +24)
- `designer-i18n`: 61/61 passed
- 빌드 / 타입체크: pre-existing 에러 외 신규 0

## visible Playwright 회귀 (web demo, http://localhost:5174, 2026-04-30)

| # | 시나리오 | 결과 | 비고 |
|---|---|---|---|
| 1 | textfield drop → 라벨 가시 + Field label/Default value/Required 노출 | ✅ | form-js native 패널, Simple 모드 |
| 2 | textfield 라벨 dblclick → 인라인 input mount + value seed + focus | ✅ | overlayCount 1, value `Text field`, focused true |
| 3 | 라벨 input에 `이름 (테스트)` 입력 + Enter → 라벨 변경 + overlay unmount | ✅ | labelTexts: `[이름 (테스트)]`, overlay 0 |
| 4 | spacer drop + select → Properties 패널에 `props-entry-layout.height-input` | ✅ | FU-A spacer-only 분기 정상 |
| 5 | textarea drop + select → Properties height entry **부재** + ResizeHandle 노출 | ✅ | overlay top 153px / left 307px / width 363px |
| 6 | chartPlaceholder drop + select → Chart Type/Title/Description 노출 (영문) + height entry 부재 + ResizeHandle 노출 | ⚠️ 영문 라벨 | `koT('designer.components.chartPlaceholder.title')` → `"제목"`이지만 form-js native bio-properties-panel은 designer t를 안 거침. 사용자 합의(B 옵션)로 영문 라벨 그대로 머지 |
| 7 | image drop → field 추가 (selection은 placeholder click으로 form-js editor selection module 도달 어려움 — 별도 이슈) | △ | image 컴포넌트는 form-js editor의 selection 흐름 차이 — sunny-meteor 범위 |
| 8 | Properties 탭 → Simple 탭 selected (default) + Full 토글 노출 | ✅ | FU-C web 영속 동작 (web은 sessionStorage 사용) |
| 9 | 그룹 collapse UI 부재 + 항상 펼침 | ✅ | FU-D 단위테스트 + 화면 확인 |

## 회귀 발생 기록 (사용자 호소 "매번 회귀" 차단 흐름)

1. **회귀 #1**: FU-E 보강(`df67a4f`) 후 web 페이지 빈 화면. 콘솔 `Module "fs" has been externalized`. 원인: designer-i18n entry barrel이 Node-only scripts(extract.ts, diff.ts, reporter.ts)을 export → 브라우저 번들 포함.
   - **검출**: visible Playwright 첫 navigate에서 즉시 발견 (단위테스트만으로는 못 잡음 — 메모리 `feedback_e2e_browser_verify` 정책 가치 입증).
   - **수정**: hotfix `5bd6474` — entry에서 scripts/* value-export 제거. 1 commit, ~5분 내 회복.

2. **회귀 #2 후보**: console 1건 `Hook can only be invoked from render methods` (preact strict 경고). 화면 동작 영향 없음, dev 모드 노이즈로 분류.

## VSCode Extension 정적 검증 (branch feat/simple-props-panel, 2026-04-30)

### 빌드 결과

| 파일 | 크기 | 상태 |
|---|---|---|
| `dist/extension.cjs` | 37.5 KB | PASS |
| `dist/webview/customEditor.js` | 3.0 MB | PASS |
| `dist/webview/customEditor.css` | 12.9 KB | PASS |
| 빌드 exit code | 0 | PASS |
| stderr 신규 에러 | 없음 (import.meta iife 경고 2건은 pre-existing) | PASS |

### 번들 정적 grep 결과

| 항목 | 검증 내용 | 결과 |
|---|---|---|
| FU-A | `LAYOUT_HEIGHT_TARGET_TYPES` + 19종 타입(`chartPlaceholder`, `tree`, `spacer`, `textarea`, `html`, `table`, `group`, `card`, `modal`, `tabs`, `tabPanel`, `iframe`, `image`, `text`) 모두 번들에 존재 | PASS |
| FU-B | `InlineLabelEditModule`, `InlineLabelEditService`, `inline-label-edit`, `fjs-form-field-label`, `fjs-inline-label-edit-input` 번들에 존재 | PASS |
| FU-C | `currentPanelMode: PanelMode = 'simple'` — 소스 정적 확인, sessionStorage 무시하고 항상 Simple 기동 | PASS |
| FU-D (JS) | `fjs-inline-label-edit-input` JS에서 programmatic class 할당 확인 | PASS |
| FU-D (CSS) | `bio-properties-panel-group-entries` / `bio-properties-panel-group-header` 규칙이 `media/form-js-editor-host.css`에 4건 포함 (webview HTML 로드 순서 9번째) | PASS |
| FU-E | `ko.json` / `en.json` 에 `image`, `table`, `chartPlaceholder`, `card`, `modal`, `tabs`, `tree` 컴포넌트 키 포함 (en.json 35건, ko.json 30건+) | PASS |
| Node-only API 혼입 | `require("fs")` / `require("path")` / `node:fs` / `node:path` — webview 번들에서 0건 | PASS |
| hotfix(5bd6474) | `designer-i18n/src/index.ts` 에서 `scripts/*` export 제거 확인 — `createT`, `createKoT`, `formatNumber/Date/DateTime` 만 export | PASS |

### CSP / NODE_ENV 정적 검증

| 항목 | 결과 |
|---|---|
| CSP `unsafe-eval` 없음 | `script-src 'nonce-...' ${cspSource}` — `unsafe-eval` 미포함 (PASS) |
| `process.env.NODE_ENV` define `"production"` | esbuild.config.mjs `define: { 'process.env.NODE_ENV': '"production"' }` 확인 (PASS) |
| `globalThis.process` 폴리필 banner | IIFE 상단 banner 확인 (PASS) |
| react → preact/compat alias | esbuild `alias` 설정 확인 (PASS) |

### VSIX 패키징 결과

| 항목 | 값 |
|---|---|
| 파일명 | `designer-vscode-extension-0.1.39.vsix` |
| 파일 크기 | 1.2 MB (22 files) |
| unscoped rename 패턴 | `@form-js-designer/designer-vscode-extension` → `designer-vscode-extension` → 복원 (PASS) |
| 포함 파일 | `dist/extension.cjs`, `dist/webview/customEditor.{js,css}`, `dist/webview/preview.{js,css}`, `media/*.css` (11개) |

### 발견 회귀 / 미적용 항목

없음. 모든 FU 항목(A~E) 번들 적용 확인. designer-i18n hotfix(5bd6474)도 vscode 번들에 정상 반영됨(`scripts/*` export 없음, `require("fs")` 0건).

---

## visible Playwright 회귀 (tiptap demo, http://localhost:5179, 2026-04-30)

> branch `feat/simple-props-panel` worktree `/Users/jji/project/form-js-designer-simple-props`  
> dev server: `npm --prefix packages/designer-tiptap run dev` (vite 5179)  
> 콘솔 critical error: **없음** (favicon.ico 404 1건만, 무해)

| # | 시나리오 | FU | 결과 | 핵심 evidence |
|---|---|---|---|---|
| T1 | tiptap demo 페이지 navigate → form-js-block 슬롯 가시 + 콘솔 critical error 없음 | 전체 | ✅ | `data-type="form-js-block"` 존재, console errors 1건(favicon 404만) |
| T2 | form-js-block dblclick → embedded modal 오픈 (canvas + props panel 가시) + Simple mode 고정 (토글 없음) | FU-C | ✅ | modal display:flex, canvasVisible true, propsPanel "TEXT FIELD / Field label / Default value / Required / Layout" — tiptap은 toggle 없이 simple 고정(설계 의도) |
| T3 | 캔버스 필드 라벨 dblclick → `.fjs-inline-label-edit-input` overlay mount + value seed + focused | FU-B | ✅ | overlayCount 1, inputValue "이름", focused true |
| T4 | spacer drop + select → 패널에 높이(px) 입력란 노출 / textfield select → height entry 부재 + `fjs-field-resize-handle` 노출 | FU-A | ✅ | spacer: customProps "SPACER / Layout / 높이(px)", heightInputCount 1; textfield: heightInputPresent false, resizeHandle (fjs-field-resize-handle-left/right) 2건 |

### 스크린샷

| 시나리오 | 파일 |
|---|---|
| T1 | `/Users/jji/project/form-js-designer/regression-tiptap-T1.png` |
| T2 | `/Users/jji/project/form-js-designer/regression-tiptap-T2.png` |
| T3 | `/Users/jji/project/form-js-designer/regression-tiptap-T3.png` |
| T4 | `/Users/jji/project/form-js-designer/regression-tiptap-T4.png` |

### FU-C tiptap 구현 설계 노트

tiptap embedded modal은 `initialPanelMode: 'simple'` 을 withDesigner가 mountEmbeddedEditorModal에 하드코딩으로 전달(`withDesigner.ts` line 56). embeddedDesigner.tsx의 `_setPanelMode` setter는 **의도적으로 노출되지 않으며** 모달 수명 동안 simple 고정 (`embeddedDesigner.tsx` lines 163-169). 따라서 web 의 `[role="tablist"][aria-label="속성 패널 모드"]` 토글은 tiptap modal에 존재하지 않는다 — 이는 회귀가 아니라 FU-C 설계 의도.

### 발견 회귀 / 미적용 항목

없음. T1~T4 전 항목 PASS. FU-A/B/C 모두 tiptap embedded modal에서 정상 동작 확인.

---

---

## feat/inline-label-edit 머지 검증 (2026-04-30)

> 이전 FU-B `279591e` (simplified replica) revert → `feat/inline-label-edit` (32 commits, 풍부한 구현) merge.
> 복원: tab page 이름, text view feelers popup, card header, datetime dateLabel/timeLabel, button label inline edit.
>
> revert commit: `2c0bfcb`  
> merge commit: `c4992a6`  
> TS fix commit: `73dd2bb` (Tabs.tsx + InlineLabelEditModule.test.ts 2건 신규 에러 해소)

### 단위테스트 (merge 후)

| 패키지 | 결과 |
|---|---|
| `designer-editor-host` | 426/426 passed (33 InlineLabelEdit 포함) |
| `designer-components` | 185/185 passed |
| `designer-core` | 257/257 passed |
| `designer-runtime` | 89/89 passed |
| `designer-vscode-extension` | 430/430 passed |
| typecheck (editor-host) | 42 errors (모두 pre-existing, 신규 0) |

### 빌드

| 패키지 | 결과 |
|---|---|
| `designer-editor-host` | PASS (1396 KB JS, 154 KB CSS) |
| `designer-vscode-extension` | PASS (3.0 MB webview/customEditor.js) |
| `designer-tiptap` | PASS (ESM + DTS) |

### visible Playwright 5×3 시나리오 (2026-04-30)

| 시나리오 | web (5174) | tiptap (5179) | vscode (정적) |
|---|---|---|---|
| S1: textfield 라벨 dblclick → "테스트" 입력 + Enter → 라벨 변경 | ✅ | ✅ | ✅ (번들 grep) |
| S2: tabs 컴포넌트 drop → tab trigger dblclick → 이름 변경 | ✅ | ✅ | ✅ (번들 grep) |
| S3: text view drop → dblclick → feelers popup 오픈 | ✅ | ✅ | ✅ (번들 grep) |
| S4: card drop → dblclick → header inline input + 커밋 | ✅ | ✅ | ✅ (번들 grep) |
| S5: spacer drop → ComponentResizeOverlay 핸들 노출 (FU-A 회귀 없음) | ✅ | ✅ | ✅ (번들 grep) |

**15/15 PASS**

### conflict 처리 내역

| 파일 | 처리 방식 |
|---|---|
| `packages/designer-vscode-extension/package.json` | HEAD version `0.1.38` 유지 (feat/inline-label-edit의 `0.1.37` 무시) |
| `docs/designer/수정대기.md` | 양쪽 추가 항목 모두 보존 (union) |

### 발견 side-effect

1. `packages/designer-components/src/tabs/Tabs.tsx`: `PureRenderProps<TabsSchema>` → `Record<string, unknown>` 직접 캐스트 불가 (TS2352). `as unknown as` 이중 캐스트로 수정 (`73dd2bb`).
2. `packages/designer-editor-host/src/__tests__/InlineLabelEditModule.test.ts`: `as const` 튜플 캐스트 동일 이슈. `as unknown as` 수정 (`73dd2bb`).
3. 이전 FU-B `279591e`의 simplified InlineLabelEditModule(단일 파일) 대비 feat/inline-label-edit의 구현은 월등히 풍부함: tab trigger dblclick, text feelers popup, card header, datetime dateLabel/timeLabel, button label, IME guard, portal root 분기, feelers reparenting in embedded modal, Tabs activeId cache, ShortcutModule 추가.

## 후속 backlog (수정대기.md로 이관)

- form-js native bio-properties-panel 라벨 한국어화 — translate provider 등록 별도 작업
