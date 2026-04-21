# TSK-03-04: Playwright E2E 스모크 - 설계

## 요구사항 확인

- TSK-03-03에서 생성한 `packages/designer-notion-adapter/sample/index.html` 샘플 페이지를 대상으로 Playwright 스모크 E2E 2건을 작성한다.
- spec 1: 샘플 페이지 접속 → "블록 삽입" 버튼 클릭 → form-js viewer 렌더 확인 스크린샷 (viewer-mount)
- spec 2 (편집 지원): viewer 렌더 후 "스키마 편집" 버튼 클릭 → SchemaEditor textarea에 새 JSON 입력 → 저장 → 폼 재렌더 확인 스크린샷 (edit-save-rerender)
- 스크린샷 아티팩트는 `docs/vscode-ext/features/notion-adapter/brw-*.png` 경로에 저장. 자격 증명(BASE_URL 등)은 환경변수로 분리하여 CI secret으로 주입 가능하게 한다.

## 타겟 앱

- **경로**: `packages/designer-notion-adapter` (TSK-03-03에서 신설, E2E spec 파일 추가)
- **근거**: E2E 대상이 `designer-notion-adapter` 패키지의 sample 페이지이며, 기존 `test/e2e/` 디렉터리에 spec 파일을 배치하는 것이 모노레포 컨벤션에 부합한다.

## 구현 방향

1. `packages/designer-notion-adapter/test/e2e/` 하위에 `smoke.spec.ts`를 작성한다. TSK-03-03 설계의 `viewer.spec.ts`와 별도 파일로 추가한다 (smoke 시나리오 2건 집중).
2. BASE_URL은 `process.env.NOTION_VIEWER_BASE_URL ?? pathToFileURL(path.resolve(__dirname, '../../sample/index.html')).href` 로 플랫폼 대응. CI에서는 환경변수로 사내 뷰어 URL을 주입한다.
3. `packages/designer-notion-adapter/playwright.config.ts`에서 `testDir`, `outputDir`(스크린샷 아티팩트 경로)을 `../../docs/vscode-ext/features/notion-adapter/`로 설정한다.
4. 스크린샷은 `page.screenshot({ path: '...' })` 으로 `brw-viewer-mount.png`, `brw-edit-save.png` 두 파일을 생성한다.
5. 패키지에 `test:e2e:smoke` 스크립트를 추가하고, 루트 `package.json`에도 alias를 추가한다.

## 파일 계획

