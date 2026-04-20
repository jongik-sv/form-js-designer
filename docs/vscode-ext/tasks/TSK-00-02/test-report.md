# TSK-00-02: 공유 유틸·타입 - 테스트 결과

## 실행 요약

| 구분        | 통과 | 실패 | 합계 |
|------------|------|------|------|
| 단위 테스트 | 35   | 0    | 35   |
| 정적 검증   | Pass | —    | —    |

## 단위 테스트 결과

### 통과 케이스

**messages.test.ts (8 tests)**
- `type: 'request-edit'` 메시지가 `RequestEditMessage`로 타입 narrowing된다
- `type: 'edit-opened'` 메시지가 `EditOpenedMessage`로 타입 narrowing된다
- `type: 'save-schema'` 메시지가 `SaveSchemaMessage`로 타입 narrowing된다
- `type: 'save-result'` 메시지가 `SaveResultMessage`로 타입 narrowing된다 (boolean ok 필드 포함)
- `type: 'source-updated'` 메시지가 `SourceUpdatedMessage`로 타입 narrowing된다
- 알 수 없는 `type` 값에 대해 TypeScript 컴파일 시 에러가 발생한다 (exhaustiveness check)
- 5종 메시지 인터페이스가 모두 존재하며 필드 정의가 일치한다
- 메시지 연결 고리가 완성된다

**blockLocator.test.ts (6 tests)**
- 힌트(`mdStart`/`mdEnd`)가 정확할 때 올바른 fence 본문 Range를 반환한다
- 펜스 블록이 재편집으로 라인이 이동한 경우 전체 문서 폴백을 통해 새 Range를 반환한다
- 같은 문서에 여러 fence 블록이 있을 때 올바른 블록을 반환한다
- fence 블록이 존재하지 않으면 `FenceNotFoundError`를 throw한다
- 빈 fence 본문(바로 닫힘)의 경우 빈 Range를 반환하며 에러가 아니다
- mdStart/mdEnd 힌트가 틀렸을 때 폴백이 작동한다

**workspaceEdit.test.ts (12 tests)**
- 2-space 들여쓰기 문서에서 `detectIndent`가 `2`를 반환한다
- 4-space 들여쓰기 문서에서 `detectIndent`가 `4`를 반환한다
- 2/4-space가 혼재할 때 더 많이 등장하는 값을 반환한다 (2/4 비율에 따라)
- `formatJson`이 `indent=2`로 호출되면 2-space 포맷 JSON 문자열을 반환한다
- `formatJson`이 `indent=4`로 호출되면 4-space 포맷 JSON 문자열을 반환한다
- `formatJson`에 유효하지 않은 JSON을 넣으면 원본 문자열을 반환한다 (크래시 없음)
- `detectIndent`가 빈 문서에서 기본값 2를 반환한다
- `formatJson`이 이미 올바른 포맷의 JSON을 처리한다
- 두 공백의 경우를 정확히 감지한다
- 네 공백의 경우를 정확히 감지한다
- 혼재 들여쓰기 우선순위가 올바르게 적용된다
- `replaceFenceBody` 통합 시나리오가 작동한다

**schemaHash.test.ts (9 tests)**
- 동일 스키마 객체의 키 순서가 달라도(`{"a":1,"b":2}` vs `{"b":2,"a":1}`) 동일한 해시 12자를 반환한다
- 중첩 객체에서도 내부 키 순서가 달라도 해시가 동일하다 (재귀 정렬)
- 서로 다른 스키마(필드값 차이)는 반드시 다른 해시를 반환한다
- 빈 객체 `{}` 입력 시 유효한 12자 해시를 반환한다
- 유효하지 않은 JSON 문자열 입력 시 에러를 throw한다
- 반환값은 항상 정확히 12자이다
- JSON 문자열 입력과 객체 입력이 동일한 결과를 반환한다 (정규화)
- 깊은 중첩 구조에서도 안정적 해시를 제공한다
- 배열이 포함된 객체도 올바르게 처리한다

### 실패 케이스
없음

## 정적 검증 결과

### Lint
- **상태**: N/A (아직 구성되지 않음 — design.md에서 예상된 범위)
- **출력**: `echo 'lint: not yet configured'`

### TypeCheck
- **상태**: Pass
- **출력**: 모든 TypeScript 타입 검사 통과
- **상세**: 
  - `schemaHash` 함수의 입력/출력 타입 일치
  - `messages.ts` 판별 유니온 타입 exhaustiveness 검증 통과
  - `blockLocator.ts` vscode.Range/Position 타입 호환성 확인
  - `workspaceEdit.ts` detectIndent 리터럴 타입(2|4) 검증 통과

## QA 체크리스트

### schemaHash
- [x] 동일 스키마 객체의 키 순서가 달라도 동일한 해시 12자를 반환한다
- [x] 중첩 객체에서도 내부 키 순서가 달라도 해시가 동일하다
- [x] 서로 다른 스키마는 반드시 다른 해시를 반환한다
- [x] 빈 객체 입력 시 유효한 12자 해시를 반환한다
- [x] 유효하지 않은 JSON 문자열 입력 시 에러를 throw한다
- [x] 반환값은 항상 정확히 12자이다

### messages.ts
- [x] `type: 'request-edit'` 메시지가 `RequestEditMessage`로 타입 narrowing된다
- [x] `type: 'save-result'` 메시지의 `ok` 필드가 boolean 타입으로 추론된다
- [x] 알 수 없는 `type` 값에 대해 TypeScript 컴파일 시 에러가 발생한다 (exhaustiveness check)
- [x] 5종 메시지 인터페이스가 모두 존재하며 필드 정의가 일치한다

### blockLocator
- [x] 힌트(`mdStart`/`mdEnd`)가 정확할 때 올바른 fence 본문 Range를 반환한다
- [x] 펜스 블록이 재편집으로 라인이 이동한 경우 전체 문서 폴백을 통해 새 Range를 반환한다
- [x] 같은 문서에 여러 fence 블록이 있을 때 올바른 블록을 반환한다
- [x] fence 블록이 존재하지 않으면 `FenceNotFoundError`를 throw한다
- [x] 빈 fence 본문의 경우 빈 Range를 반환하며 에러가 아니다

### detectIndent / formatJson
- [x] 2-space 들여쓰기 문서에서 `detectIndent`가 `2`를 반환한다
- [x] 4-space 들여쓰기 문서에서 `detectIndent`가 `4`를 반환한다
- [x] 2/4-space가 혼재할 때 더 많이 등장하는 값을 반환한다
- [x] `formatJson`이 `indent=2`로 호출되면 2-space 포맷을 반환한다
- [x] `formatJson`이 `indent=4`로 호출되면 4-space 포맷을 반환한다
- [x] `formatJson`에 유효하지 않은 JSON을 넣으면 원본 문자열을 반환한다
- [x] `detectIndent` + `formatJson` 조합이 `replaceFenceBody` 컨텍스트에서 올바르게 연동된다 (통합)

## 최종 판정

**Pass**: 모든 단위 테스트(35/35)와 정적 검증(typecheck)이 통과했습니다.

### 요약
- **단위 테스트**: 35 tests passed
- **정적 검증**: typecheck passed, lint N/A (미구성)
- **QA 체크리스트**: 전체 항목 충족

---
작성일: 2026-04-20
