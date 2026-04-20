# WBS - vscode-ext (form-js Markdown Extension)

> version: 1.0
> description: form-js 스키마를 마크다운 본문에 임베드하고 뷰어에서 렌더링 + 인라인 편집까지 가능하게 하는 확장 번들. VSCode 계열 에디터와 사내 Notion-style 마크다운 뷰어 양쪽을 타깃으로 단일 `.vsix`로 배포.
> depth: 3
> start-date: 2026-04-20
> target-date: 2026-05-20
> updated: 2026-04-20

---

## Dev Config

### Domains
| domain | description | unit-test | e2e-test | e2e-server | e2e-url |
|--------|-------------|-----------|----------|------------|---------|
| backend | Extension host (Node) logic — blockLocator, formatJson, WorkspaceEdit wiring | `npm -w @form-js-designer/designer-vscode-extension run test:unit` | - | - | - |
| frontend | Webview UI (Preact + form-js viewer/editor, preview scripts, Custom Editor webview) | `npm -w @form-js-designer/designer-vscode-extension run test:unit` | `npm -w @form-js-designer/designer-vscode-extension run test:e2e` | - | - |
| fullstack | VSCode extension full path — extension host ↔ webview messaging, Custom Editor, markdown preview integration | - | `npm -w @form-js-designer/designer-vscode-extension run test:e2e` | - | - |
| infra | Build pipeline, esbuild bundle, `.vsix` packaging, CI hooks | - | - | - | - |
| test | Test harness, Vitest config, `@vscode/test-electron` runner | - | - | - | - |

### Design Guidance
| domain | architecture |
|--------|-------------|
| backend | Extension host 로직. TextDocument 버전과 WorkspaceEdit 적용 결과를 명시적으로 검증한다. 실패 시 자동 롤백 없음 — 사용자에게 에러 배너 노출. 외부에서 문서가 변경되면 버전 mismatch 경고. |
| frontend | Webview Preact. form-js는 단일 인스턴스 유지(루트 `overrides: preact 10.29.x`). CSS는 `contributes.markdown.previewStyles`로만 주입. 다크/라이트 테마는 `data-vscode-theme-kind` 속성을 구독해 동적 반응. 라우팅·메뉴 연결: 모든 사용자 진입은 Markdown 펜스 블록 또는 ✏️ 버튼 뿐 — 이 두 진입점은 같은 Task에서 함께 추가하고 직접 E2E로 검증한다. |
| fullstack | VSCode extension full path. Custom Editor 등록/해제는 `activate/deactivate`에서 idempotent하게 처리. Extension host ↔ webview 메시지는 `src/shared/messages.ts`의 타입으로 단일화. 같은 문서에 블록이 여러 개이면 한 번에 하나만 편집 모드(single-editor lock)로 제한. |

### Quality Commands
| name | command |
|------|---------|
| lint | `npm -w @form-js-designer/designer-vscode-extension run lint` |
| typecheck | `npm -w @form-js-designer/designer-vscode-extension run typecheck` |
| coverage | `npm -w @form-js-designer/designer-vscode-extension run test:coverage` |

### Cleanup Processes
node, vitest

---

## WP-00: 프로젝트 초기화 ✅
- schedule: 2026-04-20 ~ 2026-04-22
- description: `packages/designer-vscode-extension/` 패키지 스캐폴드, esbuild 이중 타깃(extension host + webview) 빌드, 공유 유틸·타입, CI smoke.

### TSK-00-01: 패키지 스캐폴드 + VSCode manifest + esbuild
- category: infrastructure
- domain: infra
- model: sonnet
- status: [xx]
- priority: critical
- assignee: -
- schedule: 2026-04-20 ~ 2026-04-20
- tags: setup, bundler, vsce
- depends: -
- blocked-by: -
- entry-point: -
- note: 이후 모든 Task의 선행 조건

#### PRD 요구사항
- prd-ref: PRD §6 F5, §9
- requirements:
  - `packages/designer-vscode-extension/package.json`에 VSCode contribution 메타(`activationEvents`, `contributes.markdown.*`, `contributes.customEditors`) + npm 패키지 메타 동시 선언
  - esbuild 이중 타깃: `dist/extension.cjs` (node18, vscode external) / `dist/webview/*.js` (browser, iife)
  - `tsconfig.json`을 루트 패키지 설정과 일치시키고 Preact 타입 연결
- acceptance:
  - `npm -w @form-js-designer/designer-vscode-extension run build` 성공 → `dist/extension.cjs`, `dist/webview/preview.js` 생성
  - `npx vsce package`로 `.vsix` 파일 빌드 성공 (크기 제약 검증은 WP-04)
  - 단일 Preact 인스턴스 게이트 (`scripts/ci/assert-single-preact.mjs`) 통과
- constraints:
  - `preact`, `@bpmn-io/form-js-viewer`, `@bpmn-io/form-js-editor`는 번들 내부 포함 (external 금지). `vscode`만 external
  - 모노레포 `workspaces` 유지 — 이 패키지 추가로 인한 루트 `package.json` 구조 변경 없음

#### 기술 스펙 (TRD)
- tech-spec:
  - esbuild ^0.24, TypeScript ^5.6, vscode types
  - 번들 산출: `dist/extension.cjs`, `dist/webview/preview.js`, `dist/webview/customEditor.js`
- api-spec: -
- data-model: -
- ui-spec: -

