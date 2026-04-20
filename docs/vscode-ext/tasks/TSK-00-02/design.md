# TSK-00-02: 공유 유틸·타입 (schemaHash, messages, JSON 포맷 유틸) - 설계

## 요구사항 확인

- `src/shared/schemaHash.ts`에서 키 순서에 무관한 안정적 SHA-256(12자 prefix) 해시를 제공하여 동일 스키마의 렌더 인스턴스를 재사용한다.
- `src/shared/messages.ts`에서 webview ↔ extension 간 postMessage 타입 5종(`request-edit`, `edit-opened`, `save-schema`, `save-result`, `source-updated`)을 단일 소스로 정의한다.
- `src/editor/blockLocator.ts`와 `src/editor/workspaceEdit.ts`에서 펜스 블록 Range 재탐지 및 들여쓰기 감지·JSON 포맷 유틸을 제공하여 WorkspaceEdit가 들여쓰기를 보존하며 블록 본문을 교체할 수 있게 한다.
- 모든 함수는 TypeScript 순수 함수로 구현하며, 외부 의존성 없이 Node.js 내장 `crypto`만 사용한다.

## 타겟 앱

- **경로**: `packages/designer-vscode-extension` (TSK-00-01에서 스캐폴드될 패키지)
- **근거**: TRD §2 패키지 레이아웃에 `packages/designer-vscode-extension/src/shared/`, `src/editor/` 경로가 명시되어 있으며, 이 Task의 모든 파일이 해당 패키지에 위치한다.

## 구현 방향

- `schemaHash`: 입력 JSON 문자열(또는 객체)을 키 정렬 후 재직렬화하여 Node `crypto.createHash('sha256')` 로 해시한 뒤 hex 앞 12자를 반환한다. 함수 시그니처는 `schemaHash(input: string | object): string`.
- `messages.ts`: 5종 메시지를 판별 유니온 타입(`FormJsMessage`)으로 정의한다. 각 메시지 방향(`webview→ext` / `ext→webview`)도 주석으로 명시한다.
- `blockLocator.ts`: `mdStart`/`mdEnd` 힌트로 TextDocument를 재스캔하여 ` ```form-js ` 여는 줄 다음 줄부터 닫는 ` ``` ` 바로 전 줄까지의 `vscode.Range`를 반환한다. 힌트가 틀렸을 때(재편집으로 이동) 전체 문서를 선형 탐색하여 새 위치를 찾는 폴백 로직을 포함한다.
- `detectIndent` / `formatJson`: 주어진 Range 내 들여쓰기 문자를 샘플링하여 2/4-space 우세값을 결정하고, 해당 indent로 JSON을 재포맷한다. 혼재 시 더 많이 등장한 쪽을 채택한다.

## 파일 계획

