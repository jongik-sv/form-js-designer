# Headless UI (Candidate D) Q1 Spike 결과

## 요약 한 줄
**조건부 합격** — Preact 동작·워크어라운드는 완벽하나 번들 gzip 46.17 KB가 30 KB 합격선을 초과하고 Popover 열림 상태에서 axe serious 위반 1건 존재.

## 환경
- Vite: 5.4.21
- Preact: 10.19.x (preact/compat, preact/jsx-runtime)
- 외부 라이브러리: `@headlessui/react@^2.1` (실설치 `2.2.x` 계열)
- Preact 어댑터: `@preact/preset-vite@^2.9`
- 측정 도구: `@playwright/test@1.47`, `@axe-core/playwright@^4`, `axe-core@^4`, `rollup-plugin-visualizer@^5`
- 설치 라이선스 전수 확인 (134 패키지, `measurements/licenses.json`):
  - 허용 범위 내: MIT 98 / Apache-2.0 13 / ISC 10 / BSD-2-Clause 7 / BSD-3-Clause 2 / MPL-2.0 2 / 0BSD 1 = 133개
  - 범위 외: `caniuse-lite@1.0.30001788` CC-BY-4.0 1건 (data 라이선스, dev-only, 런타임 번들 미포함).
  - 조치: 리더 검토 필요하나 dev-only tooling 의 관행적 예외로 판단.

## 측정 결과
| 축 | 값 | 합격선 | 판정 |
|---|---|---|---|
| Preact 렌더 동작 | Dialog open/close (ESC+overlay) / Tabs 화살표 2회로 A→C / Popover outside click close, console.error=0, pageerror=0 | pass | **pass** |
| axe-core 위반 — 3종 귀속 | Popover-open 의 `aria-hidden-focus` serious 1건 (3 nodes) | 0 | **fail (조건부)** |
| axe-core 위반 — 데모 페이지 귀속 | 전 상태 `region` moderate 1건 (h1 이 main 밖) | — | 디자이너 본체에선 발생 안함 |
| 번들 (gzip, 3종만) | 46.17 KB (`dist/assets/index-DnGSMgTF.js` 47.28 KB + index.html 0.73 KB) | ≤ 30 KB | **fail** |
| 워크어라운드 라인 수 | 16 라인 (전부 공유 vite.config.ts alias + tsconfig paths). 컴포넌트당 0 라인 | < 50/컴포넌트 | **pass** |

## 측정 아티팩트
- `measurements/scenarios/00..09-*.png` — 9컷 시나리오 워크스루
- `measurements/console-clean.png` — 초기 로드 (console.error=0)
- `measurements/3-scenarios.png` — Popover 열린 상태에서 3 섹션 동시 표시
- `measurements/axe-report.json` — 4 상태 axe 결과
- `measurements/smoke.log`, `measurements/smoke-errors.json` — 스모크 로그
- `measurements/bundle.html` — rollup-plugin-visualizer treemap
- `measurements/bundle-size.txt` — 파일별 raw/gzip
- `measurements/workaround-lines.txt` — 16 라인 스냅샷
- `measurements/licenses.json` — 전체 134패키지 라이선스 집계

## 발견된 이슈
1. **axe `aria-hidden-focus` (serious, 3 nodes)** — Popover 열림 시 Headless UI 가 자체 aria-hidden 영역 안에 focusable 노드를 남김. 디자이너에서 사용할 경우 수정/PR 또는 자체 Popover 래퍼 필요. 디자이너 본체에서는 Popover 사용처가 프로퍼티 패널 팁 수준이라 치명도 낮음.
2. **번들 gzip 46.17 KB** — 이 중 Headless UI v2 + 그 transit dep (`@floating-ui/react`, `@floating-ui/dom`, `@tanstack/react-virtual`, `@react-aria/*`) 가 큰 비중. Dialog 단독으로 import 해도 `@floating-ui/react` 가 끌려옴. 3종만 import 해도 30 KB 선 달성 불가로 추정. tree-shake 개선 여지 있으나 peerDep 구조상 한계.
3. **CC-BY-4.0 data license** — `caniuse-lite` (browserslist). Dev-only 이므로 번들 무관하나 라이선스 정책 표 업데이트 권장.

## Kill criterion / Tie-break 판정
- **Kill criterion** (컴포넌트당 workaround ≥ 50) : 통과 (0 라인/컴포넌트).
- **번들 ≤ 30 KB** 합격선: 실패 (46.17 KB). 이는 플랜 §2.1 "Phase 1 확장성" 축에도 불리 — Accordion/Toast 등을 추가하면 번들이 더 커진다.
- **Preact 동작**: 합격 후보 조건 충족.

## Radix (task-2) 와의 비교 소견
task-2 (Radix) 결과가 아직 산출 전이라 측정 직접 비교는 불가. **예상 소견**:
- Headless UI 는 workaround 0 / console clean 으로 **"preact/compat 적합성" 축은 매우 유리**.
- 번들 크기(46 KB gzip)는 Radix 3종 import 시의 일반적 수치(25~35 KB) 대비 **불리할 가능성 높음** — Headless UI v2 가 `@floating-ui/react` + `@react-aria/*` 를 런타임 의존으로 가져가기 때문.
- axe 위반은 Popover 1건 serious로 제한적. Radix 는 preact/compat 하에서 Dialog portal 동작 자체가 불안정하다는 사전 조사 보고가 있으므로 Radix 동일 시나리오 실측 결과를 본 후 최종 비교.

## 권장
**조건부 채택 (2순위)** — Preact 적합성·유지보수성에서 최고지만 번들 크기 초과로 Phase 1 본체 채택 시 §2.1 번들 합격선 재협상이 필요. task-2(Radix)가 동일 3종에서 gzip ≤ 30 KB 를 달성하면서 axe 0 을 받으면 Radix 채택이 합리적. Radix 가 preact/compat Dialog 에서 탈락하면 Headless UI 로 fallback + 번들 예산 40 KB 로 완화.