### TSK-00-02: 공유 유틸·타입 (schemaHash, messages, JSON 포맷 유틸)
- category: infrastructure
- domain: infra
- model: sonnet
- status: [xx]
- priority: high
- assignee: -
- schedule: 2026-04-21 ~ 2026-04-21
- tags: shared, utils, types
- depends: TSK-00-01
- blocked-by: -
- entry-point: -
- note: 이후 WP-01·WP-02가 공유

#### PRD 요구사항
- prd-ref: PRD §6 F1, F3
- requirements:
  - `src/shared/schemaHash.ts` — 스키마 JSON의 안정 해시(SHA-256 prefix 12자) 계산
  - `src/shared/messages.ts` — webview ↔ extension 메시지 타입(`request-edit`, `edit-opened`, `save-schema`, `save-result`, `source-updated`)
  - `src/editor/blockLocator.ts` — `mdStart/mdEnd`로 현재 TextDocument의 펜스 본문 `Range` 재탐지
  - `src/editor/workspaceEdit.ts` 내 `detectIndent`, `formatJson` (2/4-space 자동 맞춤)
- acceptance:
  - 동일 스키마 객체의 키 순서가 달라도 해시 동일
  - 펜스 블록이 재편집으로 라인 이동해도 blockLocator가 새 range를 반환
  - 들여쓰기 2/4-space를 올바르게 감지, 섞여있으면 우세값 채택
- constraints:
  - 외부 의존성 추가 금지 — Node 내장 `crypto`만 사용

#### 기술 스펙 (TRD)
- tech-spec:
  - TypeScript 순수 함수. 모든 함수에 Vitest 단위 테스트 + 해시 정책 문서 주석
- api-spec: -
- data-model: -
- ui-spec: -

### TSK-00-03: CI smoke — lint / typecheck / 빌드 / 단위 테스트 게이트
- category: infrastructure
- domain: infra
- model: sonnet
- status: [xx]
- priority: high
- assignee: -
- schedule: 2026-04-22 ~ 2026-04-22
- tags: ci, pipeline
- depends: TSK-00-01, TSK-00-02
- blocked-by: -
- entry-point: -
- note: WP-04 배포 게이트의 선행 뼈대

#### PRD 요구사항
- prd-ref: PRD §6 F5, §8
- requirements:
  - `.github/workflows/ci.yml`에 designer-vscode-extension 전용 job 추가 (lint, typecheck, test:unit, build)
  - 워크스페이스 실패 시 fail-fast
- acceptance:
  - PR 시 CI가 `designer-vscode-extension` 경로 변경 감지 → 위 4개 step 전부 실행
  - 기존 designer 서브프로젝트 CI 경로에 영향 없음
- constraints:
  - `vsce package`는 본 게이트에 포함하지 않음 (WP-04에서 서명·업로드와 함께 처리)

#### 기술 스펙 (TRD)
- tech-spec:
  - GitHub Actions. node 20, npm workspaces
- api-spec: -
- data-model: -
- ui-spec: -

---

## WP-01: Markdown 미리보기 렌더 (M1 MVP) ✅
- schedule: 2026-04-23 ~ 2026-04-29
- description: ` ```form-js ` 코드블록을 VSCode Markdown 미리보기에서 form-js-viewer로 렌더. read-only, submit no-op.

### TSK-01-01: markdown-it 플러그인 — form-js fence → placeholder
- category: development
- domain: fullstack
- model: sonnet
- status: [xx]
- priority: critical
- assignee: -
- schedule: 2026-04-23 ~ 2026-04-23
- tags: markdown-it, render
- depends: TSK-00-02
- blocked-by: -
- entry-point: Markdown 파일의 ` ```form-js ` 코드블록 (VSCode Markdown 미리보기 `Cmd+Shift+V`에서 표시)
- note: -

#### PRD 요구사항
- prd-ref: PRD §6 F1, F3
- requirements:
  - `info=form-js` 펜스만 감지, 그 외는 기본 fence 렌더에 위임
  - 본문 JSON 파싱, 실패 시 인라인 오류 배너 HTML 출력
  - `data-schema-id`, `data-md-start`, `data-md-end` 속성 주입
