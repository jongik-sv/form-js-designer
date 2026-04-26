# TSK-02-04: WorkspaceEdit 저장 + docVersion 충돌 처리 - 설계

## 요구사항 확인
- Custom Editor webview의 저장 버튼(또는 `Cmd+S`) 누름 → `save-schema { uri, mdStart, mdEnd, schema, docVersion }` 메시지를 extension host가 수신 → 저장 직전 `TextDocument.version`이 webview가 보낸 `docVersion`과 동일한지 검증, 동일하면 `replaceFenceBody`로 펜스 본문만 교체하고 `applyEdit` 후 `save-result { ok: true }` 회신, 다르면 충돌 모달(덮어쓰기/취소)을 띄우고 사용자가 "덮어쓰기"를 선택할 때만 강행 저장.
- 펜스 외 라인·라인엔딩(CRLF/LF)·블록 주변 공백은 바이트 단위 보존. 저장 실패(applyEdit returns false 또는 throw, fence 미발견 등)는 원본 손상 없이 webview에 `save-result { ok: false, error }` 회신, Custom Editor에는 에러 배너.
- `vscode.workspace.onDidChangeTextDocument`로 원본 markdown의 외부 변경을 감지하여, 활성 EditSession이 가리키는 문서가 바뀌면 모든 등록 webview(특히 해당 Custom Editor)에 `source-updated { uri, version }`를 브로드캐스트. 자동 병합 금지 — 항상 사용자 확인.

## 타겟 앱
- **경로**: `packages/designer-vscode-extension`
- **근거**: 본 Task는 단일 VSCode 확장 패키지의 extension host(저장 트랜잭션·문서 버전 감시) ↔ Custom Editor webview(저장 버튼·충돌 모달 UI) 양 측을 잇는 fullstack 작업이며, 모노레포의 다른 workspace는 해당 없음.

## 구현 방향
- **저장 트랜잭션 단일 진입점**: `src/editor/saveSchemaController.ts`(신규)에 `handleSaveSchema(message, deps)` 함수를 두고, Custom Editor provider의 `onDidReceiveMessage`에서 `type === 'save-schema'` 때만 호출한다. 컨트롤러가 (1) URI로 `vscode.workspace.openTextDocument` 호출, (2) `doc.version === message.docVersion` 검사, (3) 불일치면 `vscode.window.showWarningMessage(modal:true, '덮어쓰기', '취소')` 결과로 분기, (4) `replaceFenceBody` + `applyEdit` 호출, (5) 결과 메시지 회신. 부수 효과(applyEdit/showWarningMessage)는 deps 인터페이스로 주입하여 단위 테스트 가능.
- **EditSession 스냅샷 확장**: TSK-02-01의 `EditSessionRegistry`에 `openedDocVersion: number`, `lastKnownDocVersion: number` 필드를 추가한다. Custom Editor 부팅 시(`resolveCustomTextEditor` 안에서) 현재 `doc.version`을 `openedDocVersion`으로 기록한다. 이후 `onDidChangeTextDocument` 콜백이 같은 URI에 대해 발생하면 `lastKnownDocVersion`을 갱신하고 webview에 `source-updated`를 브로드캐스트한다. 저장 시 webview는 자신이 본 마지막 버전(opened 시 받은 값 또는 가장 최근 source-updated의 version)을 `docVersion`으로 다시 보낸다.
- **외부 변경 감지**: `extension.ts activate()`에서 `vscode.workspace.onDidChangeTextDocument`를 한 번만 구독한다. 콜백에서 `EditSessionRegistry.findByUri(event.document.uri)`로 활성 세션 존재 여부를 O(1)로 확인하고, 있으면 panel.webview.postMessage로 `source-updated`를 발송. 자체 `applyEdit`로 인한 변경도 동일 이벤트가 발생하므로, controller가 본인 트랜잭션을 표시하는 `inFlightSaveToken`(URI 키)을 두어 cascade 알림을 억제한다.
- **충돌 모달**: 시스템 modal(`showWarningMessage` `{ modal: true }`)을 사용한다. 메시지: `"이 문서가 편집기 외부에서 변경되었습니다. 저장하시겠습니까?"` 본문 + detail에 `"덮어쓰기 시 다른 변경사항이 사라질 수 있습니다."`. 버튼은 `덮어쓰기` / `취소` 2개. `취소` 또는 dismiss → `save-result { ok: false, error: 'cancelled' }`. `덮어쓰기` → 새 `doc.version`으로 다시 검증(여전히 변동 가능)하고 강행 저장. webview는 `save-result.ok=false`이고 `error==='cancelled'`이면 별도 토스트 없이 편집 상태 유지.
- **Custom Editor webview 저장 버튼**: `customEditor.ts`(현재 스텁)에 form-js-editor 위 toolbar의 "저장" 버튼과 `Cmd+S` 키바인딩 핸들러를 추가하여, 현재 schema를 `editor.saveSchema()` 또는 `getSchema()`로 가져와 `postMessage({ type:'save-schema', uri, mdStart, mdEnd, schema, docVersion })`. `Cmd+S`는 webview 안에서 `keydown`을 캡처해 `event.preventDefault()` 후 동일 핸들러 호출(VSCode가 webview 포커스일 때 Cmd+S를 webview로 전달하므로 `vscode.commands.registerCommand('formJs.saveBlockEditor')`도 함께 등록하여 양 경로 보장).

