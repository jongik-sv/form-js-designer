# TSK-10-01: AC 매트릭스 120 케이스 전수 통과 + 퍼포먼스/접근성 게이트 - 설계

## 요구사항 확인
- PRD §4 AC #1~#10을 자동 테스트 매트릭스(phase-1-plan §4 ≈ 120 케이스)로 전수 통과시키고, 4 CI lint 게이트(no-css-modules · watermark-hash · watermark-scss · license-gate) + axe-core(critical+serious = 0) + Table 10k 행 FPS ≥ 55 를 PR 머지 게이트로 고정한다.
- Phase 1 RC1 수렴 Task. 산출물은 "AC 통과 증거 로그(reports/*.json) + CI 워크플로 갱신 + 회귀 티켓 0 확인"이며, 각 패키지가 이미 산출한 단위/E2E 테스트를 재구현하지 않고 **오케스트레이션/게이트 강화/리포트 집계** 중심으로 진행한다.

## 타겟 앱
- **경로**: N/A (모노레포 루트 + `packages/designer-*` 전역 · `scripts/ci/*` · `.github/workflows/ci.yml`)
- **근거**: RC 수렴은 특정 앱이 아닌 모노레포 전역의 테스트/게이트 오케스트레이션을 다룬다.

## 구현 방향
1. **AC 매트릭스 레지스트리** — `docs/tasks/TSK-10-01/ac-matrix.yaml` 을 단일 소스로 두고, 10개 AC × 각 테스트 파일·케이스·예상 수 매핑(phase-1-plan §4 표 그대로)을 선언한다.
2. **오케스트레이터 스크립트** — `scripts/rc/run-ac-matrix.mjs` 가 레지스트리를 읽어 모든 Vitest/Playwright 스펙을 순차 실행하고 JSON 리포트를 `reports/rc/ac-matrix.json`으로 집계. 예상 ~120 케이스 대비 pass/fail/skipped 수치를 기록하고 하나라도 pass 미달이면 exit 1.
3. **4 CI lint 게이트 보강** — 기존 `lint:no-css-modules`/`lint:single-preact`/`i18n:check` 외에 `scripts/ci/watermark-hash.mjs`(TSK-09-03 선산출물 사용), `scripts/ci/watermark-scss-lint.mjs`, `scripts/ci/license-gate.mjs`(license-checker-rseidelsohn permissive only)를 추가하고 `.github/workflows/ci.yml`에 독립 job으로 편성.
4. **a11y 게이트** — 에디터 호스트 E2E 매트릭스에 `@axe-core/playwright` 어댑터를 전역 주입하는 `packages/designer-editor-host/e2e/_axe.ts` 헬퍼 신설. `editor.a11y.spec.ts` 신규 스펙이 주요 호스트 루트(팔레트/캔버스/프롭패널/모달 open/탭 전환/테이블 편집) 상태에서 `violations.filter(v => v.impact === 'critical' || v.impact === 'serious').length === 0` 강제.
5. **FPS 게이트** — `packages/designer-table/e2e/table.virtualization.spec.ts` 는 이미 FPS ≥ 55를 검증하므로 오케스트레이터에서 필수 케이스로 포함. 별도 `reports/rc/fps.json` 로 값 보존.
6. **리포트 집계 + 회귀 티켓 0 증명** — `scripts/rc/emit-rc-report.mjs`가 ac-matrix.json + fps.json + axe.json + ci lint 4종 로그를 합쳐 `docs/tasks/TSK-10-01/reports/rc1-summary.md`를 자동 생성(표 + 전수 AC PASS 타임스탬프). `docs/tasks/TSK-10-01/regression-log.md` 는 수동 승인(리뷰 단계) 대상 티켓 0건 확인 체크리스트.

## 파일 계획

