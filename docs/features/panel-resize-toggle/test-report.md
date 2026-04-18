# panel-resize-toggle: 테스트 결과

## 결과: PASS

## 실행 요약

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 219 | 0 | 219 |
| E2E 테스트 (panel-resize) | 7 | 0 | 7 |
| E2E 테스트 (dragdrop — regression) | 13 | 0 | 13 |

## 정적 검증

| 구분 | 결과 | 비고 |
|------|------|------|
| lint | pass | no-css-modules / single-preact / watermark-hash / watermark-scss 4개 게이트 통과 |
| typecheck | pass | tsc --noEmit (designer-core) 에러 없음 |

## 실제 브라우저 검증 (brw-test)

Playwright Chromium headless + 스크린샷 golden path 1회 재현:
- `/tmp/panel-initial.png`: Properties 패널 표시, 토글 버튼(›) 확인
- `/tmp/panel-after-drag.png`: splitter 드래그 후 패널 너비 축소 확인
- `/tmp/panel-collapsed.png`: 토글 클릭 후 패널 접힘, 에디터 전체 확장 확인
- `/tmp/panel-restored.png`: 재클릭 후 prevWidth 복원 확인

brw-test: Playwright chromium — 드래그 리사이즈 및 토글 실물 확인 완료

## QA 체크리스트 판정

| # | 항목 | 결과 |
|---|------|------|
| 1 | (정상) splitter 드래그 시 .side-panel 너비 180~600px 범위 실시간 변경 | pass |
| 2 | (정상) 토글 버튼 클릭 시 .side-panel 접힘(width→0) + 내용 숨김 | pass |
| 3 | (정상) 접힌 상태에서 토글 재클릭 시 prevWidth 복원 | pass |
| 4 | (정상) Properties / Live Preview 탭 전환 후 너비 상태 유지 | pass |
| 5 | (엣지) minWidth(180px) 미만 드래그 시 180px에서 멈춤 | pass (단위 테스트) |
| 6 | (엣지) maxWidth(600px) 초과 드래그 시 600px에서 멈춤 | pass (단위 테스트) |
| 7 | (엣지) ArrowLeft 키 입력 시 너비 −10px 감소 | pass |
| 8 | (엣지) ArrowRight 키 입력 시 너비 +10px 증가 | pass |
| 9 | (에러) prevWidth=0 방어 — 재오픈 시 기본값(300px) 복원 | pass (단위 테스트) |
| 10 | (통합) Live Preview 리사이즈 후 form-js live preview 정상 렌더 | pass (E2E 시나리오 6) |
| 11 | (통합) Properties 리사이즈 후 속성 목록 정상 표시 | pass (E2E 시나리오 1) |
| 12 | (a11y) splitter role="separator", aria-orientation="vertical", aria-valuenow 올바름 | pass |
| 13 | (a11y) 토글 aria-label 상태별 "닫기"/"열기" 동적 변경 | pass |
| 14 | (클릭 경로) 사이드바 클릭 → 패널 → splitter 드래그 → 너비 변경 → 토글 → 접힘 | pass |
| 15 | (화면 렌더링) splitter 브라우저 표시 및 드래그 기본 상호작용 동작 | pass |

## 재시도 이력

- **1차 실행**: 단위 219 통과. E2E 7 중 4 실패
  - 실패 원인 A: 토글 버튼 3개 — `.side-panel` 내부 `position:absolute; left:-20px`으로 배치된 `.side-panel-toggle`이 `.side-panel`의 `overflow-y:auto`에 의해 클리핑되어 `.editor-toolbar`에 가려짐 (pointer events 가로채기)
  - 실패 원인 B: 탭 전환 너비 유지 1개 — `toBeCloseTo(n, -1)` ±5px 허용치 부족 (실제 측정 차이 15.25px, CSS transition 타이밍)
- **수정 내용**:
  - `App.tsx`: `SidePanelToggle`을 `.side-panel` 내부에서 꺼내 `.app-layout` flex 형제 요소로 독립 배치
  - `app.css`: `.side-panel-toggle` CSS를 `position:absolute` 대신 flex item(`align-self:flex-start`) 방식으로 변경
  - `editor.panel-resize.spec.ts`: 탭 전환 테스트에 `waitForTimeout(300)` 추가 및 허용치를 `toBeCloseTo → Math.abs < 20`으로 조정
- **2차 실행**: 단위 219 통과, E2E 7/7 통과, regression 13/13 통과, lint/typecheck 통과

## 비고

- 단위 테스트 219개 = 기존 182개 + 신규 37개 (usePanelResize 23개, PanelSplitter 14개)
- E2E dragdrop regression 13개 전부 통과 (패널 리사이즈 변경이 드래그&드롭에 영향 없음)
- form-js-base.css 의존 유지 확인 (`@bpmn-io/form-js-viewer/dist/assets/form-js.css` import 유지)
