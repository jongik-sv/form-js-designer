# TSK-01-04: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-vscode-extension/src/shared/messages.ts` | `BlockMountState`, `TestMountCompleteMessage` 타입 정의 | 신규 |
| `packages/designer-vscode-extension/src/testBridge.ts` | test bridge 인메모리 상태 관리 — `createTestMountState`, `updateMountState`, `getMountStateForUri`, `clearMountState` | 신규 |
| `packages/designer-vscode-extension/src/extension.ts` | test bridge 활성화 — `FORM_JS_TEST_MODE=1` 시 `form-js._test.getMountState` 커맨드 등록 | 수정 |
| `packages/designer-vscode-extension/src/markdown/preview.ts` | test bridge 발신 — `mountViewers()` 완료 후 `FORM_JS_TEST_BRIDGE` 조건으로 `postMessage({ type: 'test-mount-complete', blocks })` | 수정 |
| `packages/designer-vscode-extension/esbuild.config.mjs` | `FORM_JS_TEST_BRIDGE` define 추가 — `FORM_JS_TEST_MODE=1` 시 true, production은 false | 수정 |
| `packages/designer-vscode-extension/package.json` | `test:e2e` 스크립트 구현, `@vscode/test-electron`, `mocha`, `glob`, `@types/mocha` devDependency 추가 | 수정 |
| `packages/designer-vscode-extension/tsconfig.test.json` | 통합 테스트 빌드용 tsconfig (noEmit: false, integration 경로 포함) | 신규 |
| `packages/designer-vscode-extension/test/fixtures/multi-block-with-invalid.md` | 픽스처 2: 유효 블록 2개 + invalid JSON 블록 1개 | 신규 |
| `packages/designer-vscode-extension/test/fixtures/reload-test.md` | 픽스처 3: reload 후 재마운트 검증용 단일 블록 | 신규 |
| `packages/designer-vscode-extension/test/integration/runTests.ts` | `@vscode/test-electron` `runTests()` 진입점 | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-vscode-extension/test/integration/suite/index.ts` | Mocha suite 등록 — `*.test.js` glob import | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-vscode-extension/test/integration/suite/preview.test.ts` | 3개 통합 케이스 — 단일블록, 다중블록+invalid, reload 재마운트 | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-vscode-extension/test/integration/helpers/waitForElement.ts` | `waitForElement(fn, timeoutMs=15000)` 폴링 헬퍼 | 신규 |
| `packages/designer-vscode-extension/test/integration/helpers/openPreview.ts` | `openMarkdownPreview(uri)` — `markdown.showPreview` 래퍼 | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-vscode-extension/test/unit/testBridge.test.ts` | test bridge 단위 테스트 15개 | 신규 |
| `packages/designer-vscode-extension/test/unit/waitForElement.test.ts` | waitForElement 헬퍼 단위 테스트 7개 | 신규 |
| `packages/designer-vscode-extension/test/unit/preview.test.ts` | line 351 mock에 `importSchema` 추가 (타입 오류 수정) | 수정 |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 103 | 0 | 103 |

- 기존 87개 유지 (preview, lruCache, errorBanner, plugin, escapeHtml, preview-cache)
- 신규 testBridge: 15개 (createTestMountState, updateMountState, getMountStateForUri, clearMountState 시나리오)
- 신규 waitForElement: 7개 (즉시 resolve, 지연 resolve, 타임아웃, 폴링 간격, 기본 15s 타임아웃)

## E2E 테스트 (작성만 — 실행은 dev-test)

| 파일 경로 | 검증 대상 |
|-----------|-----------|
| `test/integration/suite/preview.test.ts` | Case 1: 단일 블록 (blocks.length===1, hasError===false) |
| `test/integration/suite/preview.test.ts` | Case 2: 다중 블록+invalid (유효 2개 hasError:false, invalid 1개 hasError:true) |
| `test/integration/suite/preview.test.ts` | Case 3: reload 후 재마운트 (blocks.length===1, 중복 없음) |

## 커버리지 (Dev Config에 coverage 정의 시)

N/A — Dev Config coverage 명령 미정의 (test:coverage는 있으나 Dev Config에 명시적 커버리지 게이트 없음)

## 비고

- **test bridge 설계 구현**: `postMessage` 발신(preview.ts) → `_testMountState` 업데이트(`testBridge.ts`) → `getMountState` 커맨드 조회(extension.ts) 3단계 구조. 실제 webview ↔ extension host 메시지 채널 연결은 실행 환경(headless VSCode)에서만 동작하며, 단위 테스트는 `testBridge.ts`의 순수 상태 관리 로직만 검증한다.
- **waitForElement 비동기 지원**: 통합 테스트가 `async fn()` (VSCode command 폴링)을 전달하므로 `Promise` 반환 함수도 지원하도록 구현했다. 단위 테스트는 동기 fn()으로만 검증한다.
- **esbuild build 선행 실패**: `watch` 옵션 이슈는 TSK-01-04 이전부터 존재하는 pre-existing 문제. TSK-01-04 변경과 무관하게 동일하게 실패함을 `git stash` + 재실행으로 확인했다.
- **production 격리**: `FORM_JS_TEST_BRIDGE: false` → esbuild가 `if (false) { ... }` dead code로 처리하여 test bridge postMessage가 production 번들에서 tree-shaking된다.
