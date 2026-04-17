# Phase 1 §2 Spike — 공유 계약 (CONTRACTS)

본 spike는 `docs/phase-1-plan.md §2` 재설계에 따라 3개 worker가 병렬 실행한다.
각 worker는 자체 디렉토리에 **독립 Vite + Preact 프로젝트**를 만들고 동일 계약으로 측정·보고한다.

## 공통 규칙

1. **위치**: 각 worker는 자신의 서브디렉토리 하나만 건드린다.
   - Q2 TanStack: `packages/designer-core/spike/phase1-q1q2/q2-tanstack/`
   - Q1 Radix: `packages/designer-core/spike/phase1-q1q2/q1-radix/`
   - Q1 Headless UI: `packages/designer-core/spike/phase1-q1q2/q1-headlessui/`

2. **스택 베이스**: 공통
   - Vite 5.x + `@preact/preset-vite`
   - TypeScript (strict)
   - `preact@^10.19.3` + `preact/compat` alias (Q1 A·D 는 react/react-dom → preact/compat)
   - `axe-core@^4`
   - `@playwright/test@^1.47` (설치만, 실제 E2E는 본 세션에서 안 돌려도 됨)

3. **의존성은 각 하위 프로젝트 package.json에 선언**. 상위 monorepo workspace에 영향 주지 말 것.
   - `npm install --prefix packages/designer-core/spike/phase1-q1q2/<name>` 로 격리 설치.

4. **핵심 산출물**:
   - `index.html` + `src/main.tsx` — 데모 페이지가 실제 로드되고 브라우저에서 동작해야 함 (브라우저 로드 실패 시 즉시 FAILED)
   - `src/demo.tsx` — 아래 각 카테고리 시나리오
   - `RESULT.md` — 아래 보고 템플릿에 맞춘 요약
   - `measurements/` — 측정 스크린샷·로그·번들 분석 덤프

5. **라이선스**: 새로 추가되는 모든 npm 패키지가 MIT / Apache-2.0 / ISC / BSD / MPL-2.0 / 0BSD 중 하나여야 함. `npm install` 후 `npm list --depth=0` 로 확인하고 RESULT.md에 기록.

---

## Q1 (UI 프리미티브) 작업 계약

### 시나리오 (모든 Q1 candidate 공통)

`src/demo.tsx`에 아래 3종 시나리오를 순서대로 렌더:

1. **Dialog**: "열기" 버튼 → 모달. 본문에 입력 필드 1개. ESC/Overlay click 으로 닫힘. 닫을 때 focus가 트리거 버튼으로 복귀.
2. **Tabs**: 3개 탭 (`탭 A`, `탭 B`, `탭 C`). 각 패널에 짧은 텍스트. 키보드 좌/우 화살표로 탭 전환 가능.
3. **Popover**: "툴팁 열기" 버튼 → anchored popover. 바깥 클릭 시 닫힘.

각 시나리오에 `data-testid`로 `dialog-trigger`, `tabs-root`, `popover-trigger` 부여.

### 측정

| 축 | 방법 | 파일 |
|---|---|---|
| Preact 렌더 동작 | `npm run dev` 브라우저 수동 확인 후 스크린샷. 콘솔 에러 0. | `measurements/console-clean.png`, `measurements/3-scenarios.png` |
| 접근성 | `npx axe-core-cli` 또는 `@axe-core/playwright` 로 Dialog 열린 상태·Tabs B 활성 상태·Popover 열린 상태 각각 감사. 위반 건수 기록. | `measurements/axe-report.json` |
| 번들 | `vite build` 후 `dist/assets/` 의 main chunk gzip 크기. `vite-bundle-visualizer` 또는 `rollup-plugin-visualizer` 사용. | `measurements/bundle.html`, `measurements/bundle-size.txt` |
| 워크어라운드 라인 수 | Radix·Headless UI 등 외부 라이브러리를 Preact에서 돌리려고 추가한 shim/patch/workaround 코드 line count | `measurements/workaround-lines.txt` (파일명:라인수 표) |

### RESULT.md 템플릿

```markdown
# {후보명} Q1 Spike 결과

## 요약 한 줄
{합격/조건부 합격/불합격} — 이유 1줄.

## 환경
- Vite: x.y.z
- Preact: x.y.z
- 외부 라이브러리: @foo/bar x.y.z
- 설치 라이선스 전수 확인: MIT/... (허용 범위 내 / 위반 X건)

## 측정 결과
| 축 | 값 | 합격선 | 판정 |
|---|---|---|---|
| Preact 렌더 동작 | pass/fail | pass | … |
| axe-core 위반 | N건 | 0 | … |
| 번들 (gzip, 3종만) | NN KB | ≤ 30 KB | … |
| 워크어라운드 라인 수 | N | < 50/컴포넌트 | … |

## 발견된 이슈
- (있다면 bullet. 없으면 "없음")

## 권장
{해당 후보를 Phase 1 본체에 채택 / 조건부 채택 / 탈락} — 결정적 근거 1~2줄.
```

---

## Q2 (Table) 작업 계약

### 시나리오

`src/demo.tsx`:

