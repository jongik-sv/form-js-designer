# Q1 Candidate E — 자작 WAI-ARIA Dialog Spike 결과

## 요약 한 줄
조건부 합격 — Dialog 단독 기준 axe 0 위반 · 번들 +2.23 KB gzip · 3종 전수 자작 시 총 ~440 LOC 순증 (외삽). 번들·a11y에서 압도적 우위이나 **유지보수 부채 + 개발 리드타임**이 결정 변수.

## 환경
- Vite: 5.4.21
- Preact: 10.29.1  (no `preact/compat` alias — react shim 0줄, 타 candidate 대비 16줄 절감)
- @preact/preset-vite: 2.10.5
- 외부 UI 라이브러리: **없음** (Dialog 본체 자작)
- 설치 라이선스 전수 확인:
  - preact, @preact/preset-vite, vite, rollup-plugin-visualizer: **MIT**
  - typescript, @playwright/test: **Apache-2.0**
  - axe-core, @axe-core/playwright: **MPL-2.0**
  - 허용 범위 내 · 위반 0건.

## 측정 결과 (Dialog 1종 한정 실측)
| 축 | 값 | 합격선 | 판정 |
|---|---|---|---|
| Preact 렌더 동작 | pass · console.error 0 · pageerror 0 | pass | ✅ |
| ARIA 속성 (role=dialog, aria-modal=true, aria-labelledby/describedby 해석) | 전 항목 pass | 전 항목 | ✅ |
| 초기 focus (첫 focusable = `dialog-input`) | pass | pass | ✅ |
| scroll lock (body.overflow = hidden) + 해제 | pass | pass | ✅ |
| Tab / Shift+Tab focus trap | pass (첫↔끝 wrap) | pass | ✅ |
| ESC close + trigger focus 복귀 | pass | pass | ✅ |
| Overlay click close + trigger focus 복귀 | pass | pass | ✅ |
| axe-core 위반 (Dialog open 상태) | **0건** (33 passes) | 0 | ✅ |
| 번들 gzip 증분 (Dialog + Demo) | **2.23 KB** | ≤ 30 KB | ✅ (12× 여유) |
| 구현 라인 수 (Dialog.tsx 본체 code-only) | **152** LOC | (참고) | — |

실측 아티팩트:
- `measurements/smoke-report.json` (11 단계 ARIA 체크)
- `measurements/axe-report.json` (full)
- `measurements/bundle-increment.json`, `bundle-size.txt`, `bundle.html` (treemap)
- `measurements/scenarios/dialog-{00..04}-*.png` (5컷)
- `measurements/workaround-lines.txt` (외삽 근거)
- `measurements/licenses-top-level.json`

## Tabs / Popover 외삽 (3종 자작 총 공수 추정)
**본 스파이크는 Dialog 만 실측**. Tabs/Popover 는 WAI-ARIA 구현 복잡도 기반 선형 외삽:

| 컴포넌트 | 복잡도 계수 | 예상 LOC | 비고 |
|---|---|---|---|
| Dialog (실측) | 1.00 | 152 | focus trap + scroll lock + ARIA + ESC + overlay |
| Tabs (외삽) | 0.70 | ~106 | roving tabindex, Arrow Left/Right/Home/End, aria-selected sync |
| Popover (외삽) | 1.20 | ~182 | anchored positioning (ResizeObserver, getBoundingClientRect), outside-click, collision flip |
| **3종 총합 (외삽)** | — | **~440 LOC** 순증 | 추가로 a11y 회귀 스펙 · 스크린리더 매트릭스 테스트 필요 |

번들 외삽 (Dialog 2.23 KB gzip 실측 → 컴포넌트 크기 계수 비례):
- Tabs ≈ 1.56 KB, Popover ≈ 2.68 KB → **3종 총 ≈ 6.47 KB gzip**

## 발견된 이슈 / 주의사항
- **없음 (블로커)** — axe 0 위반, console 0, 모든 WAI-ARIA 체크 통과.
- preact/compat alias 불필요 → `preact/hooks` 만으로 `useState, useEffect, useCallback, useRef, useId` 전부 해결. 타 candidate 대비 vite 설정 12~16줄 절감.
- createPortal 도 **미사용**. `.caria-overlay { position: fixed; inset: 0; z-index: 40 }` 가 작동하므로 portal 생략. 단, 호스트 앱에서 부모가 `transform` 등으로 stacking context 를 끊는 경우 Portal 로 격상 필요 (추후 대응).
- useId 가 `P0-0`/`P0-1` 같은 `:` 이 없는 안전한 값을 생성 → aria-labelledby/describedby 가 즉시 DOM 조회 성공.
- 포트: 5223 (다른 worker 와 충돌 없음).

