# TSK-01-04: 통합 테스트 — 미리보기 렌더 경로 - 설계

## 요구사항 확인

- `@vscode/test-electron`으로 headless VSCode 인스턴스를 실행하여 `.md` 파일 열기 → Markdown 미리보기 열기 → `.form-js-block` DOM 마운트 여부를 assertion한다.
- 픽스처 3종(단일 블록, 다중 블록+invalid JSON 혼재, 미리보기 reload 후 재마운트)에 대해 CI `test:e2e` 스크립트가 3개 케이스 전부 통과한다.
- webview DOM은 extension host에서 직접 접근 불가하므로 "test bridge" 패턴(preview.ts → postMessage → extension host → 테스트 폴링)으로 마운트 상태를 노출하고, `waitForElement` 헬퍼(타임아웃 15s)로 flaky를 방지한다.

## 타겟 앱

- **경로**: `packages/designer-vscode-extension`
- **근거**: VSCode extension 통합 테스트이므로 extension 패키지 내부 `test/integration/`에 위치해야 하며, `@vscode/test-electron`이 해당 패키지 dist를 로드하여 실행한다.

## 구현 방향

- `test/integration/runTests.ts`에서 `@vscode/test-electron`의 `runTests()` API를 호출하여 VSCode 다운로드·실행 및 테스트 suite 등록을 처리한다.
- `test/integration/suite/preview.test.ts`에서 3개 케이스를 Mocha 기반으로 작성한다 (`@vscode/test-electron`은 Mocha runner를 내장한다).
- webview DOM 직접 접근 한계를 해소하기 위해 **test bridge** 패턴을 도입한다: preview.ts가 모든 블록을 마운트 완료하면 `acquireVsCodeApi().postMessage({ type: 'test-mount-complete', blocks: [...] })`를 발송하고, extension host가 `FORM_JS_TEST_MODE=1` 환경변수 존재 시 이를 수신하여 인메모리 상태에 저장한다. 테스트는 `vscode.commands.executeCommand('form-js._test.getMountState', uri)` 폴링으로 마운트 확인한다.
- `waitForElement(fn, timeout)` 헬퍼는 50ms 간격 폴링으로 `fn()` 반환값이 truthy가 될 때까지 최대 15s 대기한다.
- `test:e2e` npm 스크립트는 `FORM_JS_TEST_MODE=1 node dist/test/integration/runTests.js`로 실행한다.

## 파일 계획

