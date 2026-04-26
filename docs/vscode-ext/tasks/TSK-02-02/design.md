# TSK-02-02: blockLocator + detectIndent + formatJson - 설계

## 요구사항 확인

- `blockLocator.locateFenceBody(doc, mdStart, mdEnd)` — 펜스 블록 본문(여는 ` ```form-js ` 라인·닫는 ` ``` ` 라인 제외)의 `vscode.Range`를 반환한다. TSK-00-02 뼈대에서 이미 구현됨; **export 형태를 네임스페이스 객체(`blockLocator`)로 재구성**하고 API 계약을 공식화한다.
- `detectIndent(doc, startPos)` — 특정 `startPos`(펜스 시작 위치)를 기준으로 근접 줄들의 들여쓰기를 샘플링해 2 또는 4 space를 반환한다. 현재 구현은 `startPos` 인자가 없으므로 **시그니처 확장**이 필요하다.
- `formatJson(schema, indent)` — `JSON.stringify(schema, null, indent)` + **말미 newline 정책 일치** (교체 Range가 trailing newline 없이 끝나도 실제 파일 라인엔딩이 변하지 않도록 보장). CRLF 파일에서 LF 강제 변환 금지.

## 타겟 앱

- **경로**: N/A (단일 앱) — `packages/designer-vscode-extension`
- **근거**: vscode extension 패키지 단일 구조, `src/editor/` 하위에 위치

## 구현 방향

- `src/editor/blockLocator.ts`: 기존 `locateFenceBody` 함수를 유지하되, **`blockLocator` 네임스페이스 객체 export를 추가**하여 `blockLocator.locateFenceBody(...)` 호출 형태를 지원한다 (기존 named export 동시 유지 — 하위 호환). 파라미터명 `_mdEnd` → `mdEnd`로 복원(PRD 계약 시그니처).
- `src/editor/workspaceEdit.ts`: `detectIndent(doc, startPos?)` 로 시그니처를 확장한다. `startPos` 제공 시 인접 줄(± 20줄)을 우선 샘플링하고, 판정 불가 시 전체 문서로 폴백한다. 기존 동작(전체 문서 샘플링)은 유지 — 하위 호환.
- `formatJson`: 입력 `schema`가 `string`이면 파싱 후 재직렬화, 객체/배열이면 `JSON.stringify` 직접 적용. 말미 `\n` 추가 여부는 `trailingNewline` 옵션(default `false`)으로 제어. CRLF 보존은 VSCode `WorkspaceEdit.replace` 호출 시 TextDocument API가 자동 처리하므로 `formatJson` 내부에서 별도 변환 금지.
- 단위 테스트 `test/unit/blockLocator.test.ts`, `test/unit/workspaceEdit.test.ts`를 확장하여 총 15+ 케이스를 확보한다.

## 파일 계획