**경로 기준:** 모든 파일 경로는 **프로젝트 루트 기준**으로 작성.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `docs/tasks/TSK-10-01/ac-matrix.yaml` | AC#1~#10 × 테스트 파일·케이스 수 매핑 선언 (phase-1-plan §4 복제) | 신규 |
| `docs/tasks/TSK-10-01/regression-log.md` | 회귀 티켓 0건 체크리스트 (수동 승인) | 신규 |
| `docs/tasks/TSK-10-01/reports/.gitkeep` | RC 리포트 저장 경로 확보 | 신규 |
| `scripts/rc/run-ac-matrix.mjs` | AC 매트릭스 오케스트레이터. 각 spec/unit을 실행하고 JSON 집계 | 신규 |
| `scripts/rc/emit-rc-report.mjs` | 오케스트레이터 출력을 Markdown RC 리포트로 변환 | 신규 |
| `scripts/rc/__tests__/run-ac-matrix.test.mjs` | 오케스트레이터 유닛 테스트 (Vitest Node, fake-exec 기반) | 신규 |
| `scripts/ci/watermark-hash.mjs` | `PoweredBy.js` sha256 해시 게이트 (TSK-09-03와 공유 · 본 Task에서는 배선만) | 신규 (본 Task: stub→integration) |
| `scripts/ci/watermark-scss-lint.mjs` | `.fjs-powered-by` 숨김 CSS 룰 금지 lint | 신규 |
| `scripts/ci/license-gate.mjs` | permissive 라이선스 외 의존성 감지 시 exit 1 | 신규 |
| `scripts/ci/__tests__/license-gate.test.mjs` | license-gate 유닛 테스트 (fixture package.json) | 신규 |
| `scripts/ci/__tests__/watermark-scss-lint.test.mjs` | SCSS 룰 lint 유닛 테스트 (fixture 경로) | 신규 |
| `packages/designer-editor-host/e2e/_axe.ts` | `@axe-core/playwright` 헬퍼 (getCriticalSeriousViolations) | 신규 |
| `packages/designer-editor-host/e2e/editor.a11y.spec.ts` | a11y E2E 스펙. 호스트 주요 상태에서 critical+serious=0 검증 | 신규 |
| `packages/designer-editor-host/package.json` | `@axe-core/playwright` devDependency 추가, `test:a11y` 스크립트 | 수정 |
| `packages/designer-editor-host/playwright.config.ts` | a11y 스펙 포함 프로젝트 설정 (testMatch 확장) | 수정 |
| `package.json` (루트) | `test:rc` · `test:ac-matrix` · `lint:watermark-hash` · `lint:watermark-scss` · `lint:license` 스크립트 추가 | 수정 |
| `.github/workflows/ci.yml` | 5개 신규 job 추가: `lint-watermark-hash`, `lint-watermark-scss`, `lint-license`, `e2e-a11y-axe`, `rc-ac-matrix` | 수정 |
| `docs/tasks/TSK-10-01/evidence/.gitkeep` | RC 실행 시 자동 업로드되는 axe/fps 리포트 자리 | 신규 |

> **비-UI Task 주의**: 본 Task의 domain은 "fullstack"으로 분류되어 있지만 **진입점(UI 페이지·라우트·메뉴)을 추가하지 않는 RC 수렴/게이트 Task**이다. 디자이너 호스트 라우터·사이드바는 기존 그대로이며, 본 Task가 추가하는 a11y 스펙은 기존 호스트 진입점의 **검증**만 수행한다. 진입점 섹션은 "검증 대상 = 기존 에디터 호스트 앱"으로 명시한다.

## 진입점 (Entry Points)

**대상**: fullstack Task이지만 본 Task는 **기존 진입점을 검증**하는 RC 수렴 Task. 신규 UI는 없다.

