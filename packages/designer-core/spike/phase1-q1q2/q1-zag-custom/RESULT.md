# Q1 Candidate B — Zag.js 저수준 + 자체 Preact 어댑터 Spike 결과

## 요약 한 줄
조건부 합격 (2순위 fallback) — Preact 동작 100% · axe 0 위반(전 후보 중 유일)이지만, 자체 어댑터 309 LOC + 번들 증분 33.99 KB (목표 30 KB 대비 +3.99 KB)로 Radix 대비 실공수가 크다.

## 환경
- Vite: 5.4.21
- Preact: 10.29.1
- Zag.js 3종: `@zag-js/dialog@1.40.0`, `@zag-js/tabs@1.40.0`, `@zag-js/popover@1.40.0` (+ `@zag-js/core@1.40.0`)
- preact/compat alias **없음** (Zag 는 framework-agnostic — 외부 React 라이브러리 의존 0).
- 설치 라이선스 전수 확인: Zag 패밀리 14종 전부 MIT / preact MIT / dev 도구 MIT·Apache-2.0·MPL-2.0·ISC. 허용 범위 내 위반 0.

## 측정 결과

| 축 | 값 | 합격선 | 판정 |
|---|---|---|---|
| Preact 렌더 동작 | Dialog(open/ESC/backdrop) · Tabs(Arrow L/R) · Popover(outside click close) 전부 pass, console.error 0, pageerror 0 | pass | ✅ |
| axe-core 위반 (3상태 합계) | **0건** | 0 | ✅ |
| 번들 gzip 증분 (Zag 3종 + 자체 어댑터) | **33.99 KB** (full 39.41 KB − preact baseline 4.60 KB) | ≤ 30 KB | ❌ **조건부 fail** (+3.99 KB) |
| 워크어라운드 라인 수 (Demo 시나리오별) | Dialog 47 · Tabs 44 · Popover 34 | < 50/컴포넌트 | ✅ |
| 워크어라운드 라인 수 (어댑터 포함, amortized) | Dialog 150 · Tabs 147 · Popover 137 | < 50/컴포넌트 | ❌ (kill criterion의 엄격 해석) |
| 라이선스 | MIT 전수 통과 | 허용 범위 내 | ✅ |

## 워크어라운드 라인 수 — 2중 해석

Task-5 계약 §4의 "컴포넌트당 50줄 미만 kill criterion" 은 어댑터 공유 공수를 어떻게 귀속시키느냐에 따라 결론이 갈린다.

- **해석 1 — Demo 컴포넌트 보일러플레이트만 측정**: 공유 어댑터는 "인프라", 컴포넌트별 wiring 은 Demo 내부에 국한.
  - Dialog 47 / Tabs 44 / Popover 34 → **전부 < 50, PASS**.
- **해석 2 — 공유 어댑터 amortize (1/3 귀속)**: 공유 309줄 ÷ 3 ≈ 103줄 이 각 컴포넌트에 귀속.
  - Dialog 150 / Tabs 147 / Popover 137 → **전부 > 50, FAIL**.

해석 1 은 "라이브러리 기능이 늘어도 어댑터는 안 늘어남" 을 근거로 옹호 가능하지만, 초기 도입 비용은 해석 2 가 현실적이다. 본 RESULT 에서는 **해석 2 의 엄격 기준으로 "조건부 탈락" 판정** 하고, 해석 1 관점의 전략적 가치를 별도로 기록한다.

세부 파일:
- `src/zag-preact/useMachine.ts` 300 LOC — `@zag-js/react/machine.mjs` (263 LOC) 를 Preact 훅으로 포팅. `flushSync` → `queueMicrotask(() => fn())` 대체, `useRef/useState/useEffect/useLayoutEffect` → `preact/hooks` 동명 API. 핵심 transition/effect/bindable 로직은 그대로.
- `src/zag-preact/normalizeProps.ts` 7 LOC — `createNormalizer((v) => v)` identity pass-through. Preact 10 이 `className`·`htmlFor`·이벤트 핸들러·스타일 객체·data-* 전수 React 호환이라 추가 변환 0.
- `src/zag-preact/index.ts` 2 LOC — barrel re-export.

