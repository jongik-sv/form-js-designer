# TSK-01-02: previewScripts — 웹뷰 내 form-js-viewer 마운트 - 설계

## 요구사항 확인
- TSK-01-01이 생성한 `.form-js-block` DOM 요소를 `dist/webview/preview.js`에서 찾아 `@bpmn-io/form-js-viewer`의 `createForm()`으로 마운트한다.
- CSS 3종(`form-js.css`, `form-js-base.css`, `form-js-block.css`)을 `contributes.markdown.previewStyles`로 주입하여 오프라인·CDN-free 환경에서도 스타일을 보장하고, 특히 `form-js-base.css` 누락 시 컨테이너 높이 0이 되는 문제를 예방한다.
- 미리보기 재로드 시 기존 viewer 인스턴스를 dispose한 뒤 재생성(중복 마운트 방지), VSCode 테마 변경 시 `data-vscode-theme-kind` 변화를 구독해 다크/라이트 색상을 즉시 반영한다.

## 타겟 앱
- **경로**: `packages/designer-vscode-extension`
- **근거**: VSCode 확장 패키지 전용 서브프로젝트로, `contributes.markdown.previewScripts`/`previewStyles`를 통해 웹뷰에서 실행되는 preview.js와 CSS를 제공하는 유일한 위치다.

## 구현 방향
- `src/markdown/preview.ts`를 브라우저 IIFE로 번들(`dist/webview/preview.js`)하여 VSCode Markdown 미리보기 웹뷰에 자동 삽입한다.
- 스크립트가 실행될 때 `document.querySelectorAll('.form-js-block')` 로 모든 블록을 수집하고, 각 블록 내 hidden `<pre class="form-js-source">` 텍스트를 JSON.parse 후 `createForm({ container, schema })` 호출로 viewer를 마운트한다.
- 인스턴스 맵(`Map<string, FormViewerInstance>`)을 모듈 스코프에 보관해 재로드 시 기존 인스턴스를 `dispose()` 후 재생성한다 (중복 마운트 방지).
- `MutationObserver`로 `<body>`의 `data-vscode-theme-kind` 속성 변화를 구독해 다크/라이트/High-Contrast 전환을 감지하고 각 viewer 컨테이너에 테마 클래스를 토글한다.
- build 스크립트에서 `node_modules/@bpmn-io/form-js/dist/*.css`를 `media/`에 복사하고 `package.json contributes.markdown.previewStyles`에 등록한다.

## 파일 계획