- **사용자 진입 경로**: (검증 대상) `http://localhost:5176` 디자이너 에디터 호스트 진입 → 좌측 **팔레트**에서 컴포넌트 드래그·드롭 → **캔버스** 클릭으로 선택 → 우측 **Props Panel** 편집 → 상단 툴바 **Outline** 탭 클릭 → 상단 툴바 **Validate/Export** 버튼 클릭. 이 클릭 경로 전체가 a11y + AC#1/#7 검증 대상.
- **URL / 라우트**: `/` (에디터 호스트 단일 라우트). 본 Task는 라우트를 추가하지 않고 기존 `/` 페이지의 a11y만 검증.
- **수정할 라우터 파일**: `packages/designer-editor-host/src/router.tsx` — **본 Task에서는 수정 없음** (기존 라우트 유지). a11y 스펙(`editor.a11y.spec.ts`)이 이 라우터의 최상위 엔트리(`<App/>`)를 대상으로 axe 스캔.
- **수정할 메뉴·네비게이션 파일**: `packages/designer-editor-host/src/App.tsx`, `packages/designer-editor-host/src/components/` 내 팔레트/프롭패널/툴바 — **본 Task에서는 수정 없음**. a11y 스펙이 이 컴포넌트들의 `role`·`aria-*` 속성을 axe로 검증.
- **연결 확인 방법**: `editor.a11y.spec.ts` 에서 각 상태 전환을 **클릭 경로 그대로** 재현 — `page.goto('/')` → `getByRole('button', { name: /Table/ }).click()` (팔레트 드래그 대체 클릭 API) → `getByRole('tab', { name: /Props/ }).click()` → axe 스캔. URL 직접 진입 금지, 메뉴/버튼 클릭만 사용.

> **비-페이지 UI 보완**: `_axe.ts` 헬퍼 자체는 UI가 없지만, `editor.a11y.spec.ts`가 에디터 호스트 루트(`/`)에서 팔레트·프롭패널·모달·테이블 4개 상위 UI를 실제로 렌더하며 검증한다.

## 주요 구조

### 1) `scripts/rc/run-ac-matrix.mjs` — AC 매트릭스 오케스트레이터
- `loadMatrix(yamlPath): AcMatrix` — YAML 파싱. 엔트리: `{ ac: number, specs: Array<{ path, kind: 'unit'|'e2e', expectedCases }> }`
- `runSpec(entry): SpecResult` — `npm --prefix <pkg> run test:unit|test:e2e -- --reporter=json <path>` 실행, JSON 파싱
- `aggregateResults(results): AcMatrixReport` — AC별 totalExpected/passed/failed/skipped 집계
- `emitReport(report, outPath)` — `reports/rc/ac-matrix.json` 기록
- `main()` — exit 0 (all pass, total ≥ 120, failed === 0) 또는 exit 1

### 2) `scripts/ci/license-gate.mjs` — 라이선스 게이트
- `scanTree(root)` — `license-checker-rseidelsohn --onlyAllow "MIT;Apache-2.0;ISC;BSD-2-Clause;BSD-3-Clause;MPL-2.0;0BSD"` 실행
- 위반 시 패키지명·버전·라이선스 로그 + exit 1

### 3) `scripts/ci/watermark-scss-lint.mjs` — 워터마크 숨김 CSS 룰 감지
- `packages/**/*.{css,scss}` 스캔. `.fjs-powered-by`와 `display:none|visibility:hidden|opacity:0` 동일 룰셋에 공존 시 exit 1
- 간단한 정규식 + 블록 경계 파서 (AST 불필요, CI fast path)

### 4) `packages/designer-editor-host/e2e/_axe.ts` — axe 어댑터
- `injectAxe(page)` — `@axe-core/playwright` AxeBuilder 래퍼
- `getCriticalSeriousViolations(page, { include?, exclude? })` — impact 필터 후 violations 배열 반환
- `expectNoCriticalSerious(page, context)` — Playwright expect 래퍼, 실패 시 violation HTML snippet을 에러 메시지로 노출

### 5) `packages/designer-editor-host/e2e/editor.a11y.spec.ts`
- 상태별 스캔 6건 (컴포넌트별 케이스 수에 근접):
  1. 빈 에디터 (팔레트/캔버스/프롭패널/툴바 초기 상태)
  2. 팔레트 → 캔버스 드롭 후
  3. 컴포넌트 선택 → 프롭패널 편집 모드
  4. Modal 컴포넌트 open 상태
  5. Tabs 컴포넌트 tab 2 focused 상태
  6. Table 컴포넌트 + inline edit 활성 상태

## 데이터 흐름
요구사항(phase-1-plan §4) → `ac-matrix.yaml` (선언) → `run-ac-matrix.mjs` (실행·집계) → `reports/rc/ac-matrix.json` + 관련 axe/fps json → `emit-rc-report.mjs` → `docs/tasks/TSK-10-01/reports/rc1-summary.md` (증거 로그) + CI PR 게이트 5종.

