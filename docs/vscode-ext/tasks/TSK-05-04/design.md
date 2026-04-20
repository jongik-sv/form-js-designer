# TSK-05-04: viewer·editor 파이프라인 주입 + i18n + 픽셀 파리티 테스트 - 설계

## 요구사항 확인

- `preview.ts`의 `createForm()`과 `customEditor.ts`의 `createFormEditor()`에 `additionalModules: [customComponents]`를 주입하여 viewer·editor 양쪽 파이프라인에서 Card/Stack/Tabs/Modal 컴포넌트가 동작하게 한다.
- 모든 가시 문자열을 `t('components.<path>')` 키로 추출하고 `designer-i18n` ko 사전에 100% 커버한다 (CI i18n-check gate).
- 통합 E2E fixture 5종(tabs 단독 / card+stack 중첩 / modal trigger+open / 혼합 / WP-01 회귀)과 768×576 SSIM ≥ 0.99 픽셀 파리티 검증을 구현한다.

## 타겟 앱

- **경로**: `packages/designer-vscode-extension`
- **근거**: viewer 파이프라인(`src/markdown/preview.ts`), editor 파이프라인(`src/editor/customEditor.ts`), E2E fixture(`test/fixtures/`), E2E 테스트(`test/e2e/`)가 모두 이 패키지에 집중되어 있다.

## 구현 방향

- **파이프라인 주입**: `preview.ts` 75번 줄의 `createForm()` 호출에 `additionalModules: [customComponents]`를 추가한다. `customEditor.ts`는 stub에서 실 구현으로 전환하여 `createFormEditor({ container, schema, additionalModules: [customComponents] })`를 호출하고, VSCode postMessage 핸들링(`edit-opened` 수신, `save-schema` 발신)을 포함한다.
- **i18n**: 신규 `src/components/i18n.ts`에서 `designer-i18n`의 `createKoT` 기반 `t()` 함수를 export하고, 네 렌더러(Tabs/Card/Stack/Modal)의 가시 문자열을 `t('components.<type>.<key>')` 키로 교체한다. `designer-i18n/locales/ko.json`에 `components.*` 키군을 추가하고, CI에서 `i18n-check.mjs`로 누락 키 0을 검증한다.
- **E2E fixture 5종**: 신규 fixture 4종(`tabs-single.md`, `card-stack-nested.md`, `modal-trigger.md` 신규 추가, `mixed-layout.md`는 TSK-05-03이 생성)과 기존 WP-01 fixture 3종을 포함하는 통합 E2E 테스트 파일을 작성한다.
- **픽셀 파리티**: `ssim.js`로 viewer webview와 designer editor webview를 동일 스키마에서 768×576 캡처 후 SSIM ≥ 0.99를 gate로 검증한다.

## 파일 계획

