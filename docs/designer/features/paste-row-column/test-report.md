# paste-row-column: 테스트 결과

## 결과: PASS

brw-test: Playwright visible 모드로 실물 확인 완료 (2026-04-18)

## 실행 요약

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 182 | 0 | 182 |
| E2E 테스트 | 6 | 0 | 6 |

> 단위 테스트: 181(기존) + 1(신규: `_duplicateFieldVertical removes layout.row even when original field has layout.row set`) = 182

## 정적 검증

| 구분 | 결과 | 비고 |
|------|------|------|
| lint | pass | no-css-modules, single-preact, watermark-hash, watermark-scss 모두 통과 |
| typecheck | pass | `npm --prefix packages/designer-core run typecheck` exit 0 |

## 구현 버그 발견 및 수정 (테스트 중)

### 버그: `_duplicateFieldVertical`이 원본 `layout.row`를 제거하지 않음

- **발견 경로**: E2E 브라우저 실물 확인 중. "세로로 복사" 클릭 후 두 필드가 동일 row에 배치됨.
- **원인**: `deepCloneWithNewIds`가 `layout.row`를 그대로 복사하므로, attrs에 원본 row ID가 유지된 채 `addFormField`를 호출 → form-js가 동일 row에 배치.
- **수정**: `_duplicateFieldVertical`에서 attrs의 `layout.row` 삭제 로직 추가.
  - 파일: `packages/designer-editor-host/src/modules/OutlineModule.ts`
  - 파일: `packages/designer-editor-host/src/__tests__/OutlineModule.test.ts` (회귀 테스트 추가)
- **수정 후 확인**: 세로 복사 → 두 필드가 서로 다른 row ID를 가짐 (JSON 스키마 검증).

## QA 체크리스트 판정

### 버튼 렌더링

| # | 항목 | 결과 |
|---|------|------|
| 1 | 컴포넌트 호버 시 context-pad에 버튼 2개(가로·세로) 표시 | pass |
| 2 | 기존 단일 복제 버튼(`[data-outline-duplicate]`)이 더 이상 존재하지 않음 | pass |
| 3 | 가로 복사 버튼 tooltip이 "행으로 복사" | pass |
| 4 | 세로 복사 버튼 tooltip이 "세로로 복사" | pass |
| 5 | 버튼 배치 순서 [가로 복사][세로 복사][삭제] | pass |

### 세로 복사 (기존 동작 보존)

| # | 항목 | 결과 |
|---|------|------|
| 6 | "세로로 복사" 클릭 시 원본 아래 새 row에 복제본 삽입 | pass (버그 수정 후) |
| 7 | 복제본은 원본과 동일 type·label, 모든 id 다름 | pass |
| 8 | key 중복 없음 (uniqueKey 패턴 적용) | pass |
| 9 | commandStack.changed 후 아웃라인 패널 갱신 | pass |

### 가로 복사

| # | 항목 | 결과 |
|---|------|------|
| 10 | "행으로 복사" 클릭 시 복제본이 원본과 같은 row에 배치 | pass |
| 11 | 가로 복사 후 원본·복제본이 캔버스에서 나란히(좌우) 렌더링 | pass |
| 12 | 원본 row 없는 경우(getRowForField → null) 세로 복사 fallback | pass (단위 테스트) |
| 13 | 복제본 id·key 모두 새로 생성 | pass |

### 엣지 케이스

| # | 항목 | 결과 |
|---|------|------|
| 14 | 동일 컴포넌트 반복 호버/unhover 시 버튼 중복 주입 없음 | pass |
| 15 | 삭제 버튼 클릭 시 기존 동작 정상 | pass |

### 단위 테스트 (OutlineModule.test.ts)

| # | 항목 | 결과 |
|---|------|------|
| 16 | `_duplicateFieldVertical` 호출 시 `layout.row` 없이 addFormField 호출 | pass |
| 17 | `_duplicateFieldHorizontal` 호출 시 `getRowForField` 호출 | pass |
| 18 | `_duplicateFieldHorizontal` 호출 시 attrs에 `layout.row` 포함 | pass |
| 19 | `getRowForField` null 반환 시 fallback 실행 (에러 없음) | pass |
| 20 | `_injectDuplicateButtons` 호출 시 두 버튼 DOM 삽입 | pass |
| 21 | 재호출 시 버튼 중복 주입 방지 | pass |

### E2E

| # | 항목 | 결과 |
|---|------|------|
| 22 | `http://localhost:5173/` 접속 → button 드롭 → 호버 → context-pad 버튼 2개 확인 | pass |
| 23 | 세로 복사 버튼 클릭 후 아웃라인 노드 수 +1 | pass |
| 24 | 가로 복사 버튼 클릭 후 아웃라인 노드 수 +1 | pass |
| 25 | 가로 복사 결과 캔버스에서 나란히 렌더링 (브라우저 시각 확인) | pass |

## 스크린샷 (test-artifacts)

| 파일 | 내용 |
|------|------|
| `test-artifacts/01-context-pad-two-buttons.png` | Text field 드롭 후 context-pad 버튼 3개 (행으로복사·세로로복사·삭제) |
| `test-artifacts/02-vertical-copy-result.png` | 세로 복사 직후 상태 (버그 발견 전: 동일 row에 배치됨 — 버그 증거) |
| `test-artifacts/03-vertical-copy-new-row.png` | 버그 수정 후 세로 복사 결과 (두 필드 세로 배치) |
| `test-artifacts/04-horizontal-copy-same-row.png` | 가로 복사 결과 (1행: 원본+가로복사본 나란히, 2행: 세로복사본) |

## 재시도 이력

- 1회차: E2E 실행 중 "세로로 복사"가 가로 배치되는 버그 발견.
  - 원인: `deepCloneWithNewIds`가 `layout.row`를 복사하는데, `_duplicateFieldVertical`이 이를 제거하지 않음.
  - 수정: `OutlineModule.ts` `_duplicateFieldVertical`에 `layout.row` 삭제 로직 추가 + 단위 테스트 1건 추가.
  - 수정 후 단위 테스트 182/182 통과, E2E 브라우저 재검증 통과.

## 비고

- Fallback 경로 브라우저 수동 확인: `formLayouter.getRowForField`를 런타임 패치하여 undefined 반환 시도했으나 form-js 내부 validator 오동작 발생. 브라우저 레벨 fallback 확인은 단위 테스트 커버리지(케이스 19, 182/182 통과)로 대체.
- E2E 서버(`http://localhost:5173`)는 이미 실행 중이었으므로 별도 기동 불필요.