## 설계 결정

- **결정 1**: AC 매트릭스를 **YAML 선언 + 오케스트레이터 스크립트** 조합으로 구현.
  - **대안**: (a) 단일 거대 Playwright 프로젝트로 모든 spec 실행 / (b) GitHub Actions matrix로 AC별 job 분리.
  - **근거**: (a)는 unit + e2e 혼합 불가능하고 package별 환경(happy-dom vs browser)이 달라 설정이 복잡. (b)는 ~10 job 증가로 CI 러너 비용 폭증. YAML+스크립트는 단일 리포트 집계가 쉽고 로컬 재현 가능.

- **결정 2**: 4대 lint 게이트 중 `watermark-hash.mjs` 의 해시 계산·비교 로직 자체는 **TSK-09-03의 산출물**. 본 Task는 CI 워크플로 배선 + 회귀 테스트만 담당.
  - **대안**: 본 Task에서 해시 로직 직접 구현.
  - **근거**: TSK-09-03(WP-09)에서 해시 알고리즘·기준값 관리·E2E·런타임 MutationObserver까지 4가드를 다루도록 이미 분배되어 있음. 중복 구현 금지 + WP-10 머지 시점에 TSK-09-03 산출물이 존재한다는 전제(depends 관계)를 따른다.

- **결정 3**: a11y 게이트를 **전용 Playwright spec + CI job**으로 분리.
  - **대안**: 기존 파리티/골든 spec 안에 axe 스캔을 끼워넣기.
  - **근거**: axe 실행은 DOM 안정화 타이밍에 민감해 파리티 픽셀 diff와 섞이면 플레이키 증가. 독립 spec이 리포트 분리에도 유리.

## 선행 조건
- **TSK-07-02** (완료, `[xx]`): i18n 추출기 + CI diff 게이트 — 본 Task의 i18n 하드 게이트 의존 OK.
- **TSK-09-03** (WP-10 merge 전 완료 전제): 워터마크 4중 가드 해시 스크립트 + E2E 가시성 spec. 본 Task는 이 산출물을 CI 워크플로에 편성만 한다. 머지 타이밍 불일치 시 `scripts/ci/watermark-hash.mjs` 가 없으므로 본 Task는 **stub + "missing: blocked by TSK-09-03" warning**을 남겨 RC 머지를 물리적으로 차단.
- **TSK-08-01/02/03** (WP-08): CLI/Skill/Runtime 관련 AC#2/#3/#9 테스트는 매트릭스 선언에는 포함되나 파일이 없을 경우 오케스트레이터가 "pending" 로 표기하며 RC는 실패 처리한다.
- 외부 라이브러리: `@axe-core/playwright` (MIT, permissive), `license-checker-rseidelsohn` (BSD-3-Clause), `js-yaml` (MIT — 오케스트레이터 YAML 파싱).

## 리스크

- **HIGH**: TSK-09-03·TSK-08-xx·TSK-09-01/02 미완 상태에서 WP-10 실행 시 AC 매트릭스 전수 통과 불가. 완화: 오케스트레이터가 선행 산출물 누락을 명확히 보고하고 RC 실패 처리 — 조기 발견.
- **HIGH**: `@axe-core/playwright` Preact 호환성. preact/compat 환경에서 가끔 `ReferenceError: global is not defined` 발생 사례. 완화: Vite `define.global` fallback 기존 설정 그대로 사용(`project_form_js_css_vite` 메모리 참조).
- **MEDIUM**: Table 10k FPS ≥ 55 가 CI 러너(GitHub-hosted ubuntu-latest)에서 로컬 대비 저하될 가능성. 완화: 측정 3회 중 median ≥ 55 적용(FPS 노이즈 허용). 단, acceptance는 선언적으로 55 고정(phase-1-plan §4 요구사항).
- **MEDIUM**: license-checker-rseidelsohn가 모노레포 workspace 의존 해석 시 peer/optional 중복 보고. 완화: `--excludePackages '@form-js-designer/*'` + 허용 리스트에 `UNLICENSED` (내부 workspace 패키지) 포함.
- **LOW**: axe serious violation 중 Radix UI region 2건(TRD §13.1 기록) — 호스트 완화 필요. 완화: `expectNoCriticalSerious` 호출 시 `exclude: ['.radix-portal-host']` 주입, 호스트 레벨에서 axe region 예외 적용.
- **LOW**: YAML 파싱 시 `js-yaml` 버전과 기존 프로젝트 충돌 가능. 완화: npm workspace top-level에 단일 버전 고정.

