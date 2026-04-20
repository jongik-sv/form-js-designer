# TSK-02-01: Custom Editor Provider 등록 + form-js-editor 부팅 - 설계

## 요구사항 확인
- 뷰어 `.form-js-block`의 ✏️ 버튼이 `request-edit`를 webview → extension host로 보내면, extension host가 같은 Markdown 문서 옆(`ViewColumn.Beside`)에 별도 편집용 webview 패널을 열고 `form-js-editor`를 초기 스키마로 부팅한다.
- `viewType: form-js.block-editor`로 Custom Editor API(`registerCustomTextEditorProvider`)를 `activate()`에서 idempotent하게 등록하고, single-editor lock으로 문서 내 동시 편집을 1건으로 제한한다. editor dispose 시 preview webview로 `edit-closed`를 브로드캐스트해 ✏️를 재활성화한다.
- Preact 단일 인스턴스·`preact/compat` 사용 금지·VSCode CSP 기본 정책(inline script 금지) 준수. 편집 webview는 view column 2(측면), 기본 크기 절반.

## 타겟 앱
- **경로**: `packages/designer-vscode-extension`
- **근거**: WBS/TRD가 명시한 단일 VSCode 확장 패키지이며, 이 Task는 해당 패키지의 extension host + webview(Custom Editor) 경로를 구현한다. 모노레포 루트의 다른 workspace는 대상 아님.

## 구현 방향
- `extension.ts`의 `activate()`에서 `FormJsBlockEditorProvider`(신규)를 `vscode.window.registerCustomEditorProvider(viewType, provider, { webviewOptions: { retainContextWhenHidden: true }, supportsMultipleEditorsPerDocument: false })`로 등록하고, 이를 보완하는 `formJs.openBlockEditor` 커맨드를 등록한다. preview webview가 보낸 `request-edit`는 VSCode Markdown preview의 `onDidReceiveMessage`로 직접 받을 수 없으므로, preview에서 `command:formJs.openBlockEditor?{...}` 링크를 통해 커맨드를 호출하여 편집을 연다(아래 설계 결정 §1 참조).
- `EditSession`(문서 URI × mdStart/mdEnd + editor WebviewPanel + preview 식별자)을 extension host에 in-memory로 보관해 single-editor lock을 강제한다. 새로운 `request-edit`는 기존 세션이 있으면 reveal만 하거나 거절하고, 기존 세션 dispose 시 모든 preview로 `edit-closed`를 브로드캐스트한다.
- Custom Editor webview는 `dist/webview/customEditor.js` + 정적 HTML(nonce 적용, inline script 금지)로 부팅한다. `edit-opened` 메시지로 schema를 전달받아 `@bpmn-io/form-js-editor`의 `createFormEditor`로 컨테이너에 마운트한다. 저장·충돌 처리는 본 Task 범위 외(TSK-02-04)이므로 `save-schema` 송신은 버튼 스텁만 두고 실제 반영은 후속 Task에서 연결한다.
- 번들 관점: 기존 `dist/webview/customEditor.js` 스텁을 실제 부팅 코드로 대체하되 `@bpmn-io/form-js-editor`를 번들 내부에 포함(external 금지). Preact single instance 가드는 TSK-00-01의 `scripts/ci/assert-single-preact.mjs`가 계속 검증한다.

## 파일 계획