**경로 기준:** 프로젝트 루트 기준.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-vscode-extension/src/editor/blockLocator.ts` | `blockLocator` 네임스페이스 객체 export 추가; `_mdEnd` → `mdEnd` 파라미터명 복원; JSDoc 정식화 | 수정 |
| `packages/designer-vscode-extension/src/editor/workspaceEdit.ts` | `detectIndent(doc, startPos?)` 시그니처 확장; `formatJson` 말미 newline 옵션 추가; CRLF 주의 주석; `replaceFenceBody` 내부에서 `startPos=range.start` 전달 | 수정 |
| `packages/designer-vscode-extension/src/editor/index.ts` | `blockLocator` 객체 re-export 추가 | 수정 |
| `packages/designer-vscode-extension/test/unit/blockLocator.test.ts` | 9+ 케이스로 확장: 빈 줄 주변, CRLF 라인 텍스트, `blockLocator.locateFenceBody` 객체 호출 형태 등 | 수정 |
| `packages/designer-vscode-extension/test/unit/workspaceEdit.test.ts` | 6+ 케이스 추가: `detectIndent(doc, startPos)` 지역 샘플링, `formatJson` trailing newline, 객체 직접 입력, CRLF stub 등 | 수정 |

## 진입점 (Entry Points)

N/A — domain=backend, 비-UI Task.

## 주요 구조

- **`blockLocator` 객체** (`src/editor/blockLocator.ts`): `export const blockLocator = { locateFenceBody }` 형태의 네임스페이스 객체. 기존 `export function locateFenceBody(...)` named export도 동시 유지.
- **`locateFenceBody(doc, mdStart, mdEnd)`** (`src/editor/blockLocator.ts`): 힌트(mdStart) 우선 탐색 → 실패 시 전체 문서 선형 폴백 → 미발견 시 `FenceNotFoundError`. `mdEnd`는 PRD 계약 시그니처이므로 이름 복원 (`_mdEnd` 제거).
- **`detectIndent(doc, startPos?)`** (`src/editor/workspaceEdit.ts`): `startPos`(`{ line: number }` 인터페이스 — vscode.Position mock 호환) 제공 시 `[startPos.line - SAMPLE_RADIUS, startPos.line + SAMPLE_RADIUS]` 범위 우선 샘플링, 미판정(카운터 모두 0)이면 전체 문서 폴백. 반환 `2 | 4`.
- **`formatJson(schema, indent, opts?)`** (`src/editor/workspaceEdit.ts`): `schema`가 `string`이면 `JSON.parse` 후 `JSON.stringify`, 아니면 바로 `JSON.stringify`. `opts.trailingNewline`(default `false`) true 시 결과 끝에 `\n` 추가. 파싱 실패 시 원본 문자열 반환.
- **`replaceFenceBody(doc, schema, range)`** (`src/editor/workspaceEdit.ts`): 기존 함수 — `detectIndent(doc, range.start)` + `formatJson(schema, indent)` 조합. `range.start` 를 `startPos`로 전달하도록 내부 업데이트.

## 데이터 흐름

`save-schema` 메시지 수신 → `locateFenceBody(doc, mdStart, mdEnd)` → Range 확보 → `detectIndent(doc, range.start)` → indent(2|4) → `formatJson(schema, indent)` → `WorkspaceEdit.replace(uri, range, formatted)` → `applyEdit`.

## 설계 결정 (대안이 있는 경우만)

- **결정**: `detectIndent`에 `startPos?` optional 파라미터를 추가해 기존 전체-문서 샘플링을 폴백으로 유지
- **대안**: `startPos` 필수 파라미터로 변경 (하위 호환 깨짐)
- **근거**: `replaceFenceBody`가 이미 `range`를 알고 있으므로 `startPos`를 전달하는 것이 자연스럽고, 기존 테스트를 깨지 않으면서 PRD 시그니처를 충족한다.

---

- **결정**: `formatJson`의 `schema` 파라미터 타입을 `string | unknown`으로 확장 (객체 직접 전달 허용)
- **대안**: `string`만 받고 호출자가 `JSON.stringify` 책임
- **근거**: `save-schema` 메시지에서 `schema`가 이미 파싱된 객체로 올 수 있으므로 유연성 확보. 내부에서 `typeof schema === 'string'` 분기.

---

- **결정**: CRLF 처리는 별도 변환 로직 없이 VSCode TextDocument API의 `WorkspaceEdit.replace` 위임
- **대안**: `formatJson` 내부에서 CRLF 감지 후 변환
- **근거**: VSCode는 파일의 EOL을 `TextDocument.eol`로 관리하며 `applyEdit` 시 파일 설정을 유지한다. 별도 변환은 오히려 EOL을 강제하는 역효과를 낸다.

## 선행 조건

- TSK-00-02 (`[xx]`) 완료 — `blockLocator.ts`, `workspaceEdit.ts` 뼈대 존재 (이미 완료됨)
- `test/setup/vscode-mock-impl.ts`의 `Position`/`Range` mock 존재 (이미 존재)
- Vitest alias `vscode` → `test/setup/vscode-mock-impl.ts` 설정 (이미 설정됨)

## 리스크

- **LOW**: `detectIndent`의 `startPos` 파라미터를 `vscode.Position` 타입이 아닌 `{ line: number }` 인터페이스로 정의해야 테스트 stub과 호환된다. `vscode.Position` import 시 테스트 환경 타입 불일치 가능성.
- **LOW**: `formatJson`에서 `schema`를 `unknown` 타입으로 받으면 `JSON.parse` 경로를 타지 않고 `JSON.stringify`를 바로 호출하므로 기존 테스트(문자열 입력)와 동작이 달라질 수 있다. 타입 분기(`typeof schema === 'string'`)로 처리.
- **LOW**: `blockLocator.ts`에서 `_mdEnd` → `mdEnd`로 파라미터명 변경 시 ESLint `no-unused-vars` 경고 가능. `/* mdEnd is reserved for future hint-range validation */` 주석 또는 명시적 `void mdEnd` 처리.
- **MEDIUM**: CRLF 픽스처(`\r\n`)를 TextDocument stub에서 표현 시 `lineAt().text`는 줄 바꿈 문자를 포함하지 않아야 한다 (VSCode 실제 동작). 테스트 stub 설계 시 CRLF 파일의 각 줄을 `\r` 없이 반환하도록 정의하고, 이것이 "CRLF 보존" 수용 조건과 일치함을 주석으로 명시한다.

## QA 체크리스트

### locateFenceBody (blockLocator.test.ts)

- [ ] 힌트(mdStart)가 정확할 때 펜스 본문의 시작 줄이 `mdStart+1`, 끝 줄이 닫는 ` ``` ` 직전 줄임을 확인
- [ ] 힌트 앞에 빈 줄이 여러 개 있어도 `mdStart` 정확 일치 시 올바른 Range를 반환
- [ ] 펜스 본문 뒤에 빈 줄이 여러 개 있는 경우 Range의 end가 올바른 줄을 가리킴
- [ ] 힌트가 틀릴 때(라인 이동 발생) 전체 문서 폴백으로 첫 번째 `form-js` 펜스를 반환
- [ ] 멀티 블록 문서에서 힌트가 두 번째 블록을 가리키면 두 번째 블록 Range를 반환
- [ ] 빈 펜스(여는 줄 바로 뒤에 닫는 줄)에서 isEmpty인 Range를 반환
- [ ] `form-js` 펜스 없는 문서에서 `FenceNotFoundError`를 throw
- [ ] 다른 언어 펜스(` ```typescript `)는 무시하고 `FenceNotFoundError`를 throw
- [ ] `blockLocator.locateFenceBody(doc, mdStart, mdEnd)` 객체 메서드 호출 형태도 named export와 동일하게 동작

### detectIndent (workspaceEdit.test.ts)

- [ ] 2-space 문서에서 2를 반환
- [ ] 4-space 문서에서 4를 반환
- [ ] 2/4-space 혼재 시 우세값을 반환
- [ ] 동점 시 2를 반환(기본값)
- [ ] 들여쓰기 없는 문서에서 2를 반환(기본값)
- [ ] `startPos` 제공 시 해당 위치 ± 20줄 범위의 우세값을 반환 (전체 문서 통계와 의도적으로 다른 지역 문서로 검증)
- [ ] `startPos` 미제공 시 전체 문서 샘플링 기존 동작 유지

### formatJson (workspaceEdit.test.ts)

- [ ] indent=2로 2-space 포맷 JSON 반환
- [ ] indent=4로 4-space 포맷 JSON 반환
- [ ] 유효하지 않은 JSON 문자열 입력 시 원본 반환 (크래시 없음)
- [ ] 빈 객체 `{}` 포맷 → `{}`
- [ ] 배열 포맷
- [ ] `trailingNewline: true` 옵션 시 결과 끝에 `\n` 포함
- [ ] `trailingNewline: false`(기본) 시 결과 끝에 `\n` 없음
- [ ] 객체 직접 입력(`{ type: 'default' }`)도 올바르게 직렬화

### 통합 (workspaceEdit.test.ts)

- [ ] `detectIndent(doc, range.start)` + `formatJson(schema, indent)` 조합이 2-space 문서에서 2-space 결과를 반환
- [ ] `detectIndent(doc, range.start)` + `formatJson(schema, indent)` 조합이 4-space 문서에서 4-space 결과를 반환
- [ ] `replaceFenceBody` 호출 후 반환된 `WorkspaceEdit`에 replace 연산 1개가 포함됨