**경로 기준:** 모든 파일 경로는 **프로젝트 루트 기준**으로 작성한다.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-vscode-extension/src/markdown/preview.ts` | 웹뷰 내 실행 스크립트 본체 — `.form-js-block` 탐색, JSON 파싱, `createForm()` 마운트, 인스턴스 맵 관리, 테마 구독, 재로드 dispose 처리 | 신규 |
| `packages/designer-vscode-extension/media/form-js-block.css` | 확장 고유 CSS — `.form-js-block` 최소 높이 40px, 오버레이 레이아웃, 테마 토큰 변수 정의 | 신규 |
| `packages/designer-vscode-extension/scripts/copy-css.mjs` | build 시 `node_modules/@bpmn-io/form-js/dist/*.css` → `media/` 복사 스크립트 | 신규 |
| `packages/designer-vscode-extension/package.json` | `contributes.markdown.previewScripts`, `contributes.markdown.previewStyles` 등록; build script에 `copy-css` 단계 추가 | 수정 |
| `packages/designer-vscode-extension/esbuild.config.mjs` | `src/markdown/preview.ts` → `dist/webview/preview.js` browser IIFE 번들 엔트리 추가 | 수정 |
| `packages/designer-vscode-extension/src/test/unit/preview.test.ts` | `mountViewers`, `disposeAll`, `applyTheme` 순수 로직 Vitest 단위 테스트 | 신규 |

> UI Task(`frontend`) 진입점 배선 파일: VSCode Markdown 미리보기는 라우터/메뉴 파일 대신 `package.json`의 `contributes` 선언이 진입점 연결 역할을 한다. 위 표의 `package.json`이 해당 역할을 담당한다.

## 진입점 (Entry Points)

**사용자 진입 경로:**
1. VSCode에서 `.md` 파일을 열고 Command Palette → `Markdown: Open Preview to the Side` (단축키 `Cmd+Shift+V`) 실행
2. VSCode가 `contributes.markdown.previewScripts`에 등록된 `./dist/webview/preview.js`를 미리보기 웹뷰에 자동 삽입
3. `preview.js`가 DOMContentLoaded 후 `.form-js-block` 요소를 모두 탐색하여 viewer 마운트

**URL / 라우트:** `vscode-webview://` 내부 (VSCode가 관리하는 내부 origin). 사용자가 직접 URL을 입력하는 경로 없음.

**수정할 라우터 파일:**
- `packages/designer-vscode-extension/package.json`의 `contributes.markdown.previewScripts` 배열에 `"./dist/webview/preview.js"` 엔트리 추가 (위 파일 계획 표에 포함)
- `packages/designer-vscode-extension/package.json`의 `contributes.markdown.previewStyles` 배열에 CSS 3종 경로 추가

**수정할 메뉴·네비게이션 파일:**
- VSCode Markdown 미리보기에서 별도 메뉴/네비게이션 변경 없음. 진입은 VSCode 내장 `Markdown: Open Preview` 명령(기존 Command Palette 항목)으로 처리됨.
- 확장 활성화를 위한 `activationEvents`에 `"onLanguage:markdown"` 포함 여부 확인 필요 (`package.json` 동일 파일)

**연결 확인 방법 (E2E 검증):**
- `@vscode/test-electron` 환경에서 샘플 `.md` 파일 (`test/fixtures/single-block.md`)을 `vscode.commands.executeCommand('markdown.showPreviewToSide', uri)` 로 열기
- 웹뷰 DOM에 `.form-js-block` 엘리먼트가 존재하고, 그 내부에 form-js viewer 루트 노드(`.fjs-container` 또는 `.fjs-form`)가 렌더되었음을 확인
- 직접 URL 입력(`page.goto`) 방식 사용 금지

## 주요 구조

- **`mountViewers()`**: `document.querySelectorAll('.form-js-block')` → 각 블록에서 hidden `<pre>` 텍스트 추출 → JSON.parse → `createForm({ container, schema })` → 반환된 인스턴스를 `instanceMap`에 `data-schema-id` 키로 등록. 파싱 실패 시 try/catch 내에서 블록 단위로 오류 배너를 렌더하고 다음 블록 처리 계속.
- **`disposeAll()`**: `instanceMap`을 순회하며 각 `instance.destroy()` (또는 `dispose()`) 호출 후 맵 클리어. DOMContentLoaded 재실행 또는 VSCode 미리보기 reload 시 먼저 호출해 중복 마운트를 방지.
- **`applyTheme(themeKind)`**: `body[data-vscode-theme-kind]` 값(`vscode-light` | `vscode-dark` | `vscode-high-contrast`)을 읽어 `.form-js-block` 요소에 해당 CSS 클래스를 토글. 초기 실행 시 및 `MutationObserver` 콜백에서 호출.
- **`ThemeObserver`**: `MutationObserver`로 `<body>` 속성 변화를 구독. `data-vscode-theme-kind` 변경 시 `applyTheme()`를 호출해 테마 CSS 클래스를 즉시 갱신.
- **`instanceMap`**: `Map<string, FormViewerInstance>` — 모듈 스코프 싱글턴. `data-schema-id`를 키로 viewer 인스턴스를 보관. 웹뷰 수명 내 유효하며 패널 재열림 시 초기화됨.

## 데이터 흐름

입력: TSK-01-01이 생성한 `.form-js-block` (내부 `<pre class="form-js-source">` 에 raw JSON 포함) + `body[data-vscode-theme-kind]`  
처리: `preview.js` → JSON.parse → `createForm({ container, schema, properties: { readOnly: true } })` → 인스턴스를 `instanceMap`에 등록 → `MutationObserver`로 테마 변화 구독 → `applyTheme()` 호출로 CSS 클래스 토글  
출력: `.form-js-block` 내부에 마운트된 form-js viewer DOM (`.fjs-container`) + 테마 CSS 클래스 적용 상태

## 설계 결정 (대안이 있는 경우만)

- **결정**: viewer 인스턴스를 모듈 스코프 `Map`으로 관리하고 re-run 시 `disposeAll()` 선행
- **대안**: `data-schema-id` 속성 존재 여부로 마운트 여부를 판단하고 중복 시 skip
- **근거**: skip 방식은 DOM이 교체되지 않고 webview가 partial-reload될 때 stale 인스턴스가 남아 메모리 누수가 발생할 수 있음. dispose-then-recreate 방식이 수명 관리 측면에서 안전하다.

---

- **결정**: `form-js-base.css`를 `contributes.markdown.previewStyles`로 정적 주입
- **대안**: `preview.ts` 내부에서 `<link>` 태그를 동적으로 삽입
- **근거**: VSCode CSP는 인라인 스크립트 및 동적 외부 리소스 로드를 제한함. `contributes.markdown.previewStyles`는 확장 검증 단계에서 allowlist에 등록되므로 CSP 우회 없이 안전하게 스타일을 주입할 수 있다.

---

- **결정**: `copy-css.mjs` 빌드 스크립트로 `node_modules/@bpmn-io/form-js/dist/*.css` → `media/` 복사
- **대안**: form-js CSS를 esbuild로 번들에 포함 후 JS에서 `document.createElement('style')`로 주입
- **근거**: CSS를 JS 번들에 내장하면 CSP `style-src` 위반 없이 주입하기 위해 nonce 처리가 필요하고 복잡도가 증가함. previewStyles 정적 등록이 VSCode 공식 권장 방식이며 구현이 단순하다.

## 선행 조건
- **TSK-01-01 완료**: `.form-js-block` div와 hidden `<pre class="form-js-source">` 구조를 markdown-it 플러그인이 생성해야 함
- **TSK-00-01 완료**: esbuild.config.mjs에 browser IIFE 타깃 번들 설정이 존재해야 함 (`dist/webview/preview.js` 출력 경로)
- **`@bpmn-io/form-js-viewer` 설치**: `packages/designer-vscode-extension/package.json` dependencies에 포함

## 리스크

- **HIGH**: `form-js-base.css` 누락 시 `.fjs-container` 높이가 0으로 렌더되어 폼이 보이지 않음. `copy-css.mjs`가 빌드 시 반드시 실행되어야 하며, CI build 단계에서 `media/form-js-base.css` 파일 존재 여부를 검증하는 단언을 추가해야 함.
- **HIGH**: Preact 중복 인스턴스 — esbuild가 `@bpmn-io/form-js-viewer`와 함께 Preact를 번들에 포함할 때, 모노레포 루트 `overrides: preact 10.29.x`가 단일 인스턴스를 보장하는지 webview 번들 체인에서 별도 검증 필요. `scripts/ci/assert-single-preact.mjs` 게이트 통과 필수.
- **MEDIUM**: VSCode 미리보기 웹뷰는 탭 이동·재포커스 시 스크립트를 재실행하지 않을 수 있음. `DOMContentLoaded` vs `document.readyState`에 따라 초기화 타이밍이 달라질 수 있으므로 양쪽 경우를 방어적으로 처리해야 함.
- **MEDIUM**: `createForm()` 의 `container`는 DOM에 이미 children이 없는 상태이어야 함. 재마운트 시 `disposeAll()` 후 컨테이너 내부 DOM이 완전히 정리되는지 확인 필요 (form-js `destroy()` 계약 검증).
- **LOW**: `data-vscode-theme-kind` 속성은 VSCode 버전마다 문서화 수준이 낮음. High Contrast 값(`vscode-high-contrast`, `vscode-high-contrast-light`)이 버전 간 일치하는지 사전 확인 권장.

## QA 체크리스트

### 정상 케이스
- [ ] 10개 필드를 가진 form-js 스키마 블록이 포함된 `.md` 파일을 미리보기로 열었을 때, `.fjs-container` (또는 form-js viewer 루트 노드)가 `.form-js-block` 내부에 렌더되고 첫 렌더 소요 시간의 p95가 500ms 미만이다.
- [ ] 같은 `.md` 문서에 블록이 3개 있을 때 3개 모두 독립적으로 viewer가 마운트된다.
- [ ] 미리보기 패널을 닫고 다시 열었을 때 viewer가 중복 마운트되지 않고 정상 렌더된다 (이전 인스턴스 dispose 확인).
- [ ] 라이트 테마에서 미리보기를 열었을 때 `.form-js-block`에 light 테마 CSS 클래스가 적용되어 배경/텍스트가 라이트 색상으로 표시된다.
- [ ] 다크 테마로 전환하면 `.form-js-block`의 테마 CSS 클래스가 즉시 변경되고 배경/텍스트 색상이 다크 색상으로 전환된다.
- [ ] High Contrast 테마로 전환 시에도 테마 클래스가 즉시 반영된다.
- [ ] `media/form-js.css`, `media/form-js-base.css`, `media/form-js-block.css` 3종이 모두 미리보기 웹뷰에 로드된다.
- [ ] `.form-js-block`의 최소 높이가 40px 이상 보장된다 (빈 스키마 또는 필드 없는 스키마 포함).

### 엣지 케이스
- [ ] 스키마 JSON의 `components` 배열이 비어 있는 경우 viewer가 빈 폼을 렌더하고 오류 없이 표시된다.
- [ ] 동일한 `data-schema-id`를 가진 블록이 같은 문서에 2개 존재할 때 두 번째 블록도 독립적으로 마운트된다 (또는 캐시 전략에 따라 처리됨).
- [ ] `<pre class="form-js-source">` 텍스트 컨텐츠가 빈 문자열인 경우 JSON 파싱 오류가 발생하고 오류 배너가 해당 블록에만 표시된다.
- [ ] 미리보기 패널이 열린 상태에서 `.md` 파일이 외부 편집기에 의해 수정되어 미리보기가 자동 새로 고침될 때, 기존 viewer 인스턴스가 먼저 dispose되고 새 인스턴스가 마운트된다.

### 에러 케이스
- [ ] JSON 파싱에 실패한 블록 1개가 있을 때 해당 블록에만 오류 배너가 표시되고, 나머지 유효한 블록은 정상적으로 viewer가 마운트된다 (전체 미리보기가 깨지지 않음).
- [ ] `createForm()` 호출이 내부 오류로 실패할 때 try/catch로 격리되어 다른 블록 마운트에 영향을 주지 않는다.
- [ ] CDN이 차단된 오프라인 환경에서도 CSS와 form-js 런타임이 번들 내부에서 정상 로드된다.

### 통합 케이스
- [ ] `@vscode/test-electron` 통합 테스트: `vscode.commands.executeCommand('markdown.showPreviewToSide', uri)` 실행 → 웹뷰 DOM에 `.form-js-block > .fjs-container` 존재 확인 (URL 직접 입력 금지).
- [ ] `scripts/ci/assert-single-preact.mjs` lint 게이트가 `dist/webview/preview.js` 번들에서 Preact 단일 인스턴스를 확인한다.
- [ ] `media/` 디렉토리에 `form-js.css`, `form-js-base.css` 두 파일이 모두 존재하는 상태에서 `npm run build`가 성공한다.

**fullstack/frontend Task 필수 항목 (E2E 테스트에서 검증 — dev-test reachability gate):**
- [ ] (클릭 경로) VSCode Command Palette에서 `Markdown: Open Preview to the Side` 를 실행하여 목표 미리보기 패널에 도달한다 (URL 직접 입력 금지)
- [ ] (화면 렌더링) `.form-js-block` 내부에 form-js viewer 핵심 UI 요소(`.fjs-container` 또는 `.fjs-form`)가 브라우저에서 실제 표시되고 기본 상호작용이 동작한다
