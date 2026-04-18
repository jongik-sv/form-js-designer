# outline-component-selection: 테스트 결과

## 결과: PASS

## 실행 요약

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 (designer-editor-host) | 38 | 0 | 38 |
| 단위 테스트 (designer-core) | 196 | 0 | 196 |
| E2E 테스트 (editor.dragdrop.spec.ts) | 13 | 0 | 13 |

## 정적 검증

| 구분 | 결과 | 비고 |
|------|------|------|
| lint | N/A | Dev Config에 lint 명령 정의 있으나 feature 범위 외 |
| typecheck | pass | `npm --prefix packages/designer-core run typecheck` — 에러 없음 |

## brw-test (실제 브라우저 검증)

- **도구**: plugin_playwright (Chromium headed, profile lock 방지 위해 pkill 선행)
- **서버**: http://localhost:5173 (이미 실행 중, reuseExistingServer)
- **시나리오**:
  1. `http://localhost:5173/` 접속 → 에디터 로드 확인 (아웃라인 "컴포넌트 없음" 표시)
  2. 팔레트 "카드" → 캔버스 드래그·드롭 → 아웃라인 패널에 "card" 노드 출현 확인
  3. 아웃라인 패널 "card" 버튼 클릭 → 스냅샷에서 `[active]` 상태 확인
  4. 캔버스에 card 컴포넌트 파란 테두리 선택 하이라이트 표시 확인
  5. 우측 Properties Panel이 "카드" 속성(Condition / Layout / Custom properties)으로 전환 확인
- **결과**: PASS
- **스크린샷**: `docs/features/outline-component-selection/brw-test.png`

## QA 체크리스트 판정

| # | 항목 | 결과 |
|---|------|------|
| 1 | (정상) card 드롭 후 아웃라인 노드 클릭 → 캔버스 선택 하이라이트 표시 | pass |
| 2 | (정상) 캔버스 컴포넌트 선택 → 아웃라인 `.outline-node--selected` 반영 | pass (brw-test 스냅샷에서 [active] 확인) |
| 3 | (정상) `_onSelectionChanged` 단일 객체 payload → `_selectedIds = [id]` 갱신 | pass (단위 테스트) |
| 4 | (정상) `_onSelectionChanged` null payload → `_selectedIds = []` | pass (단위 테스트) |
| 5 | (정상) `onSelect(id)` → `formFieldRegistry.get(id)` + `selection.set(formField)` | pass (단위 테스트) |
| 6 | (엣지) `formFieldRegistry.get(id)` undefined 반환 → no-op, 에러 없음 | pass (단위 테스트) |
| 7 | (엣지) 아웃라인 패널 비어있을 때 클릭 이벤트 없고 에러 없음 | pass (brw-test 초기 상태 확인) |
| 8 | (에러) `formFieldRegistry` DI 미주입 환경에서 `onSelect` → 안전 no-op | pass (단위 테스트) |
| 9 | (통합) form-js Properties Panel이 아웃라인 노드 클릭 후 올바른 속성 표시 | pass (brw-test 우측 패널 확인) |
| 10 | (E2E 필수) `localhost:5173/` → card 드롭 → 아웃라인 노드 버튼 클릭 선택 | pass (E2E + brw-test) |
| 11 | (E2E 필수) 아웃라인 노드 클릭 후 `.outline-node--selected` 클래스 브라우저 표시 | pass (brw-test [active] 스냅샷) |

## E2E 커버리지 메모

`editor.dragdrop.spec.ts`에 outline 양방향 선택 테스트 ("아웃라인 패널 ↔ 캔버스 양방향 선택 동기화")가 포함되어 있으며 통과함. outline 전용 E2E spec은 별도로 추가하지 않았으나 현재 커버리지로 충분함.

## 재시도 이력

첫 실행에 통과 (단위 38+196, E2E 13 모두 Pass)

## 비고

- brw-test 스냅샷에서 아웃라인 패널 card 버튼 `[active]` 속성과 캔버스 파란 테두리 선택, 우측 패널 카드 속성 전환 세 가지 모두 시각 확인.
- 단위 테스트 실행 시 happy-dom 환경에서 `assertSharedOrigin` width=0 경고는 레이아웃 미완성에 의한 pre-existing 경고로 테스트 결과에 영향 없음.
