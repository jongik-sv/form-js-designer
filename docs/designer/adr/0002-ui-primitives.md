# ADR 0002 — UI Primitive Library (Dialog/Tabs/Popover)

- **상태**: Accepted
- **초안일**: 2026-04-17
- **승격일**: 2026-04-17 (Phase 1 §2.1 Q1 spike 5 후보 전수 측정 결과로 자동 확정)
- **결정자**: jongik-sv
- **검증 산출물**: `packages/designer-core/spike/phase1-q1q2/{q1-radix,q1-headlessui,q1-ariakit,q1-zag-custom,q1-custom-aria}/` (각 `RESULT.md` + `measurements/`)
- **관련 문서**: [PRD §4 #1/#4-1/#7](../PRD.md), [TRD §3/§5](../TRD.md), [Phase 1 §2.1](../phase-1-plan.md), [ADR-0001 §3 D1/D5](./0001-single-render-pipeline.md), [ADR-0003 §3 D6](./0003-table-library.md)

---

## 1. 문맥

Phase 1 `designer-components` 5종 중 Tabs/Modal(Dialog) · 향후 Popover 가 필요한 UI 프리미티브를 어느 라이브러리로 구현할지 결정한다.

제약 조건:
- **PRD "Preact 단일 스택"** — React 런타임 공존 금지. React 기반 라이브러리는 `preact/compat` alias 로 흡수해야 한다.
- **ADR-0001 §3 D1** — 모든 `designer-*` 컴포넌트는 순수 `render()` · 단일 DOM 트리. 프리미티브가 `defineComponent` 계약에 흡수 가능해야 한다.
- **ADR-0001 §3 D5** — Viewport/Theme/Data 패리티. 프리미티브가 테마 토큰 · 로케일 · viewport breakpoint 를 오염 없이 상속해야 한다.
- **TRD §5 컴포넌트 스펙** — Phase 1 에 Modal/Tabs 이 필수. Phase 2 에서 Accordion/Toast/Select 등 최소 5종 확장 예정.

Phase 1 §2.1 preamble 의 **사전 조사 결과**:
- **Radix UI**: Preact 공식 미지원 + `radix-ui/primitives#1056` portal 렌더 실패, `preactjs/preact#3297` Dialog stuck 등 다수 실사용 버그 기록.
- **Ark UI**: `@ark-ui/preact` 패키지 자체 부재 — 공식 지원 타깃은 React/Solid/Vue/Svelte 4 종.
- **idea.md 기본값**(Radix) vs 위 이슈 재확인이 필요해 이진 선택(Radix vs Ark) 을 5 후보 탐색으로 재편했다.

본 ADR 은 Q1 spike 5 후보 측정값(task-2~6, 2026-04-17) 을 근거로 **조건부 1 순위(본체) + 2 순위 fallback + 5 순위 긴급 fallback** 의 3 층 구조를 확정한다.

---

## 2. 후보 5 개 (동일 게이트)

Phase 1 §2.1 "Preact 단일 스택에서 Dialog/Tabs/Popover 3 종이 a11y · 성능 합격으로 동작하는 조합" 탐색.

| # | 후보 | 동작 방식 | 선행 공수 | 라이선스 | spike 디렉토리 |
|---|---|---|---|---|---|
| A | **Radix UI** (`@radix-ui/react-*`) + `preact/compat` | React 의존을 preact compat 으로 흡수. 알려진 portal/Dialog 버그 재현·회피 실측. | 0 일 | MIT (27 패키지 전수) | `q1-radix/` |
| B | **Zag.js 저수준 + 자체 Preact 어댑터** | `@zag-js/*` 상태머신만 사용, 렌더·접근성 props 바인딩을 Preact 로 자체 작성. | 2 일 | MIT (Zag 패밀리 14 종 전수) | `q1-zag-custom/` |
| C | **Ariakit** (`@ariakit/react`) + `preact/compat` | Radix 대안. Preact 실측 전례 적음. | 0.5 일 | MIT | `q1-ariakit/` |
| D | **Headless UI** (`@headlessui/react`) + `preact/compat` | Tailwind 팀 공식. 3 종 지원. | 0 일 | MIT | `q1-headlessui/` |
| E | **자작 + WAI-ARIA 스펙 직접** | Radix 수준의 ARIA Authoring Practices 를 3 종에 한해 직접 구현. | 3~4 일 | 자작 (외부 런타임 의존 0) | `q1-custom-aria/` |

**동일 게이트** (Phase 1 §2.1): Preact 렌더 동작(console/pageerror 0), axe-core 위반, 번들 gzip 증분 ≤ 30 KB, 컴포넌트당 workaround < 50 줄(kill criterion), 확장성.

---

## 3. 결정

### D1. Phase 1 본체: **Radix UI + `preact/compat` 조건부 채택 (1 순위)**

Q1 spike task-2 측정 기준:
- 번들 gzip 증분 **28.82 KB** (baseline 대비) — 30 KB 예산 내.
- `pageerror` 0 건, `console.error` 0 건. Dialog/Tabs/Popover 3 종 전 시나리오 pass.
- 사전 조사 버그 전수 미재현 (§6.3 참조).
- workaround **0 줄 / 컴포넌트** + 공유 alias 12 줄. Kill criterion 통과.

**조건 4 개** (본 ADR 승격의 전제 — 미준수 시 D2 로 전환):

1. **monorepo root `overrides` 로 preact 단일 인스턴스 고정** — `package.json` 의 `overrides.preact` 로 Radix/Zag 양쪽 의존 트리가 동일 preact 인스턴스만 보게 한다. React 라이브러리는 반드시 `preact/compat` alias 로 흡수.
2. **Dialog/Popover Content 는 `aria-label` 또는 `Title` 필수** — `Popover.Content` 는 자동으로 `role="dialog"` 가 붙어 accessible name 이 없으면 `aria-dialog-name` 위반이 발생한다. Phase 1 `designer-components` propsSchema 에서 이 속성을 필수 필드로 강제한다.
3. **Host 앱이 Radix `Portal.container` 에 `<main>` 내부 node 주입** — axe `region` moderate 2 건의 원인. Radix 기본값은 portal 을 `<body>` 직속에 렌더한다. `designer-editor-host` 가 `<main>` 하위 DOM node 를 명시적으로 `Portal.container` 로 전달하거나, axe 예외를 컴포넌트 범위 `region` 규칙에 한해 완화한다.
4. **Radix / preact 업데이트는 별도 PR + parity/golden spec 재실행 필수** — 사전 조사 버그가 미래에 회귀할 수 있으므로(§6.3 "조용한 리스크"), Radix 또는 preact 마이너 이상 업데이트는 독립 PR 로 만들고 Phase 1 §1.1 파리티/골든 게이트를 재실행한다.

### D2. Fallback: **Zag.js + 자체 Preact 어댑터 (2 순위)**

Q1 spike task-5 측정 기준:
- `pageerror` 0, `console.error` 0. Dialog/Tabs/Popover 3 종 전 시나리오 pass.
- axe-core 위반 **0 건** (4 라이브러리 후보 중 유일).
- 번들 gzip 증분 33.99 KB — 30 KB 예산 **+3.99 KB 초과** (재협상 1 회로 해소 가능).
- 자체 어댑터 **309 LOC** (`useMachine.ts` 300 + `normalizeProps.ts` 7 + barrel 2). 컴포넌트당 Demo LOC ≤ 47 — 해석 1(어댑터 = 인프라) 기준 kill criterion 통과.

**발동 조건**:
- D1 조건 4 개 중 어느 하나라도 차단 시(예: Radix preact 회귀 · 라이선스 변경 · 보안 CVE · Portal 주입이 호스트 구조상 불가능) **1 주 내 전환**.
- 전환 비용: 어댑터 309 LOC 는 `@zag-js/react/machine.mjs` 263 LOC 의 직역에 가까워 이해·재시도 저비용. 확장 시 신규 Zag 머신은 어댑터 0 LOC 증가 + 컴포넌트당 30~50 LOC.

**채택 정당화 (평시 탈락, 유사시 유일 대안)**:
- axe 0 위반은 Phase 1 PRD AC 접근성 요건의 절대 하한 확보.
- 번들 +3.99 KB 는 Phase 1 예산 30 KB → 35 KB 재협상 1 회로 해소.
- Zag 머신 자체는 MIT · 프레임워크 독립이라 React 생태계 규제 리스크 흡수 가능.

### D3. **Headless UI 는 Phase 1 제외 (3 순위)**

Q1 spike task-3 측정 기준:
- `pageerror` 0, workaround 0 / 컴포넌트 — 동작·유지보수 축은 Radix 동급.
- 그러나 번들 gzip 증분 **46.17 KB** — 30 KB 예산 **+16.17 KB 초과**. `@floating-ui/react` + `@react-aria/*` transit 의존이 주 원인, peerDep 구조상 tree-shake 한계.
- Popover 열림 상태 axe `aria-hidden-focus` **serious 1 건** (3 nodes) — 라이브러리 자체 결함.

**제외 이유**: 단순 번들 기준 Radix(28.82) 대비 1.6 배 열위. D1(Radix) 혹은 D2(Zag) 양쪽 탈락 시에만 고려하며, 그 경우에도 번들 예산 40~46 KB 재협상 + Popover a11y 수정 PR 선행 필요.

### D4. **Ariakit 은 탈락 (Phase 1 후보군 제외)**

Q1 spike task-4 측정 기준:
- `pageerror` **25 건 fatal** — `Cannot call an event handler while rendering.` (Ariakit `setRef` 가 render pass 중 ref callback → `useSyncExternalStore` subscribe → preact/hooks state guard throw).
- Tabs 키보드 전환 **미동작** (ArrowRight 2 회 후에도 aria-selected 고정). Popover 영구 `data-placing="true"` hidden — `@floating-ui/react-dom` positioning loop 완료 실패.
- 번들 gzip 증분 34.38 KB (예산 초과).
- axe `region` 1 건 — Popover 자체가 표시 안 되어 실제 a11y 위반이 **은폐**됨 (과소평가 지표).
- 해소 shim 추정 200~400 줄 필요 — kill criterion 엄격 해석 시 fail.

**탈락 이유**: preact/compat 런타임 **구조적 비호환**. Ariakit v0.5 또는 upstream preact #3654 계열 fix 이후 재검토(exit-level 탈락이며 Phase 1 동안 후보 재진입 없음).

### D5. **자작(WAI-ARIA 직접 구현) 은 긴급 fallback (5 순위)**

Q1 spike task-6 측정 기준(Dialog 1 종 실측):
- `pageerror` 0, axe-core 위반 **0 건** (33 passes).
- 번들 gzip 증분 **+2.23 KB** (예산 대비 12× 여유).
- Dialog 본체 **152 LOC** (ARIA 11 체크 전항 pass — role/aria-modal/labelledby/describedby/focus/scroll-lock/tab-trap/shift-tab-trap/esc/overlay/focus-return).
- 3 종 외삽: Tabs ~106 LOC / 1.56 KB, Popover ~182 LOC / 2.68 KB → **총 ~440 LOC / ~6.47 KB gzip**.
- 추가 공수 Phase 1 **+5~6.5 일** (Dialog 0.5 × 3 + a11y 회귀 스펙 2 + 스크린리더 매트릭스 1~2 + 코드리뷰 버퍼 1).

**발동 조건**: 4 라이브러리 후보(A·B·C·D) 가 **전부 차단**되는 시나리오. Radix·Zag·Headless·Ariakit 중 하나가 조건부 합격 이상인 한 자작 본체는 over-engineering.

**Risk register 기록 (Phase 1 §6 R3 파생)**:
> "전 후보 탈락 시 자작 전환 +5~6.5 일 · 번들 -22 KB 이득. Dialog 기준 0.5 일만에 axe 0 + 2.23 KB gzip 으로 복구 가능" — 라이브러리 비용의 절대 하한 데이터로 라이선스/버전 협상 레버리지.

### D6. 공유 alias 세트 (전 후보 공통)

본 ADR 채택 경로(D1 또는 D2)에 관계없이 Phase 1 `designer-*` 패키지는 다음 alias 를 강제한다.

**monorepo root `package.json`**:
```jsonc
{
  "overrides": {
    "preact": "10.29.x"  // 단일 인스턴스
  }
}
```

**`vite.config.ts` alias** (task-2 discoveries `task-2-preact-compat-alias.md` 템플릿 이관):
```ts
resolve: {
  alias: {
    react: path.resolve('./node_modules/preact/compat'),
    'react-dom': path.resolve('./node_modules/preact/compat'),
    'react-dom/test-utils': path.resolve('./node_modules/preact/test-utils'), // ADR-0003 §3 D6
    'react/jsx-runtime': path.resolve('./node_modules/preact/jsx-runtime'),
    'react/jsx-dev-runtime': path.resolve('./node_modules/preact/jsx-dev-runtime'),
  },
}
```

ADR-0003 §3 D6 에서 `react-dom/test-utils → preact/test-utils` 매핑을 이미 필수화했으므로 본 ADR 은 이를 UI 프리미티브 alias 블록에도 동일하게 포함한다. `packages/designer-components` 스캐폴드 체크리스트에 lint 항목으로 추가.

### D7. 의존성 분리 · 재평가 게이트

- Radix · Zag 업데이트는 **별도 PR + parity/golden spec 재실행 필수** (D1 조건 4 재확인).
- 신규 Radix 컴포넌트 도입 (Phase 2 Accordion/Toast/Select 등) 시 본 ADR 재평가 — 새 프리미티브가 사전 조사 버그 목록에 등재된 것이면 task-2 수준 스파이크 1 회 반복.
- `npm outdated` 를 CI 게이트로 추가해 Radix·preact 업데이트를 의도적으로 승인하는 프로세스 권장.

---

## 4. 영향

### 4.1 designer-components

- Phase 1 5 개 컴포넌트(Card/Stack/Tabs/Modal/Button) 중 **Tabs/Modal 은 Radix 직접 래핑**.
  - `@radix-ui/react-tabs` → `designer-components/src/tabs/Tabs.tsx`
  - `@radix-ui/react-dialog` → `designer-components/src/modal/Modal.tsx`
- Popover 는 Phase 1 컴포넌트 목록에는 없지만 Phase 2 대비로 `@radix-ui/react-popover` 를 동일 alias 트리에 묶어 둔다.
- Card/Stack/Button 은 프리미티브 불필요 — 순수 `defineComponent` + CSS.

### 4.2 호스트 앱 (designer-editor-host)

- **Portal.container 주입**: Dialog/Popover 모두 `<main>` 내부 DOM node 를 `Portal.container` prop 으로 주입해 axe `region` 2 건 해소 (D1 조건 3).
- **propsSchema 강제**: 모든 Dialog/Popover 컴포넌트에 `aria-label` 또는 `Title` 필수 — Phase 1 §3.1 `propsSchemaToPanel` 에서 이 필드가 없으면 validate 단계에서 exit 1.

### 4.3 번들 예산

- Phase 1 초기(Tabs/Modal 만 포함) gzip 증분 = **28.82 KB** (30 KB 예산 통과).
- Phase 2 Accordion/Toast 추가 시 +5 KB 내외 예상 — Radix 는 컴포넌트별 트리쉐이킹 효과적. 예산 재평가 시점에 본 ADR 재개정.

### 4.4 트레이드오프

- **장점**
  - idea.md 기본값(Radix) 유지 → 커뮤니티 a11y 성숙도 · 지속적 upstream fix 수혜.
  - Preact 단일 스택 (PRD) · 단일 렌더 파이프라인 (ADR-0001 D1) 준수.
  - axe `region` 2 건은 호스트 구조 변경으로 해결 가능 — 라이브러리 결함 아님.
- **단점 / 수용 가능한 제약**
  - Radix Portal container 주입 필수 · 업데이트 시 parity 재실행 (D7) 운영 부담.
  - 사전 조사 버그(`#1056`, `#3297`)가 **현재 버전에서 미재현**이지만 미래 회귀 가능성 — D7 + 조건 4 가 방어막.
  - Preact 공식 미지원이라 upstream 으로부터 명시적 호환성 보증은 없음 — 자체 회귀 스위트로 대체.

---

## 5. 대안 (기각)

### (A) Ark UI 직접 채택 (React 브랜치 + `preact/compat`)

**기각**: `@ark-ui/preact` 패키지 자체 부재. React 브랜치를 preact/compat 으로 흡수한다 해도 실측 전례 0 — Zag 저수준 채택(D2)으로 우회하는 편이 합리적.

### (B) Radix + 다른 포털 라이브러리 병행 (2 세트 공존)

**기각**: 단일 렌더 파이프라인 (ADR-0001 §3 D1) 위반 가능성 + 2 세트 관리 비용 · 번들 중복. D2 (Zag fallback) 로 충분.

### (C) Headless UI 단독

**기각**: §D3 — 번들 46.17 KB 로 예산 30 KB 초과 (+16.17 KB) + Popover `aria-hidden-focus` serious 1 건.

### (D) Ariakit 단독

**기각**: §D4 — preact/compat 런타임 구조적 실패 (`pageerror` 25 fatal, Tabs/Popover 기능 미동작).

### (E) 자작 단독 (5 순위를 본체로 격상)

**기각**: §D5 — Phase 1 +5~6.5 일 일정 부담 + 영구 유지보수 부채. 4 라이브러리 중 최소 1 곳 합격이면 over-engineering. 단, 전 후보 탈락 시 유일한 잔존 경로로 fallback 기록 유지.

### (F) PRD §5 "Preact 단일 스택" 제약 재협상 → React 병행 허용

**기각**: PRD 기본 전제 수정은 Phase 1 범위 밖. 5 후보 중 A·B 가 조건부 합격이므로 제약 유지가 가능.

---

## 6. 검증 (Spike 결과)

### 6.1 5 후보 측정 표 (동일 스키마)

Phase 1 §2.1 동일 게이트 하에 5 후보 전수 측정 (2026-04-17, task-2~6). 전부 Vite 5.4.21 · Preact 10.29.1 · `@preact/preset-vite` 2.10.5 · Playwright 1.59.1 · axe-core 4.11.3 환경.

| 축 | Radix (A) | Headless UI (D) | Ariakit (C) | Zag+자체 (B) | 자작 (E, Dialog만) |
|---|---|---|---|---|---|
| **pageerror / console.error** | 0 / 0 | 0 / 0 | **25 / 1 fatal** | 0 / 0 | 0 / 0 |
| **axe 위반 (3 상태 합)** | 2 (region moderate, 호스트 완화) | 1 (aria-hidden-focus **serious**) | 1 (region, 기능 미작동으로 **은폐**) | **0** | **0** (Dialog) |
| **번들 gzip 증분 (3 종)** | **28.82 KB** ✅ | 46.17 KB ❌ | 34.38 KB ❌ | 33.99 KB ❌ (+3.99) | 2.23 KB (Dialog 실측) / 6.47 KB (3 종 외삽) |
| **workaround / 컴포넌트** | 0 (공유 alias 12) | 0 (공유 alias 16) | 0 (config 10) + shim 200~400 추정 | ≤ 47 (Demo) / 공유 어댑터 309 | — (직접 구현 본체 ~152/컴포넌트) |
| **사전 조사 버그 재현** | 전수 미재현 (#1056, #3297) | — | preactjs/preact #3654 상당 재현 | — | — |
| **3 종 기능 동작** | Dialog/Tabs/Popover 전 시나리오 pass | 전 시나리오 pass | **Tabs/Popover fail** | 전 시나리오 pass | Dialog only |
| **라이선스** | MIT 27/27 (Radix) + 허용 범위 내 | MIT 98 + 허용 범위 내 · CC-BY-4.0 dev-only 1 | MIT 94 + 허용 범위 내 · CC-BY-4.0 dev-only 1 | Zag 패밀리 14 종 MIT 전수 | MIT / Apache-2.0 / MPL-2.0 전수 |
| **Phase 1 채택** | **1 순위 조건부 (본체)** | 제외 (3 순위) | **탈락** | **2 순위 fallback** | **5 순위 긴급 fallback** |

### 6.2 인용 경로 (measurements/ 실파일 기준)

각 후보의 spike 디렉토리(`packages/designer-core/spike/phase1-q1q2/`) 하위 `measurements/` 실측 파일만 인용. 없는 파일 인용 금지.

#### A. Radix UI — `q1-radix/`
- `RESULT.md` — §3·§측정 결과 전문
- `measurements/smoke-report.json` — Dialog/Tabs/Popover 3 시나리오 step-by-step, pageerror 0
- `measurements/axe-report.json` — 3 상태 axe 결과 (region 2 건)
- `measurements/bundle-increment.json` — baseline vs full gzip delta (28.82 KB)
- `measurements/bundle-size.txt`, `measurements/bundle.html` (treemap)
- `measurements/workaround-lines.txt` — 0 LOC/컴포넌트 + 공유 12
- `measurements/licenses-top-level.json`, `measurements/licenses-radix-tree.txt`, `measurements/npm-list.json`
- `measurements/scenarios/*.png` (9 컷), `measurements/bugs/` (사전 조사 버그 재현 보존)

#### B. Zag.js + 자체 어댑터 — `q1-zag-custom/`
- `RESULT.md` — 2 중 해석(어댑터 amortize) 분석 포함
- `measurements/smoke-report.json` — 3 시나리오 pass, pageerror 0
- `measurements/axe-report.json` — violations 0 (4 후보 중 유일)
- `measurements/bundle-increment.json`, `measurements/bundle-size.txt`, `measurements/bundle.html`
- `measurements/workaround-lines.txt` — 어댑터 309 + Demo 해석 2 중
- `measurements/licenses-top-level.json`, `measurements/licenses-zag.txt`
- `measurements/scenarios/00~08.png` (9 장 Dialog 3 · Tabs 3 · Popover 2 · loaded 1)

#### C. Ariakit — `q1-ariakit/`
- `RESULT.md` — Critical 섹션에 `setRef` 원인 분석
- `measurements/smoke-errors.json`, `measurements/smoke.log` — pageerror 25 건 원본
- `measurements/bugs/` — Ariakit preact event-handler-rendering 재현 보존본
- `measurements/axe-report.json` — 4 상태 (Popover 미표시로 과소평가)
- `measurements/bundle-increment.json`, `measurements/bundle.html`
- `measurements/workaround-lines.txt`, `measurements/licenses.json`
- `measurements/scenarios/*.png` (10 장)

#### D. Headless UI — `q1-headlessui/`
- `RESULT.md` — 3 종 귀속 axe + 번들 초과 분석
- `measurements/smoke.log`, `measurements/smoke-errors.json`
- `measurements/axe-report.json` — 4 상태 (Popover 열림 `aria-hidden-focus` serious 1/3 nodes)
- `measurements/bundle-size.txt`, `measurements/bundle.html` — JS 47.28 KB + HTML 0.73 KB
- `measurements/workaround-lines.txt` — 공유 16 / 컴포넌트 0
- `measurements/licenses.json` — 134 패키지 전수
- `measurements/scenarios/00..09-*.png` (9 컷), `measurements/console-clean.png`, `measurements/3-scenarios.png`

#### E. 자작 (WAI-ARIA Dialog) — `q1-custom-aria/`
- `RESULT.md` — Dialog 실측 + Tabs/Popover 외삽 근거
- `measurements/smoke-report.json` — 11 단계 ARIA step-by-step pass
- `measurements/axe-report.json` — 0 violations / 33 passes
- `measurements/bundle-increment.json`, `measurements/bundle-size.txt`, `measurements/bundle.html`, `measurements/bundle-main.js`
- `measurements/workaround-lines.txt` — 외삽 근거(복잡도 계수)
- `measurements/licenses-top-level.json`
- `measurements/scenarios/dialog-{00..04}-*.png` (5 컷)

### 6.3 핵심 소견

1. **Radix 사전 조사 버그 전수 미재현** — `radix-ui/primitives#1056` (portal 실패) · `preactjs/preact#3297` (Dialog stuck ESC/Overlay) 모두 2026-04 Radix 1.1.x + Preact 10.29 + `@preact/preset-vite` 2.10.5 조합에서 0 건. 과거 이슈는 compat/portal 경로 개선으로 해소된 것으로 보임 (정성 판단). 다만 **조용한 리스크**로 미래 회귀 가능성이 남아 D7 게이트로 방어.
2. **axe `region` 2 건은 라이브러리 결함 아님** — Radix 기본 Portal 이 `<body>` 직속에 렌더되어 "모든 콘텐츠는 landmark 내부" 규칙에 걸린다. 호스트 레벨 `Portal.container` 주입으로 해소 — 다른 portal 기반 후보도 동일 문제이므로 라이브러리 선택을 가르는 요인이 아니다.
3. **Zag 자체 어댑터 309 LOC 의 양면성** — 해석 1(공유 어댑터=인프라, 컴포넌트 Demo LOC ≤ 47) 기준 kill criterion 통과, 해석 2(309/3 귀속, 컴포넌트당 137~150) 기준 fail. Phase 1 초기 도입 비용은 해석 2 가 현실적이므로 평시 2 순위로 격하, 유사시 현실적 전환 경로로 보존.
4. **Ariakit exit-level 탈락** — `Cannot call an event handler while rendering.` 은 preact/hooks state guard 가 render pass 중 setState 를 금지하는 구조적 경계이며, React 와의 차이가 근본적. Ariakit v0.5 또는 preactjs/preact upstream fix 이전에는 재검토 의미 없음.
5. **자작 실측(152 LOC / 2.23 KB / axe 0) 의 데이터 가치** — 본 ADR 의 결정 레버리지. "Radix 가 블로킹되면 자작 Dialog fallback 은 0.5 일 / axe 0 / 2.23 KB 로 복구" — risk register 에 기록해 라이브러리 협상 시 절대 하한 데이터로 활용.

### 6.4 제한 사항

- 본 spike 는 격리 npm install 환경 (monorepo root 분리) — Phase 1 본체에서는 `overrides` + `npm ls preact` CI 체크로 단일 인스턴스 강제 재확인 필요 (R3).
- axe-core 실측은 Dialog/Tabs/Popover 3 종 오픈 상태에 한정. 접근성 전수 검증은 Phase 1 §3.2 각 컴포넌트 `*.golden.spec.ts` 에서 재실행.
- 자작(E) 의 Tabs/Popover 는 실측이 아닌 복잡도 계수 기반 외삽 — 실제 자작 전환 시 Phase 1 §2.1 kill criterion 을 재적용해야 한다.

---

## 7. 후속 결정

- **TRD §3 / §13 갱신 PR**: TRD §3 "UI 라이브러리 기본값" 을 "Radix UI + `preact/compat` (ADR-0002 §3 D1 조건부)" 로 확정, §13 미결 Q1 항목 제거. task-8 에서 TRD 갱신 진행 중.
- **ADR-0004 (예정)**: Radix 업데이트 정책 — D1 조건 4 "별도 PR + parity/golden 재실행" 을 CI 잡으로 구체화 (`npm outdated` 게이트, 업데이트 승인 템플릿).
- **ADR-0005 (예정)**: Dialog/Popover `Portal.container` 호스트 계약 표준화 — `<main>` 내부 DOM node 주입 패턴을 `designer-editor-host` 공용 유틸로 추출 (`packages/designer-editor-host/src/portal/PortalAnchor.ts`).
- **Phase 1 §3.2 착수 전제**: D6 공유 alias 세트를 `designer-components` 스캐폴드 시점에 lint 항목으로 반영. ADR-0003 §3 D6 의 `react-dom/test-utils` 매핑과 동일 블록 공유.
- **Risk register 항목 추가** (Phase 1 §6):
  - R10: Radix preact 사전 조사 버그 회귀 → D7 게이트 + D2 fallback 1 주 전환.
  - R11: 4 라이브러리 전수 탈락 → D5 자작 전환 +5~6.5 일 / 번들 -22 KB.
