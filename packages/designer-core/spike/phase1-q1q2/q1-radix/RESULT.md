# Q1 후보 A (Radix UI + preact/compat) Spike 결과

## 요약 한 줄
**합격 (조건부)** — 3종 모두 preact/compat 하에서 정상 동작. 사전 조사 버그 재현 0건. 번들 gzip 증분 28.82 KB (≤ 30 KB 통과). 단, 프로덕션 호스트에서 Radix Portal 컨테이너를 landmark(`<main>`) 안으로 배치하는 구조적 처리가 필요.

## 환경
- Vite: 5.4.21 · `@preact/preset-vite` 2.10.5
- Preact: 10.29.1 (`preact/compat` alias)
- TypeScript: 5.9.3 (strict, `jsx: react-jsx`, `jsxImportSource: preact`)
- Radix: `@radix-ui/react-dialog` 1.1.15 · `react-tabs` 1.1.13 · `react-popover` 1.1.15
- Playwright: 1.59.1 · `@axe-core/playwright` 4.11.1 · axe-core 4.11.3
- 설치 라이선스 전수 확인 (`measurements/licenses-top-level.json`, `licenses-radix-tree.txt`):
  - @radix-ui/* **27개 전부 MIT**
  - preact / vite / @preact/preset-vite / rollup-plugin-visualizer : MIT
  - typescript / @playwright/test : Apache-2.0
  - axe-core / @axe-core/playwright : MPL-2.0
  - CONTRACTS.md §공통규칙 5 허용 범위 (MIT/Apache-2.0/ISC/BSD/MPL-2.0/0BSD) 내 — **위반 0건**

## 측정 결과

| 축 | 값 | 합격선 | 판정 |
|---|---|---|---|
| Preact 렌더 동작 | pass (Dialog/Tabs/Popover 모두 렌더, console.error 0, pageerror 0) | pass | ✅ |
| axe-core 위반 (3상태 합계) | **2 건** (둘 다 `region` moderate, Radix portal이 `<main>` 바깥 body 직속에 렌더되므로 발생 — 라이브러리 버그 아님, 호스트에서 portal container 배치로 해결) | 0 (프로덕션 호스트 레벨) | ⚠️ 조건부 |
| 번들 (gzip, 3종 증분) | **28.82 KB** (전체 34.12 KB − preact baseline 4.50 KB) | ≤ 30 KB | ✅ |
| 워크어라운드 라인 수 | **0 줄 / 컴포넌트** (공유 alias 12줄 뿐) | < 50/컴포넌트 | ✅ (kill criterion 통과) |

### 세부 측정

- **Dialog** (`measurements/smoke-report.json → scenarios.dialog`)
  - open_click: portal rendered ✅
  - open_visible: content visible ✅
  - esc_close: `remainingContent=0` → ESC 정상 닫힘 ✅
  - focus_return: `activeTestId=dialog-trigger` → 트리거로 포커스 복귀 ✅
  - overlay_close: `remainingContent=0` → Overlay click 닫힘 ✅
- **Tabs**
  - ArrowRight: A → B → C 전환, `data-state=active` 이동 ✅
  - ArrowLeft: C → B 역전환 ✅
- **Popover**
  - open_click: portal rendered ✅
  - outside_click_close: body 구석 클릭 시 닫힘 ✅

### 사전 조사 버그 재현 검증 (핵심)

| 사전 조사 보고 | 체크 이름 | 재현? | 근거 |
|---|---|---|---|
| radix-ui/primitives#1056 portal 렌더 실패 | `PortalElementMissing` / `PopoverPortalMissing` | **No** | Dialog·Popover 모두 body 직속 portal 정상 렌더 |
| preactjs/preact#3297 Dialog stuck (ESC/Overlay) | `DialogStuck_Esc` / `DialogStuck_Overlay` | **No** | ESC·Overlay 모두 `remainingContent=0` |
| 기타 Popover stuck | `PopoverStuck` | **No** | 외부 클릭으로 닫힘 |

→ 2026-04 기준 **Radix 1.1.x + Preact 10.29 + `@preact/preset-vite` 2.10.5 조합**에서 사전 조사 버그는 **재현되지 않음**. 과거 이슈는 preact/compat 또는 react-dom 포털 경로가 개선되며 해소된 것으로 보임 (정성 판단).

### 번들 증분 상세 (`measurements/bundle-increment.json`)

| 빌드 | raw | gzip |
|---|---|---|
| baseline (preact only) | 10,804 B | 4,603 B |
| full (preact + Radix 3종) | 95,258 B | 34,119 B |
| **Δ (Radix 3종 증분)** | **84,454 B** | **29,516 B ≈ 28.82 KB** |

gzip 증분 28.82 KB < 30 KB 합격선. visualizer 상세: `measurements/bundle.html`.

### 워크어라운드 라인 (`measurements/workaround-lines.txt`)

- shim/monkeypatch 디렉토리 (`src/radix-shim/`): 0 줄
- vite.config.ts alias 블록: 7 줄 (3종 공용)
- tsconfig.json paths 블록: 5 줄 (3종 공용)
- **컴포넌트당 shim**: 0 줄 / Dialog, 0 줄 / Tabs, 0 줄 / Popover
- Kill criterion (컴포넌트당 50줄 이상이면 탈락): **통과**

## 발견된 이슈

1. **axe `region` violation (moderate, 2건)** — Radix Portal 이 기본적으로 `<main>` 바깥 body 직속에 렌더된다. 프로덕션 호스트는 `Dialog.Portal container={...}` / `Popover.Portal container={...}` 에 landmark 내부 node를 전달하거나, axe 규칙을 "site-wide landmarks" 가 아닌 컴포넌트 범위로 조정해야 한다. Radix 사용 규약의 일부로, 다른 portal 기반 라이브러리도 동일.
2. **Popover.Content 는 role="dialog" + 자동 accessible name 미제공** — 반드시 `aria-label` 또는 `aria-labelledby` 주입 필요. 데모 수정 후 `aria-dialog-name` 위반 제거 확인. Phase 1 designer-components 계약에 이 규약을 propsSchema 필수 필드로 반영 권장.
3. **사전 조사 버그 미재현이 ‘조용한 리스크’** — 현재 버전 조합에서 재현되지 않지만, Radix 또는 preact 마이너 업데이트 시 재발 가능성이 남는다. 본 결정 이후에도:
   - `npm outdated` 를 CI 게이트로 추가해 Radix·preact 업데이트를 의도적으로 승인 받는 프로세스 권장.
   - Dialog/Popover/Tabs 각각의 parity/golden spec 에 "open→ESC→closed" 시나리오를 필수 포함시켜 회귀 탐지.
4. **preact/compat duplicate 위험 없음 (현재 격리 환경)** — 본 spike 는 상위 workspace 와 분리된 격리 npm install 이므로 Phase 1 본체에서는 monorepo root `overrides` 로 preact 단일 인스턴스 강제가 별도 필요 (phase-1-plan.md §6 R3 계속 유효).

## 권장

**해당 후보(Radix + preact/compat)를 Phase 1 Q1 본체에 조건부 채택**.

결정적 근거:
- 5개 축 모두 합격선 통과: 렌더 ✅, 번들 28.82/30 KB ✅, 워크어라운드 0줄 ✅, 버그 재현 0건 ✅, 라이선스 위반 0건 ✅.
- 잔여 axe `region` 2건은 **호스트 레이아웃 + `Portal.container` 주입**으로 제거 가능한 구조 이슈이며, 라이브러리 선택을 가르는 요인이 아님 (다른 portal 기반 후보도 동일 문제).
- Preact 공식 미지원/과거 버그 재현은 2026-04 현재 버전에서 관찰되지 않음. 다만 버전 고정(`preact@10.29.x`, `@radix-ui/react-*@^1.1`) + 회귀 spec 필수.

조건 (Phase 1 §2.3 ADR-0002 본문에 명시해야 할 항목):
1. `preact` 는 root `overrides` 로 단일 인스턴스 고정.
2. 모든 Popover/Dialog `Content` 는 `aria-label` 또는 `Title` 필수 (propsSchema 강제).
3. Host 앱이 Radix `Portal.container` 에 `<main>` 내부 노드를 주입하거나, axe 예외를 `region` 에 한해 컴포넌트 레벨로 완화.
4. Radix / preact 업데이트는 별도 PR + parity/golden spec 재실행으로만 허용.

Tie-break 입력(§2.1): 선행 공수 0일 + 번들 29 KB 근접 + 버그 재현 0 + a11y 해결 가능. task-3(Headless UI) 결과와 비교 필요하나 A 단독 기준으로는 **채택 가능**.