**경로 기준:** 모든 파일 경로는 **프로젝트 루트 기준**으로 작성한다.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-vscode-extension/src/markdown/preview.ts` | `createForm()` 호출에 `additionalModules: [customComponents]` 추가 | 수정 |
| `packages/designer-vscode-extension/src/editor/customEditor.ts` | stub → `createFormEditor({ additionalModules: [customComponents] })` 실 구현, postMessage 계약 포함 | 수정 |
| `packages/designer-vscode-extension/src/components/i18n.ts` | 컴포넌트 전용 `t()` wrapper — `designer-i18n` `createKoT` 기반 | 신규 |
| `packages/designer-vscode-extension/src/components/TabsRenderer.tsx` | `t('components.tabs.*')` 키 적용 | 수정 |
| `packages/designer-vscode-extension/src/components/CardRenderer.tsx` | `t('components.card.*')` 키 적용 | 수정 |
| `packages/designer-vscode-extension/src/components/StackRenderer.tsx` | `t('components.stack.*')` 키 적용 | 수정 |
| `packages/designer-vscode-extension/src/components/ModalRenderer.tsx` | `t('components.modal.*')` 키 적용 | 수정 |
| `packages/designer-i18n/locales/ko.json` | `components.*` 키군 추가 (Card/Stack/Tabs/Modal 가시 문자열) | 수정 |
| `packages/designer-vscode-extension/test/fixtures/tabs-single.md` | fixture 1: tabs 단독 스키마 | 신규 |
| `packages/designer-vscode-extension/test/fixtures/card-stack-nested.md` | fixture 2: card+stack 중첩 스키마 | 신규 |
| `packages/designer-vscode-extension/test/fixtures/modal-trigger.md` | fixture 3: modal trigger+open 스키마 | 신규 |
| `packages/designer-vscode-extension/test/fixtures/mixed-layout.md` | fixture 4: tabs 내부 card+stack 혼합 (TSK-05-03 생성, 본 Task에서 재사용) | 수정(또는 신규) |
| `packages/designer-vscode-extension/test/e2e/components-integration.test.ts` | E2E: fixture 5종 렌더 + axe 0 + "not supported" 오류 소멸 + round-trip | 신규 |
| `packages/designer-vscode-extension/test/e2e/pixel-parity.test.ts` | 픽셀 파리티 전용: viewer vs designer 768×576 SSIM ≥ 0.99 | 신규 |
| `packages/designer-vscode-extension/scripts/assert-i18n-coverage.mjs` | CI: `i18n-check.mjs` 래퍼, exit code 비 0 시 CI fail | 신규 |
| `packages/designer-vscode-extension/package.json` | `scripts.test:e2e` CI 구성에 i18n-check + pixel-parity 스텝 추가 | 수정 |

> 이 Task는 라우터·메뉴 시스템이 없는 VSCode webview 구조이므로 router/menu 파일 항목은 해당 없다. `package.json`의 `contributes.markdown.preview` + `contributes.customEditors` 설정이 이 확장의 진입 배선 역할을 한다.

## 진입점 (Entry Points)

이 Task는 **비-페이지 UI** (VSCode webview, 라우트·메뉴 시스템 없음)이다. 진입 경로는 두 가지이다.

- **사용자 진입 경로**: VSCode에서 `.md` 파일 열기 → Markdown 미리보기(`Cmd+Shift+V`) → `preview.ts`가 `createForm({ additionalModules: [customComponents] })`로 블록 마운트. 또는: Markdown 미리보기 우상단 ✏️ 버튼 클릭 → Custom Editor 패널 오픈 → `customEditor.ts`가 `createFormEditor({ additionalModules: [customComponents] })`로 마운트
- **URL / 라우트**: VSCode webview 내부 (`vscode-webview://` 프로토콜) — 외부 라우트 없음
- **수정할 라우터 파일**: 해당 없음(라우팅 없는 웹뷰 구조). 컴포넌트 주입은 `packages/designer-vscode-extension/src/markdown/preview.ts`의 `createForm()` 호출부와 `src/editor/customEditor.ts`의 `createFormEditor()` 호출부가 담당
- **수정할 메뉴·네비게이션 파일**: 해당 없음. 사용자는 Markdown 펜스 블록 type으로 컴포넌트를 선택하며, CI 배선은 `packages/designer-vscode-extension/package.json`의 `scripts.test:e2e`로 연결
- **연결 확인 방법**: E2E 테스트에서 `markdown.showPreviewToSide` 커맨드로 `tabs-single.md`를 열어 `.fj-tabs` 요소 존재, "form field of type tabs not supported" 오류 소멸을 확인. URL 직접 입력(`page.goto`) 금지

## 주요 구조

1. **`preview.ts` 수정**: `createForm({ container, schema, properties: { readOnly: true }, additionalModules: [customComponents] })`로 변경. `customComponents`는 `src/components/index.ts`에서 import.

2. **`customEditor.ts` 실 구현**: `@bpmn-io/form-js-editor`의 `createFormEditor()` 호출 + `additionalModules: [customComponents]` 주입. VSCode `acquireVsCodeApi()` postMessage 핸들링: `edit-opened` 수신 시 스키마 로드, `save-schema` 발신 시 WorkspaceEdit으로 원본 블록 갱신.

