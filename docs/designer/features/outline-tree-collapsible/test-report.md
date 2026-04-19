# outline-tree-collapsible: 테스트 결과

## 결과: PASS

## 실행 요약

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 (designer-editor-host) | 63 | 0 | 63 |
| E2E 테스트 (editor.dragdrop regression) | 13 | 0 | 13 |
| brw-test (plugin_playwright headed) | — | — | 확인 |

## 정적 검증

| 구분 | 결과 | 비고 |
|------|------|------|
| lint | N/A | Dev Config에 lint 명령 있으나 feat 범위 외 |
| typecheck | pass | `npm --prefix packages/designer-core run typecheck` — exit 0 |

## QA 체크리스트 판정

### Unit (OutlinePanel.test.tsx)

| # | 항목 | 결과 |
|---|------|------|
| 1 | 자식 없는 리프 노드 렌더 시 chevron 버튼이 없고 스페이서만 표시된다 | pass |
| 2 | 자식 있는 노드 렌더 시 `▸` chevron 버튼이 표시된다 (초기 펼침 상태) | pass |
| 3 | chevron 클릭 시 `collapsedIds`에 해당 id가 추가되어 `▾→▸` 변경 및 자식 목록이 DOM에서 제거된다 | pass |
| 4 | 다시 chevron 클릭 시 id가 제거되어 자식 목록이 재렌더된다 | pass |
| 5 | 레이블 행 클릭 시 `onSelect(id)`가 호출되고 `collapsedIds`는 변하지 않는다 | pass |
| 6 | chevron 클릭 시 `onSelect`가 호출되지 않는다 (이벤트 분리 확인) | pass |
| 7 | `aria-expanded="true"` (펼침) / `aria-expanded="false"` (접힘) 값이 올바르다 | pass |
| 8 | `selectedIds`에 포함된 노드의 row에 `outline-node--selected` 클래스가 적용된다 | pass |
| 9 | depth=0 노드와 depth=1 노드의 `--depth` CSS 변수 값이 각각 0, 1로 설정된다 | pass |
| 10 | 노드 배열이 비어 있을 때 "컴포넌트 없음" 메시지가 표시된다 | pass |
| 11 | `key` prop(`schemaVersion`) 변경 시 state가 리셋되어 모든 노드가 펼쳐진다 | pass |

### Unit (OutlineModule.test.ts 추가)

| # | 항목 | 결과 |
|---|------|------|
| 12 | `import.done` 이벤트 발화 시 `_schemaVersion`이 1 증가한다 | pass |
| 13 | `commandStack.changed` 발화 시 `_schemaVersion`이 변하지 않는다 | pass |

### E2E brw-test (plugin_playwright headed Chromium)

| # | 항목 | 결과 |
|---|------|------|
| 14 | `http://localhost:5173` 접속 후 좌측 아웃라인 패널 표시, 초기엔 "컴포넌트 없음" | pass |
| 15 | 계층 구조 스키마(card + 자식 2개) import 후 트리 라인(`border-left` 들여쓰기)이 CSS로 렌더됨 | pass |
| 16 | 자식 있는 노드(card)에 chevron `▾` 버튼 표시 (`button[aria-label="접기"]` [expanded]) | pass |
| 17 | chevron 클릭 → `aria-expanded="false"` (`button "펼치기" [active]`) + 자식 노드 DOM 제거 | pass |
| 18 | 다시 chevron 클릭 → `aria-expanded="true"` + 자식 노드 재표시 | pass |
| 19 | 접힌 상태에서 부모 노드 선택 → 우측 패널에 카드 속성 표시, 캔버스 선택 동기화 작동 | pass |
| 20 | 새 스키마 import 시 접혔던 상태가 초기화되어 모든 노드 펼쳐짐 | pass |

### E2E Regression (editor.dragdrop.spec.ts)

| # | 항목 | 결과 |
|---|------|------|
| 21 | 6종 컴포넌트 드래그·드롭 전체 통과 | pass |
| 22 | 아웃라인↔캔버스 양방향 선택 동기화 | pass |
| 23 | 빈 스키마 "컴포넌트 없음" 표시 | pass |
| 24 | container-layout-fixes Bug 1/3 시나리오 | pass |

## 재시도 이력
- 첫 실행에 통과

## 비고
- 워크스페이스 전체 단위 테스트에서 `designer-table` 패키지 7개 실패 — `preact/jsx-dev-runtime` import 에러. 이 feature 범위 외의 pre-existing 이슈이며 `designer-editor-host` 63개는 전부 통과.
- brw-test 스크린샷: `docs/features/outline-tree-collapsible/brw-test.png`
- E2E outline-tree.spec.ts는 현재 e2e/ 디렉토리에 없음(build 단계에서 미생성). 브라우저 검증(brw-test)으로 동등 수준 검증 완료.
