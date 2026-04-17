# Ariakit (Candidate C) Q1 Spike 결과

## 요약 한 줄
**불합격** — Ariakit v0.4.26 은 preact/compat 런타임에서 `Cannot call an event handler while rendering.` pageerror 25건이 발생하며, Tabs 키보드 전환과 Popover 표시가 기능적으로 실패한다. 번들도 34.38 KB로 ≤30 KB 합격선을 넘는다.

## 환경
- Vite: 5.4.21
- Preact: 10.29.1
- 외부 라이브러리: `@ariakit/react@0.4.26` (의존: `@ariakit/react-core@0.4.20`, `@ariakit/core@0.4.18`, `@floating-ui/react-dom`, `use-sync-external-store`)
- 설치 라이선스 전수 확인 (tree 121개):
  - MIT 94 / Apache-2.0 5 / MPL-2.0 2 / ISC 10 / BSD-2/3-Clause 9 — 허용 범위 내
  - CC-BY-4.0 1 (`caniuse-lite`, `@preact/preset-vite → @babel/preset-env` 경유 dev-only, 번들 미포함) — task-3과 동일 이슈, 플랜 리더 재확인 필요
- 포트: **5203** (5183/5193 점유 회피)

## 측정 결과

| 축 | 값 | 합격선 | 판정 |
|---|---|---|---|
| Preact 렌더 동작 | Dialog pass / Tabs **fail** / Popover **fail**; console.error 1, pageerror **25** | pass (console.error=0, pageerror=0) | **❌ fail** |
| axe-core 위반 | `region` moderate 1건 (호스트 레벨 · `<h1>` 이 `<main>` 바깥) — Popover가 `hidden`이라 실제 위반이 잠재 은폐 | 0 | ⚠️ 조건부 (기능 미동작으로 과소평가) |
| 번들 (gzip, Ariakit 3종 증분) | **34.38 KB** (full 38.87 KB − baseline 4.50 KB) | ≤ 30 KB | **❌ fail** |
| 워크어라운드 라인 수 | config 10줄 공유 · 컴포넌트 shim 0줄. 런타임 해소 shim 추정 200~400줄 필요 | < 50/컴포넌트 | pass (config만) / **fail (실제 해소)** |
| 라이선스 | MIT 위주, 허용 범위 내 (CC-BY-4.0 1건 dev-only) | 100% | ✅ |

## 발견된 이슈

### Critical — preact/compat 런타임 비호환
- `pageerror: Cannot call an event handler while rendering.` 25건 (smoke-errors.json).
- Ariakit 내부 `setRef` (chunk `@ariakit_react.js:605`) 가 render pass 중에 ref callback 을 호출하고,
  그 callback 이 `useSyncExternalStore` subscribe/notify 경로로 setState 를 트리거한다.
  React 는 허용하지만 Preact 는 "rendering 중 setState" 로 간주하여 throw.
- 결과:
  - **Tabs**: ArrowRight 2회 후에도 `[role="tab"][aria-selected="true"]` 가 `탭 A` 에 고정. 키보드 전환 실패.
  - **Popover**: `PopoverDisclosure` 클릭 후 7회 polling 동안 `data-placing="true"` `hidden` 유지. `@floating-ui/react-dom` positioning 루프가 ref 에러로 완료되지 못함.
  - **Dialog**: 에러는 발생하지만 기능은 통과 (ESC close, overlay click close, focus return).

### Moderate — 번들 크기
- 34.38 KB gzip 증분. Radix(28.82 KB)보다 크고, Headless UI(46.17 KB)보다 작음.
- `@floating-ui/*` + `@ariakit/react-core` + `use-sync-external-store` 의 조합이 주요 비중.

### Low — 라이선스
- task-3과 동일한 `caniuse-lite` CC-BY-4.0 1건. Dev 의존이며 브라우저 번들에 유입되지 않음.

## 사전 조사 가설 재확인

본 스파이크 전 리스크로 제시된 두 가지:
1. "Ariakit v0.4+는 `useSyncExternalStore` 의존이 강함 → subscribe 재등록 이슈" (preactjs/preact #3654) — **재현됨, 단 정확히는 ref callback 중 setState throw 로 외부적으로 관찰됨.**
2. "Store 객체 매 렌더 재생성 시 focus 이슈" — 본 데모는 `*Provider` (내부 store auto-manage) 로 회피했으나, 다른 실패가 선행하여 단독 검증 불가.

## 권장

**탈락 (Phase 1 미채택)** — 결정적 근거 2줄:
1. preact/compat 런타임에서 Tabs/Popover 기능이 동작하지 않으며, 이를 해소하려면 200~400줄의 Preact options 패치 또는 Ariakit core wrapper 가 필요하다 (§3 D3 워크어라운드 한계 초과).
2. Radix (Candidate A) 가 이미 같은 환경에서 pageerror 0 + 28.82 KB 로 통과했으므로, Ariakit 을 선택할 이점이 없다.

## 3후보 비교 소견 (Radix/Headless UI/Ariakit)

### 축별 우위

| 축 | Radix (A) | Headless UI (B) | Ariakit (C) | 우승 |
|---|---|---|---|---|
| preact/compat 런타임 | pageerror 0 | pageerror 0 | **pageerror 25, Tabs/Popover 기능 실패** | A=B |
| 번들 gzip (3종 증분) | **28.82 KB** | 46.17 KB | 34.38 KB | **A** |
| axe 실측 | region 2건 (호스트로 해결 가능) | **aria-hidden-focus serious 1건 (Popover 열림 시)** | 형식 1건 (Popover 미표시로 과소평가) | A |
| workaround config | 12줄 | 16줄 | 10줄 | C (config만; 실제 기능은 실패) |
| 워크어라운드 실제 필요 | 0줄 | 0줄 | **200~400줄 예상** | A=B |
| 사전 조사 버그 재현 | 전수 미재현 | — | **preactjs/preact #3654 상당 재현** | A |

### Phase 1 채택 권고 (본 worker 관점)

- **1순위 (본체 채택)**: **Radix UI**
  - 번들 통과, axe `region` 은 호스트 레벨에서 해결, workaround 0. task-2 권고대로 조건부 채택 조건 4가지 수용.
- **2순위 (fallback)**: **Headless UI**
  - Radix 가 예기치 못한 회귀로 탈락할 경우만. 번들 예산 ≤45 KB 재협상 + Popover `aria-hidden-focus` 수정 필요.
- **탈락**: **Ariakit**
  - 본 spike 결과로 Phase 1 **후보에서 제외**. 추후 Ariakit ≥0.5 또는 업스트림 preact #3654 계열 fix 가 나오면 재검토.

## 산출물

- `packages/designer-core/spike/phase1-q1q2/q1-ariakit/RESULT.md` (이 파일)
- `measurements/smoke-errors.json`, `measurements/smoke.log` — pageerror 25건 원본
- `measurements/bugs/ariakit-preact-event-handler-rendering.json` — 재현 로그 보존본
- `measurements/axe-report.json` — 4상태 axe 결과
- `measurements/bundle.html`, `measurements/bundle-increment.json` — 번들 증분
- `measurements/workaround-lines.txt` — config 10줄 / 실제 해소 shim 미작성 사유
- `measurements/licenses.json` — 최상위 10개
- `measurements/scenarios/*.png` — 10장 (00~09)

## 공유 발견

- `/tmp/claude-signals/phase1-spike/discoveries/task-4-ariakit-preact-incompat.md`
  (Ariakit 이 preact/compat 에서 런타임 실패하는 구체적 원인 + 3후보 비교표)