## 파일 계획

**경로 기준:** 모든 파일 경로는 프로젝트 루트 기준.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-vscode-extension/src/editor/saveSchemaController.ts` | 저장 트랜잭션 컨트롤러 — `handleSaveSchema(msg, deps)` / 버전 검증 / 충돌 모달 호출 / `replaceFenceBody` + `applyEdit` 적용 / `save-result` 회신 / `inFlightSaveToken` 관리. deps 인터페이스로 vscode API 주입(테스트 분리). | 신규 |
| `packages/designer-vscode-extension/src/editor/sourceWatcher.ts` | `vscode.workspace.onDidChangeTextDocument` 구독 + `EditSessionRegistry`와 결합하여 활성 세션이 있는 URI에 대해서만 `source-updated` 브로드캐스트. cascade 억제(self-edit 무시). dispose 가능. | 신규 |
| `packages/designer-vscode-extension/src/editor/editSession.ts` | (TSK-02-01 신규 예정) `EditSession`에 `openedDocVersion`, `lastKnownDocVersion`, `pendingSaveTokens: Set<number>` 추가; `findByUri(uri)`, `updateLastKnownVersion(uri, v)`, `markSaveInFlight(uri, v)`/`clearSaveInFlight(uri, v)` 메서드 추가. | 수정(TSK-02-01에서 신규 후 본 Task에서 확장) |
| `packages/designer-vscode-extension/src/editor/customEditorProvider.ts` | (TSK-02-01 신규 예정) `resolveCustomTextEditor`에서 `EditSessionRegistry.beginSession` 직후 `doc.version`을 세션에 기록; `onDidReceiveMessage`에서 `save-schema` 분기 추가 → `saveSchemaController.handleSaveSchema` 호출. `source-updated` 브로드캐스트 메서드 노출. | 수정(의존 Task의 신규 파일을 본 Task에서 확장) |
| `packages/designer-vscode-extension/src/editor/customEditor.ts` | webview 측 — form-js-editor 위 toolbar에 `<button data-testid="form-js-save-button">저장</button>` 마운트, `keydown` 캡처로 `Cmd/Ctrl+S` 가로채 `event.preventDefault()` 후 동일 핸들러 호출. 핸들러: `editor.getSchema()` → `vscodeApi.postMessage({ type:'save-schema', uri, mdStart, mdEnd, schema, docVersion: lastKnownDocVersion })`. `message` 리스너로 `save-result` / `source-updated` 수신 — 전자는 토스트/에러 배너, 후자는 `lastKnownDocVersion = msg.version`으로 갱신. | 수정 |
| `packages/designer-vscode-extension/src/editor/conflictModal.ts` | 충돌 모달 wrapper — `showConflictModal(showWarningMessage)` 함수. 모달 텍스트·버튼 라벨 한 곳에 모음. 반환 `'overwrite' \| 'cancel'`. | 신규 |
| `packages/designer-vscode-extension/src/editor/index.ts` | `saveSchemaController`, `sourceWatcher`, `conflictModal` re-export. | 수정 |
| `packages/designer-vscode-extension/src/extension.ts` | `activate()`에서 `sourceWatcher.start(context, sessionRegistry)` 호출, `formJs.saveBlockEditor` 커맨드 등록(현재 활성 Custom Editor webview에 saveSchema 트리거 메시지 송신), `deactivate()`에서 watcher dispose. | 수정 |
| `packages/designer-vscode-extension/src/shared/messages.ts` | `SaveSchemaMessage`에 `uri: string`, `mdStart: number`, `mdEnd: number`, `docVersion: number` 추가; `SourceUpdatedMessage`에서 기존 `schema: string`을 제거(또는 deprecate)하고 `uri: string`, `version: number` 추가; 타입 가드 일관성 유지. | 수정 |
| `packages/designer-vscode-extension/package.json` | `contributes.commands[]`에 `{ "command": "formJs.saveBlockEditor", "title": "form-js: Save Block Editor" }` 추가; `contributes.keybindings[]`에 `{ "command": "formJs.saveBlockEditor", "key": "ctrl+s", "mac": "cmd+s", "when": "activeCustomEditorId == 'form-js.block-editor'" }` 추가. | 수정 |
| `packages/designer-vscode-extension/test/unit/editor/saveSchemaController.test.ts` | 정상 저장 / 버전 일치 / 버전 불일치 + overwrite / 버전 불일치 + cancel / fence 미발견 / applyEdit 실패 / inFlightSaveToken 분기 — 8+ 케이스. | 신규 |
| `packages/designer-vscode-extension/test/unit/editor/sourceWatcher.test.ts` | onDidChangeTextDocument fire → 세션 있는 URI만 source-updated 브로드캐스트, self-edit 토큰 검사 → 6+ 케이스. | 신규 |
| `packages/designer-vscode-extension/test/unit/editor/conflictModal.test.ts` | 모달 호출 인자(text/detail/modal:true/buttons), 사용자 응답 매핑(overwrite/cancel/dismiss). | 신규 |
| `packages/designer-vscode-extension/test/unit/messages-save.test.ts` | `SaveSchemaMessage`/`SourceUpdatedMessage` 타입 narrowing 컴파일·런타임 검증 (런타임은 `type` 분기 + 필드 존재 확인). | 신규 |
| `packages/designer-vscode-extension/test/setup/vscode-mock-impl.ts` | `workspace.onDidChangeTextDocument`/`workspace.applyEdit`/`window.showWarningMessage` mock 헬퍼 추가(EventEmitter, 호출 캡처). 기존 mock 파일이 없으면 본 Task에서 생성, 있으면 확장. | 수정 |
| `packages/designer-vscode-extension/test/integration/suite/saveAndConflict.test.ts` | `@vscode/test-electron` 통합 — (a) 정상 저장 → 파일 내용 diff에서 펜스 외 0바이트, (b) 외부 편집 후 저장 → 모달 stub 응답에 따라 저장/취소 분기 검증. | 신규 |
| `packages/designer-vscode-extension/test/fixtures/save-2space.md` | 2-space 들여쓰기 fixture(편집 전/후 비교용). | 신규 |
| `packages/designer-vscode-extension/test/fixtures/save-4space.md` | 4-space 들여쓰기 fixture. | 신규 |
| `packages/designer-vscode-extension/test/fixtures/save-crlf.md` | CRLF 라인엔딩 fixture(라인엔딩 보존 검증). | 신규 |

## 진입점 (Entry Points)

- **사용자 진입 경로**: VSCode에서 form-js 펜스 블록을 가진 `.md` 파일 열기 → `Cmd+Shift+V`로 Markdown 미리보기 열기 → `.form-js-block` 우상단 ✏️ 버튼 클릭 → ViewColumn.Two에 Custom Editor webview가 열림 → form-js-editor에서 필드 추가/수정 → toolbar의 "저장" 버튼 클릭 또는 Custom Editor 패널 포커스 상태에서 `Cmd+S` 누름 → (충돌 없으면) 원본 `.md` 파일의 해당 펜스 본문 JSON이 즉시 교체되고 webview에 "저장됨" 토스트 → (충돌이면) 시스템 modal "이 문서가 편집기 외부에서 변경되었습니다. 저장하시겠습니까?" 등장 → 사용자가 `덮어쓰기` 선택 시 강행 저장, `취소` 선택 시 webview에 변경 유지·파일 변경 없음.
- **URL / 라우트**: VSCode 커맨드 — `formJs.saveBlockEditor` (keybinding `Cmd+S` when `activeCustomEditorId == 'form-js.block-editor'`). webview ↔ extension 메시지 채널 — `save-schema` (req) / `save-result` (resp) / `source-updated` (push). Custom Editor viewType은 TSK-02-01에서 등록된 `form-js.block-editor`.
- **수정할 라우터 파일**:
  - `packages/designer-vscode-extension/package.json` — `contributes.commands[]`에 `formJs.saveBlockEditor` 커맨드 추가, `contributes.keybindings[]`에 `Cmd+S` 매핑 추가(`when`: `activeCustomEditorId == 'form-js.block-editor'`로 일반 에디터 저장과 충돌 회피).
  - `packages/designer-vscode-extension/src/extension.ts` — `activate()`에 `vscode.commands.registerCommand('formJs.saveBlockEditor', () => activeProvider.triggerSave())` 등록, `vscode.workspace.onDidChangeTextDocument` 구독 시작(`sourceWatcher.start`), 모두 `context.subscriptions`에 push.
- **수정할 메뉴·네비게이션 파일**:
  - `packages/designer-vscode-extension/src/editor/customEditor.ts` — Custom Editor webview의 toolbar에 "저장" 버튼 마운트 + `Cmd+S` keydown 캡처.
  - `packages/designer-vscode-extension/media/form-js-editor.css` — "저장" 버튼/토스트/에러 배너의 위치·테마 토큰 스타일 추가.
- **연결 확인 방법**: `fixtures/save-2space.md`를 VSCode에서 열고 Markdown preview 띄움 → `.form-js-block a.form-js-edit-button` 클릭 → ViewColumn.Two에 Custom Editor 패널 열림 → 패널 안의 `[data-testid="form-js-save-button"]` 클릭 → `applyEdit`이 호출되어 원본 `.md` 파일의 펜스 본문이 새 schema로 바뀌고, `save-result` 메시지 수신 후 webview에 `[data-testid="form-js-save-toast"]` 등장.

## 주요 구조

- **`saveSchemaController.handleSaveSchema(message, deps)`** (`saveSchemaController.ts`): 저장 트랜잭션 오케스트레이터. deps = `{ openTextDocument, applyEdit, showWarningMessage, sessionRegistry, blockLocator, replaceFenceBody, onResult, onSourceUpdate }`. 실행 흐름: openTextDocument → version 비교 → conflict 시 `conflictModal.show` → `markSaveInFlight(uri, expectedVersion)` → `locateFenceBody` → `replaceFenceBody` → `applyEdit` → `clearSaveInFlight` → `onResult(ok|error)`. 어떤 단계 실패도 catch하여 `{ ok:false, error }` 반환. Pure orchestration — 부수효과 모두 deps.
- **`sourceWatcher.start(context, sessionRegistry, dispatch)`** (`sourceWatcher.ts`): `vscode.workspace.onDidChangeTextDocument` 구독을 한 번만 등록. 콜백에서 `sessionRegistry.findByUri(event.document.uri)`로 활성 세션 조회 → 세션 있고 `pendingSaveTokens`에 `event.document.version`이 없으면 `dispatch.broadcast(uri, { type:'source-updated', uri, version:event.document.version })` 호출. context.subscriptions로 dispose 등록.
- **`EditSessionRegistry`** 확장 (`editSession.ts`): 기존 lock 메서드에 더해 `recordOpenedVersion(uri, v)`, `getLastKnownVersion(uri)`, `markSaveInFlight(uri, v)`, `clearSaveInFlight(uri, v)`, `findByUri(uri): EditSession | undefined` 추가. `EditSession`은 `{ mdStart, mdEnd, panel, openedDocVersion, lastKnownDocVersion, pendingSaveTokens: Set<number> }`.
- **`conflictModal.show(showWarningMessage)`** (`conflictModal.ts`): `showWarningMessage('이 문서가 편집기 외부에서 변경되었습니다. 저장하시겠습니까?', { modal: true, detail: '덮어쓰기 시 다른 변경사항이 사라질 수 있습니다.' }, '덮어쓰기', '취소')` 호출 → `'덮어쓰기' → 'overwrite' / '취소' | undefined → 'cancel'` 매핑.
- **customEditor.ts (webview)**: form-js-editor 인스턴스 위 toolbar에 `<button data-testid="form-js-save-button">저장</button>` 마운트, `keydown` 캡처로 `Cmd/Ctrl+S` 가로채 `event.preventDefault()` 후 동일 핸들러 호출. 핸들러: `editor.getSchema()` → `vscodeApi.postMessage({ type:'save-schema', uri, mdStart, mdEnd, schema, docVersion: lastKnownDocVersion })`.
- **`extension.ts`**: `activate()`에서 `sourceWatcher.start()` + `formJs.saveBlockEditor` 커맨드 등록. `deactivate()`에서 watcher dispose, sessionRegistry 정리.

## 데이터 흐름

**정상 저장**: 사용자가 webview 저장 버튼 클릭(또는 `Cmd+S`) → `customEditor.ts`가 `editor.getSchema()` → `postMessage({ type:'save-schema', uri, mdStart, mdEnd, schema, docVersion: lastKnownVer })` → provider `onDidReceiveMessage` → `saveSchemaController.handleSaveSchema` → `openTextDocument(uri)` → `doc.version === docVersion` 일치 → `markSaveInFlight(uri, doc.version)` → `locateFenceBody(doc, mdStart, mdEnd)` → `replaceFenceBody(doc, schema, range)` → `applyEdit(edit)` → `clearSaveInFlight` → `webview.postMessage({ type:'save-result', ok:true })` → webview 토스트 표시.

**충돌 분기**: 위와 동일하나 `doc.version !== docVersion` → `conflictModal.show()` 호출 → 사용자가 `덮어쓰기` 선택 → 현재 `doc.version` 재읽기 → `markSaveInFlight` → 같은 저장 경로. `취소` 또는 dismiss → `webview.postMessage({ type:'save-result', ok:false, error:'cancelled' })` → 파일 변경 0바이트.

**외부 변경 알림**: 사용자가 같은 `.md` 파일을 다른 에디터로 변경 → `vscode.workspace.onDidChangeTextDocument` fire → `sourceWatcher` 콜백 → `sessionRegistry.findByUri(uri)` → 활성 세션 발견 + `pendingSaveTokens`에 신 버전 없음 → `panel.webview.postMessage({ type:'source-updated', uri, version: doc.version })` → webview의 `lastKnownDocVersion` 갱신.

## 설계 결정 (대안이 있는 경우만)

### §1. 충돌 시 자동 병합 vs 사용자 확인
- **결정**: 항상 사용자에게 modal로 확인(덮어쓰기/취소 2버튼).
- **대안**: ours/theirs 자동 병합 또는 3-way diff UI 제공.
- **근거**: PRD constraints "자동 병합 금지"·TRD §5 명시. form-js 스키마는 트리 구조라 텍스트 3-way diff가 의미 보존을 깨뜨릴 위험이 크다.

### §2. docVersion을 webview가 보내는가, host가 자체 검증하는가
- **결정**: webview가 `lastKnownDocVersion`을 함께 보내고, host는 그 값과 현재 `doc.version`을 비교한다.
- **대안**: webview는 schema만 보내고 host가 `EditSession.openedDocVersion`만으로 검증.
- **근거**: source-updated 후 사용자가 "기존 변경사항을 그대로 저장"하기로 결정한 경우, 다음 저장에서 무조건 충돌이 뜨면 UX가 깨진다. webview가 본 마지막 버전을 보내는 방식이 의미 보존에 더 정확하다.

### §3. self-edit cascade 억제 방법
- **결정**: `EditSession.pendingSaveTokens: Set<number>`에 `markSaveInFlight(uri, expectedVersion)`로 신 버전 후보를 미리 등록하고, `onDidChangeTextDocument` 콜백에서 set에 있으면 source-updated를 발송하지 않고 제거.
- **대안**: 저장 후 일정 시간(예: 100ms) 동안 source-updated를 무시하는 debounce.
- **근거**: 시간 기반은 동시 외부 변경을 누락할 위험이 있다. 버전 토큰 기반은 결정론적이며, applyEdit 실패 시 clearSaveInFlight로 정확히 정리 가능.

### §4. `Cmd+S` 처리: webview keydown vs VSCode 커맨드 키바인딩
- **결정**: 둘 다. webview keydown에서 `event.preventDefault()` + 핸들러 호출 + `package.json contributes.keybindings`에 `formJs.saveBlockEditor` (when `activeCustomEditorId == 'form-js.block-editor'`) 등록.
- **대안**: 키바인딩만 등록.
- **근거**: VSCode webview의 keydown 처리 방식이 환경(Code/Cursor/Windsurf)별 미묘하게 다르다. 두 경로를 모두 두면 환경 호환성과 신뢰성을 동시에 확보.

### §5. `applyEdit` 실패 시 재시도 vs 즉시 에러 회신
- **결정**: 즉시 에러 회신 (`{ ok:false, error:'applyEdit failed' }`). `clearSaveInFlight`로 토큰 정리 + Custom Editor에 에러 배너 + 원본 파일 변경 0바이트 보장.
- **대안**: 1회 자동 재시도 후 실패 시 에러.
- **근거**: applyEdit 실패의 흔한 원인은 즉시 발생한 외부 변경이며, 재시도해도 결과가 같거나 충돌 모달과 중복된다.

## 선행 조건
- **TSK-02-02** (`[dd]`): `blockLocator.locateFenceBody`, `detectIndent`, `formatJson`, `replaceFenceBody` API 시그니처 확정.
- **TSK-02-03** (`[dd]`): `request-edit` 송신과 `EditClosedMessage` 타입이 messages.ts에 추가되어 있어야 `SaveSchemaMessage` 확장이 깨지지 않음.
- **TSK-02-01** (`[dd]`): `EditSessionRegistry`, `FormJsBlockEditorProvider`, `customEditor.ts` webview 부팅이 신규 파일로 존재해야 본 Task가 확장 가능. **본 Task build는 TSK-02-01 build 완료 후에만 시작 가능**.
- 외부 라이브러리: `@bpmn-io/form-js-editor` ^1.21.2의 `getSchema()` API. `vscode` ^1.85.0의 `workspace.onDidChangeTextDocument`, `workspace.applyEdit`, `window.showWarningMessage(modal)`.

## 리스크

- **HIGH — TSK-02-01 build 미완 의존**: 본 설계는 `EditSessionRegistry`, `FormJsBlockEditorProvider`, `customEditor.ts` 부팅 코드가 존재한다고 가정한다. 의존 Task들의 build가 완료되어야 본 Task build 시작 가능.
- **HIGH — `onDidChangeTextDocument` self-edit 무한 루프**: `applyEdit`이 발생시키는 변경 이벤트를 source-updated로 흘리면 webview가 불필요한 알림을 받는다. `pendingSaveTokens` 토큰 매칭이 정확해야 하며, controller의 try/finally로 clearSaveInFlight 누락 방지.
- **HIGH — 충돌 모달 응답 동안 추가 외부 변경 발생**: 모달이 떠 있는 동안 다른 외부 변경이 발생하면 사용자가 "덮어쓰기"를 눌렀을 때 다시 다른 버전의 doc을 저장하게 된다. 컨트롤러는 모달 후 `openTextDocument`를 다시 호출해 최신 버전으로 진행한다.
- **MEDIUM — `Cmd+S` 키바인딩 환경 호환성**: VSCode·Cursor·Windsurf의 webview keydown 전달 방식이 미묘히 다르다. 키바인딩과 webview keydown 캡처 둘 다로 완화.
- **MEDIUM — schema 직렬화**: form-js-editor의 `getSchema()`가 객체를 반환하므로 `SaveSchemaMessage.schema` 타입을 `string | unknown`으로 정의하여 dev-build가 명시적으로 분기.
- **LOW — `showWarningMessage` modal의 OS별 외관 차이**: 동작은 동일. 텍스트만 통일.
- **LOW — `activeCustomEditorId` context key 이름**: VSCode 1.85+에서 정확한 키 이름 검증 후 적용.

## QA 체크리스트
dev-test 단계에서 검증할 항목.

- [ ] (정상 — 저장 성공) Custom Editor에서 필드 1개 추가 후 저장 버튼 클릭 → 원본 `.md` 파일의 펜스 본문이 새 스키마로 교체되고, webview가 `save-result { ok:true }` 토스트를 표시한다.
- [ ] (정상 — 펜스 외 무변경) 저장 전후 파일을 byte diff했을 때 펜스 본문 외 영역(주변 라인·빈 줄·라인엔딩)은 0바이트 변경.
- [ ] (정상 — 들여쓰기 보존) 2-space 들여쓰기 fixture와 4-space 들여쓰기 fixture에서 저장 결과 JSON의 들여쓰기가 원본 문서 우세값과 일치한다.
- [ ] (정상 — CRLF 보존) CRLF 라인엔딩 fixture에서 저장 후에도 모든 라인엔딩이 CRLF로 유지된다.
- [ ] (정상 — Cmd+S) Custom Editor 패널 포커스 상태에서 `Cmd+S`/`Ctrl+S` keydown → 동일 저장 경로가 호출된다.
- [ ] (충돌 — 모달 등장) 편집 중 같은 `.md` 파일을 외부에서 수정한 뒤 저장 시도 → `showWarningMessage`가 `{ modal: true, detail: '...' }` + `덮어쓰기`/`취소` 2버튼으로 호출된다.
- [ ] (충돌 — 덮어쓰기) 충돌 모달에서 `덮어쓰기` 선택 시 → `applyEdit`이 호출되고 webview는 `save-result { ok:true }`를 받는다.
- [ ] (충돌 — 취소) 충돌 모달에서 `취소`(또는 dismiss) 시 → `applyEdit` 호출 없음, 파일 변경 0바이트, webview는 `save-result { ok:false, error:'cancelled' }`를 받고 편집 상태 유지.
- [ ] (외부 변경 알림) 활성 EditSession이 있는 `.md` 파일이 외부에서 변경되면 Custom Editor webview는 `source-updated { uri, version }` 메시지를 수신한다. self-edit(applyEdit) 결과로 발생한 경우는 수신하지 않는다.
- [ ] (에러 — fence 미발견) 저장 시 펜스 블록을 찾지 못하면 `applyEdit` 호출 없이 `save-result { ok:false, error:'fence not found' }` 회신, 원본 파일 무변경, Custom Editor에 에러 배너 표시.
- [ ] (에러 — applyEdit 실패) `workspace.applyEdit`이 false 반환 또는 throw 시 `save-result { ok:false, error }` 회신, 원본 파일 무변경, `pendingSaveTokens`에서 in-flight 토큰이 정리된다.
- [ ] (idempotency — 중복 저장) 같은 schema로 연속 저장 2회 → webview는 두 번 모두 `save-result { ok:true }` 수신.
- [ ] (성능) 정상 저장 1회 round-trip이 로컬 dev에서 200ms 이내, 충돌 모달 표시까지 300ms 이내.
- [ ] (타입 안정성) `SaveSchemaMessage`에 `uri/mdStart/mdEnd/docVersion`이 포함된 상태에서 `npm -w @form-js-designer/designer-vscode-extension run typecheck` 통과.
- [ ] (자원 정리) 확장 deactivate 시 `sourceWatcher.dispose()` 호출되어 onDidChangeTextDocument 핸들이 해제되고, 다음 activate에서 중복 구독이 발생하지 않는다.

**fullstack/frontend Task 필수 항목 (E2E 테스트에서 검증 — dev-test reachability gate):**
- [ ] (클릭 경로) `fixtures/save-2space.md` 열기 → `Cmd+Shift+V`로 Markdown preview 열기 → preview webview의 `.form-js-block a.form-js-edit-button` 클릭 → ViewColumn.Two에 Custom Editor 패널 등장 → 패널 webview의 `[data-testid="form-js-save-button"]` 클릭 → `save-result` 수신·파일 변경 확인. URL 직접 입력 금지.
- [ ] (화면 렌더링) Custom Editor webview에서 form-js-editor 위 toolbar의 "저장" 버튼이 보이고 클릭 가능하며, 저장 후 토스트 텍스트가 변경되는 것을 확인. 충돌 시나리오에서는 시스템 modal이 등장하여 "덮어쓰기"·"취소" 버튼이 보이는 것을 확인.