3. **`i18n.ts` 신규**: `designer-i18n`의 `createKoT(koDict)` 패턴으로 컴포넌트 전용 `t(key: string): string` 함수 export. 네 렌더러가 import하여 가시 문자열에 적용.

4. **E2E `components-integration.test.ts`**: `@vscode/test-electron`으로 VSCode 인스턴스를 시작, fixture 5종에 대해 `markdown.showPreviewToSide` 커맨드 → DOM 요소 존재 assert → axe 스캔 → "not supported" 오류 문자열 부재 → 인터랙션 검증(탭 클릭, modal 열기/닫기).

5. **E2E `pixel-parity.test.ts`**: viewer webview와 Custom Editor webview를 동일 tabs 스키마로 각각 768×576 캡처 → `ssim.js`로 SSIM 계산 → ≥ 0.99 assert. anti-aliasing 무시 옵션 적용.

## 데이터 흐름

```
스키마 JSON (fixture .md 내)
  → preview.ts: createForm({ additionalModules: [customComponents] })
      → TabsRenderer/CardRenderer/StackRenderer/ModalRenderer dispatch
      → t('components.*') 키로 i18n 문자열 렌더
  → DOM 렌더 완료

✏️ 클릭 → request-edit postMessage
  → customEditor.ts: createFormEditor({ additionalModules: [customComponents] })
  → 저장 시 save-schema → WorkspaceEdit.replace → 원본 .md 블록 교체 (round-trip)
```

## 설계 결정 (대안이 있는 경우만)

### SSIM 라이브러리 선택
- **결정**: `ssim.js` 사용
- **대안**: `pixelmatch` (픽셀 단위 diff 수치 반환)
- **근거**: SSIM은 0~1 스칼라를 반환하므로 "SSIM ≥ 0.99" AC를 직접 assert하기 용이. pixelmatch는 다른 픽셀 수를 반환해 해상도 의존적 임계값이 필요.

### customEditor.ts 실 구현 범위
- **결정**: stub → 실 구현 전환 (TSK-05-04에서 담당)
- **대안**: TSK-02-01 완료 후 별도 Task에서 구현
- **근거**: `depends: TSK-05-02, TSK-05-03, TSK-02-01` 명시 + AC에 round-trip 무손실 검증 포함. TSK-02-01 design.md를 참조하여 API 계약 추출; 미완료 시 stub assertion + TODO 표기.

## 선행 조건

- **TSK-05-02 완료**: `TabsRenderer`, `TabPanelRenderer`, `src/components/index.ts` tabs 등록
- **TSK-05-03 완료**: `CardRenderer`, `StackRenderer`, `ModalRenderer`, `src/components/index.ts` card/stack/modal 등록
- **TSK-02-01 설계 확인**: `customEditor.ts`의 `createFormEditor()` API 시그니처 및 postMessage 계약
- **`designer-i18n` `createKoT` export 확인**: `packages/designer-i18n/src/createKoT.ts` 존재 필요
- **`ssim.js` devDependency**: `packages/designer-vscode-extension/package.json`에 추가 필요

## 리스크

- **HIGH**: TSK-02-01이 미완료라면 `createFormEditor()` API 시그니처 미확정 → `customEditor.ts` 실 구현 불가. Build 단계에서 TSK-02-01 design.md 참조 후 미완료 확인 시 stub + TODO로 대체, AC round-trip 항목 조건부 스킵.
- **HIGH**: `@vscode/test-electron`으로 webview 내부 DOM에 직접 접근하는 것은 구조적 제약이 있다. 현재 패턴인 `test-mount-complete` postMessage 브릿지를 통한 간접 검증 방식을 유지해야 한다. 픽셀 파리티는 headless 브라우저 mock webview 방식 필요.
- **MEDIUM**: `ssim.js`의 ESM/CJS 호환 문제 (Node.js 20 + `"type":"commonjs"` 환경). CJS 빌드 또는 dynamic import로 대응.
- **MEDIUM**: viewer와 editor 렌더 타이밍 차이로 SSIM 오차 발생 가능. `waitForElement` 패턴으로 렌더 완료 대기 후 캡처, 재시도 로직 포함.
- **MEDIUM**: `designer-i18n` 정적 추출기가 `packages/designer-vscode-extension/src/components/` 경로를 스캔 대상에 포함하는지 확인 필요. 미포함 시 `i18n-check.mjs` 스캔 경로에 추가.
- **LOW**: `additionalModules` 추가 후 기존 WP-01 fixture에서 form-js 내부 이벤트/훅 충돌 가능. 단위 테스트로 사전 확인.