**경로 기준:** 모든 파일 경로는 **프로젝트 루트 기준**으로 작성한다.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-vscode-extension/src/shared/schemaHash.ts` | 키-정렬 안정 해시 함수 + 해시 정책 JSDoc 주석 | 신규 |
| `packages/designer-vscode-extension/src/shared/messages.ts` | webview ↔ extension postMessage 판별 유니온 타입 5종 | 신규 |
| `packages/designer-vscode-extension/src/editor/blockLocator.ts` | TextDocument에서 fence 블록 Range 재탐지 (`locateFenceBody`) | 신규 |
| `packages/designer-vscode-extension/src/editor/workspaceEdit.ts` | `detectIndent`, `formatJson` 유틸 + `replaceFenceBody` 진입점 | 신규 |
| `packages/designer-vscode-extension/src/shared/index.ts` | shared 모듈 배럴 export | 신규 |
| `packages/designer-vscode-extension/src/editor/index.ts` | editor 모듈 배럴 export | 신규 |
| `packages/designer-vscode-extension/test/unit/schemaHash.test.ts` | schemaHash Vitest 단위 테스트 | 신규 |
| `packages/designer-vscode-extension/test/unit/messages.test.ts` | messages 타입 narrowing Vitest 테스트 | 신규 |
| `packages/designer-vscode-extension/test/unit/blockLocator.test.ts` | blockLocator 정상/이동/폴백 Vitest 테스트 | 신규 |
| `packages/designer-vscode-extension/test/unit/workspaceEdit.test.ts` | detectIndent, formatJson Vitest 단위 테스트 | 신규 |

## 진입점 (Entry Points)

N/A — domain=infra, 비-UI Task.

## 주요 구조

- **`schemaHash(input: string | object): string`** — 입력이 string이면 JSON.parse 후 키 정렬 재직렬화, object이면 직접 정렬 직렬화. `crypto.createHash('sha256').update(sorted).digest('hex').slice(0, 12)` 반환. JSDoc에 해시 정책(입력 정규화 방식·truncation 근거)을 문서화.
- **`FormJsMessage` 판별 유니온** — `type` 필드로 5종 메시지를 식별. `RequestEditMessage`, `EditOpenedMessage`, `SaveSchemaMessage`, `SaveResultMessage`, `SourceUpdatedMessage` 각 인터페이스 + 합집합 `FormJsMessage = RequestEditMessage | ...`.
- **`locateFenceBody(doc: TextDocument, mdStart: number, mdEnd: number): vscode.Range`** — (1) `mdStart` 힌트에서 탐색 시작, (2) 힌트 위치에 fence가 없으면 전체 문서 선형 폴백, (3) 못 찾으면 `FenceNotFoundError` throw.
- **`detectIndent(doc: TextDocument, hintStart: vscode.Position): 2 | 4`** — Range 내 각 라인 들여쓰기 공백 수를 샘플링하여 2의 배수 vs 4의 배수 빈도 비교. 동점이면 2 반환.
- **`formatJson(json: string, indent: 2 | 4): string`** — `JSON.stringify(JSON.parse(json), null, indent)` 래퍼. 파싱 실패 시 원본 문자열 반환 + 경고 로그.

## 데이터 흐름

입력(raw JSON 문자열 / TextDocument + 라인 힌트) → 처리(정규화·해시 계산, 문서 스캔, 들여쓰기 감지, JSON 재포맷) → 출력(12자 해시 문자열 / `vscode.Range` / 포맷된 JSON 문자열)

## 설계 결정 (대안이 있는 경우만)

- **결정**: 해시 입력 정규화 방식으로 "키 정렬 후 재직렬화" 채택
- **대안**: 원본 JSON 문자열 그대로 해시 (정규화 없음)
- **근거**: PRD F1 "동일 스키마 반복 시 렌더 비용 최소화" 요건 충족 — 키 순서만 다른 동일 스키마가 별도 인스턴스로 마운트되면 낭비이므로 안정 해시가 필수.

---

- **결정**: `detectIndent` 반환값을 `2 | 4` 리터럴 타입으로 제한
- **대안**: `number` 반환 후 호출자가 검증
- **근거**: VSCode 편집기는 실제로 2/4-space 두 가지만 일반적이고, TRD가 "2/4-space 자동 맞춤"을 명시하므로 타입 레벨에서 인코딩.

---

- **결정**: `blockLocator.ts`를 `workspaceEdit.ts`와 분리된 독립 파일로 작성
- **대안**: `workspaceEdit.ts` 내부에 인라인
- **근거**: TRD §2 패키지 레이아웃이 `blockLocator.ts` / `workspaceEdit.ts`를 별도 파일로 명시. 또한 blockLocator는 읽기 전용(부수 효과 없음)이고 workspaceEdit는 VSCode API 의존이 있어 테스트 격리 측면에서 분리가 유리.

## 선행 조건

- **TSK-00-01** — `packages/designer-vscode-extension` 패키지 스캐폴드 (tsconfig, Vitest 설정, package.json 포함). 스캐폴드 없이는 이 Task 파일을 배치할 경로가 존재하지 않음.
- `@types/vscode` — `blockLocator.ts`의 `vscode.Range`, `vscode.Position` 타입 사용. TSK-00-01 devDependency 설치 시 포함 예정.
- Node.js ≥ 18 — `crypto.createHash` 내장 모듈 (추가 설치 불필요).

## 리스크

- **MEDIUM**: `blockLocator`의 전체 문서 선형 폴백은 대형 Markdown 파일에서 성능 저하 가능. 단, vscode TextDocument는 라인 단위 API를 제공하므로 문자열 전체 스캔이 아닌 `lineAt()` 이터레이션으로 완화 가능. 파일 규모 제한(예: 5000라인 이상 경고)은 이 Task 범위 밖.
- **MEDIUM**: `vscode.Range` / `vscode.Position` 타입은 VSCode API 의존 — 단위 테스트 시 `vscode` 모듈이 없는 Node 환경에서 실행 불가. Vitest에서 `vscode` 모듈을 mock해야 함. mock 설계는 TSK-00-01 또는 test-setup Task에서 확인 필요.
- **LOW**: JSON 키 정렬 시 중첩 객체 내부도 재귀 정렬 여부. 현재 스펙은 "최상위 키 정렬"이 최소 요건이지만, 중첩 필드도 정렬해야 완전한 정규화가 됨. 구현에서 재귀 정렬을 기본으로 채택하고 테스트에서 중첩 케이스 검증.
- **LOW**: `formatJson`에서 trailing comma, 주석 등 JSON5/JSONC 입력 처리 범위 미정의. TRD가 표준 JSON만 언급하므로 비표준 입력은 파싱 에러 처리(원본 반환)로 충분.

## QA 체크리스트

### schemaHash
- [ ] 동일 스키마 객체의 키 순서가 달라도(`{"a":1,"b":2}` vs `{"b":2,"a":1}`) 동일한 해시 12자를 반환한다
- [ ] 중첩 객체에서도 내부 키 순서가 달라도 해시가 동일하다
- [ ] 서로 다른 스키마(필드값 차이)는 반드시 다른 해시를 반환한다
- [ ] 빈 객체 `{}` 입력 시 유효한 12자 해시를 반환한다
- [ ] 유효하지 않은 JSON 문자열 입력 시 에러를 throw한다 (혹은 명시된 에러 처리 경로를 따른다)
- [ ] 반환값은 항상 정확히 12자이다

### messages.ts
- [ ] `type: 'request-edit'` 메시지가 `RequestEditMessage`로 타입 narrowing된다
- [ ] `type: 'save-result'` 메시지의 `ok` 필드가 boolean 타입으로 추론된다
- [ ] 알 수 없는 `type` 값에 대해 TypeScript 컴파일 시 에러가 발생한다 (exhaustiveness check)
- [ ] 5종 메시지 인터페이스가 모두 존재하며 TRD §3.4 필드 정의와 일치한다

### blockLocator
- [ ] 힌트(`mdStart`/`mdEnd`)가 정확할 때 올바른 fence 본문 Range를 반환한다 (시작 줄 = ` ```form-js ` 다음 줄, 끝 줄 = ` ``` ` 직전 줄)
- [ ] 펜스 블록이 재편집으로 라인이 이동한 경우 전체 문서 폴백을 통해 새 Range를 반환한다
- [ ] 같은 문서에 여러 fence 블록이 있을 때 힌트에 가장 가까운(또는 힌트 이후 첫 번째) 블록을 반환한다
- [ ] fence 블록이 존재하지 않으면 `FenceNotFoundError`를 throw한다
- [ ] 빈 fence 본문(바로 닫힘)의 경우 빈 Range를 반환하며 에러가 아니다

### detectIndent / formatJson
- [ ] 2-space 들여쓰기 문서에서 `detectIndent`가 `2`를 반환한다
- [ ] 4-space 들여쓰기 문서에서 `detectIndent`가 `4`를 반환한다
- [ ] 2/4-space가 혼재할 때 더 많이 등장하는 값을 반환한다
- [ ] `formatJson`이 `indent=2`로 호출되면 2-space 포맷 JSON 문자열을 반환한다
- [ ] `formatJson`이 `indent=4`로 호출되면 4-space 포맷 JSON 문자열을 반환한다
- [ ] `formatJson`에 유효하지 않은 JSON을 넣으면 원본 문자열을 반환한다 (크래시 없음)
- [ ] `detectIndent` + `formatJson` 조합이 `replaceFenceBody` 컨텍스트에서 올바르게 연동된다 (통합)