전체: `measurements/workaround-lines.txt`.

## 3 시나리오 실측

### Dialog
- trigger click → portal 렌더 ✅
- ESC → close + focus 복귀 (`dialog-trigger`) ✅
- backdrop 은 positioner(z=50) 아래 있어 직접 클릭 불가. `closeOnInteractOutside` 로 positioner 패딩 클릭 → close ✅.

### Tabs
- ArrowRight → a→b→c, Zag 가 `data-selected` 부착 ✅
- ArrowLeft → c→b ✅
- focus 이동이 키보드 네비와 동기화 ✅

### Popover
- trigger → portal + `@zag-js/popper` positioner 렌더 ✅
- document 바깥 click → `@zag-js/interact-outside` 발동, close ✅

모두 `measurements/scenarios/*.png` 9장.

## 발견된 이슈
- **Dialog backdrop click 테스트 설계**: Zag 의 Dialog Positioner 가 `inset:0 display:flex` 로 backdrop 상단을 덮기 때문에, backdrop 엘리먼트를 직접 클릭할 수 없다. 실사용자는 "content 외곽 클릭" 경로로 닫으며, 이는 Zag 의 `dismissable` 로직이 처리한다. 스모크 테스트는 `page.mouse.click(20, 20)` 형태로 positioner 외곽을 클릭해 `interact_outside` 트리거를 검증.
- **어댑터 포팅 시 `flushSync` 제거 영향**: React 어댑터는 `flushSync` 로 transition을 동기 flush 하지만, Preact 는 노출 API 없어 microtask 로 대체. 본 스모크 3 시나리오에서는 관측되는 race 없음. Phase 1 본체로 확장 시 `@zag-js/color-picker` 등 고빈도 업데이트 컴포넌트에서 재검증 필요.
- **번들 증분 33.99 KB**: Zag 는 internal 의존(`dismissable`, `focus-trap`, `remove-scroll`, `interact-outside`, `popper`, `aria-hidden`) 7종을 끌고 온다. Radix(28.82 KB) 대비 +5.17 KB 이지만, Preact 단일 인스턴스 보장·런타임 100% 통과·axe 0 을 감안하면 Phase 1 예산 재협상 근거 충분.

## 4후보 비교표 (task-2 · task-3 · task-4 · task-5 동일 스키마)

| 축 | Radix (task-2) | Headless UI (task-3) | Ariakit (task-4) | **Zag+자체 (task-5)** |
|---|---|---|---|---|
| 동작 방식 | `@radix-ui/react-*` + preact/compat | `@headlessui/react` + preact/compat | `@ariakit/react` + preact/compat | Zag machine + 자체 Preact hook |
| 런타임 (pageerror) | 0 | 0 | **25 (fatal)** | **0** |
| axe 위반 (3상태 합) | 2 (region, portal 위치) | 1 (aria-hidden-focus serious) | 1 (region, 기능미동작 은폐) | **0** |
| 번들 gzip 증분 | **28.82 KB** ✅ | 46.17 KB ❌ | 34.38 KB ❌ | 33.99 KB ❌(+3.99) |
| workaround config | 12 | 16 | 10 | 309 어댑터 + 컴포넌트당 ≤47 |
| 사전 조사 버그 재현 | 전수 미재현 | 없음 | Preact 비호환 재현 | 해당 없음 (신규) |
| 유지보수성 | Radix 분기별 릴리스, Preact 공식 미지원 | Tailwind 팀, React 전용 | v0.4 Preact 비호환, 업스트림 fix 미정 | Zag machine 업그레이드 = 자체 어댑터 호환 재검증 부담 |
| 확장성 (Accordion/Toast 등) | Radix 20+ 지원 | Tailwind UI 전 스펙 | v0.4 전 스펙 | Zag 머신 40+ 지원, 각각 자체 어댑터 적용 필요 |

## 자유도 vs 공수 트레이드오프 (정성 평가)