**경로 기준:** 모든 파일 경로는 프로젝트 루트 기준.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-notion-adapter/test/e2e/smoke.spec.ts` | Playwright E2E 스모크 spec 2건: viewer-mount, edit-save-rerender | 신규 |
| `packages/designer-notion-adapter/playwright.config.ts` | Playwright 설정: testDir, outputDir(`docs/vscode-ext/features/notion-adapter/`), BASE_URL 환경변수 처리, 브라우저 설정 | 신규 |
| `packages/designer-notion-adapter/package.json` | `test:e2e:smoke` 스크립트 추가 (`playwright test --config playwright.config.ts`), devDependencies에 `@playwright/test` 추가 | 수정 |
| `package.json` (루트) | `test:e2e:smoke` alias: `npm -w @form-js-designer/designer-notion-adapter run test:e2e:smoke` | 수정 |

## 진입점 (Entry Points)

N/A — domain=test, 비-UI Task.

## 주요 구조

- **`smoke.spec.ts` > `'viewer-mount' test`**: `page.goto(BASE_URL)` → `[data-testid="insert-block"]` 버튼 클릭 → `.form-js-block .fjs-container` 요소 출현 대기(`waitForSelector`) → `page.screenshot({ path: '...brw-viewer-mount.png' })` → 셀렉터 존재 assert.
- **`smoke.spec.ts` > `'edit-save-rerender' test`**: viewer-mount 선행 → `[data-testid="edit-schema"]` 버튼 클릭 → textarea에 새 스키마 JSON 입력(`page.fill`) → `[data-testid="save-schema"]` 버튼 클릭 → form-js viewer가 재렌더되어 새 필드가 DOM에 나타나는지 확인(`waitForSelector`) → `page.screenshot({ path: '...brw-edit-save.png' })`.
- **`playwright.config.ts`**: `use.baseURL = NOTION_VIEWER_BASE_URL (또는 file:// fallback)`, `outputDir = '../../docs/vscode-ext/features/notion-adapter'`, `reporter: [['html'], ['dot']]`, `testDir: './test/e2e'`, chromium args `['--allow-file-access-from-files']`.
- **BASE_URL 헬퍼**: `process.env.NOTION_VIEWER_BASE_URL ?? pathToFileURL(path.resolve(__dirname, 'sample/index.html')).href` — 로컬에서는 file:// 프로토콜로 동작, CI에서는 사내 뷰어 URL 주입.

## 데이터 흐름

입력: 샘플 페이지(file:// 또는 사내 뷰어 URL) → 처리: Playwright 브라우저가 클릭 시퀀스 실행 → 출력: pass/fail 결과 + `docs/vscode-ext/features/notion-adapter/brw-*.png` 스크린샷 아티팩트.

## 설계 결정 (대안이 있는 경우만)

- **결정**: 기존 `test/e2e/viewer.spec.ts`(TSK-03-03)와 별도로 `smoke.spec.ts` 신규 작성
- **대안**: viewer.spec.ts에 smoke 케이스를 병합
- **근거**: smoke spec은 CI 빠른 피드백 전용으로 별도 파일로 격리하면 파일 단위 선택 실행 가능. TSK-03-03 spec과 독립성 유지.

- **결정**: 스크린샷 저장 경로를 `docs/vscode-ext/features/notion-adapter/` (acceptance 기준)로 설정
- **대안**: `packages/designer-notion-adapter/test-results/`에 저장
- **근거**: acceptance 조건에서 `docs/vscode-ext/features/notion-adapter/brw-*.png`를 명시했으므로 해당 경로 준수.

- **결정**: BASE_URL을 환경변수로 분리하고 file:// fallback 제공
- **대안**: playwright.config.ts에 하드코딩
- **근거**: CI secret 주입 요건(constraints)을 충족하면서 로컬 개발 시 의존성 없이 실행 가능.

## 선행 조건

- **TSK-03-03 완료 필수**: `packages/designer-notion-adapter/sample/index.html`과 `genericMount`, `FormJsViewerBlock` 컴포넌트가 존재해야 한다. spec에서 `[data-testid="insert-block"]`, `[data-testid="edit-schema"]`, `[data-testid="save-schema"]` 셀렉터를 사용하므로, TSK-03-03 구현 시 해당 `data-testid` 속성이 샘플 페이지와 컴포넌트에 추가되어야 한다.
- `@playwright/test` 패키지가 `packages/designer-notion-adapter/devDependencies`에 설치되어 있어야 한다.
- 로컬 실행 시: `npx playwright install chromium` 선행 필요.
- CI 실행 시: `NOTION_VIEWER_BASE_URL` 환경변수에 사내 뷰어 인증 포함 URL 주입.

## 리스크

- **HIGH**: TSK-03-03의 샘플 페이지에 `data-testid` 속성이 없으면 smoke.spec.ts 셀렉터가 즉시 실패. 완화: 이 design.md의 선행 조건에 `data-testid` 목록을 명시하여 TSK-03-03 build 단계에서 반드시 추가하도록 한다.
- **HIGH**: file:// 프로토콜로 Playwright 접속 시 CORS/CSP 제약 발생 가능. 완화: `playwright.config.ts`에서 chromium `args: ['--allow-file-access-from-files']` 옵션 추가.
- **MEDIUM**: 사내 뷰어 BASE_URL이 CI secret이어서 로컬 검증 시 file:// fallback만 가능. 완화: smoke spec 2건 모두 file:// 환경에서 통과 확인 후 CI 머지.
- **MEDIUM**: form-js viewer 비동기 마운트 타이밍으로 `waitForSelector` timeout 발생 가능. 완화: timeout 10_000ms, `waitForSelector('.fjs-container', { state: 'visible' })` 사용.
- **LOW**: Windows 경로 구분자 문제로 file:// URL 생성 오류 가능. 완화: `pathToFileURL` (Node.js `url` 모듈) 사용.

## QA 체크리스트

- [ ] (정상) `smoke.spec.ts 'viewer-mount'` — 샘플 페이지 접속 → "블록 삽입" 버튼 클릭 → `.form-js-block .fjs-container`가 DOM에 visible 상태로 렌더됨 → `brw-viewer-mount.png` 파일이 `docs/vscode-ext/features/notion-adapter/` 경로에 생성됨
- [ ] (정상) `smoke.spec.ts 'edit-save-rerender'` — viewer 렌더 후 "스키마 편집" 클릭 → SchemaEditor textarea에 새 스키마 JSON 입력 → "저장" 클릭 → 새 스키마 기반 폼 필드가 DOM에 나타남 → `brw-edit-save.png` 파일이 생성됨
- [ ] (엣지) BASE_URL 환경변수 미설정 시 file:// fallback이 동작하여 로컬에서 spec이 실행됨
- [ ] (엣지) viewer 마운트가 비동기로 지연될 때 `waitForSelector` 10초 timeout 안에 성공함
- [ ] (에러) 잘못된 스키마 JSON을 SchemaEditor에 입력하고 저장 시도 시 에러 메시지가 표시되고 viewer는 이전 상태를 유지함
- [ ] (통합) `npm run test:e2e:smoke` 명령으로 두 spec 모두 통과하고 exit code 0으로 종료됨
- [ ] (통합) CI 환경에서 `NOTION_VIEWER_BASE_URL` secret 주입 후 동일 spec이 사내 뷰어 URL에서 통과함 (로컬 검증은 file:// fallback으로 대체)