1. **10,000 행 데이터** 랜덤 생성 (id, name, email, score: number, createdAt: date, active: boolean).
2. **TanStack Table v8 + TanStack Virtual** 로 DataGrid 렌더.
3. **3단계 멀티헤더**: Level 0 `개인정보` → Level 1 `기본`/`연락처` → Level 2 `name, email, score …` 로 grouped columns 정의. colspan이 자동 계산되는지 시각 확인.
4. **dnd-kit column reorder**: 헤더 드래그해서 컬럼 순서 변경 가능.
5. **sort + filter**: `score` 내림차순 정렬 + `name` 텍스트 필터.
6. **가상 스크롤**: 화면 높이 400px 기준 윈도우에 보이는 행만 DOM에 존재 (50~60개 선).

### 측정

| 축 | 방법 | 파일 |
|---|---|---|
| 10k 행 FPS | `performance.now()` + `requestAnimationFrame` 루프로 평균 FPS 수집. 스크롤 3초 간 자동 wheel 시뮬레이션 중 측정. | `measurements/fps.txt` |
| 멀티헤더 3단계 | 스크린샷에서 colspan 구조 확인. | `measurements/multiheader.png` |
| 컬럼이동 | dnd-kit 핸들 드래그 시연 스크린샷. | `measurements/reorder.png` |
| preact/compat hooks | 콘솔 에러·hook 호환 경고 0건. | `measurements/console-clean.png` |
| 번들 | `vite build` gzip 크기. | `measurements/bundle-size.txt` |
| 라이선스 | `npm list --depth=0`에서 tanstack·virtual·dnd-kit·기타 체크. | `RESULT.md` 환경 섹션 |

### FPS 측정 규칙 (PD1 자동 결정 핵심)

```js
// src/measure-fps.ts
let frames = 0; let start = performance.now();
function loop() {
  frames++;
  if (performance.now() - start < 3000) requestAnimationFrame(loop);
  else {
    const fps = frames / ((performance.now() - start) / 1000);
    (document.getElementById('fps') as HTMLElement).textContent = fps.toFixed(1);
    (window as any).__spikeFps = fps;
  }
}
requestAnimationFrame(loop);
```

페이지 로드 후 자동 auto-scroll (e.g. `setInterval(() => scrollContainer.scrollBy(0, 40), 16)` 3초) 트리거와 동시에 loop 시작.

### RESULT.md 템플릿

```markdown
# Q2 Step 1 — TanStack DOM Spike 결과

## 요약 한 줄
PD1-A 실현 가능/불가능 — FPS NN.N, 이유 1줄.

## 환경
- Vite, Preact, @tanstack/react-table x.y.z, @tanstack/react-virtual x.y.z, @dnd-kit/core x.y.z
- 라이선스 전수: ...

## 측정 결과
| 축 | 값 | 합격선 | 판정 |
|---|---|---|---|
| 평균 FPS (10k, 3초 스크롤) | NN.N | ≥ 55 | … |
| 멀티헤더 3단계 | 동작/실패 | 동작 | … |
| 컬럼이동 | 동작/실패 | 동작 | … |
| preact/compat hooks 호환 | pass/fail | pass | … |
| 번들 (gzip) | NN KB | 참고 (합격선 없음) | — |

## PD1 결정 귀결
- FPS ≥ 55 → **PD1-A 확정** (TanStack 단독 채택)
- FPS 50~55 → Step 2 (DOM 최적화) 권장
- FPS < 50 또는 hooks 실패 → **PD1-B 전환**, Glide Data Grid Step 3 필요

## 발견된 이슈
- ...

## 권장
{PD1-A 확정 / Step 2 필요 / PD1-B 전환} — 근거 1~2줄.
```

---

## 시그널 프로토콜 (공통)

- 작업 시작 시: `touch /tmp/claude-signals/phase1-spike/task-N.running` 을 Bash로 실행.
- 2분마다 동일 touch 반복 (heartbeat). 빠뜨리면 leader가 STALE 판정.
- 완료 시: 자신의 `RESULT.md` 요약(한 줄 + 측정 결과 표)을 `/tmp/claude-signals/phase1-spike/task-N.done` 에 기록.
- 실패 시: 실패 사유를 `/tmp/claude-signals/phase1-spike/task-N.failed` 에 기록.
- 공유 발견(다른 worker에 유용): `/tmp/claude-signals/phase1-spike/discoveries/` 에 `task-N-<주제>.md` 파일 남김. 다른 worker는 **작업 시작 전 이 디렉토리를 Read로 훑고 참고**.

## 금지 사항

- 상위 workspace (루트 package.json, 다른 spike 디렉토리) 변경 금지.
- form-js 본체 (`node_modules/@bpmn-io/*`) 수정 금지.
- git commit 금지. 결과 파일만 생성. leader가 나중에 일괄 커밋.
- `*.module.css` 파일명 금지 (ADR-0001 §3 D4, `scripts/ci/no-css-modules.mjs`가 차단).
- `process.env.NODE_ENV` 최상위 직접 참조 금지 (ADR-0001 §3 D7, `isProductionEnv()` 또는 `import.meta.env.PROD` 사용).