| 관점 | Radix (compat) | Zag+자체 (본 후보) |
|---|---|---|
| ARIA 마크업 제어 | Radix 내부 로직 (블랙박스, 우리 몫 0) | 완전 자체 제어 (axe 0 · Phase 1 마크업 정책 강제 가능) |
| Preact 버전업 리스크 | Preact·Radix 양 쪽 업데이트 (2 변수) | Preact·Zag·자체 어댑터 3 변수, 단 어댑터는 우리 소유 |
| 초기 도입 | 12 LOC alias 로 종료 | 309 LOC 어댑터 포팅 + 유지 책임 |
| 번들 | 28.82 KB | 33.99 KB (Zag 내부 helper 7종 포함) |
| 런타임 안정성 | 사전 조사 버그 재현 0 (본 spike 에서 확인) | 본 spike 시나리오 0 에러, 확장 시 adapter 재검증 필요 |
| SLA | Radix 업스트림 의존 | 어댑터는 우리 통제, Zag machine 은 업스트림 의존 |

**결론**: 본 후보는 "Radix 가 장래에 Preact 호환성 회귀(task-2 §사전조사 버그가 재발)할 경우" 의 **fallback** 으로 유효하다. Radix 가 현재 스냅샷처럼 안정이면 어댑터 유지비용이 정당화되지 않는다.

## Phase 1 채택 권고 (1~4순위)

1. **1순위 (본체 채택 권고 유지) — Radix UI (task-2)**: 번들 28.82 KB ✅, 런타임 에러 0, axe 2건 모두 host-level 해결 가능. 조건부 채택 (monorepo preact 단일 인스턴스 고정, Portal.container 호스트 주입 필수).
2. **2순위 (fallback) — 본 후보 Zag.js + 자체 어댑터 (task-5)**: axe 0 달성은 유일하나 번들 +3.99 KB 초과 + 어댑터 309 LOC 유지 부담. Radix 가 Preact 회귀·보안 취약점·포팅 차단 시 전환 타당.
3. **3순위 — Headless UI (task-3)**: 번들 46.17 KB 초과 + Popover axe serious. Tailwind 팀 업스트림 fix 또는 host 래퍼 shim 후 고려.
4. **탈락 — Ariakit (task-4)**: pageerror 25건 fatal, v0.5 또는 Preact 업스트림 fix 후 재검토.

## 전 후보 탈락 시 fallback 가능성

Radix·HUI·Ariakit 3종이 모두 차단되는 시나리오(예: Preact 10.x 가 Radix portal 내부 API 를 깨는 회귀, 또는 Tailwind UI 이전의 라이선스 변경)가 발생하면:
- 본 후보의 **어댑터 309 LOC** 은 Phase 1 당일 착수 가능한 수준의 고정비용. (`@zag-js/react/machine.mjs` 263 LOC 의 직역에 가까움 — 이해·재시도가 쉽다.)
- 확장 시 Accordion/Toast/Menu 등 추가 Zag 머신은 **새 어댑터 없이 동일 hook 재사용**, 컴포넌트별 30~50 LOC 만 추가.
- 번들 +3.99 KB 초과는 Phase 1 예산 협상 (30 KB → 35 KB) 1 회로 해소 가능.
- axe 0 달성은 host 레벨 우회 없이 컴포넌트 계약에서 보장되어, PRD §4 AC 10항목 중 접근성 관련 위험을 원천 차단.

즉, **본 후보는 "평시 탈락, 유사시 1주 내 전환 가능한 현실적 fallback"** 으로 Phase 1 문서에 기록 권고.

## 산출물
- `RESULT.md` (본 문서)
- `measurements/smoke-report.json` — 3 시나리오 steps + 0/0 error
- `measurements/axe-report.json` — 3상태, violations=0
- `measurements/bundle-increment.json` — gzip delta
- `measurements/bundle.html` — treemap
- `measurements/bundle-size.txt` — 단일 페이지 번들 40.69 KB (baseline 포함)
- `measurements/workaround-lines.txt` — 어댑터 + Demo 분해
- `measurements/licenses-top-level.json`, `measurements/licenses-zag.txt`
- `measurements/scenarios/00~08.png` — 9장 (Dialog 3 · Tabs 3 · Popover 2 · loaded 1)