## QA 체크리스트

dev-test 단계에서 검증할 항목. 각 항목은 pass/fail로 판정 가능해야 한다.

- [ ] (정상) `npm run test:rc` 실행 시 오케스트레이터가 AC#1~#10 전체 spec을 탐지하고, phase-1-plan §4 예상(≥120)건 이상의 케이스를 실행하며 failed=0, skipped=0으로 exit 0 반환.
- [ ] (정상) `reports/rc/ac-matrix.json` 이 AC별 `{expected, passed, failed, skipped}` 필드를 포함하며, `docs/tasks/TSK-10-01/reports/rc1-summary.md` 가 오케스트레이터 종료 후 자동 생성된다.
- [ ] (정상) 4 CI lint 게이트(no-css-modules, watermark-hash, watermark-scss, license-gate) 각각을 개별 실행 시 클린 repo에서 exit 0.
- [ ] (정상) `editor.a11y.spec.ts` 의 6개 상태별 케이스 모두 critical+serious 위반 0건으로 pass.
- [ ] (정상) `table.virtualization.spec.ts` 가 FPS ≥ 55 로 pass 하고 값이 `reports/rc/fps.json` 에 기록된다.
- [ ] (정상) i18n-check (`npm --prefix packages/designer-i18n run i18n:check`)가 missing=0으로 exit 0.
- [ ] (엣지) 오케스트레이터에 누락된 spec 파일(예: TSK-08-xx 미완) 발생 시 exit 1 + 리포트에 `status: "missing"` 로 명시되어야 한다.
- [ ] (엣지) axe violation impact가 "moderate"/"minor"만 있을 때 a11y 게이트는 pass (critical+serious만 차단).
- [ ] (엣지) 4 lint 중 하나라도 위반(예: `display:none` 을 `.fjs-powered-by` 룰셋에 주입한 fixture)을 추가하면 해당 lint가 정확히 exit 1.
- [ ] (에러) `ac-matrix.yaml` 스키마 위반(필수 필드 누락) 시 오케스트레이터가 명확한 에러 메시지 + exit 2.
- [ ] (에러) license-gate에 비-permissive 의존성(GPL fixture) 추가 시 exit 1, 위반 패키지명 출력.
- [ ] (에러) CI workflow가 추가한 5개 job 모두 독립 실행 가능하며 실패 시 PR 머지 차단 (required checks).
- [ ] (통합) 전체 `npm run lint && npm run test:rc` 한 번에 실행해도 런타임 누수(node 프로세스·vite dev server 잔존) 없이 정리된다(`cleanup_processes` 대상: node/vitest/vite/playwright).
- [ ] (통합) PR에서 임의 AC 테스트 1건을 고의로 실패시키면 CI의 `rc-ac-matrix` job이 실패하고 머지 불가.
- [ ] (통합) `docs/tasks/TSK-10-01/regression-log.md` 에 나열된 회귀 티켓 0건 체크박스가 전부 체크되어야 RC1 태깅 진행 가능(TSK-10-02의 선행 게이트).

**fullstack Task 필수 항목 (E2E 테스트에서 검증 — dev-test reachability gate):**
- [ ] (클릭 경로) 메뉴/사이드바/버튼을 클릭하여 목표 페이지에 도달한다 (URL 직접 입력 금지) — `editor.a11y.spec.ts` 가 `page.goto('/')` 이후 팔레트/툴바 버튼 클릭만으로 6개 상태를 재현.
- [ ] (화면 렌더링) 핵심 UI 요소가 브라우저에서 실제 표시되고 기본 상호작용이 동작한다 — 각 a11y 케이스가 Modal open/Tabs 전환/Table inline edit 활성 화면을 스크린샷 아티팩트로 남긴다.
