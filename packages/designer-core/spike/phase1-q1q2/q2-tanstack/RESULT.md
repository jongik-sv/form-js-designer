# Q2 Step 1 — TanStack DOM Spike 결과

## 요약 한 줄
**PD1-A 실현 가능** — 10,000 행 평균 FPS 59.99 (Playwright headless 1440×900, 3s auto-scroll), 멀티헤더·컬럼이동·정렬·필터 모두 동작, preact/compat hooks 호환 OK.

## 환경
- 위치: `packages/designer-core/spike/phase1-q1q2/q2-tanstack/`
- 측정일: 2026-04-17
- Vite: 5.4.21
- Preact: 10.29.1 (via `@preact/preset-vite` 2.10.5, `react`/`react-dom` → `preact/compat` alias)
- `@tanstack/react-table`: 8.21.3
- `@tanstack/react-virtual`: 3.13.23
- `@dnd-kit/core`: 6.3.1, `@dnd-kit/sortable`: 8.0.0, `@dnd-kit/utilities`: 3.2.2
- Playwright: 1.59.1 (측정용 · Apache-2.0)
- 설치 라이선스 전수 확인: **MIT 10개 / Apache-2.0 2개** — 허용 범위(MIT/Apache-2.0/ISC/BSD/MPL-2.0/0BSD) 내, 위반 0건. (`measurements/licenses.json` + 수동 `package.json` 조사)

## 측정 결과

| 축 | 값 | 합격선 | 판정 |
|---|---|---|---|
| 평균 FPS (10k, 3초 wheel-sim scroll) | **59.99** (보조 확인 60.42) | ≥ 55 | ✅ 통과 |
| 멀티헤더 3단계 | 동작 (`개인정보 → 기본/연락처 → 실제 열`, Level 0 colspan=4, Level 0 지표 colspan=2) | 동작 | ✅ |
| 컬럼이동 | 동작 (dnd-kit `useSortable` + `SortableContext`, leaf headers 전용) | 동작 | ✅ |
| preact/compat hooks 호환 | pass (콘솔 에러 0, 워닝 0) | pass | ✅ |
| 번들 (gzip) | **45.3 KB** (JS 44.82 KB + CSS 0.47 KB) | 참고 | — |

**FPS 측정 방법** (CONTRACTS.md §FPS 규칙 준수):
- `vite build` 후 `vite preview --port 5176` preview 서버 기동.
- Playwright Chromium headless (viewport 1440×900) 로 접속, `<div data-testid="table-wrap">` 어태치 확인.
- 페이지 로드 완료 직후 `startFpsMeasurement(scrollContainer)` 자동 트리거 → `requestAnimationFrame` 루프 3 초 + `setInterval(scrollContainer.scrollBy, 16ms)` 자동 wheel 시뮬.
- 결과는 `window.__spikeFps` 에 기록되며 Playwright가 `measurements/fps.txt` 로 덤프.

**번들 측정**:
- `vite build` 산출물을 node `zlib.createGzip(level=9)` 로 각 chunk 압축 → 합산.
- `rollup-plugin-visualizer` 가 `measurements/bundle.html` (treemap) 생성.

## 산출물 (파일 기준)

| 구분 | 경로 |
|---|---|
| FPS | `measurements/fps.txt` |
| 멀티헤더 스크린샷 | `measurements/multiheader.png` |
| 컬럼이동 스크린샷 | `measurements/reorder.png` |
| 콘솔 깨끗 스크린샷 | `measurements/console-clean.png` |
| 콘솔 에러·워닝 로그 | `measurements/console-log.txt` (0 byte — 위반 없음) |
| 번들 사이즈 | `measurements/bundle-size.txt` |
| 번들 treemap | `measurements/bundle.html` |
| 라이선스 | `measurements/licenses.json` |
| 진단 JSON | `measurements/diag.json` |

## 발견된 이슈

### I1 — TanStack Table `state` 비-안정 ref → preact/compat 무한 렌더 루프 (해결)

최초 구현에서 `useReactTable({ state: { columnFilters: cond ? [{...}] : [] } })` 처럼 매 렌더 새 배열을 state로 넘기자 Playwright headless에서 `page.evaluate()` 가 2초 내 응답하지 않고 렌더러가 100% CPU로 동결. preact/compat의 `useSyncExternalStore` 구현이 매 렌더마다 TanStack 스토어 snapshot을 새 ref로 받아 재렌더 → 새 state 객체 → … 무한 루프로 관찰.

**수정**: state 배열/객체를 `useMemo`로 안정화하고 해당 setter를 반드시 제공.

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
  ...
});
```

→ 공유 발견: `/tmp/claude-signals/phase1-spike/discoveries/task-1-tanstack-infinite-loop.md`.

Phase 1 `designer-table` 구현 시 **`state` 항목 모두 stable ref 전용** 규칙을 TypeScript 헬퍼(`useStableTableState`) 또는 ESLint 규칙으로 강제 권고.

### I2 — Vite + preact alias 세트 발견 (discovery)

`react-dom/test-utils` → `preact/test-utils` alias 를 포함해야 TanStack 내부 dev 경고까지 차단. 공유 발견: `/tmp/claude-signals/phase1-spike/discoveries/task-1-vite-preact-alias.md`.

## PD1 결정 귀결

CONTRACTS.md + phase-1-plan.md §2.0/§2.2 Step 1 의 자동 확정 규칙:

- **FPS ≥ 55** → **PD1-A 확정 (TanStack 단독 채택)**. ✅ **해당됨 (59.99)**
- FPS 50~55 → Step 2 (DOM 최적화 0.5 일) 필요. 해당 안 됨.
- FPS < 50 or preact/compat hooks 실패 → PD1-B 전환 (Glide). 해당 안 됨.

즉 **본 결과로 PD1-A 자동 확정**. Glide Step 3 생략 가능. ADR-0003 §0 에서 PD1-A 명시 + Table 라이브러리 = TanStack Table v8 + TanStack Virtual + dnd-kit 확정.

## 권장

**PD1-A 확정 · TanStack Table v8 + TanStack Virtual + dnd-kit 채택**.

근거:
1. 10 k 행 + 멀티헤더 + 가상화 + dnd reorder + sort + filter 조합이 headless 환경에서도 60 FPS 근사 유지 → ADR-0001 D1 (DOM 렌더 의무) 무리 없이 충족.
2. 모든 의존성 MIT/Apache-2.0 (TRD §0 라이선스 게이트 통과).
3. 번들 gzip 45 KB — Phase 1 total budget 여유.
4. preact/compat 호환성 검증 완료 (단, state stable-ref 규칙은 구현 시 강제).

## 비고 / 제한사항

- 본 spike는 headless Chromium(dev 렌더러) 기준. 실제 macOS/Windows 브라우저에서의 FPS는 보통 동일하거나 더 좋음. 측정값은 보수적으로 해석.
- 스크롤 FPS는 "wheel 시뮬레이션 + scrollBy 40 px/16 ms" 기준 — 실사용자의 빠른 플릭 시나리오는 별도 Phase 1 E2E perf spec (§3.3 `table.virtualization.spec.ts`)에서 재검증.
- 편집 모드 inline editor는 Phase 1 §3.3 스코프. 본 spike에서는 미측정 (CONTRACTS.md Q2 범위 밖).