## QA 체크리스트

### 파이프라인 주입
- [ ] `tabs-single.md` 미리보기 렌더 시 콘솔에 "form field of type tabs not supported" 오류가 출력되지 않는다
- [ ] `card-stack-nested.md` 미리보기 렌더 시 "form field of type card/stack not supported" 오류가 소멸한다
- [ ] `modal-trigger.md` 미리보기 렌더 시 "form field of type modal not supported" 오류가 소멸한다
- [ ] Custom Editor를 열면 팔레트에 card/stack/tabs/modal 항목이 노출된다

### Fixture 5종 E2E
- [ ] (fixture 1) `tabs-single.md` 미리보기에서 `.fj-tabs` 요소가 DOM에 존재하고 탭 버튼 클릭 시 패널이 전환된다
- [ ] (fixture 2) `card-stack-nested.md` 미리보기에서 `.fjs-card` 내부에 `.fjs-stack`이 존재한다
- [ ] (fixture 3) `modal-trigger.md` 미리보기에서 trigger 버튼 클릭 → `dialog[open]` 출현 → Esc 키 → `dialog[open]` 소멸
- [ ] (fixture 4) `mixed-layout.md` 미리보기에서 tabs > card > stack 구조가 렌더 오류 없이 표시된다
- [ ] (fixture 5 회귀) WP-01 fixture 3종(`single-block.md`, `multi-block.md`, `multi-block-with-invalid.md`)이 커스텀 모듈 주입 후에도 동일하게 렌더된다

### 접근성
- [ ] 5종 fixture 각각에서 axe serious/critical violation 0

### i18n
- [ ] `node packages/designer-i18n/bin/i18n-check.mjs` 실행 결과 exit code 0 (누락 키 0)
- [ ] `ko.json`에 `components.tabs.*`, `components.card.*`, `components.stack.*`, `components.modal.*` 키군이 존재한다
- [ ] CI `test:e2e` job에서 i18n-check step fail 시 전체 job이 fail한다

### 픽셀 파리티
- [ ] 동일 tabs 스키마 768×576 캡처에서 viewer webview와 designer editor의 SSIM ≥ 0.99이다
- [ ] 픽셀 diff 계산 시 anti-aliasing 무시 옵션이 적용된다
- [ ] SSIM < 0.99 또는 픽셀 diff > 1% 시 테스트가 fail한다

### Round-trip
- [ ] viewer에서 tabs 스키마 렌더 → ✏️ 버튼으로 editor 열기 → 필드 추가 → 저장 → 원본 `.md` 블록 JSON이 변경된다
- [ ] 저장 후 블록의 펜스 외 영역(마크다운 텍스트)은 바이트 단위로 동일하다

### 회귀
- [ ] WP-01 M1 fixture 3종 + WP-02 편집 fixture 4종이 `additionalModules` 주입 후에도 동일하게 동작한다

### 통합 케이스 (E2E — dev-test reachability gate)
- [ ] (클릭 경로) VSCode에서 `tabs-single.md` 파일을 열고, `markdown.showPreviewToSide` 커맨드를 통해 미리보기 패널에 도달한다 (URL 직접 입력 금지)
- [ ] (화면 렌더링) 핵심 UI 요소(탭 헤더, Card border, Stack flex, Modal trigger 버튼)가 브라우저에서 실제 표시되고 기본 상호작용이 동작한다