## 5후보 종합 비교 소견

| 후보 | 판정 | 번들 gzip (3종) | axe 위반 | 워크어라운드 | 장점 | 단점 |
|---|---|---|---|---|---|---|
| A Radix (task-2) | 조건부 합격 1순위 | 28.82 KB | 2 moderate (region) | 0 / 공유 alias 12줄 | a11y 성숙도, 커뮤니티 | portal 호스트 배치 필요 |
| B Headless UI (task-3) | 조건부 합격 2순위 | 46.17 KB ❌ | 1 serious (aria-hidden-focus) | 0 / 공유 alias 16줄 | Transition 내장 | 번들 초과 |
| C Ariakit (task-4) | 진행 중 | — | — | — | — | — |
| D Zag (task-5) | 진행 중 | — | — | — | — | — |
| **E 자작 (본)** | **조건부 합격 5순위 / fallback** | **~6.47 KB (외삽)** ✅ | **0 (Dialog 실측)** | N/A (구현 본체 ~440 LOC 외삽) | 번들 1/4, a11y 완전 제어, 라이선스 자유 | Phase 1 일정 +5~8일, 유지보수 부채 영구 |

### Radix 번들 28.82 KB vs 자작 외삽 6.47 KB — 실제 비용 비교
- **번들 차이**: -22.35 KB gzip (약 77% 감소) → 초고성능 저사양 클라이언트(임베디드 패널 등)에서만 의미. 일반 designer UI 에서는 페이로드 우열이 결정적이지 않음.
- **개발 공수 차이**: Radix 0줄 shim vs 자작 ~440 LOC 순증. Phase 1 일정 기준 **+5~8일** (Dialog 0.5일 실측 × 3종 외삽 + a11y 회귀 스펙 2일 + 스크린리더 매트릭스 1~2일 + 코드리뷰 버퍼 1일).
- **유지보수 부채**: Radix 가 ARIA 1.3 · 브라우저 포커스 동작 변화 · VoiceOver iOS 업데이트를 흡수해 줌. 자작은 매 OS/브라우저 릴리스마다 회귀 테스트 필요.
- **라이선스 자유도**: 자작은 React 생태계 의존 0 → 향후 Svelte/Solid 이식 또는 lit-html 스윙 시 1:1 포팅 쉬움. Phase 3 이후에만 가치.

### 전 후보 탈락 시 자작 전환 시 Phase 1 타임라인 영향
- Phase 1 §2 일정은 **UI 프리미티브 도입 1주** 가정.
- 자작 전환 시: **Dialog 0.5일 + Tabs 0.5일 + Popover 1.0일 + a11y 회귀 2일 + 스크린리더 QA 1~2일 = 약 5~6.5일 추가 (-1 → +1주 추가)**.
- Radix/Headless 대비 즉각 1주 슬립. 단, A/B/C/D 전부 탈락 시 **유일한 잔존 경로**.

### 권장 (본 worker 관점)
- **Phase 1 채택 1·2순위는 Radix / (Ariakit or Headless UI) 유지**. 자작은 채택하지 말 것.
- **자작은 "전 후보 탈락" 시의 fallback 루트로 명시 문서화**만 해 두고, 실제 구현은 킥오프하지 않음.
- 자작 실측 데이터(Dialog 152 LOC, 2.23 KB, axe 0)는 **타 candidate 와 협상 시 레버리지**로 활용 가능:
  - 예: "Radix 버그로 블로킹되면 자작 fallback 은 Dialog 기준 0.5일만에 0 위반 + 2.23 KB gzip 으로 복구 가능" — risk register 에 기록.

### 최종 권고
**조건부 합격 / Phase 1 5순위 (fallback only)**. Radix (task-2) 가 조건부 1순위로 유지되는 한 자작 본체 투입은 over-engineering. 본 spike 의 가치는 **"퇴로 확보 + 라이브러리 비용의 절대 하한 데이터"** 제공에 있음.
