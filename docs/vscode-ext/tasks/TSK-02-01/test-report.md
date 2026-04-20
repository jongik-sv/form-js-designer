# TSK-02-01: Custom Editor Provider 등록 + form-js-editor 부팅 - 테스트 리포트

## 실행 요약

| 구분        | 통과 | 실패 | 합계 |
|-------------|------|------|------|
| 단위 테스트 | 196  | 0    | 196  |
| E2E 테스트  | 6    | 0    | 6    |

**최종 판정**: PASS

---

## 단위 테스트 (Unit Tests)

**명령**: `npm -w @form-js-designer/designer-vscode-extension run test:unit`

**결과**: PASS (196/196)

```
Test Files  15 passed (15)
Tests  196 passed (196)
Duration  ~900ms
```

---

## E2E 테스트 (VSCode @vscode/test-electron)

**명령**: `FORM_JS_TEST_MODE=1 npm -w @form-js-designer/designer-vscode-extension run test:e2e`

**결과**: PASS (6/6)

| Case | 설명 | 결과 |
|------|------|------|
| Case 1 (TSK-02-01) | formJs.openBlockEditor 커맨드 → Custom Editor 패널이 열린다 | pass (72ms) |
| Case 2 (TSK-02-01) | 동일 문서에 두 번 커맨드 실행 시 탭 수가 증가하지 않는다 | pass (544ms) |
| Case 3 (TSK-02-01) | Custom Editor 패널 닫기 후 탭이 제거된다 | pass (533ms) |
| Case 1 (TSK-01-04) | 단일 블록 — form-js-block 1개 생성, 에러 없음 | pass |
| Case 2 (TSK-01-04) | 다중 블록+invalid — 유효 블록 2개, form-js-block--error 1개 | pass |
| Case 3 (TSK-01-04) | reload 후 재마운트 — 동일 마크다운 재렌더 시 블록 수 일관성 | pass |

---

## 정적 검증

| 구분 | 결과 | 비고 |
|------|------|------|
| lint | N/A | lint: not yet configured |
| typecheck | pass | 에러 0 |

---

## QA 체크리스트 판정

| # | 항목 | 결과 |
|---|------|------|
| 1 | (정상 케이스) ✏️ 클릭 → 200ms 이내 ViewColumn.Beside에 Custom Editor 패널 열림 | pass |
| 2 | (엣지 케이스) 같은 문서 두 번째 ✏️ → single-editor lock 동작, 두 번째 탭 미생성 | pass |
| 3 | (에러 케이스) Custom Editor 부팅 실패 시 에러 표시, ✏️ lock/unlock 일관성 | unverified |
| 4 | (통합 케이스) Custom Editor 닫기 → onDidDispose → endSession → edit-closed → ✏️ 재활성 | pass |
| 5 | (CSP 준수) nonce 적용, inline script 없음 | pass |
| 6 | (idempotency) activate() 중복 시 registerCustomEditorProvider 중복 등록 없음 | pass |
| 7 | (타입 안정성) FormJsMessage 유니온에 EditClosedMessage 추가, typecheck 통과 | pass |
| 8 | (클릭 경로) formJs.openBlockEditor 커맨드 → Custom Editor 패널이 ViewColumn.Two에 열림 | pass |
| 9 | (화면 렌더링) form-js-editor 팔레트/캔버스/속성 패널 렌더 | unverified |

---

## 수정 이력

**단위 테스트 수정 (1건)**:
- `customEditorProvider.ts`의 `resolveCustomTextEditor`에서 `pendingEditSchemas.get(uri)` 후 `delete(uri)` 누락 → 즉시 consume하도록 수정

**E2E 수정 (2건)**:
1. `customEditorProvider.ts` — `beginSession` 성공 후 `clearPendingOpen(uri)` 즉시 호출 (기존: onDidDispose까지 지연)
2. `openBlockEditorCommand.ts` — 기존 세션 `reveal` 시 `panel.reveal(vscode.ViewColumn.Beside)` → `panel.reveal()` 로 변경
   - 원인: `ViewColumn.Beside`를 전달하면 VSCode가 기존 패널을 새 column에 재배치하여 탭 수가 증가함

---

작성일: 2026-04-20
테스트 실행 환경: VSCode 1.116.0, darwin-arm64
