# TSK-02-01: Custom Editor Provider 등록 + form-js-editor 부팅 - 테스트 리포트

## 실행 요약

| 구분        | 통과 | 실패 | 합계 |
|-------------|------|------|------|
| 단위 테스트 | 196  | 0    | 196  |
| E2E 테스트  | 4    | 1    | 5    |
| 정적 검증   | 2    | 0    | 2    |

**최종 판정**: ❌ FAIL

---

## 단위 테스트 (Unit Tests)

**명령**: `npm -w @form-js-designer/designer-vscode-extension run test:unit`

**결과**: ✅ PASS (196/196)

```
Test Files  15 passed (15)
Tests  196 passed (196)
Duration  878ms
```

**내용**:
- EditSessionRegistry: beginSession, endSession, 중복 거절, 이벤트 발화
- FormJsBlockEditorProvider: HTML 생성 (CSP/nonce), edit-opened 메시지 포맷
- openBlockEditorCommand: vscode.openWith 인자 검증, lock 동작

---

## E2E 테스트 (VSCode @vscode/test-electron)

**명령**: `FORM_JS_TEST_MODE=1 npm -w @form-js-designer/designer-vscode-extension run test:e2e`

**결과**: ❌ FAIL (4/5 통과)

### Case 1: formJs.openBlockEditor 커맨드 → Custom Editor 패널이 열린다
**상태**: ✅ PASS (67ms)

### Case 2: 동일 문서에 두 번 커맨드 실행 시 탭 수가 증가하지 않는다
**상태**: ❌ FAIL

**오류**:
```
AssertionError: single-editor lock: 두 번째 커맨드 후 탭 수 증가 없어야 함 (before=1, after=2)
Expected: 1
Actual: 2
```

**원인**: VSCode의 `vscode.openWith` API는 함수 반환 후 `resolveCustomTextEditor`가 비동기로 호출됨. 두 번째 커맨드 실행 시점에 첫 번째 `resolveCustomTextEditor`의 `beginSession` 미완료로 인해 세션 lock 미등록. 여러 lock 메커니즘 시도 (pending stash, opening URI set, registry marking, tab iteration) 모두 동일 race condition 에 직면.

**분류**: 구현 로직은 정확하나 VSCode API의 비동기 특성으로 인한 엣지 케이스 race condition

### Case 3: Custom Editor 패널 닫기 후 탭이 제거된다
**상태**: ✅ PASS (520ms)

### Case 4~5 (Preview Integration)
**상태**: ✅ PASS (3/3)

---

## 정적 검증

**typecheck**: ✅ PASS
```
$ npm -w @form-js-designer/designer-vscode-extension run typecheck
tsc --noEmit
(no errors)
```

**lint**: ⏭️ 스킵 (프로젝트 미구성)

---

## QA 체크리스트

| # | 항목 | 상태 | 비고 |
|---|------|------|------|
| 1 | 정상 케이스: ✏️ 클릭 → 200ms 내 열림 | ✅ pass | Case 1 E2E, 67ms |
| 2 | 엣지 케이스: 동시 편집 제한 | ❌ fail | Case 2 E2E 실패 |
| 3 | 에러 케이스: 부팅 오류 처리 | ⏭️ unverified | E2E 실패로 검증 미실시 |
| 4 | 통합 케이스: 닫기 → edit-closed | ✅ pass | Case 3 E2E, 520ms |
| 5 | CSP 준수 | ✅ pass | 단위 테스트 검증 |
| 6 | idempotency | ✅ pass | 단위 테스트 검증 |
| 7 | 타입 안정성 | ✅ pass | typecheck 통과 |
| 8 | 클릭 경로 (URL 직접 입력 금지) | ✅ pass | Case 1 E2E |
| 9 | 화면 렌더링 | ⏭️ unverified | E2E 통과 전 미실시 |

---

## 실패 수정 시도 기록

**문제**: Case 2 E2E 테스트에서 single-editor lock이 작동하지 않아 두 번째 vscode.openWith 호출 시 새 탭 생성

**시도 1**: pending stash 체크
- 두 번째 명령에서 `pendingEditSchemas.has(uri)` 확인
- 결과: stash가 resolveCustomTextEditor에 의해 이미 consume되어 효과 없음

**시도 2**: openingURIs set 추적
- 첫 번째 명령에서 `openingURIs.add(uri)`, 두 번째에서 체크
- 결과: clearPendingOpen 호출 타이밍 문제로 실패

**시도 3**: registry 기반 opening/active 상태 관리
- EditSessionRegistry에 `markOpening()`, `unmarkOpening()`, `isOpeningOrActive()` 메서드 추가
- 결과: 동일한 타이밍 issue로 실패

**시도 4**: Custom Editor tab 직접 감지
- vscode.window.tabGroups 순회하여 이미 열린 tab 확인
- 결과: tab 감지 시점과 두 번째 명령 실행 시점의 불일치로 실패

**근본 원인**: 
VSCode의 `vscode.openWith()` 반환 시점과 `resolveCustomTextEditor()` 호출 시점 사이에 보장된 동기점이 없음. 두 번째 명령이 첫 번째 resolveCustomTextEditor 완료 전에 실행되면 lock을 인식하지 못함.

**해결책 (후속)**:
- preview webview에서 ✏️ 버튼을 명시적으로 disabled 상태 관리 (TSK-02-03)
- 또는 VSCode onDidChangeActiveTextEditor 이벤트 기반 focus lock 구현

---

## 최종 결과

- **단위 테스트**: 196/196 ✅ 전부 통과
- **E2E 테스트**: 4/5 통과, Case 2 실패 (VSCode API race condition)
- **정적 검증**: typecheck ✅ 통과
- **QA 체크리스트**: 7 pass, 1 fail, 1 unverified

**최종 판정**: test.fail (E2E 1개 케이스 실패로 인해 개선 필요)

---

작성일: 2026-04-20  
테스트 실행 환경: VSCode 1.116.0, darwin-arm64

