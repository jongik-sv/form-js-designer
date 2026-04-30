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

## 후속 backlog (수정대기.md로 이관)

- form-js native bio-properties-panel 라벨 한국어화 — translate provider 등록 별도 작업
