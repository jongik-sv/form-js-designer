# TSK-02-05: 통합 테스트 확장 — 편집 시나리오 전수 - 설계

## 요구사항 확인
- `@vscode/test-electron` 기반 통합 테스트 4종 신규 작성: ✏️ 클릭 → Custom Editor 오픈, 필드 추가 후 저장 → 펜스 외 0바이트, 다중 블록 single-editor lock, 버전 충돌 경고 모달.
- 2-space·4-space 들여쓰기 파일 각각의 저장 결과를 diff로 비교하여 펜스 외 라인이 바이트 동일함을 검증.
- WP-02 완료 게이트: CI에서 4개 케이스 모두 flaky 없이 통과해야 한다.

## 타겟 앱
- **경로**: `packages/designer-vscode-extension`
- **근거**: `@vscode/test-electron` 통합 테스트, fixture 파일, Mocha suite 진입점이 모두 이 패키지에 집중된다.

## 구현 방향
- 기존 `test/integration/suite/index.ts`(Mocha runner)가 `suite/*.test.js`를 자동 glob-import하므로 새 파일을 `test/integration/suite/editScenarios.test.ts`에 추가하면 기존 runner 수정 없이 자동 등록된다.
- 4종 케이스를 단일 파일 `editScenarios.test.ts`에 `suite()` 블록으로 묶어 독립성 유지.
- fixture 파일은 TSK-02-04 설계에서 이미 `save-2space.md` / `save-4space.md` / `save-crlf.md`가 계획됐으므로 해당 파일을 그대로 재활용하되, 본 Task에서 최종 fixture 내용을 확정하여 생성한다.
- 케이스 3(single-editor lock)·케이스 4(버전 충돌 모달)는 extension host API(`EditSessionRegistry` 직접 조회, `save-result` 메시지 수신)를 통해 검증하며, `@vscode/test-electron` 환경 안에서 실행한다.
- `helpers/` 하위에 재사용 유틸(`openCustomEditor`, `waitForMessage`, `byteCompareFence`)을 분리하여 각 케이스에서 임포트한다.

## 파일 계획

