# table-form-js-defaults: 테스트 결과

## 결과: PASS

## 실행 요약

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 101 | 0 | 101 |
| E2E 테스트 | 27 | 0 | 27 |

## 정적 검증

| 구분 | 결과 | 비고 |
|------|------|------|
| lint | N/A | 별도 실행 불필요 (typecheck 통과) |
| typecheck | pass | `npm --prefix packages/designer-core run typecheck` 에러 없음 |

## 실물 브라우저 검증 (Playwright headed)

Playwright headed 모드로 `http://localhost:5173/` 접속 후 테이블 드래그·드롭 실행.

| 검증 항목 | 결과 |
|-----------|------|
| Palette "테이블" 아이템 드래그 → 캔버스 드롭 | pass |
| thead에 ID / Name / Date 컬럼 헤더 가시성 | pass |
| tbody에 3행 렌더 (rowCount=3) | pass |
| 첫 번째 행에 "John Doe" 텍스트 포함 | pass |
| 두 번째 행에 "Erika Muller" | pass (육안 확인) |
| 세 번째 행에 "Dominic Leaf" | pass (육안 확인) |

### 스크린샷

- `docs/features/table-form-js-defaults/brw-01-after-drop.png` — 드롭 직후 에디터 전체 화면
- `docs/features/table-form-js-defaults/brw-02-table-detail.png` — 테이블 컴포넌트 확대

## QA 체크리스트 판정

| # | 항목 | 결과 |
|---|------|------|
| 1 | `TableComponent.create()` 반환 `columns` 길이 3, accessor `id`/`name`/`date` | pass |
| 2 | `TableComponent.create({ columns: [] })` 시 `columns` 빈 배열 | pass |
| 3 | 두 번 호출 시 배열 참조 서로 다름 (복사본 독립성) | pass |
| 4 | `shouldUseDemoData(DEFAULT_COLUMNS)` → `true` | pass |
| 5 | `shouldUseDemoData([{ id:'foo', accessor:'foo' }])` → `false` | pass |
| 6 | `shouldUseDemoData([])` → `false` | pass |
| 7 | `value=undefined` 시 `tbody tr` 3개 표시 | pass (E2E + brw) |
| 8 | `value=[{ id:99, name:'Test', date:'01.01.2024' }]` 시 데모 아닌 실제값 1행 | pass (단위 테스트) |
| 9 | 그룹 헤더 포함 멀티헤더 트리에서 `shouldUseDemoData` 리프만 추출 판정 | pass |
| 10 | 컬럼 변경 후 `value=[]` 이면 `tbody` 비어 있음 | pass (단위 테스트) |
| 11 | 팔레트 "테이블" 드래그 → 캔버스 드롭 → 테이블 추가 | pass (E2E + brw) |
| 12 | 드롭 후 `thead`에 ID/Name/Date 표시, `tbody`에 1행 이상 | pass (E2E + brw) |
| 13 | 드롭 후 `tbody tr:first-child`에 `John Doe` 텍스트 포함 | pass (E2E + brw) |

## 재시도 이력

첫 실행에 통과 — 단위 101/101, E2E 27/27, 브라우저 검증 전 항목 pass.

## 비고

- 단위 테스트 실행 시 `assertPureRender` stderr 경고 출력됨. 이는 기존 코드에서 유래하는 정보성 경고이며 테스트 실패와 무관함.
- E2E 서버는 실행 시작 전부터 `http://localhost:5173`에서 이미 기동 중이었음 (`reuseExistingServer: true` 적용).
- brw-test 시그널: 실물 브라우저 확인 완료 (2026-04-18).