**경로 기준:** 모든 파일 경로는 프로젝트 루트 기준.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-vscode-extension/package.json` | `contributes.customEditors[]`에 `form-js.block-editor` 엔트리 추가, `contributes.commands[]`에 `formJs.openBlockEditor` 등록, `activationEvents`에 `onCustomEditor:form-js.block-editor` 추가. (VSCode extension의 **라우터/manifest** — 커맨드·viewType 라우팅 선언부.) | 수정 |
| `packages/designer-vscode-extension/src/extension.ts` | `activate()`에서 `FormJsBlockEditorProvider` 등록 + `formJs.openBlockEditor` 커맨드 등록(+ idempotent 가드). `deactivate()`에서 세션 정리. 기존 test bridge 블록 보존. (extension host **router** 진입점.) | 수정 |
| `packages/designer-vscode-extension/src/editor/customEditorProvider.ts` | extension host 측 `FormJsBlockEditorProvider` 구현(`resolveCustomTextEditor`). webview HTML 생성(nonce·CSP·script src), `edit-opened` 초기 전송, `save-schema`/`edit-closed` 메시지 라우팅, dispose 훅. | 신규 |
| `packages/designer-vscode-extension/src/editor/editSession.ts` | `EditSessionRegistry` — 문서 URI별 현재 편집 세션 1건 lock, `beginSession`/`endSession`/`getActive` + `EventEmitter`로 lock 상태 브로드캐스트. | 신규 |
| `packages/designer-vscode-extension/src/editor/openBlockEditorCommand.ts` | `formJs.openBlockEditor({ uri, mdStart, mdEnd, schema })` 커맨드 본문. 세션 lock 확인 → `vscode.commands.executeCommand('vscode.openWith', uri, 'form-js.block-editor', { viewColumn: Beside })` 호출 → provider에 초기 schema 전달(세션 context 큐). | 신규 |
| `packages/designer-vscode-extension/src/editor/customEditor.ts` | 기존 스텁을 실제 부팅 코드로 교체. `acquireVsCodeApi()` 후 `edit-opened` 수신 시 `createFormEditor({ container, schema })` 마운트, dispose 시 자원 해제, `save-schema` 송신 버튼 wiring(실제 저장 로직은 후속 TSK-02-04). | 수정 |
| `packages/designer-vscode-extension/src/editor/index.ts` | `FormJsBlockEditorProvider`, `EditSessionRegistry` export 추가. | 수정 |
| `packages/designer-vscode-extension/src/shared/messages.ts` | `RequestEditMessage`에 `schema: string` 추가, `EditClosedMessage` 타입 신규 추가 + `FormJsMessage` 유니온에 반영. | 수정 |
| `packages/designer-vscode-extension/src/markdown/preview.ts` | `.form-js-block` 우상단 ✏️ **버튼 / 네비게이션 요소(menu·navigation 배선)** 마운트 — `mountEditButton(block)` 함수로 호버 시 표시되는 버튼(anchor) 삽입, `command:formJs.openBlockEditor?...` 링크 활성. `message` 이벤트 리스너로 `edit-opened`(자기 문서면 버튼 비활성)·`edit-closed`(재활성) 반영. | 수정 |
| `packages/designer-vscode-extension/media/form-js-editor.css` | Custom Editor webview 전용 최소 스타일(host 루트 100% 높이 + form-js-editor container). | 신규 |
| `packages/designer-vscode-extension/media/form-js-block.css` | `.form-js-block` 우상단 ✏️ 버튼(네비 요소) 위치/호버 표시 스타일(상세는 TSK-02-03에서 완성, 본 Task에서는 최소 CSS 추가). | 수정 |
| `packages/designer-vscode-extension/esbuild.config.mjs` | `customEditor.ts` entry 유지. `define` 상수가 editor bundle에도 공통 적용되는지 확인(필요 시 분리). | 수정(선택적) |
| `packages/designer-vscode-extension/test/unit/editor/editSession.test.ts` | `EditSessionRegistry` 단위 테스트 — begin/end/중복 거절/이벤트 발화. | 신규 |
| `packages/designer-vscode-extension/test/unit/editor/customEditorProvider.test.ts` | `resolveCustomTextEditor`의 HTML CSP/nonce 포함 검증, `edit-opened` 메시지 포맷 검증(vscode mock). | 신규 |
| `packages/designer-vscode-extension/test/unit/editor/openBlockEditorCommand.test.ts` | 커맨드 호출 시 `vscode.openWith` 인자가 올바른 viewType + `ViewColumn.Beside`인지, lock 존재 시 거절하는지 검증. | 신규 |
| `packages/designer-vscode-extension/test/fixtures/edit-single.md` | 편집 통합 테스트용 단일 블록 fixture. | 신규 |
| `packages/designer-vscode-extension/test/integration/suite/customEditor.test.ts` | `@vscode/test-electron` 통합 — `formJs.openBlockEditor` 커맨드 실행 → Custom Editor 패널이 ViewColumn.Two에 열리는지, resolveCustomTextEditor 완료 이벤트, dispose 시 preview로 `edit-closed` 수신 확인. | 신규 |
| `packages/designer-vscode-extension/test/integration/helpers/waitForCustomEditor.ts` | Custom Editor 오픈 대기 헬퍼(타임아웃 15s, 폴링 간격 50ms). | 신규 |

## 진입점 (Entry Points)

- **사용자 진입 경로**: VSCode에서 form-js 펜스 블록이 포함된 `.md` 파일 열기 → `Cmd+Shift+V`로 Markdown 미리보기 열기 → 렌더된 `.form-js-block` 우상단 ✏️ 버튼 클릭 → 오른쪽(ViewColumn.Beside) 드로어에 Custom Editor 패널이 열리고 `form-js-editor`가 스키마로 초기화됨.
- **URL / 라우트**: VSCode 커맨드 URI — `command:formJs.openBlockEditor?<URI-encoded JSON>`. Custom Editor viewType은 `form-js.block-editor`. 실제 호출 경로는 `vscode.openWith(uri, 'form-js.block-editor', ViewColumn.Beside)`.
- **수정할 라우터 파일** (VSCode 확장의 "라우터" 대응물):
  - `packages/designer-vscode-extension/package.json` — `contributes.customEditors[]`에 `{ "viewType": "form-js.block-editor", "displayName": "form-js Block Editor", "selector": [{ "filenamePattern": "*.md" }], "priority": "option" }` 엔트리 추가, `contributes.commands[]`에 `{ "command": "formJs.openBlockEditor", "title": "form-js: Open Block Editor" }` 추가, `activationEvents`에 `"onCustomEditor:form-js.block-editor"` 포함. (파일 계획 표에 포함.)
  - `packages/designer-vscode-extension/src/extension.ts` — `activate()`에서 `vscode.window.registerCustomEditorProvider('form-js.block-editor', provider, { webviewOptions: { retainContextWhenHidden: true }, supportsMultipleEditorsPerDocument: false })` 호출 + `vscode.commands.registerCommand('formJs.openBlockEditor', openBlockEditorCommand)` 등록. (파일 계획 표에 포함.)
- **수정할 메뉴·네비게이션 파일** (VSCode 미리보기의 "메뉴·네비게이션" 대응물 = webview 내 ✏️ 버튼):
  - `packages/designer-vscode-extension/src/markdown/preview.ts` — `mountEditButton(block)` 신규 함수로 `.form-js-block` 우상단에 ✏️ 버튼(또는 anchor)을 삽입하고 `command:formJs.openBlockEditor?...`로 커맨드를 호출. `navItems` 배열 대응물은 없고 단일 DOM 주입이지만, "preview 안에서 사용자가 유일하게 접근하는 네비 요소"이므로 이 Task의 메뉴·네비게이션 파일로 간주. (파일 계획 표에 포함.)
  - `packages/designer-vscode-extension/media/form-js-block.css` — ✏️ 버튼의 위치·호버 표시를 위한 최소 CSS 추가. 상세 접근성/ARIA/single-editor lock UX 디테일은 TSK-02-03에서 완성되며, 본 Task에서는 "클릭하면 편집이 열린다" 최소 경로만 배선한다. (파일 계획 표에 포함.)
- **연결 확인 방법**: E2E에서 `fixtures/edit-single.md`를 열고 Markdown preview를 띄운 뒤, preview webview DOM에서 `.form-js-block a.form-js-edit-button`(또는 `button`)을 클릭 → 200ms 내 `resolveCustomTextEditor`가 호출되어 편집 webview가 ViewColumn.Two에 열리는지 확인. URL 직접 입력(`page.goto`) 사용 금지 — VSCode 환경이라 애초에 불가능하지만, 동등물인 `vscode.commands.executeCommand('vscode.openWith', ...)` 직접 호출 **대신** webview DOM 클릭을 경유해야 reachability gate를 충족.

## 주요 구조
- **`FormJsBlockEditorProvider`** (extension.ts ↔ customEditor webview 라이프사이클): `resolveCustomTextEditor(document, webviewPanel, token)`에서 CSP + nonce 적용 HTML을 주입하고, `EditSessionRegistry`에 lock을 요청한 뒤 lock 성공 시 `edit-opened { schema, mdStart, mdEnd }`를 송신. `webviewPanel.onDidDispose`에서 lock 해제 및 preview 브로드캐스트.
- **`EditSessionRegistry`**: 문서 URI → `EditSession { mdStart, mdEnd, panel }` 맵. `beginSession(uri, mdStart, mdEnd, panel)` 성공/거절(중복 시), `endSession(uri)`, `EventEmitter`로 lock 변화 이벤트 발행. extension host 전역 싱글톤.
- **`openBlockEditorCommand`**: `command:` URI로부터 `{ uri, mdStart, mdEnd, schema }`를 수신. `PendingEditSchema` 맵에 schema를 stash한 뒤 `vscode.openWith`로 Custom Editor를 열면 provider가 큐에서 스키마를 꺼내 `edit-opened`를 발송.
- **customEditor.ts (webview)**: `acquireVsCodeApi()` → `message`(`edit-opened`) 수신 → `createFormEditor({ container, schema })` 마운트 → 저장 버튼 클릭 시 `postMessage({ type: 'save-schema', schema })`(본 Task에서는 송신만, 저장 처리는 TSK-02-04). `window.addEventListener('unload')`로 editor.destroy().
- **preview ✏️ 버튼 스텁**: `mountEditButton(block)`으로 우상단 absolute anchor 삽입. `href="command:formJs.openBlockEditor?<encoded>"`로 커맨드 활성. `message` 리스너로 `edit-opened`/`edit-closed` 수신해 disabled 토글.

## 데이터 흐름
사용자 ✏️ 클릭 → preview webview의 anchor `command:formJs.openBlockEditor?<URI-encoded { uri, mdStart, mdEnd, schema }>` 활성 → extension host의 `formJs.openBlockEditor` 커맨드 호출 → `EditSessionRegistry.beginSession` 성공 시 `PendingEditSchema[uriKey] = { mdStart, mdEnd, schema }` stash → `vscode.commands.executeCommand('vscode.openWith', uri, 'form-js.block-editor', ViewColumn.Beside)` → `FormJsBlockEditorProvider.resolveCustomTextEditor` 호출 → CSP+nonce HTML 주입 + webview.asWebviewUri로 `dist/webview/customEditor.js` 로드 → stashed schema를 consume 후 `webview.postMessage({ type:'edit-opened', schema, mdStart, mdEnd })` → customEditor.ts가 `createFormEditor({ container, schema })` 마운트 → 편집 webview 닫힘 → provider `onDidDispose` → `EditSessionRegistry.endSession` → preview에 `edit-closed` 브로드캐스트 → ✏️ 재활성.

## 설계 결정 (대안이 있는 경우만)

### §1. preview → extension 메시지 전달 방식
- **결정**: preview.ts의 ✏️ 버튼은 `command:formJs.openBlockEditor?<URI-encoded JSON>` anchor로 커맨드 URI를 활성화한다. schema 크기가 커맨드 URI 길이 제한(≈8KB)을 넘는 경우, `form-js-block.dataset`에 schema를 유지하고 command URI에는 `schemaId`만 실어 보낸 뒤 provider가 preview webview에 back-channel로 schema를 요청한다(후속 Task에서 보강).
- **대안**: `acquireVsCodeApi().postMessage` 기반으로만 구현하여 extension host가 Markdown preview message를 직접 수신.
- **근거**: VSCode의 `markdown.previewScripts`에서 보낸 postMessage를 extension host가 수신하는 공식 안정 API는 문서화되어 있지 않다. `command:` URI는 Markdown preview에서 공식 허용되고 CSP와 충돌하지 않으며, 인자 전달을 JSON 인코딩으로 일관되게 처리할 수 있다.

### §2. Custom Editor 바인딩 대상
- **결정**: `viewType: form-js.block-editor`는 `*.md`에 바인딩, `priority: option`(사용자가 `vscode.openWith`로 명시적으로 열 때만 활성) + `supportsMultipleEditorsPerDocument: false`. Provider는 `resolveCustomTextEditor`에서 `PendingEditSchema` 맵을 읽어 현재 블록 위치를 결정한다.
- **대안**: `*.form.json` 전용 확장자(기존 package.json 형태). 또는 `CustomEditorProvider`(Custom Document) 방식.
- **근거**: 요구사항상 "같은 문서 옆 패널"에 편집기를 띄워야 하고 원본이 Markdown이므로 `*.md`의 옵션형 Custom Text Editor가 자연스럽다. Custom Document 방식은 WorkspaceEdit 반영이 복잡해지고, 저장 충돌 처리(TSK-02-04)에서 `TextDocument` 직접 접근이 필요하므로 `registerCustomTextEditorProvider`가 적합.

### §3. schema 전달 채널
- **결정**: extension host의 `PendingEditSchema: Map<string, { mdStart, mdEnd, schema }>`(key = document URI)를 통해 커맨드 핸들러 → provider로 전달. provider는 resolve 시 해당 엔트리를 consume한 뒤 즉시 제거하고 `edit-opened`로 webview에 송신.
- **대안**: Custom Editor webview의 HTML 생성 시 초기 schema를 `<script type="application/json">`으로 inline 주입.
- **근거**: inline JSON은 CSP와 충돌하지 않지만 재편집·hot reload 시 데이터 갱신이 번거롭다. 메모리 채널 + postMessage가 단일 소스 원칙에 부합하고 TSK-02-04의 저장 경로와도 동일 채널을 재사용한다.

## 선행 조건
- TSK-00-02: `src/shared/messages.ts` 타입 뼈대, `src/editor/blockLocator.ts`, `src/editor/workspaceEdit.ts` (이번 Task는 저장 미실행이므로 workspaceEdit 사용 없음, 타입만 공유).
- TSK-01-04: 미리보기 렌더 경로 완성 — `.form-js-block` 마운트·schema 복원이 전제.
- 외부 라이브러리: `@bpmn-io/form-js-editor` ^1.21.2(이미 dependencies), `preact` 10.29.x single instance(루트 overrides 유지).

## 리스크
- **HIGH — Markdown preview ↔ extension host 메시지 경로 미확정**: VSCode의 `markdown.previewScripts`에서 `acquireVsCodeApi`로 보낸 메시지를 extension host가 직접 수신하는 안정 API가 없다. 설계 결정 §1의 `command:` URI 경로가 기본이며, dev-build는 먼저 `command:` 경로를 구현하고 `postMessage` 수신은 동작 확인 후 선택적으로 추가한다. `command:` URI 길이 제한 초과 시 schema id 경유 back-channel로 폴백.
- **HIGH — Preact 중복 인스턴스 회귀**: `@bpmn-io/form-js-editor`가 `preact/compat`를 끌어오면 preview(`form-js-viewer`)와 editor 번들 사이에 Preact 인스턴스가 나뉠 수 있다. editor 번들은 browser IIFE이므로 preview와 별도 instance가 정상이나, bundle 내부에서 `preact/compat`로 치환되지 않도록 esbuild resolve 확인. `scripts/ci/assert-single-preact.mjs` green 유지.
- **MEDIUM — CSP/nonce 실수로 edit webview 블랭크**: `resolveCustomTextEditor`가 반환하는 HTML은 VSCode가 자동 CSP를 적용하지 않으므로 직접 `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-<x>' ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline';">`을 넣어야 하고, `<script src>`·style 링크 모두 `webview.asWebviewUri`로 변환해야 한다. 누락 시 화면이 빈 채로 열린다.
- **MEDIUM — single-editor lock 경쟁 상태**: 두 preview가 동시에 `request-edit`를 보내는 경우 lock 처리가 async `vscode.openWith`를 기다리는 동안 경쟁 가능. `EditSessionRegistry.beginSession`은 sync로 lock을 선점하고 이후 openWith 실패 시 rollback한다.
- **LOW — 기존 `formJsDesigner.formEditor` viewType과의 공존**: 기존 manifest의 `formJsDesigner.formEditor` 엔트리는 본 Task에서 유지하되 deprecate 주석 추가. 제거는 후속 Task에서 일괄 정리(호환성 영향 없음).

