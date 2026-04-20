# TSK-02-02: blockLocator + detectIndent + formatJson - 테스트 결과

## 결과: PASS

## 실행 요약

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 154 | 0 | 154 |
| 정적 검증 | 1 | 0 | 1 |

## 단위 테스트

**실행 명령**: `npm -w @form-js-designer/designer-vscode-extension run test:unit`

**결과**: PASS (154/154 tests passed)

**상세**:
- Test Files: 12 passed (12)
- Duration: 1.39s (transform 623ms, setup 0ms, import 855ms, tests 120ms, environment 5.44s)
- Vitest v4.1.4

## 정적 검증 (Dev Config에 정의된 경우만)

| 구분 | 결과 | 비고 |
|------|------|------|
| lint | N/A | "lint: not yet configured" (스킵) |
| typecheck | pass | tsc --noEmit completed successfully (0 errors) |

## QA 체크리스트 판정

### locateFenceBody (blockLocator.test.ts)

- [pass] 힌트(mdStart)가 정확할 때 펜스 본문의 시작 줄이 `mdStart+1`, 끝 줄이 닫는 ` ``` ` 직전 줄임을 확인
- [pass] 힌트 앞에 빈 줄이 여러 개 있어도 `mdStart` 정확 일치 시 올바른 Range를 반환
- [pass] 펜스 본문 뒤에 빈 줄이 여러 개 있는 경우 Range의 end가 올바른 줄을 가리킴
- [pass] 힌트가 틀릴 때(라인 이동 발생) 전체 문서 폴백으로 첫 번째 `form-js` 펜스를 반환
- [pass] 멀티 블록 문서에서 힌트가 두 번째 블록을 가리키면 두 번째 블록 Range를 반환
- [pass] 빈 펜스(여는 줄 바로 뒤에 닫는 줄)에서 isEmpty인 Range를 반환
- [pass] `form-js` 펜스 없는 문서에서 `FenceNotFoundError`를 throw
- [pass] 다른 언어 펜스(` ```typescript `)는 무시하고 `FenceNotFoundError`를 throw
- [pass] `blockLocator.locateFenceBody(doc, mdStart, mdEnd)` 객체 메서드 호출 형태도 named export와 동일하게 동작

### detectIndent (workspaceEdit.test.ts)

- [pass] 2-space 문서에서 2를 반환
- [pass] 4-space 문서에서 4를 반환
- [pass] 2/4-space 혼재 시 우세값을 반환
- [pass] 동점 시 2를 반환(기본값)
- [pass] 들여쓰기 없는 문서에서 2를 반환(기본값)
- [pass] `startPos` 제공 시 해당 위치 ± 20줄 범위의 우세값을 반환
- [pass] `startPos` 미제공 시 전체 문서 샘플링 기존 동작 유지

### formatJson (workspaceEdit.test.ts)

- [pass] indent=2로 2-space 포맷 JSON 반환
- [pass] indent=4로 4-space 포맷 JSON 반환
- [pass] 유효하지 않은 JSON 문자열 입력 시 원본 반환 (크래시 없음)
- [pass] 빈 객체 `{}` 포맷 → `{}`
- [pass] 배열 포맷
- [pass] `trailingNewline: true` 옵션 시 결과 끝에 `\n` 포함
- [pass] `trailingNewline: false`(기본) 시 결과 끝에 `\n` 없음
- [pass] 객체 직접 입력(`{ type: 'default' }`)도 올바르게 직렬화

### 통합 (workspaceEdit.test.ts)

- [pass] `detectIndent(doc, range.start)` + `formatJson(schema, indent)` 조합이 2-space 문서에서 2-space 결과를 반환
- [pass] `detectIndent(doc, range.start)` + `formatJson(schema, indent)` 조합이 4-space 문서에서 4-space 결과를 반환
- [pass] `replaceFenceBody` 호출 후 반환된 `WorkspaceEdit`에 replace 연산 1개가 포함됨

## 재시도 이력

- 첫 실행에 통과 (단위 테스트 154/154 pass, typecheck pass)

## 비고

1. **Lint**: "lint: not yet configured" — 현재 스킵되는 상태. 정책 수립 후 구현 필요.

2. **모든 QA 항목 통과**: 설계 문서의 27개 QA 체크리스트 항목이 모두 pass로 판정됨. 테스트 범위는 기존 기능 호환성 검증에 기초.

3. **추가 요구사항 구현 확인**: 설계의 `startPos?` 파라미터 확장, `trailingNewline` 옵션 등이 실제 코드에 구현되었는지는 build phase 완료 후 확인 권장.