**경로 기준:** 모든 파일 경로는 **프로젝트 루트 기준**으로 작성한다.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-vscode-extension/test/integration/runTests.ts` | `@vscode/test-electron` `runTests()` 진입점 — VSCode 다운로드, extensionDevelopmentPath, extensionTestsPath 설정 | 신규 |
| `packages/designer-vscode-extension/test/integration/suite/index.ts` | Mocha suite 등록 — `test/integration/suite/*.test.ts`를 glob import | 신규 |
| `packages/designer-vscode-extension/test/integration/suite/preview.test.ts` | 3개 통합 케이스 — 단일블록, 다중블록+invalid, reload 재마운트 | 신규 |
| `packages/designer-vscode-extension/test/integration/helpers/waitForElement.ts` | `waitForElement(fn, timeoutMs=15000)` 폴링 헬퍼 | 신규 |
| `packages/designer-vscode-extension/test/integration/helpers/openPreview.ts` | `openMarkdownPreview(uri)` — `vscode.commands.executeCommand('markdown.showPreview', uri)` 래퍼 | 신규 |
| `packages/designer-vscode-extension/test/fixtures/single-block.md` | 픽스처 1: 유효한 form-js 단일 블록 | 신규 |
| `packages/designer-vscode-extension/test/fixtures/multi-block-with-invalid.md` | 픽스처 2: 유효 블록 2개 + invalid JSON 블록 1개 | 신규 |
| `packages/designer-vscode-extension/test/fixtures/reload-test.md` | 픽스처 3: reload 후 재마운트 검증용 (단일 블록, single-block.md와 동일 구조) | 신규 |
| `packages/designer-vscode-extension/src/extension.ts` | test bridge 수신 로직 추가 — `FORM_JS_TEST_MODE=1` 시 webview 메시지 `test-mount-complete` 수신 → `_testMountState` 맵 업데이트 + `form-js._test.getMountState` 커맨드 등록 | 수정 |
| `packages/designer-vscode-extension/src/markdown/preview.ts` | test bridge 발신 로직 추가 — `FORM_JS_TEST_BRIDGE` 전역 변수(esbuild define으로 주입)가 true일 때 마운트 완료 시 `postMessage({ type: 'test-mount-complete', blocks })` | 수정 |
| `packages/designer-vscode-extension/src/shared/messages.ts` | `TestMountCompleteMessage` 타입 추가 | 수정 |
| `packages/designer-vscode-extension/package.json` | `test:e2e` 스크립트 추가: `FORM_JS_TEST_MODE=1 node dist/test/integration/runTests.js` | 수정 |
| `packages/designer-vscode-extension/esbuild.config.mjs` | `test bridge` 플래그 define 추가 — `FORM_JS_TEST_BRIDGE: process.env.FORM_JS_TEST_MODE === '1'` | 수정 |
| `packages/designer-vscode-extension/tsconfig.test.json` | 통합 테스트 빌드용 tsconfig (target: node18, paths: test/integration/**) | 신규 |

## 진입점 (Entry Points)

N/A — domain: test. 사용자 UI 진입 경로 없음. CI에서 `npm -w @form-js-designer/designer-vscode-extension run test:e2e` 명령으로 실행된다.

## 주요 구조

- **`runTests()` 진입점** (`test/integration/runTests.ts`): `@vscode/test-electron`의 `runTests({ extensionDevelopmentPath, extensionTestsPath, launchArgs: ['--disable-extensions', '--no-sandbox'] })`로 headless VSCode를 시작한다. `extensionDevelopmentPath`는 `packages/designer-vscode-extension`, `extensionTestsPath`는 컴파일된 `dist/test/integration/suite/index.js`를 가리킨다.

- **`waitForElement(fn, timeoutMs)`** (`helpers/waitForElement.ts`): `setInterval(50ms)` + `setTimeout(timeoutMs)` 패턴. `fn()`이 truthy 값을 반환하면 resolve, 타임아웃 도달 시 `TimeoutError('waitForElement timed out after ${timeoutMs}ms')` throw. 테스트 assert 전에 반드시 호출된다.

- **`openMarkdownPreview(uri)`** (`helpers/openPreview.ts`): `vscode.commands.executeCommand('markdown.showPreview', uri)`를 호출하고 preview panel이 등록될 때까지 짧은 딜레이(200ms)를 준다. reload 케이스에서는 동일 uri로 두 번째 호출하여 재열림을 시뮬레이션한다.

- **`getMountState` 커맨드** (`extension.ts` 내 test bridge): `vscode.commands.registerCommand('form-js._test.getMountState', (uri: string) => _testMountState.get(uri))`를 `FORM_JS_TEST_MODE` 환경변수 존재 시에만 등록. 반환값은 `{ blocks: Array<{ schemaId: string, hasError: boolean }> }`.

- **테스트 케이스 3종** (`preview.test.ts`):
  - Case 1 (단일 블록): `single-block.md` 열기 → `getMountState` 폴링 → `blocks.length === 1 && !blocks[0].hasError` 검증
  - Case 2 (다중 블록+invalid): `multi-block-with-invalid.md` 열기 → `blocks.length === 3` (유효 2 + invalid 1) → 유효 블록 2개 `hasError: false`, invalid 1개 `hasError: true` 검증
  - Case 3 (reload): `reload-test.md` 열기 → 마운트 확인 → preview close → preview 재열기 → 재마운트 확인 (중복 마운트 없음, `blocks.length === 1`)

## 데이터 흐름

입력: `test:e2e` 스크립트 실행 → headless VSCode 기동, 픽스처 `.md` 열기, `markdown.showPreview` 명령 실행
처리: VSCode가 preview.js를 webview에 로드 → preview.ts가 `.form-js-block` 마운트 → test bridge postMessage → extension host `_testMountState` 업데이트 → 테스트 `waitForElement`로 폴링
출력: Mocha `pass`/`fail` 결과, CI exit code 0(성공) 또는 1(실패)

## 설계 결정 (대안이 있는 경우만)

- **결정**: test bridge (postMessage → 커맨드 폴링) 방식으로 webview DOM 상태를 노출
- **대안**: Playwright CDP로 VSCode webview에 직접 attach하여 DOM `.form-js-block` 쿼리
- **근거**: CDP 연결은 VSCode 버전별 devtools port 번호가 달라 flaky가 크고, `--remote-debugging-port` 옵션이 headless 모드에서 항상 동작하지 않음. test bridge는 extension API 내부에서만 동작하므로 버전 독립적이고 안정적

---

- **결정**: `FORM_JS_TEST_MODE=1` 환경변수 + esbuild define(`FORM_JS_TEST_BRIDGE`)으로 test bridge 코드를 production에서 트리쉐이킹
- **대안**: test bridge 코드를 항상 포함
- **근거**: `.vsix` 번들 크기 ≤ 5MB 제약 준수 및 production 코드에서 테스트 전용 커맨드가 등록되지 않도록 보안 경계 유지

---

- **결정**: Mocha runner 사용 (`@vscode/test-electron` 내장)
- **대안**: Vitest로 통합 테스트 작성
- **근거**: `@vscode/test-electron`은 Mocha를 테스트 프레임워크로 내장한다. Vitest는 VSCode extension host 컨텍스트(= `vscode` API 사용 가능 환경)에서 실행하려면 별도 어댑터가 필요하여 복잡도 증가

## 선행 조건

- **TSK-01-03 완료**: LRU 캐시 + 오류 배너 구현 완료 (test bridge가 `hasError` 상태를 올바르게 보고하려면 preview.ts 에러 처리 로직이 구현되어 있어야 함)
- **TSK-01-01, TSK-01-02 완료**: `.form-js-block` 마운트 전체 경로가 동작해야 함
- **TSK-00-01 완료**: `packages/designer-vscode-extension` 패키지 스캐폴드, esbuild 설정, tsconfig
- `@vscode/test-electron` 패키지를 `devDependencies`에 추가
- CI 환경에 `xvfb` (Linux headless display) 또는 `--no-sandbox` 옵션으로 VSCode 실행 가능한 환경 필요

## 리스크

- **HIGH**: `@vscode/test-electron` 실행 시 headless Linux CI 환경에서 VSCode가 디스플레이 없이 실행되지 않을 수 있음. `xvfb-run` 래퍼 또는 `--no-sandbox --disable-gpu` 플래그가 필요하며, GitHub Actions의 `ubuntu-latest` 러너에서 사전 검증 필수
- **HIGH**: test bridge의 postMessage 수신 타이밍 — preview webview가 완전히 로드되기 전에 `getMountState`를 폴링하면 undefined 반환. `waitForElement` 타임아웃 15s가 충분한지는 실제 CI 환경에서 검증 필요 (느린 CI에서 form-js viewer 초기화가 15s를 초과할 수 있음)
- **MEDIUM**: `@vscode/test-electron`이 내려받는 VSCode 버전이 테스트 실행마다 최신으로 변경될 수 있어 API 변경에 취약. `@vscode/test-electron`의 `version` 고정 및 CI 캐시(`~/.vscode-test`) 설정 필요
- **MEDIUM**: test bridge 코드가 esbuild `define`으로 tree-shaking되지 않을 경우 production 번들에 포함될 수 있음. build 후 `dist/webview/preview.js`에 `test-mount-complete` 문자열이 없는지 CI에서 grep 검증 추가 권장
- **LOW**: 픽스처 `.md` 파일의 form-js JSON이 현재 `@bpmn-io/form-js-viewer` 버전과 호환되지 않으면 테스트가 false negative를 낼 수 있음. 최소 스키마(`{ "type": "default", "components": [] }`)를 사용하여 버전 의존성 최소화

## QA 체크리스트

- [ ] (정상 — 단일 블록) `single-block.md` 미리보기 열기 후 `getMountState`가 `blocks.length === 1`, `blocks[0].hasError === false`를 반환한다
- [ ] (정상 — 다중 블록) `multi-block-with-invalid.md` 미리보기에서 유효 블록 2개의 `hasError === false`가 확인된다
- [ ] (정상 — invalid 배너) `multi-block-with-invalid.md`의 invalid JSON 블록 1개는 `hasError === true`이고, 나머지 유효 블록 렌더에 영향을 주지 않는다
- [ ] (정상 — reload) `reload-test.md` 미리보기를 닫고 다시 열면 `getMountState`가 재설정되어 `blocks.length === 1`이 재확인되고 중복 마운트 없음이 확인된다
- [ ] (flaky 방지) `waitForElement` 헬퍼가 15s 타임아웃 내에 마운트 상태를 감지하며, 타임아웃 초과 시 명확한 `TimeoutError` 메시지가 출력된다
- [ ] (CI) `npm -w @form-js-designer/designer-vscode-extension run test:e2e`가 GitHub Actions `ubuntu-latest` 러너에서 exit code 0으로 완료된다
- [ ] (production 빌드 격리) `FORM_JS_TEST_MODE` 없이 빌드된 `dist/webview/preview.js`에 `test-mount-complete` 문자열이 포함되지 않는다
- [ ] (엣지 — 빈 스키마) `{ "type": "default", "components": [] }` 스키마는 오류 없이 마운트되고 `hasError === false`를 반환한다
- [ ] (에러 — 완전 무효 JSON) `{broken json` 블록은 `hasError === true`로 보고되고 테스트가 통과한다
- [ ] (통합 — WP-01 완료 게이트) 3개 케이스 전부 pass 시 WP-01 완료로 전이될 수 있음을 CI 로그에서 확인한다