## QA 체크리스트
dev-test 단계에서 검증할 항목.

- [ ] (정상 케이스) form-js 펜스 블록이 포함된 `.md`를 preview로 연 뒤 ✏️ 버튼을 클릭하면 200ms 이내에 ViewColumn.Beside(오른쪽)에 Custom Editor 패널이 열리고, `form-js-editor`가 전달된 schema로 초기화된다.
- [ ] (엣지 케이스) 같은 문서에 `form-js` 블록이 2개 이상일 때, 첫 번째 블록의 ✏️를 눌러 편집이 열린 상태에서 두 번째 블록의 ✏️는 `aria-disabled="true"` 또는 disabled 상태로 표시되며 클릭해도 두 번째 편집 webview가 열리지 않는다.
- [ ] (에러 케이스) Custom Editor webview 부팅 중 `form-js-editor` import 실패/스키마 JSON 파싱 실패가 발생해도 Custom Editor 패널은 에러 메시지를 보이고, preview webview의 ✏️ 버튼 상태가 lock/unlock 일관성(열기 실패 시 unlock)을 유지한다.
- [ ] (통합 케이스) Custom Editor 패널을 닫으면(Cmd+W 또는 tab close) provider의 `onDidDispose`가 `EditSessionRegistry.endSession`을 호출하고, preview webview가 `edit-closed` 메시지를 수신해 ✏️ 버튼이 재활성화된다.
- [ ] (CSP 준수) Custom Editor HTML에 `<script>` 태그는 `nonce` 속성이 부여되고 inline script가 없으며, CSP `script-src`에 nonce와 `webview.cspSource`만 허용된다(브라우저 devtools에서 CSP 경고 0).
- [ ] (idempotency) `activate()`가 여러 번 호출돼도 `registerCustomEditorProvider`가 중복 등록되지 않으며, `deactivate()` 호출 후 재활성화 시 새로운 provider 인스턴스가 lock 없이 깨끗한 상태로 부팅된다.
- [ ] (타입 안정성) `FormJsMessage` 유니온에 `EditClosedMessage`가 추가되어 preview.ts/customEditor.ts/extension host 세 지점 모두 `type === 'edit-closed'` 분기로 narrowing 되고, `npm -w @form-js-designer/designer-vscode-extension run typecheck` 통과.

**fullstack/frontend Task 필수 항목 (E2E 테스트에서 검증 — dev-test reachability gate):**
- [ ] (클릭 경로) 메뉴/사이드바/버튼을 클릭하여 목표 페이지에 도달한다 (URL 직접 입력 금지) — 구체화: `fixtures/edit-single.md` 열기 → Cmd+Shift+V로 Markdown preview 열기 → preview webview DOM의 `.form-js-block a.form-js-edit-button` 클릭 → Custom Editor 패널이 ViewColumn.Two에 등장. `vscode.openWith` 직접 호출은 내부 검증용이며 사용자 경로는 반드시 ✏️ 버튼 클릭을 통과해야 한다.
- [ ] (화면 렌더링) 핵심 UI 요소가 브라우저에서 실제 표시되고 기본 상호작용이 동작한다 — Custom Editor webview에서 `form-js-editor`의 팔레트/캔버스/속성 패널 3개 영역이 렌더되고, 샘플 스키마의 필드가 캔버스에 표시된다(필드 1개를 드래그로 선택해 속성 패널이 반응하는 것까지 확인).