- acceptance:
  - ` ```form-js ` 블록 렌더 시 `.form-js-block` div + hidden `<pre class="form-js-source">` 생성
  - 잘못된 JSON 블록은 오류 배너만 출력되고 전체 preview 깨지지 않음 (블록 단위 try/catch)
  - 같은 문서에 블록 여러 개이면 각각 고유 `data-schema-id` 부여
- constraints:
  - XSS 방지: 본문은 반드시 `escapeHtml` 통과 후 hidden `<pre>`에 삽입

#### 기술 스펙 (TRD)
- tech-spec:
  - `contributes.markdown.markdownItPlugins: true` + `extension.ts`에서 `extendMarkdownIt` export
- api-spec: -
- data-model: -
- ui-spec:
  - `.form-js-block` 루트 컨테이너만 반환, 실제 form-js 렌더는 preview script 몫

### TSK-01-02: previewScripts — 웹뷰 내 form-js-viewer 마운트
- category: development
- domain: frontend
- model: sonnet
- status: [xx]
- priority: critical
- assignee: -
- schedule: 2026-04-24 ~ 2026-04-27
- tags: webview, viewer, preact
- depends: TSK-01-01
- blocked-by: -
- entry-point: VSCode "Markdown: Open Preview" (Cmd+Shift+V) — form-js 블록이 포함된 문서를 연 상태
- note: form-js-base.css 누락 시 컨테이너 h=0 주의

#### PRD 요구사항
- prd-ref: PRD §6 F1, §9
- requirements:
  - `dist/webview/preview.js`가 preview 로드 후 `.form-js-block`을 모두 찾아 `createForm({ container, schema })` 호출
  - CSS 주입: `form-js.css`, `form-js-base.css`, 확장 고유 `form-js-block.css` (`contributes.markdown.previewStyles`)
  - 다크/라이트 테마 자동 대응
- acceptance:
  - 10개 필드 스키마 블록의 첫 렌더 p95 < 500ms (로컬 dev)
  - 미리보기 재로드 시 viewer가 중복 마운트되지 않음 (기존 인스턴스 dispose 후 재생성)
  - 다크 테마 전환 시 배경/텍스트 색 즉시 반영
- constraints:
  - CDN 금지 — form-js 런타임·CSS는 번들 내부
  - 오프라인 환경에서 동일 동작

#### 기술 스펙 (TRD)
- tech-spec:
  - `@bpmn-io/form-js-viewer`, Preact 10.29.x single instance
  - CSS 원본 copy: build 시점에 `node_modules/@bpmn-io/form-js/dist/*.css`를 `media/`에 복사
- api-spec: -
- data-model: -
- ui-spec:
  - `.form-js-block` 내부에 viewer DOM 마운트. 최소 높이 40px 보장

### TSK-01-03: 스키마 해시 캐시 + JSON 파싱 실패 배너
- category: development
- domain: frontend
- model: sonnet
- status: [xx]
- priority: high
- assignee: -
- schedule: 2026-04-28 ~ 2026-04-28
- tags: cache, error-ui
- depends: TSK-01-02
- blocked-by: -
- entry-point: 동일 스키마가 여러 번 등장하는 Markdown 문서 미리보기
- note: -

#### PRD 요구사항
- prd-ref: PRD §6 F1, §8
- requirements:
  - 동일 `data-schema-id` 블록이 미리보기에 재등장하면 캐시된 viewer 인스턴스의 schema만 재적용 (LRU 크기 20)
  - JSON 파싱 실패 시 `.form-js-block--error` 배너 + 오류 메시지 렌더
- acceptance:
  - 같은 스키마 5개 포함 문서의 재렌더 시간이 1번째 대비 50% 이하
  - 파싱 실패 블록 1개가 있어도 다른 블록 정상 렌더
- constraints:
  - 캐시는 webview life cycle 내에서만 유효, 패널 재열림 시 초기화

#### 기술 스펙 (TRD)
- tech-spec:
  - LRU 자작 구현 또는 `Map` + manual eviction (외부 lib 추가 금지)
- api-spec: -
- data-model: -
- ui-spec:
  - 오류 배너: `⚠ Invalid form-js schema — {message}` (접근성: `role="alert"`)

### TSK-01-04: 통합 테스트 — 미리보기 렌더 경로
- category: infrastructure
- domain: test
- model: sonnet
- status: [xx]
- priority: high
- assignee: -
- schedule: 2026-04-29 ~ 2026-04-29
- tags: test, e2e, vscode-test
- depends: TSK-01-03
- blocked-by: -
- entry-point: -
- note: WP-01 완료 게이트

#### PRD 요구사항
- prd-ref: PRD §6 F1, §8
- requirements:
  - `@vscode/test-electron` 기반 통합 테스트: `.md` 열기 → preview 열기 → `.form-js-block` DOM 존재 확인
  - 샘플 문서 3종 (단일 블록, 다중 블록, 잘못된 JSON 포함)
- acceptance:
  - CI에서 `test:e2e`가 vscode 인스턴스를 띄워 3개 케이스 전부 통과
  - flaky 방지: 뷰어 마운트 대기에 `waitForElement` 사용, 타임아웃 15s
- constraints:
  - vscode headless 모드 (`--display-version` 등 표준 옵션)
- test-criteria:
  - 단일 블록 렌더 확인
  - 다중 블록 + 한 개 invalid JSON 혼재 — 유효 블록 렌더, invalid는 배너
  - 미리보기 reload 후 viewer 정상 재마운트

#### 기술 스펙 (TRD)
- tech-spec:
  - `@vscode/test-electron`, Playwright devtools 연동은 필요 시만
- api-spec: -
- data-model: -
- ui-spec: -

---

## WP-02: 인라인 편집 (M2)
- schedule: 2026-04-30 ~ 2026-05-08
- description: 뷰어 ✏️ 버튼 → Custom Editor webview에서 form-js-editor로 스키마 편집 → 저장 시 원본 Markdown의 해당 펜스 블록 JSON 교체.

### TSK-02-01: Custom Editor Provider 등록 + form-js-editor 부팅
- category: development
- domain: fullstack
- model: opus
- status: [ ]
- priority: critical
- assignee: -
- schedule: 2026-04-30 ~ 2026-05-01
- tags: custom-editor, webview, editor
- depends: TSK-00-02, TSK-01-04
- blocked-by: -
- entry-point: 뷰어 우상단 ✏️ 버튼 → Custom Editor 패널(측면 드로어)
- note: extension↔webview↔editor webview 3방향 메시지 설계

#### PRD 요구사항
- prd-ref: PRD §6 F2
- requirements:
  - `viewType: form-js.block-editor` Custom Editor 등록
  - `request-edit` 메시지 수신 → 같은 문서 옆 패널에 webview 오픈 → 전달받은 schema로 `form-js-editor` 초기화
  - editor dispose 시 리소스 정리, 다음 요청에서 깨끗한 상태 부팅
- acceptance:
  - ✏️ 버튼 클릭 → 200ms 이내 편집 webview가 열림
  - 같은 문서 여러 블록이 있어도 한 번에 하나만 편집 (다른 블록의 ✏️는 비활성 상태로 표시)
  - 편집 webview 닫기 시 첫 번째 webview에 `edit-closed` 신호 전달, ✏️ 재활성
- constraints:
  - Preact single instance 유지, editor 번들도 `preact/compat` 사용 금지
  - VSCode CSP 기본 준수, inline script 금지

#### 기술 스펙 (TRD)
- tech-spec:
  - `@bpmn-io/form-js-editor` 브라우저 번들, `dist/webview/customEditor.js`
- api-spec:
  - webview ↔ extension: `request-edit`, `edit-opened`, `save-schema`, `save-result`, `source-updated`
- data-model: -
- ui-spec:
  - Custom Editor는 view column 2(측면), 기본 크기 절반

### TSK-02-02: blockLocator + detectIndent + formatJson
- category: development
- domain: backend
- model: sonnet
- status: [ ]
- priority: high
- assignee: -
- schedule: 2026-05-01 ~ 2026-05-01
- tags: parser, text-utils
- depends: TSK-00-02
- blocked-by: -
- entry-point: -
- note: TSK-00-02 유틸 뼈대의 정식 구현

#### PRD 요구사항
- prd-ref: PRD §6 F2, F3
- requirements:
  - `blockLocator.locateFenceBody(doc, mdStart, mdEnd)` — 펜스 블록 본문만의 `vscode.Range` 반환 (```form-js 라인/```끝 라인 제외)
  - `detectIndent(doc, startPos)` — 해당 위치의 주도적 들여쓰기(2 or 4 space) 감지
  - `formatJson(schema, indent)` — `JSON.stringify(schema, null, indent)` + 말미 newline 정책 일치
- acceptance:
  - 편집 전후 파일의 펜스 외 영역은 바이트 단위로 동일
  - 2-space / 4-space 테스트 문서 각각에서 저장 결과 들여쓰기가 유지
  - CRLF 파일에서 LF로 강제 변환 없이 라인엔딩 보존
- constraints:
  - 외부 파서 도입 금지 — TextDocument API만 사용

#### 기술 스펙 (TRD)
- tech-spec:
  - Vitest 단위 테스트 15+ 케이스 (공백 혼재, 주변 빈 줄, 말미 개행 등)
- api-spec: -
- data-model: -
- ui-spec: -

### TSK-02-03: ✏️ 오버레이 + single-editor lock + 메시지 송신
- category: development
- domain: frontend
- model: sonnet
- status: [ ]
- priority: high
- assignee: -
- schedule: 2026-05-04 ~ 2026-05-04
- tags: overlay, ux, preview-script
- depends: TSK-02-01, TSK-01-03
- blocked-by: -
- entry-point: 렌더된 form-js 블록의 우상단 ✏️ 버튼 (호버 시 표시, 키보드 Tab 접근)
- note: PRD §7 UX 요구 반영

#### PRD 요구사항
- prd-ref: PRD §6 F2, §7
- requirements:
  - 각 `.form-js-block`에 ✏️ 버튼 추가, 호버 시만 표시
  - 클릭 시 `request-edit` postMessage + 다른 블록의 ✏️ 비활성화 (`aria-disabled=true`)
  - `edit-closed` 수신 시 모든 버튼 재활성화
  - 키보드 접근: Tab 포커스 이동, Enter/Space 활성
- acceptance:
  - axe 접근성 violation 0 (버튼, role, label)
  - 동시에 두 블록 편집 트리거 방지
- constraints:
  - CSS는 `media/form-js-block.css`에 분리, VSCode 테마 토큰 사용

#### 기술 스펙 (TRD)
- tech-spec:
  - `acquireVsCodeApi()` postMessage
- api-spec: webview → extension `request-edit`
- data-model: -
- ui-spec:
  - 버튼: 32×32, 우상단 8px 여백, 호버/포커스 아웃라인 VSCode 표준

### TSK-02-04: WorkspaceEdit 저장 + docVersion 충돌 처리
- category: development
- domain: fullstack
- model: opus
- status: [ ]
- priority: critical
- assignee: -
- schedule: 2026-05-05 ~ 2026-05-06
- tags: workspace-edit, concurrency
- depends: TSK-02-02, TSK-02-03
- blocked-by: -
- entry-point: Custom Editor의 저장 버튼 (단축키 `Cmd+S` 포함)
- note: 저장 실패율 < 1% 목표 (PRD §8)

#### PRD 요구사항
- prd-ref: PRD §6 F2, F3, §8
- requirements:
  - `save-schema` 메시지 수신 → `replaceFenceBody(doc, mdStart, mdEnd, formatJson(schema, indent))`
  - 저장 전 `TextDocument.version` vs 편집 시작 시 스냅샷 비교 — 불일치면 사용자에게 confirm modal
  - 저장 성공 시 `save-result: { ok: true }`, 실패 시 `{ ok: false, error }`
  - 원본 markdown 파일 외부 변경 감지 시 `source-updated` 브로드캐스트
- acceptance:
  - 정상 저장 시 펜스 본문만 교체, 주변 라인·라인엔딩 보존
  - 동시 편집 충돌 시 원본 블록은 손상 없이 유지되고 사용자 재확인 후 덮어쓰거나 취소 가능
  - WorkspaceEdit 적용 실패 시 error 배너 표시 + 원본 보존
- constraints:
  - 자동 병합 금지 — 항상 사용자 확인
- test-criteria:
  - 충돌 시나리오: 편집 중 원본을 외부 편집기로 수정 → 저장 시도 → 경고 모달 확인

#### 기술 스펙 (TRD)
- tech-spec:
  - `vscode.workspace.applyEdit`, `vscode.workspace.onDidChangeTextDocument`
- api-spec:
  - webview → ext: `save-schema { uri, mdStart, mdEnd, schema, docVersion }`
  - ext → webview: `save-result { ok, error? }`, `source-updated { uri, version }`
- data-model: -
- ui-spec:
  - 충돌 모달: 버튼 2개 (덮어쓰기 / 취소)

### TSK-02-05: 통합 테스트 확장 — 편집 시나리오 전수
- category: infrastructure
- domain: test
- model: sonnet
- status: [ ]
- priority: high
- assignee: -
- schedule: 2026-05-07 ~ 2026-05-08
- tags: test, e2e, vscode-test
- depends: TSK-02-04
- blocked-by: -
- entry-point: -
- note: WP-02 완료 게이트

#### PRD 요구사항
- prd-ref: PRD §6 F2, §8
- requirements:
  - 통합 테스트 시나리오 4종:
    1. ✏️ 클릭 → Custom Editor 오픈
    2. 필드 추가 후 저장 → 원본 md 블록 JSON 변경 확인
    3. 같은 문서 다중 블록에서 single-editor lock 동작
    4. 버전 충돌 시 경고 모달 등장
  - 들여쓰기 2/4-space 각각의 파일로 저장 결과 비교
- acceptance:
  - CI에서 4개 케이스 전부 통과, flaky 0
  - 저장 전후 펜스 외 라인 바이트 동일 (diff tool 확인)
- constraints:
  - 테스트 fixture는 `test/fixtures/` 하위에 위치, CI 캐시 대상
- test-criteria:
  - 저장 결과 diff에서 펜스 외 변경 0바이트

#### 기술 스펙 (TRD)
- tech-spec:
  - `@vscode/test-electron` + Vitest assertion
- api-spec: -
- data-model: -
- ui-spec: -

---

## WP-03: 사내 Notion-style 뷰어 어댑터 (M3)
- schedule: 2026-05-04 ~ 2026-05-14
- description: 사내 Notion-style 마크다운 뷰어 플랫폼을 식별하고 custom block 어댑터 제공. 전제조건 식별 실패 시 범위 재정의.

### TSK-03-01: 사내 뷰어 플랫폼 식별 조사
- category: infrastructure
- domain: infra
- model: sonnet
- status: [ ]
- priority: critical
- assignee: -
- schedule: 2026-05-04 ~ 2026-05-05
- tags: research, identification
- depends: TSK-00-01
- blocked-by: -
- entry-point: -
- note: PRD §12 Q1 해결 전제

#### PRD 요구사항
- prd-ref: PRD §6 F4, §9, §12 Q1
- requirements:
  - 사내 뷰어 프런트엔드 `package.json` / 번들 파일명 / 블록 추가 UI 분석
  - 후보 식별: BlockNote / Tiptap / Plate / Lexical / Novel / AFFiNE / 자체 구현
  - custom block 확장 API 존재 여부와 계약 문서화
- acceptance:
  - `docs/vscode-ext/features/notion-adapter/platform-identification.md` 산출물 — 플랫폼·버전·확장 API 요약 + 위험 요소
  - TSK-03-02 착수 전 결정됨

#### 기술 스펙 (TRD)
- tech-spec:
  - 사내 뷰어 접근 가능한 최소 환경에서 devtools 분석
- api-spec: -
- data-model: -
- ui-spec: -

### TSK-03-02: 어댑터 설계 + 계약 정의
- category: development
- domain: fullstack
- model: opus
- status: [ ]
- priority: high
- assignee: -
- schedule: 2026-05-06 ~ 2026-05-07
- tags: adapter, design
- depends: TSK-03-01
- blocked-by: -
- entry-point: 사내 뷰어의 블록 추가 메뉴 → "form-js" 항목
- note: -

#### PRD 요구사항
- prd-ref: PRD §6 F4
- requirements:
  - 식별된 플랫폼의 custom block API에 맞춘 어댑터 설계 문서
  - 디자이너 공통 코어(`designer-core`, `designer-runtime`, `designer-components`) 재사용 지점 명시
  - 편집 지원 가능 여부(플랫폼 기능 의존) 결정
- acceptance:
  - `docs/vscode-ext/features/notion-adapter/adapter-design.md` 산출물 — viewer/편집 흐름, 번들 전략, CSS 격리 방안

#### 기술 스펙 (TRD)
- tech-spec:
  - 플랫폼별 플러그인 SDK (TSK-03-01 결과 따름)
- api-spec: -
- data-model: -
- ui-spec:
  - 블록 내부 뷰어는 VSCode와 동일한 viewer UX

### TSK-03-03: 어댑터 PoC 구현 (viewer-only 먼저, 가능하면 편집까지)
- category: development
- domain: fullstack
- model: sonnet
- status: [ ]
- priority: high
- assignee: -
- schedule: 2026-05-08 ~ 2026-05-12
- tags: adapter, implementation
- depends: TSK-03-02
- blocked-by: -
- entry-point: 사내 뷰어의 블록 추가 메뉴 → "form-js" 선택 → 블록에 스키마 JSON 입력
- note: 편집 지원은 플랫폼 여건에 따름

#### PRD 요구사항
- prd-ref: PRD §6 F4, §8
- requirements:
  - form-js-viewer를 사내 뷰어의 custom block 형태로 마운트
  - 스키마 JSON 편집 UI (최소: 플러그인 설정에서 JSON 직접 편집)
  - VSCode extension과 동일한 CSS 패키징 재사용
- acceptance:
  - 샘플 페이지에서 viewer 렌더 성공 + 다크/라이트 테마 일치
  - Preact 단일 인스턴스 유지 (플랫폼 고유 Preact/React와 충돌 없음)
- constraints:
  - 플랫폼이 React 기반이면 `preact/compat` 경계를 명확히 분리 (디자이너 본체의 F12 정책 준수)

#### 기술 스펙 (TRD)
- tech-spec:
  - 플랫폼별 custom block plugin 패키지 작성 (별도 entry)
- api-spec: -
- data-model: -
- ui-spec:
  - 블록 루트 컨테이너 + viewer, 높이 auto

### TSK-03-04: Playwright E2E 스모크
- category: infrastructure
- domain: test
- model: sonnet
- status: [ ]
- priority: medium
- assignee: -
- schedule: 2026-05-13 ~ 2026-05-14
- tags: e2e, playwright
- depends: TSK-03-03
- blocked-by: -
- entry-point: -
- note: 사내 뷰어 PoC 환경 E2E

#### PRD 요구사항
- prd-ref: PRD §6 F4
- requirements:
  - 샘플 페이지 접속 → form-js 블록 삽입 → 뷰어 렌더 확인 스크린샷
  - 편집 지원 시: 블록 편집 → 저장 → 재렌더 확인
- acceptance:
  - 스모크 spec 2건 통과, 아티팩트 `docs/vscode-ext/features/notion-adapter/brw-*.png`
- constraints:
  - 사내 뷰어 자격 증명은 CI secret

#### 기술 스펙 (TRD)
- tech-spec:
  - Playwright, 플랫폼 대응 BASE_URL
- api-spec: -
- data-model: -
- ui-spec: -

---

## WP-04: 배포 + 품질 게이트 (M4)
- schedule: 2026-05-11 ~ 2026-05-20
- description: `.vsix` 패키징·사내 배포, 성능/접근성/번들 크기 게이트.

### TSK-04-01: .vsix 빌드 파이프라인 + 사내 배포
- category: infrastructure
- domain: infra
- model: sonnet
- status: [ ]
- priority: high
- assignee: -
- schedule: 2026-05-11 ~ 2026-05-12
- tags: release, packaging, vsce
- depends: TSK-02-05
- blocked-by: -
- entry-point: -
- note: Marketplace 등록 X, 사내 공유 경로만

#### PRD 요구사항
- prd-ref: PRD §6 F5, §9
- requirements:
  - `npm -w @form-js-designer/designer-vscode-extension run package` 스크립트 — `vsce package` 호출
  - 산출 `.vsix`를 사내 공유 저장소로 업로드 (경로·자격은 env로 주입)
  - 버전 태그 규칙: `vscode-ext-v{semver}`
- acceptance:
  - CI 릴리즈 잡에서 태그 push → `.vsix` 생성 → 사내 저장소 업로드 성공
  - 재실행 시 동일 artifact idempotent
- constraints:
  - 서명/인증서 요구 시 별도 문서화

#### 기술 스펙 (TRD)
- tech-spec:
  - `@vscode/vsce`, curl/aws-cli (사내 저장소 종류에 따라)
- api-spec: -
- data-model: -
- ui-spec: -

### TSK-04-02: 접근성 (axe) + 테마 전환 E2E
- category: infrastructure
- domain: test
- model: sonnet
- status: [ ]
- priority: high
- assignee: -
- schedule: 2026-05-13 ~ 2026-05-14
- tags: a11y, axe, theme
- depends: TSK-04-01
- blocked-by: -
- entry-point: VSCode 미리보기 + Custom Editor에서 axe 스캔
- note: -

#### PRD 요구사항
- prd-ref: PRD §6, §7, §8
- requirements:
  - 미리보기·Custom Editor 양쪽에서 axe violation 0
  - 다크→라이트→High Contrast 3가지 테마 전환 스크린샷 자동 생성
- acceptance:
  - axe serious/critical 0
  - 3가지 테마 전환 E2E 통과

#### 기술 스펙 (TRD)
- tech-spec:
  - `@axe-core/playwright`, Playwright
- api-spec: -
- data-model: -
- ui-spec: -

### TSK-04-03: 성능·번들 크기 게이트
- category: infrastructure
- domain: test
- model: sonnet
- status: [ ]
- priority: medium
- assignee: -
- schedule: 2026-05-15 ~ 2026-05-15
- tags: perf, budget
- depends: TSK-04-02
- blocked-by: -
- entry-point: -
- note: PRD §8 성공 지표 자동 검증

#### PRD 요구사항
- prd-ref: PRD §8
- requirements:
  - 초기 렌더 p95 측정 스크립트 (10 필드 스키마 기준)
  - `.vsix` 크기 측정 + 예산 초과 시 CI fail
- acceptance:
  - 렌더 p95 ≤ 500ms, `.vsix` ≤ 5MB
  - CI 리포트에 측정값 기록 (이력 추적 가능)
- constraints:
  - 측정은 고정 환경(Linux runner) 기준
- test-criteria:
  - 5번 연속 측정 중앙값이 게이트 이하

#### 기술 스펙 (TRD)
- tech-spec:
  - Playwright performance API, `bytes` 측정 스크립트
- api-spec: -
- data-model: -
- ui-spec: -

## WP-05: 신규 컴포넌트 (§3.2 Card/Stack/Tabs/Modal)
- schedule: 2026-05-09 ~ 2026-05-16
- description: form-js-viewer 빌트인 외 레이아웃 컴포넌트 4종(Card, Stack, Tabs/TabPanel, Modal)을 `defineComponent` 계약으로 추가. viewer·editor 양쪽 파이프라인에 `additionalModules`로 주입해 Phase 1 §3.2 / PRD AC#1·AC#4-1 충족. 기본 Button은 form-js 내장이므로 §3.2 중 대상 4종만 이 WP에서 다룬다.

### TSK-05-01: defineComponent 계약 + 커스텀 모듈 스캐폴드
- category: development
- domain: frontend
- model: opus
- status: [ ]
- priority: critical
- assignee: -
- schedule: 2026-05-09 ~ 2026-05-10
- tags: components, module, registry
- depends: TSK-01-04
- blocked-by: -
- entry-point: -
- note: 이후 TSK-05-02/03이 이 계약을 사용. viewer·editor 공통.

#### PRD 요구사항
- prd-ref: PRD §6 F1, AC#1, AC#4-1, ADR-0001
- requirements:
  - `src/components/defineComponent.ts` — `{ type, renderer, propsSchema, layout, i18nKeys, icon }` 시그니처 + Zod 스키마 검증
  - `src/components/index.ts` — 본 WP의 모든 컴포넌트를 form-js `Module`(FormFields registry contribution) 형태로 묶어 export
  - viewer(`preview.ts`)와 editor(`customEditor.ts`)가 동일 모듈을 공유 — single source of truth
- acceptance:
  - `createForm({ container, schema, additionalModules: [customComponents] })` 호출이 타입/런타임 에러 없이 동작
  - 빈 스키마 + 본 모듈 주입 상태에서 WP-01 M1 fixture 3종 회귀 0
  - defineComponent 계약 위반 시(필수 필드 누락) 빌드 타임 탐지
- constraints:
  - Preact 단일 인스턴스 규약 유지 (`preact/compat` 금지)
  - 외부 UI lib 금지 — Preact + form-js primitives만 사용
  - CSS는 신규 `media/form-js-components.css`에 분리하여 `contributes["markdown.previewStyles"]`에 추가

#### 기술 스펙 (TRD)
- tech-spec:
  - `@bpmn-io/form-js-viewer` FormFields registry, Module DI 컨테이너
  - Zod ^3 — propsSchema 정적 검증
- api-spec: -
- data-model:
  - 공통 스키마: `{ type: 'tabs'|'tabPanel'|'card'|'stack'|'modal', id, label?, components?: [...], layout?: { row, columns } }`
- ui-spec:
  - 각 컴포넌트 최소 높이 40px, VSCode 테마 토큰(`--vscode-editor-foreground`/`--vscode-editor-background`) 기반

### TSK-05-02: Tabs / TabPanel 렌더러
- category: development
- domain: frontend
- model: sonnet
- status: [dd]
- priority: critical
- assignee: -
- schedule: 2026-05-11 ~ 2026-05-12
- tags: tabs, layout, a11y
- depends: TSK-05-01
- blocked-by: -
- entry-point: form-js 블록 내 `type: tabs` 스키마
- note: schemaVersion 19 호환, 현재 form.md 샘플 스키마가 직접 수혜

#### PRD 요구사항
- prd-ref: PRD §6 F1, AC#1, AC#4-1
- requirements:
  - `tabs` 컨테이너: 헤더 바 + 활성 패널 영역, Arrow Left/Right 탐색, Home/End 지원
  - `tabPanel`: 자식 `components[]`를 form-js 기존 row/columns layout에 위임
  - ARIA: `role=tablist` / `role=tab` (+ `aria-selected`, `aria-controls`) / `role=tabpanel`
  - 초기 활성 탭: 첫 번째 tabPanel. 스키마 `activeTab` 문자열(id)로 override 가능
- acceptance:
  - 탭 3개 × 각 패널 필드 2개 fixture가 viewer에서 탭 전환·키보드 탐색 모두 정상
  - axe violation 0 (serious/critical)
  - round-trip(스키마 → render → import) 무손실, WP-01 LRU 캐시와 충돌 없음
- constraints:
  - inactive 패널의 필드 값도 form data에 포함(form-js 기본 동작 유지)
  - 탭 헤더 sticky 또는 scrollable 결정은 본 Task에서 확정 후 문서화

#### 기술 스펙 (TRD)
- tech-spec:
  - Preact `useState` activeIndex, `useRef` panel DOM, `useEffect` focus 관리
- api-spec: -
- data-model:
  - `{ type: 'tabs', id, components: [{ type: 'tabPanel', id, label, components: [...] }] }`
- ui-spec:
  - 헤더 바: 밑줄 indicator 2px, 활성 탭 굵게, 호버 시 `--vscode-list-hoverBackground`

### TSK-05-03: Card / Stack / Modal 렌더러
- category: development
- domain: frontend
- model: sonnet
- status: [ ]
- priority: high
- assignee: -
- schedule: 2026-05-13 ~ 2026-05-14
- tags: card, stack, modal, portal
- depends: TSK-05-01
- blocked-by: -
- entry-point: form-js 블록 내 `type: card|stack|modal` 스키마
- note: TSK-05-02와 병렬 진행 가능

#### PRD 요구사항
- prd-ref: PRD §6 F1, AC#1, AC#4-1
- requirements:
  - Card: 상단 `label` + 본문 `components[]` + (옵션) 하단 action row(`actions[]`)
  - Stack: `direction` (vertical/horizontal), `gap` (px), `wrap` 지원. children은 자식 컴포넌트
  - Modal: trigger 요소(button/link) + 포털 렌더, Esc/backdrop 닫기, focus trap, 복귀 시 trigger로 포커스 반환
- acceptance:
  - 각 컴포넌트 단일 블록 fixture가 viewer에서 렌더 + axe 0
  - Modal 포털이 `.form-js-block` 루트 밖으로 새지 않음 — 블록 내부 portal root 제공
  - Tabs × Card × Stack × Modal 혼합 스키마에서 기존 layout.row/columns 회귀 0
- constraints:
  - 외부 포털·다이얼로그 라이브러리 추가 금지 — Preact `createPortal`과 `<dialog>` 요소만 사용
  - Modal 오픈 시 `document.body` scroll lock 없음(VSCode webview 정책 준수)
  - High Contrast 테마에서 border/outline 가시성 유지

#### 기술 스펙 (TRD)
- tech-spec:
  - Preact `createPortal` + native `<dialog showModal()>` 조합. Electron 호환 확인
- api-spec: -
- data-model:
  - `{ type: 'card', id, label?, components: [...], actions?: [...] }`
  - `{ type: 'stack', id, direction: 'vertical'|'horizontal', gap: number, wrap?: boolean, components: [...] }`
  - `{ type: 'modal', id, trigger: { label, variant }, components: [...] }`
- ui-spec:
  - Card: border 1px `--vscode-panel-border`, radius 4px, padding 12px
  - Stack: flex gap, min-height 0 overflow 방지
  - Modal: overlay dim 40%, max-width 640px, 화면 중앙

### TSK-05-04: viewer·editor 파이프라인 주입 + i18n + 픽셀 파리티 테스트
- category: development
- domain: fullstack
- model: sonnet
- status: [ ]
- priority: high
- assignee: -
- schedule: 2026-05-15 ~ 2026-05-16
- tags: integration, i18n, pixel-parity, test
- depends: TSK-05-02, TSK-05-03, TSK-02-01
- blocked-by: -
- entry-point: -
- note: WP-05 완료 게이트. AC#1·AC#4-1·AC#5·AC#10 동시 검증.

#### PRD 요구사항
- prd-ref: PRD §6 F1, AC#1, AC#4-1, AC#5, AC#10
- requirements:
  - `preview.ts`의 `createForm(...)`에 `additionalModules: [customComponents]` 주입
  - `customEditor.ts`의 `createFormEditor(...)`에도 동일 주입 (WP-02 편집 경로에서 팔레트 노출)
  - 모든 가시 문자열을 `t('components.<path>')` 추출, `designer-i18n` ko 사전 100% 커버 — CI 누락 게이트
  - 통합 테스트 fixture 5종: (1) tabs 단독, (2) card+stack 중첩, (3) modal trigger+open, (4) tabs 내부 card+stack 혼합, (5) 기존 WP-01 fixture 회귀 확인
- acceptance:
  - CI `test:e2e` 5 fixture 전부 렌더 성공, axe violation 0
  - `form field of type <tabs|card|stack|modal> not supported` 오류 소멸 확인
  - ko 사전 누락 키 0 (CI gate fail로 보호)
  - 디자이너 ↔ viewer 픽셀 파리티(ADR-0001) — 동일 스키마 768×576 캡처 SSIM ≥ 0.99
  - 저장 경로(WP-02)에서 커스텀 컴포넌트 편집 후 round-trip 무손실
- constraints:
  - 기존 WP-01 M1 fixture 3종 + WP-02 편집 fixture 4종 회귀 0
  - 픽셀 diff는 1% 허용, anti-aliasing 무시 옵션
- test-criteria:
  - tabs 스키마 단일 블록 렌더·탭 전환
  - card+stack 중첩 렌더
  - modal trigger 클릭 → open 상태 스냅샷 + Esc 닫기
  - 혼합(tabs 안에 card, card 안에 stack) 렌더
  - 픽셀 파리티 샘플 SSIM ≥ 0.99

#### 기술 스펙 (TRD)
- tech-spec:
  - `@vscode/test-electron` + Playwright, `pixelmatch` 또는 `ssim.js`
  - i18n 추출: 기존 designer-i18n 정적 추출기 재사용
- api-spec: -
- data-model: -
- ui-spec: -
