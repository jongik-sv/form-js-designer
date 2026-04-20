# ADR 0003 — Table Library & PD1 Canvas-Exception Policy

- **상태**: Accepted
- **초안일**: 2026-04-17
- **승격일**: 2026-04-17 (Phase 1 §2.2 Step 1 spike 결과로 자동 확정)
- **결정자**: jongik-sv
- **검증 산출물**: `packages/designer-core/spike/phase1-q1q2/q2-tanstack/` (`RESULT.md` + `measurements/`)
- **관련 문서**: [PRD §4 #8, #9](../PRD.md), [TRD §5.1, §10](../TRD.md), [Phase 1 §2](../phase-1-plan.md), [ADR-0001 D1/D6](./0001-single-render-pipeline.md)

---

## 1. 문맥

Phase 1 Table 구현은 두 개의 상호 연동된 결정을 요구한다.

1. **라이브러리 선정 (Q2)**: TRD §5.1 `TableSchema`/`ColumnDef` 트리(멀티헤더)·10k 행 가상 스크롤·셀 편집·dnd 컬럼 이동을 모두 충족해야 함 (PRD AC #8, #9 직결).
2. **상위 정책 (PD1)**: 라이브러리 후보가 canvas 기반(Glide Data Grid)을 포함하므로, **그 전에** ADR-0001 D1(모든 컴포넌트 DOM 렌더 의무) · D6(viewer↔editor 픽셀 파리티)에 Table 전용 예외를 둘지 결정해야 한다.

Phase 1 §2.0 PD1 결정 방식: **성능 실측으로 자동 확정**.
- FPS ≥ 55 (+ 멀티헤더·reorder 동작 + preact/compat hooks 호환) → **PD1-A** (DOM 유지, Glide 탈락)
- FPS < 50 또는 preact/compat hooks 실패 → **PD1-B** (Table 한정 canvas 예외 허용, Glide 재검토)

본 ADR은 Q2 Step 1 spike (`packages/designer-core/spike/phase1-q1q2/q2-tanstack/`) 측정값을 근거로 두 결정을 동시에 확정한다.

---

## 2. 후보

| # | 후보 | 렌더 방식 | 라이선스 | Preact 호환 |
|---|---|---|---|---|
| (A) | **TanStack Table v8** (headless) + **TanStack Virtual** + **dnd-kit** | DOM (headless — 렌더는 호출자) | MIT / MIT / MIT | `preact/compat` alias 실측 OK (§6.1) |
| (B) | **Glide Data Grid** (`@glideapps/glide-data-grid`) | Canvas | MIT | peerDep `react` only — react shim 미검증 |

---

## 3. 결정

### D1. Table 라이브러리는 **TanStack Table v8 + TanStack Virtual + dnd-kit** 조합을 채택한다

- 세 패키지 모두 **headless + DOM** — ADR-0001 §3 D1(모든 컴포넌트 DOM 렌더) · D6(픽셀 파리티) 전제를 **무수정 유지**한다.
- 라이선스는 모두 MIT — TRD §0 permissive 게이트 통과 (Apache-2.0/ISC/BSD/MPL-2.0/0BSD 허용 범위 내).
- TRD §5.1 `ColumnDef.columns?` 트리가 TanStack `columns` 중첩 필드에 1:1 매핑된다 (멀티헤더 colspan/rowspan 자동 계산).

### D2. **PD1-A** 를 Phase 1 기본 정책으로 확정한다

- 모든 컴포넌트(Table 포함)는 DOM 렌더 의무를 유지한다. ADR-0001 §3 D1/D6 원문 그대로 적용.
- Glide Data Grid 채택 시 필요했던 **ADR-0001 부록 §A "Canvas 예외" 조항은 작성하지 않는다.** Phase 1 ADR 세트는 DOM 단일 전제로 종결된다.
- Phase 2 이후 100k+ 초대규모 · Canvas-only 리치 셀(Excel 수식 편집 등)에서 DOM 한계가 드러나면 **PD1-B** 재검토 여지는 열어 둔다 — 그 경우 본 ADR을 **Superseded** 로 표기하고 신규 ADR로 교체한다.

### D3. 가상 스크롤은 **TanStack Virtual** 로 구현한다

- TanStack Table 공식 가상화 예제와 정합. `getRowModel().rows` 를 `useVirtualizer({ count, getScrollElement, estimateSize })` 에 직접 연결.
- row 높이 가변(variable size) 지원 — 편집 모드에서 다중행 editor 가 펼쳐질 때도 `estimateSize` + `measureElement` 콜백으로 재측정.
- TRD §10 NFR "1만 행 가상화 스크롤 60fps" — spike 실측 59.99 FPS 로 충족 (§6.1).

### D4. 컬럼 이동은 **dnd-kit** `SortableContext` + `useSortable` 로 구현한다

- designer-core (palette 드래그, 필드 드래그) 와 designer-table (컬럼 드래그) 가 **동일 dnd 라이브러리** 를 사용 — 드래그 오버레이/센서/접근성 키보드 처리 규약을 패키지 경계 없이 공유한다.
- leaf header(실제 열) 에만 `useSortable` 을 붙이고, group header(멀티헤더 중간층) 는 자식 leaf 순서로 자동 계산.

### D5. TanStack `state` 항목은 **stable ref** 전용 규약을 채택한다 (spike 발견 I1 반영)

preact/compat 환경에서 `state.columnFilters` 등에 매 렌더 새 배열·객체를 넘기면 `useSyncExternalStore` 경로가 무한 재렌더에 진입한다 (spike I1, `discoveries/task-1-tanstack-infinite-loop.md`).

Phase 1 `designer-table` 구현 시 다음 중 **최소 하나** 를 필수로 한다.

1. `useMemo` 로 state 값 안정화 + controlled 시 빈 setter 라도 반드시 제공.
2. `designer-table` 내부 헬퍼 `useStableTableState({ sorting, columnOrder, columnFilters })` 로 모든 state 묶음을 일괄 memoize.
3. ESLint 커스텀 규칙(추후) 또는 TypeScript 브랜드 타입으로 "stable-refed" state 만 `useReactTable` 에 전달되도록 강제.

### D6. Vite/Preact alias 세트에 `react-dom/test-utils → preact/test-utils` 를 포함한다 (spike 발견 I2 반영)

`@preact/preset-vite` 기본 alias 에 TanStack 런타임 경로는 포함되지만 dev-only 경로(`react-dom/test-utils`) 는 누락되어 내부 워닝이 찍힌다. `designer-table` 패키지의 `vite.config.ts` / `vitest.config.ts` 공통 alias 에 해당 매핑을 강제하고, 패키지 스캐폴드 체크리스트(Phase 1 §3.3) 에 lint 항목으로 추가한다. 공유 발견: `discoveries/task-1-vite-preact-alias.md`.

---

## 4. 영향

### 4.1 번들

| 대상 | raw | gzip |
|---|---|---|
| `index-D_z942Z-.js` (TanStack Table + Virtual + dnd-kit + demo) | 142,762 B | 44,823 B |
| `index-ZVj2erMn.css` | 1,056 B | 477 B |
| **합계** | **143,818 B** | **45,300 B (45.3 KB)** |

원시 값: `packages/designer-core/spike/phase1-q1q2/q2-tanstack/measurements/bundle-size.txt`. Treemap: 같은 폴더 `bundle.html`.

TRD §10 NFR "designer-runtime 추가 분 ≤ 100 KB gzip" 대비 **45.3 KB** 는 Table 단독 분량으로 예산 내. 단 본 수치는 demo 코드(`Demo.tsx`, mock row 10k 생성 로직) 까지 포함하므로 실제 `designer-table` 패키지만 추출한 gzip 은 이보다 작을 것으로 예상 — Phase 1 §3.3 착수 시점에 pkg-only 측정값으로 재갱신한다.

### 4.2 신규 패키지 영향

| 패키지 | 영향 |
|---|---|
| `designer-table` (신규) | TanStack 기반 구현 착수 가능. 내부 구조는 Phase 1 §3.3 WBS 를 따른다. |
| `designer-core` | 영향 없음. OverlayLayer 는 DOM 기반이라 Table 셀을 동일 규약(`[data-fjs-id]`) 으로 식별 가능. |
| `designer-cli` / `designer-i18n` / `designer-components` | 영향 없음. |

### 4.3 트레이드오프

- **장점**
  - ADR-0001 §3 D1/D6 파리티 **무수정 유지** — 부록 §A, PD1-B 전환, Canvas 예외 조항 모두 불필요.
  - headless 구조 — 렌더 DOM 은 designer-table 이 완전히 소유하므로 `defineComponent` 계약(§ADR-0001 D1) 및 `[data-fjs-id]` · OverlayLayer 계약에 자연스럽게 합류.
  - 세 라이브러리 모두 활발한 유지보수 + MIT + Preact 실측 호환.
- **단점 / 수용 가능한 제약**
  - 100k+ 초대규모, Canvas-only 리치 셀(Excel 수식 · 대형 스프레드시트) 은 Phase 1 범위 밖 — 필요 시 Phase 2 에서 PD1-B 재평가.
  - preact/compat 환경에서 `state` stable-ref 규약(§3 D5) 을 반드시 지켜야 함 — 미준수 시 무한 렌더 루프. ESLint/헬퍼로 강제.

---

## 5. 대안 (기각)

### Glide Data Grid (canvas)

| 축 | 평가 |
|---|---|
| 10k 행 FPS | 60+ 가능 (canvas, 참고치) |
| ADR-0001 §3 D1 (DOM 렌더) | **충돌** — 셀이 DOM 이 아님 |
| ADR-0001 §3 D3 / D6 (`[data-fjs-id]` 기반 OverlayLayer, 픽셀 파리티) | **재정의 필요** — canvas 위 영역에 `[data-fjs-id]` 를 걸 수 없고, 파리티는 "viewer canvas ↔ viewer canvas + 데이터 모델 동등성" 으로 약화 |
| Preact 호환 | `peerDependencies.react` only — `preact/compat` alias + react shim 실측 필요 (미수행) |
| 라이선스 | MIT (문제 없음) |
| 멀티헤더 | 내장 (mergeable headers) |
| 컬럼 이동 | 내장 |

**기각 사유**: TanStack DOM 조합이 FPS 합격선(55) 을 큰 여유(≥ 5 FPS, 실측 59.99) 로 통과한 이상 **ADR-0001 §3 D1/D6 전제를 깨고 canvas 예외 조항을 신설할 정당성이 없다.** 단일 렌더 파이프라인(§ADR-0001 §3 D1) · 픽셀 파리티 게이트(§ADR-0001 §3 D6) 는 Phase 0 spike 에서 pixelmatch diff 0 으로 검증된 자산이며, canvas 도입은 이를 전면 재설계해야 하므로 Phase 1 비용 대비 이득이 없다.

Phase 2 이후 DOM 한계(100k+ 초대규모, 리치 셀) 가 실측으로 드러나면 본 판단을 재검토한다 — 그 경우 PD1-B 신규 ADR 로 교체.

---

## 6. 검증 (Spike 산출물)

### 6.1 실측 결과 (task-1, 2026-04-17)

환경: Vite 5.4.21 · Preact 10.29.1 (`@preact/preset-vite` 2.10.5, `react`/`react-dom` → `preact/compat` alias) · `@tanstack/react-table` 8.21.3 · `@tanstack/react-virtual` 3.13.23 · `@dnd-kit/core` 6.3.1 · `@dnd-kit/sortable` 8.0.0 · `@dnd-kit/utilities` 3.2.2 · Playwright 1.59.1 (측정 도구, Apache-2.0).

| 축 | 값 | 합격선 | 판정 |
|---|---|---|---|
| 평균 FPS (10k, 3 초 wheel-sim scroll, 1440×900) | **59.99** (보조 확인 60.42) | ≥ 55 | ✅ |
| 멀티헤더 3단계 | 개인정보 → 기본/연락처 → 실제 열 (Level 0 colspan=4, Level 1 그룹 colspan=2) | 동작 | ✅ |
| 컬럼이동 | dnd-kit `useSortable` + `SortableContext` (leaf headers 전용) | 동작 | ✅ |
| preact/compat hooks | 콘솔 에러 0, 워닝 0 | pass | ✅ |
| 번들 (gzip) | 45.3 KB (JS 44.82 KB + CSS 0.47 KB) | 참고 | — |
| 라이선스 | 설치 전수 MIT 10 / Apache-2.0 2, 위반 0 | TRD §0 gate | ✅ |

**FPS 측정 방법** (Phase 1 §2.2 Step 1 CONTRACTS §FPS 규칙 준수): `vite build` → `vite preview --port 5176` preview 서버 기동 → Playwright Chromium headless 접속 → `<div data-testid="table-wrap">` attach 확인 → `startFpsMeasurement(scrollContainer)` 자동 트리거 → `requestAnimationFrame` 루프 3 초 + `setInterval(scrollContainer.scrollBy, 16ms)` wheel 시뮬 → 결과 `window.__spikeFps` → Playwright 가 `measurements/fps.txt` 로 덤프.

**번들 측정 방법**: `vite build` 산출물을 node `zlib.createGzip(level=9)` 로 chunk 별 압축 후 합산. Treemap 은 `rollup-plugin-visualizer`.

**인용 경로 (`packages/designer-core/spike/phase1-q1q2/q2-tanstack/measurements/` 기준)**:
- FPS 원시값: `measurements/fps.txt` (59.99)
- 보조 FPS/진단: `measurements/diag.json` (`spikeFps: 60.417`, `spikeDone: true`, `hasTestId: true`)
- 번들 수치: `measurements/bundle-size.txt`
- 번들 treemap: `measurements/bundle.html`
- 멀티헤더 스크린샷: `measurements/multiheader.png`
- 컬럼이동 스크린샷: `measurements/reorder.png`
- 콘솔 깨끗 스크린샷: `measurements/console-clean.png`
- 콘솔 로그: `measurements/console-log.txt` (0 byte — 위반 없음)
- 라이선스 스캔: `measurements/licenses.json`

### 6.2 발견된 이슈 / 주의

#### I1 — TanStack `state` 비-안정 ref → preact/compat 무한 렌더 루프

**증상**: `useReactTable({ state: { columnFilters: cond ? [{...}] : [] } })` 처럼 매 렌더 새 배열/객체를 state 로 넘기면 Playwright headless 에서 `page.evaluate()` 가 2 초 내 응답 없이 렌더러가 100% CPU 로 동결.

**원인**: preact/compat 의 `useSyncExternalStore` 구현이 매 렌더마다 TanStack 스토어 snapshot 을 새 ref 로 받아 재렌더 → 새 state 객체 → 다시 재렌더 … 무한 루프.

**수정**: state 배열/객체를 `useMemo` 로 안정화하고 controlled 시 setter 를 반드시 제공.

```tsx
const columnFilters = useMemo(
  () => (nameFilter ? [{ id: 'name', value: nameFilter }] : []),
  [nameFilter],
);
const table = useReactTable({
  data, columns,
  state: { sorting, columnOrder, columnFilters },
  onSortingChange: setSorting,
  onColumnOrderChange: setColumnOrder,
  onColumnFiltersChange: () => {},  // controlled면 빈 함수라도 필수
  // ...
});
```

**ADR 반영**: §3 **D5** ("TanStack `state` 항목은 stable ref 전용") 로 승격. 공유 발견 기록: `/tmp/claude-signals/phase1-spike/discoveries/task-1-tanstack-infinite-loop.md`.

#### I2 — Vite + preact alias 세트 (`react-dom/test-utils` 포함 필요)

**증상**: `@preact/preset-vite` 기본 alias 만으로는 TanStack 의 dev-only 경로(`react-dom/test-utils`) 가 해결되지 않아 내부 워닝이 콘솔에 남음.

**수정**: `vite.config.ts` · `vitest.config.ts` alias 에 `react-dom/test-utils → preact/test-utils` 매핑을 명시 추가.

**ADR 반영**: §3 **D6** ("Vite/Preact alias 세트"). 공유 발견 기록: `/tmp/claude-signals/phase1-spike/discoveries/task-1-vite-preact-alias.md`.

### 6.3 제한 사항

- 본 spike 는 headless Chromium(dev 렌더러) 기준. 실제 macOS/Windows 브라우저 FPS 는 통상 동일하거나 더 좋음 — 측정값은 보수적으로 해석.
- 스크롤 FPS 는 "wheel 시뮬레이션 + `scrollBy` 40 px / 16 ms" 기준. 실사용자의 빠른 플릭 시나리오는 Phase 1 §3.3 `table.virtualization.spec.ts` 에서 재검증한다.
- 편집 모드 inline editor 는 Phase 1 §3.3 스코프 — 본 spike 범위 밖.

---

## 7. 후속 결정

- **ADR-0004** (예정): 컬럼 이동 dnd 전략 세부 — 키보드 접근성 (Arrow 키 기반 재배치), 드래그 힌트 오버레이를 `designer-core` OverlayLayer 와 통합하는 방식.
- **ADR-0005** (예정): 편집 셀 상태 관리 — inline editor 아키텍처, 컴포넌트 내부 상태 토글이 ADR-0001 §3 D1 "에디터 분기 금지" 와 충돌하지 않음을 계약으로 명시.
- **TRD §3 / §5.1 갱신 PR**: TRD §3 (테이블 섹션) · §13 (Q2 미결) 의 "Phase 0 spike 후 §3 갱신" 문구를 제거하고 본 ADR을 확정 참조로 링크. Phase 1 §2.3 결정 갱신 PR 에 포함.
- **Phase 1 §3.3 착수 전제**: §3 D5 (stable ref 규약) 가 ESLint 규칙 또는 `useStableTableState` 헬퍼로 강제 가능한지 선행 확인. 불가능하면 코드 리뷰 체크리스트로 대체.
