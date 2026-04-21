# TSK-04-02: 접근성 (axe) + 테마 전환 E2E - 설계

## 요구사항 확인

- 미리보기(Markdown Preview) 및 Custom Editor 양쪽 웹뷰에서 `axe-core`로 접근성 스캔을 실행하여 serious/critical violation 0개를 보장한다.
- VSCode `workbench.colorTheme` 설정 API를 이용해 다크 → 라이트 → High Contrast 3가지 테마로 순차 전환하고, 각 테마에서 스크린샷을 자동 캡처하여 결과물로 저장한다.
- `@vscode/test-electron` 통합 환경 + Playwright visible 보완 테스트 두 레이어로 검증한다.

## 타겟 앱

- **경로**: `packages/designer-vscode-extension`
- **근거**: VSCode 확장 패키지에서 웹뷰 접근성과 테마 전환이 발생하므로 해당 패키지가 타겟이다.

## 구현 방향

- `test/integration/suite/` 하위에 `a11y.test.ts`(axe 통합)와 `themeSwitch.test.ts`(테마 전환) 두 파일을 추가한다.
- `test/e2e/` 하위에 `a11y-axe.test.ts`(axe E2E 보완)와 `theme-switch.test.ts`(테마 전환 E2E 보완)를 추가한다.
- `@vscode/test-electron` 환경에서 webview DOM 직접 접근이 제한되므로, `src/testBridge.ts`에 axe 결과를 webview → extension host로 postMessage 중계하는 인터페이스를 추가한다 (`FORM_JS_TEST_MODE=1` 시에만 활성화).
- Playwright visible 보완 테스트에서는 `@axe-core/playwright`를 직접 사용한다.

## 파일 계획

