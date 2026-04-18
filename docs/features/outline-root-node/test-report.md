# outline-root-node: 테스트 결과

## 결과: PASS

## 실행 요약

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 75 | 0 | 75 |
| E2E 테스트 | 19 | 0 | 19 |

> E2E: `editor.dragdrop.spec.ts` 19개 통과. `tabs-*.spec.ts` 5개 실패는 `tabs-tabpanel-refactor` 별도 feature의 pre-existing 실패 (outline-root-node 범위 밖, untracked 파일). E2E 우회 없음.

## 정적 검증

| 구분 | 결과 | 비고 |
|------|------|------|
| lint | pass | no-css-modules OK, single-preact OK |
| typecheck | pass | tsc --noEmit 에러 없음 |

## brw-test (실제 Chromium headed)

- 스크린샷: `docs/features/outline-root-node/brw-test.png`
- 검증 결과:
  - [1] 빈 상태에서 "Outline" 루트 노드 표시: pass (가상 루트 텍스트 "Outline" 확인)
  - [2] 컴포넌트(card) 드롭 후 "Outline" 하위에 자식(card) 표시: pass (자식 노드 수=1)
  - [3] 루트 chevron 접기/펼치기: pass (aria-expanded false→true 전환 확인)
  - [4] 루트 클릭 no-op: pass (aria-selected=null, onSelect 미호출)

## QA 체크리스트 판정

| # | 항목 | 결과 |
|---|------|------|
| 1 | 컴포넌트 1개 이상 스키마 로드 시 "Outline" 행 표시 | pass |
| 2 | "Outline" 행 chevron(▾) 표시, 클릭 시 자식 접힘 (aria-expanded="false") | pass |
| 3 | 접힌 상태에서 재클릭 시 자식 펼쳐짐 (aria-expanded="true") | pass |
| 4 | 초기 상태 가상 루트 펼쳐짐 (aria-expanded="true") | pass |
| 5 | 가상 루트 행 클릭(chevron 제외) 시 onSelect 미호출 (no-op) | pass |
| 6 | 기존 최상위 컴포넌트 행 클릭 시 onSelect(id) 호출 | pass (단위 테스트) |
| 7 | 가상 루트 행에 data-testid="outline-virtual-root" | pass |
| 8 | 빈 스키마에서 "Outline" 루트 노드 표시 (빈 children) | pass |
| 9 | 기존 최상위 노드 --depth=1 (가상 루트 아래) | pass (단위 테스트) |
| 10 | 가상 루트 id __outline_root__가 formFieldRegistry에 없어 selection.set() 미호출 | pass (단위 테스트) |
| 11 | 드래그·드롭 후 "Outline" 루트 아래 자식 트리 업데이트 | pass (brw-test) |
| 12 | 컴포넌트 선택 시 aria-selected="true", 가상 루트에는 없음 | pass (단위+brw-test) |
| 13 | 핵심 UI 가상 루트 노드 브라우저 실제 표시, chevron 접기/펼치기 동작 | pass (brw-test) |

## 재시도 이력

- 1회차: E2E `아웃라인 패널 ↔ 캔버스 양방향 선택 동기화` 실패 — 가상 루트 도입 후 첫 번째 `[data-outline-id]`가 가상 루트(클릭 no-op)가 되어 `.outline-node--selected` 검증 실패
- 수정: `editor.dragdrop.spec.ts` 셀렉터를 `[data-outline-id]:not([data-outline-id="__outline_root__"])` 로 변경 → 재실행 통과

## 비고

- `tabs-drop-into-tab.spec.ts`, `tabs-schema-verify.spec.ts` 등 tabs 관련 E2E 파일은 untracked 상태이며 `tabs-tabpanel-refactor` 별도 feature의 미완성 시나리오. outline-root-node feature 범위 밖의 pre-existing 실패로 확인.
- 브라우저 검증 스크린샷에서 좌측 아웃라인 패널에 "Outline" 루트 + "card" 자식 트리 렌더 확인.