**경로 기준:** 모든 파일 경로는 프로젝트 루트 기준.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-vscode-extension/test/integration/suite/editScenarios.test.ts` | 통합 테스트 메인 파일. 케이스 1~4를 `suite()` 블록으로 구성. `@vscode/test-electron` Mocha 환경 안에서 실행. | 신규 |
| `packages/designer-vscode-extension/test/integration/helpers/openCustomEditor.ts` | `vscode.commands.executeCommand('formJs.openBlockEditor', uri, blockIndex)` 호출 후 `waitForElement`로 `editSessionRegistry.getActive(uri)` 폴링 → `EditSession` 반환 헬퍼. | 신규 |
| `packages/designer-vscode-extension/test/integration/helpers/waitForMessage.ts` | Custom Editor webview ↔ extension host 메시지(`save-result`, `source-updated` 등) 수신 대기 Promise 헬퍼. 타임아웃 시 Error throw. | 신규 |
| `packages/designer-vscode-extension/test/integration/helpers/byteCompareFence.ts` | fixture 파일 저장 전·후 전체 바이트를 읽어 펜스 범위 밖 바이트를 비교하고 diff 바이트 수를 반환하는 순수 함수. | 신규 |
| `packages/designer-vscode-extension/test/fixtures/save-2space.md` | 2-space 들여쓰기 form-js 펜스 블록을 포함한 Markdown fixture. 저장 전·후 비교용. | 신규 |
| `packages/designer-vscode-extension/test/fixtures/save-4space.md` | 4-space 들여쓰기 fixture. 동일 구조이나 JSON 들여쓰기 4-space. | 신규 |
| `packages/designer-vscode-extension/test/fixtures/save-crlf.md` | CRLF 라인엔딩 fixture. 라인엔딩 보존 검증용. | 신규 |
| `packages/designer-vscode-extension/test/fixtures/multi-block-edit.md` | 같은 파일에 form-js 펜스 블록이 2개 포함된 fixture. 케이스 3(single-editor lock) 전용. | 신규 |
| `packages/designer-vscode-extension/test/integration/suite/index.ts` | 기존 Mocha runner — `*.test.js` glob auto-discovery. `editScenarios.test.ts` 자동 포함. 타임아웃을 60000ms로 상향 조정. | 수정 |

## 진입점 (Entry Points)

N/A (domain=test, 비-UI Task)

## 주요 구조

- **`editScenarios.test.ts` — suite "Form JS Edit Scenarios (TSK-02-05)"**
  - **케이스 1**: fixture `save-2space.md` 열기 → `openMarkdownPreview(uri)` → `vscode.commands.executeCommand('formJs.openBlockEditor', uri, 0)` → `waitForElement(() => editSessionRegistry.getActive(uri.toString()))` → session defined assert.
  - **케이스 2**: `save-2space.md` 원본 버퍼 스냅샷 → `openCustomEditor(uri)` → extension host에 `{ type: 'save-schema', uri, mdStart, mdEnd, schema, docVersion }` 메시지 주입 → `waitForMessage('save-result')` → 파일 재읽기 → `byteCompareFence(before, after, { mdStart, mdEnd })` === 0 assert. 2-space·4-space 두 subcase.
  - **케이스 3**: `multi-block-edit.md` 열기 → 첫 번째 블록으로 `openCustomEditor(uri, 0)` → 두 번째 블록으로 `openCustomEditor(uri, 1)` 시도 → `editSessionRegistry.getActive(uri)` panel이 동일(두 번째 lock 거절) 또는 두 번째 panel이 dispose assert.
  - **케이스 4**: `save-2space.md` 편집 중 `vscode.workspace.fs.writeFile`로 파일 외부 변경 → `save-schema` 메시지 전송(stale docVersion) → `waitForMessage('save-result', { ok: false })` 수신 assert(모달 interactive 환경 제약으로 모달 등장 직전 단계까지 검증).
- **`openCustomEditor(uri, blockIndex?)` 헬퍼**: extension host `formJs.openBlockEditor` 커맨드 호출 + `waitForElement` 폴링. `EditSession` 반환.
- **`waitForMessage(topic, matcher?, timeoutMs?)` 헬퍼**: extension host 측 메시지 수집 브릿지(테스트 환경용 `EventEmitter` 구독) 또는 `editSessionRegistry`의 결과 이벤트를 폴링. 타임아웃 15000ms 기본.
- **`byteCompareFence(before: Buffer, after: Buffer, fenceRange: {startLine: number, endLine: number})` 헬퍼**: 파일 전체 바이트에서 펜스 범위 밖 바이트를 추출해 `Buffer.compare`로 비교. 차이 바이트 수 반환.

## 데이터 흐름

테스트 셋업 → fixture 파일 오픈(`vscode.workspace.openTextDocument`) → extension host의 `EditSessionRegistry` + `FormJsBlockEditorProvider`(동일 Node 프로세스) → 메시지 주입/수신으로 저장 사이클 완전 순회 → 파일 시스템 재읽기 + 바이트 diff assert로 기대 동작 검증 → `teardown`에서 `editSessionRegistry.disposeAll()` + 파일 복원.

## 설계 결정 (대안이 있는 경우만)

### §1. 케이스별 파일 vs 단일 파일
- **결정**: 케이스 1~4를 `editScenarios.test.ts` 한 파일에 모두 작성.
- **대안**: 케이스별 별도 파일 (4개).
- **근거**: 케이스 수가 4개로 적고 각 케이스는 독립 `setup/teardown`으로 정리되므로 한 파일이 유지보수에 유리하다.

### §2. 케이스 4 모달 검증 범위
- **결정**: `@vscode/test-electron` headless 환경에서 `showWarningMessage({ modal: true })` 차단 회피를 위해, 모달 등장 직전 단계(docVersion mismatch → `save-result { ok: false }` 수신)까지만 검증.
- **대안**: `showWarningMessage` mock 주입으로 응답 제어.
- **근거**: 실제 VSCode API가 동작하는 통합 환경에서 시스템 modal stub 주입이 불안정하다. docVersion mismatch 경로 자체는 단위 테스트(`saveSchemaController.test.ts`)에서 완전 커버하므로 통합에서는 진입 경로 확인으로 충분하다.

### §3. `byteCompareFence` 구현
- **결정**: Node `Buffer` 단위 비교, 펜스 범위 라인 경계를 `\n` 검색으로 계산.
- **대안**: 라인 단위 텍스트 diff.
- **근거**: 수용 기준이 "바이트 동일"이므로 텍스트 diff보다 바이트 단위 비교가 명세를 더 정확히 충족한다.

## 선행 조건
- **TSK-02-04** (`[dd]`): `saveSchemaController`, `sourceWatcher`, `conflictModal`, `editSession` 확장, `package.json` 커맨드/키바인딩 등록 구현 완료 후 케이스 2~4 실행 가능.
- **TSK-02-01** (`[dd]`): `EditSessionRegistry`, `FormJsBlockEditorProvider`, `formJs.openBlockEditor` 커맨드가 실제로 동작해야 케이스 1~4 모두 실행 가능.
- **TSK-02-02** (`[dd]`): `replaceFenceBody`, `detectIndent`, `formatJson` 구현 완료 후 저장 diff 검증 의미 있음.
- 외부 라이브러리: `@vscode/test-electron` ^2.4.1, `mocha` ^11.1.0, `glob` ^11 (이미 `devDependencies`에 포함).

## 리스크

- **HIGH — webview 메시지 직접 접근 불가**: Custom Editor webview는 별도 iframe 프로세스이므로 `editSessionRegistry`(동일 Node 프로세스) 상태 조회 + `waitForMessage`(extension host 이벤트 수집) 조합으로 간접 검증. 케이스 2·4는 이 구조가 정확히 구현되어야 함.
- **HIGH — 모달 interactive 블로킹**: `showWarningMessage({ modal: true })`는 headless CI에서 타임아웃 원인이 된다. 케이스 4 범위를 모달 진입 전 단계(docVersion mismatch 확인 + `save-result ok:false` 수신)로 제한하여 차단.
- **MEDIUM — flakiness: 비동기 타이밍**: `waitForElement` / `waitForMessage` 폴링 타임아웃을 15,000ms, Mocha 개별 테스트 타임아웃을 60,000ms로 설정하여 CI 간헐적 실패 방지.
- **MEDIUM — `save-crlf.md` Git LF 변환**: `.gitattributes`에 `test/fixtures/save-crlf.md -text` 추가 필요. 또는 테스트 셋업에서 `\r\n`을 직접 기록하는 헬퍼 사용.
- **LOW — TSK-02-04 build 미완 시 케이스 2·3·4 타임아웃**: CI 파이프라인에서 TSK-02-04 build 완료 후 본 테스트 실행을 보장해야 함.

## QA 체크리스트
dev-test 단계에서 검증할 항목.

- [ ] (케이스 1) `save-2space.md` 열고 `formJs.openBlockEditor` 커맨드 실행 시 `editSessionRegistry.getActive(uri)` 가 15초 이내에 defined로 확인된다.
- [ ] (케이스 2-a) `save-2space.md`에서 저장 후 `byteCompareFence` 결과가 0바이트이다.
- [ ] (케이스 2-b) `save-4space.md`에서 저장 후 `byteCompareFence` 결과가 0바이트이며, 저장된 JSON 첫 번째 key 들여쓰기가 `    "` (4-space)이다.
- [ ] (케이스 2-c) 2-space fixture와 4-space fixture 저장 JSON의 들여쓰기가 서로 다름을 assert한다.
- [ ] (케이스 3) `multi-block-edit.md`에서 첫 번째 블록 편집 중 두 번째 블록 편집 요청 시 `editSessionRegistry.beginSession` lock 거절이 발생하여 두 번째 panel이 dispose된다.
- [ ] (케이스 4) `save-2space.md` 편집 중 외부 파일 변경 후 stale docVersion으로 `save-schema` 전송 → `save-result { ok: false }` 수신.
- [ ] (`byteCompareFence` 유틸 단위) 펜스 밖 바이트를 수동 변경한 before/after에 non-zero diff 반환, 펜스 안만 변경한 경우 zero diff 반환.
- [ ] (fixture 인코딩) `save-crlf.md`의 모든 라인엔딩이 CRLF(`\r\n`)임을 Buffer에서 직접 확인한다.
- [ ] (CI 통과) `npm run test:e2e` 실행 시 신규 `editScenarios` suite의 케이스 4개가 모두 pass.
- [ ] (flaky 없음) 동일 케이스 3회 연속 실행 시 모두 pass.
- [ ] (타입 안정성) `editScenarios.test.ts` 및 helpers 파일이 `npm -w @form-js-designer/designer-vscode-extension run typecheck` 통과.