**경로 기준:** 모든 파일 경로는 프로젝트 루트 기준으로 작성한다.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-vscode-extension/test/integration/suite/a11y.test.ts` | axe 스캔 통합 테스트 — 미리보기 + Custom Editor 각각에서 axe violation 0 검증 | 신규 |
| `packages/designer-vscode-extension/test/integration/suite/themeSwitch.test.ts` | 테마 전환 E2E — 다크/라이트/HC 3가지 테마 전환 + 스크린샷 저장 | 신규 |
| `packages/designer-vscode-extension/test/e2e/a11y-axe.test.ts` | Playwright visible 보완 axe E2E 테스트 (`@axe-core/playwright` 직접 사용) | 신규 |
| `packages/designer-vscode-extension/test/e2e/theme-switch.test.ts` | Playwright visible 보완 테마 전환 스크린샷 테스트 | 신규 |
| `packages/designer-vscode-extension/src/testBridge.ts` | FORM_JS_TEST_MODE=1 시 webview 내 axe 결과를 extension host로 postMessage 중계하는 bridge 확장 | 수정 |
| `packages/designer-vscode-extension/test/fixtures/screenshots/.gitkeep` | 테마별 스크린샷 저장 디렉토리 생성용 | 신규 |
| `packages/designer-vscode-extension/package.json` | `@axe-core/playwright`, `axe-core` devDependency 추가; `test:a11y` 스크립트 추가 | 수정 |

## 진입점 (Entry Points)

domain=test — 테스트 인프라 Task이므로 UI 라우터/네비게이션 연결 없음. N/A.

## 주요 구조

1. **`AxeWebviewBridge`** (`src/testBridge.ts` 확장): `FORM_JS_TEST_MODE=1` 환경에서 webview가 로드될 때 `axe-core` 스크립트를 동적 추가 주입. 스캔 완료 시 `postMessage({ type: 'axe-result', violations })` 전송 → extension host에서 Promise resolve.

2. **`A11ySuite`** (`test/integration/suite/a11y.test.ts`): Mocha suite. `openFixturePreview()`로 미리보기 열기 → `waitForAxeResult(timeout=15000)`로 결과 수신 → `assert.strictEqual(criticalAndSerious.length, 0)` 검증. Custom Editor는 `vscode.commands.executeCommand('vscode.openWith', uri, 'form-js.block-editor')` 진입.

3. **`ThemeSwitchSuite`** (`test/integration/suite/themeSwitch.test.ts`): `workbench.colorTheme` 설정을 순차 변경 (`Default Dark Modern` → `Default Light Modern` → `Default High Contrast`). 각 전환 후 2000ms 대기 → 스크린샷 캡처 → `test/fixtures/screenshots/theme-{kind}.png` 저장.

4. **`AxeE2ETest`** (`test/e2e/a11y-axe.test.ts`): `@axe-core/playwright`를 사용하여 webview URL에 직접 axe 스캔 실행. serious/critical violation 0 assertion.

5. **`ThemeSwitchE2E`** (`test/e2e/theme-switch.test.ts`): Playwright visible 테스트에서 테마별 CSS 변수(`--vscode-editor-background`)가 변경됨을 확인 + 3종 스크린샷 저장.

## 데이터 흐름

입력: VSCode webview(미리보기 / Custom Editor) → axe-core 스캔 실행 → postMessage 중계 → Mocha assertion.
테마 전환: `workbench.colorTheme` 변경 명령 → 2000ms 대기 → 스크린샷 캡처 → PNG 파일 저장.

## 설계 결정 (대안이 있는 경우만)

- **결정**: `@vscode/test-electron` 통합 테스트에서 `axe-core` 직접 + webview postMessage 중계 패턴 사용
- **대안**: `@axe-core/playwright`를 통합 테스트에서 직접 사용
- **근거**: `@vscode/test-electron` 환경에서는 Playwright context가 없어 webview DOM 직접 접근 불가 — postMessage 중계가 유일하게 신뢰성 있는 방법. Playwright visible E2E 보완 테스트에서는 `@axe-core/playwright`를 직접 사용한다.

- **결정**: 테마 전환 스크린샷을 `test/fixtures/screenshots/` 에 저장
- **대안**: CI artifact 전용 경로에 직접 저장
- **근거**: 기존 fixtures 디렉토리 구조와 일관성 유지. CI artifact 업로드 경로 설정은 별도 CI 설정에서 처리한다.

## 선행 조건

- TSK-04-01: `.vsix` 빌드 파이프라인 완료 (빌드 환경 확립 전제)
- TSK-01-04: `@vscode/test-electron` 통합 환경 구성 완료 (이미 존재)
- `axe-core` 및 `@axe-core/playwright` devDependency 추가 필요
- `src/testBridge.ts` 파일이 이미 존재 (수정 대상)

## 리스크

- **HIGH**: `@vscode/test-electron` 환경에서 webview DOM에 직접 접근 불가 — axe 결과를 postMessage로 중계하는 구조가 없으면 테스트 불가. `testBridge.ts` 확장이 미구현 시 통합 테스트 전체 블록.
- **HIGH**: 테마 전환 API가 `@vscode/test-electron` headless 환경에서 DOM CSS 변경을 즉시 트리거하지 않을 수 있음 — Playwright visible 보완 테스트로 반드시 병행 검증.
- **MEDIUM**: `axe-core`를 webview에 런타임 주입 시 CSP(Content Security Policy) 위반 가능성 — `FORM_JS_TEST_MODE=1`일 때만 nonce 방식으로 CSP 완화 필요.
- **MEDIUM**: headless 환경에서 스크린샷이 빈 화면으로 캡처될 수 있음 — Playwright visible 모드 보완 테스트 필수.
- **LOW**: `screenshots/` 디렉토리가 `.gitignore`에 포함될 경우 CI artifact 업로드 설정 별도 필요.

## QA 체크리스트

- [ ] (정상) 미리보기 웹뷰(`markdown.showPreviewToSide`)를 열면 axe 스캔 결과에서 `critical`/`serious` violation이 0개이다.
- [ ] (정상) Custom Editor 웹뷰(`vscode.openWith` + `form-js.block-editor`)를 열면 axe 스캔 결과에서 `critical`/`serious` violation이 0개이다.
- [ ] (정상) 테마를 `Default Dark Modern`으로 설정 후 스크린샷이 `theme-dark.png`로 저장된다.
- [ ] (정상) 테마를 `Default Light Modern`으로 설정 후 스크린샷이 `theme-light.png`로 저장된다.
- [ ] (정상) 테마를 `Default High Contrast`로 설정 후 스크린샷이 `theme-hc.png`로 저장된다.
- [ ] (정상) 3가지 테마 전환 E2E 테스트 스위트가 오류 없이 통과한다.
- [ ] (엣지) axe가 `moderate`/`minor` violation만 보고할 때 테스트는 통과한다 (serious/critical만 실패 조건).
- [ ] (엣지) fixture가 빈 스키마(`{}`)일 때도 axe 스캔이 오류 없이 완료된다.
- [ ] (에러) axe postMessage 응답이 15초 내에 오지 않으면 테스트가 timeout error로 fail한다.
- [ ] (에러) 스크린샷 저장 경로가 없으면 디렉토리를 자동 생성 후 저장한다.
- [ ] (통합) Playwright visible 보완 테스트(`test/e2e/a11y-axe.test.ts`)에서 `@axe-core/playwright`로 동일한 axe serious/critical violation 0 결과를 확인한다.
- [ ] (통합) 테마 전환 시 CSS 변수(`--vscode-editor-background`)가 테마별로 달라짐을 Playwright visible 테스트에서 확인한다.
