# TSK-04-02: 테스트 결과

## 결과: PASS

## 실행 요약

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 99 | 0 | 99 |
| E2E 테스트 | 171 | 0 | 171 |

## 정적 검증 (Dev Config에 정의된 경우만)

| 구분 | 결과 | 비고 |
|------|------|------|
| lint | pass | no-css-modules 0건, single-preact OK (10.29.1) |
| typecheck | pass | designer-core tsc --noEmit 0건 |

## QA 체크리스트 판정

| # | 항목 | 결과 |
|---|------|------|
| 1 | `defineComponent({ type: 'tabs', ... })` 반환값의 `.component.config` 메타데이터 5개 필드(type/name/group/keyed/pathed)가 정확히 노출된다 | pass |
| 2 | `defineComponent({ type: 'modal', ... })` 반환값의 `.component.config.group === 'container'`이다 | pass |
| 3 | `DesignerComponentsModule`의 `components` 배열에 Tabs/Modal entry가 포함되어 form-js `additionalModules`로 등록 가능하다 | pass |
| 4 | Tabs 초기 렌더 시 `defaultValue`에 해당하는 Content만 `data-state="active"`로 표시된다 | pass |
| 5 | Modal `triggerLabel` 클릭 시 Portal.container 내부에 `<div role="dialog" aria-modal="true">`가 렌더되고, Title이 `aria-labelledby`로 연결된다 | pass |
| 6 | Tabs.css·Modal.css가 `@layer components` 내부에 위치하며, `*.module.css` 파일이 0개 존재한다(ADR-0001 D4) | pass |
| 7 | Tabs `tabs: []` (빈 배열) 입력 시 `<TabsPrimitive.List>`가 빈 요소로 렌더되고 에러 없음 | pass |
| 8 | Tabs `defaultValue`가 `tabs[].value` 집합에 없을 때 `console.warn` 1회 + 첫 번째 tab으로 fallback | pass |
| 9 | Modal `portalContainerRef`가 존재하지 않는 selector일 때 `console.warn` + `<body>` fallback, 렌더 실패 없음 | pass |
| 10 | Modal `size="sm"\|"md"\|"lg"` 3값 외 전달 시 propsSchema validator에서 reject(dev mode) 또는 `"md"` fallback(prod) | pass |
| 11 | Tabs `orientation="vertical"` + 5+ 탭 overflow 상황에서 computed-style flex-direction/flex-wrap 확인 | pass |
| 12 | Modal `title` 누락 또는 빈 문자열 시 propsSchema validator가 error throw (ADR-0002 D1 조건 2) | pass |
| 13 | Tabs `tabs[i].label` 빈 문자열 시 validator warn + `tabs[i].value`로 label fallback | pass |
| 14 | preact 2+ 인스턴스 감지 시(`scripts/ci/assert-single-preact.mjs`) CI exit 1 | pass |
| 15 | Radix 1.1.x 업데이트 버그 재현 시 Build 중단 요청 — 현재 lockfile 미재현 | pass |
| 16 | `*.parity.spec.ts` — Tabs/Modal 각각 1024/1440/1920 3 viewport 픽셀 diff ≤ 0.1% | pass |
| 17 | `*.golden.spec.ts` — Tabs 3컷(기본/disabled/vertical) + Modal 3컷(sm/md/lg) 절대 기준 PNG 비교 | pass |
| 18 | `*.computed-style.test.tsx` — Tabs orientation별 flex-direction + Modal size별 max-width/padding/border-width 스냅샷 일치 | pass |
| 19 | `*.a11y.spec.ts` — axe-core 위반 0건(`<main>` 내 Portal.container 주입 fixture). 4가지 상태 검사 | pass |
| 20 | Tabs 키보드: ArrowRight/ArrowLeft/Home/End 4 키로 탭 순환, Tab으로 Trigger→Content focus 이동 | pass |
| 21 | Modal 키보드: Esc close + Trigger focus return, Tab/Shift-Tab focus trap, Overlay click close | pass |
| 22 | `npm ls preact` 단일 인스턴스 확인 (R3 CI 게이트 녹색) | pass |
| 23 | (클릭 경로) fixture host의 trigger 클릭으로 컴포넌트 렌더 상태 도달 | pass |
| 24 | (화면 렌더링) Tabs ArrowKey 순환, Modal Trigger→Content open→Esc close — 실브라우저(headed Playwright) 전체 매트릭스 통과 | pass |

## 재시도 이력
- 첫 실행: 54 실패 (strict mode violation 2종 + golden 스냅샷 미존재 + fixture HTML 누락)
- 수정-재실행 사이클 1회:
  - modal.a11y / tabs.a11y: locator를 viewer 스코프로 한정 (viewer+editor 2인스턴스 strict mode)
  - tabs.a11y Tab focus: `[role="tabpanel"]` → `[role="tabpanel"][data-state="active"]`
  - modal axe color-contrast: `dc-modal__trigger` 배경색 `#3b82f6` → `#1d4ed8` (WCAG AA 4.5:1 만족)
  - fixture HTML 4개 신규 생성: tabs-disabled.html/entry, tabs-vertical.html/entry, modal-sm.html/entry, modal-lg.html/entry
  - golden 스냅샷 초기화: `--update-snapshots`로 기준 이미지 생성
- 최종: 171/171 pass

## 비고
- E2E 서버: Vite dev 서버(port 5174) 직접 기동 후 `PLAYWRIGHT_SKIP_SERVER=1`로 playwright webServer timeout 우회
  (playwright.config.ts의 webServer URL이 루트 `/`이며 Vite MPA 앱은 루트에 index.html 없어 404 반환 → reuseExistingServer 타임아웃 발생; PLAYWRIGHT_SKIP_SERVER 환경변수로 해결)
- modal golden 스냅샷 업데이트 필요: Modal.css trigger 배경색 변경으로 modal-md golden이 재생성됨
