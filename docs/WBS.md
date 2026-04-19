# WBS - form-js-designer

> version: 1.0
> description: bpmn.io form-js 기반 WYSIWYG 전문 화면 디자이너 (Preact 단일 스택, AI-driven, 한국어 1차)
> depth: 3
> start-date: 2026-03-20
> target-date: 2026-06-05
> updated: 2026-04-17
>
> **상위 문서**: [PRD](./PRD.md) · [TRD](./TRD.md) · [Phase 1 Plan](./phase-1-plan.md) · [ADR-0001](./adr/0001-single-render-pipeline.md) · [ADR-0002](./adr/0002-ui-primitives.md) · [ADR-0003](./adr/0003-table-library.md)
>
> **범례**: ✅ 처리 완료 · 🔄 진행 중 · ⬜ 미착수
>
> **규모**: 중소규모(단일 모노레포, 1차 릴리스) → 3단계 구조 (Phase/WP → Task)
> **Task 크기 정책**: 큰 단위(Work Package 수렴 기준, 1 Task ≈ 2~7일). WP당 3~6 Task. 세부 파일·테스트 체크리스트는 phase-1-plan §3에 위임.

---

## Dev Config

### Domains
| domain | description | unit-test | e2e-test | e2e-server | e2e-url |
|--------|-------------|-----------|----------|------------|---------|
| frontend | Preact 컴포넌트·에디터 호스트 | `npm --prefix packages/<pkg> run test:unit` | `npm --prefix packages/<pkg> run test:e2e` | `npm --prefix packages/designer-editor-host run dev` | `http://localhost:5173` |
| library | 타입·어댑터·런타임 (UI 없음) | `npm --prefix packages/<pkg> run test:unit` | - | - | - |
| cli | Node.js CLI (designer-cli) | `npm --prefix packages/designer-cli run test:unit` | `npm --prefix packages/designer-cli run test:e2e` | - | - |
| ai | Claude Code Skill/Slash Command | `npm --prefix packages/designer-cli run test:skill` | - | - | - |
| infra | CI 스크립트, ADR, spike | `npm run lint` | - | - | - |
| docs | PRD/TRD/Plan/ADR 문서 | - | - | - | - |
| fullstack | Full stack | `npm run test:unit` | `npm --prefix packages/designer-editor-host run test:a11y` | `npm --prefix packages/designer-editor-host run dev` | `http://localhost:5173` |

### Design Guidance
| domain | architecture |
|--------|-------------|
| frontend | Preact 단일 스택 + preact/compat로 React 라이브러리 흡수. 모든 컴포넌트는 `defineComponent` 계약 기반 순수 렌더. CSS는 전역 `@layer components` 평문 CSS (`*.module.css` 금지, ADR-0001 D4). 신규 페이지/모듈은 form-js `additionalModules` 규약으로 등록하고 에디터 호스트 App의 라우트·팔레트에 동시에 추가한다. |
| library | 디자이너 측과 viewer 측에서 동일 코드로 렌더하는 WYSIWYG 단일 파이프라인 (ADR-0001 D1/D5/D6). `defineComponent`·OverlayLayer·LocaleProvider는 프로젝트 전역 공유 계약이므로 하위 호환을 엄격히 유지한다. |
| cli | Node ≥20, ESM, `bin/designer-cli.mjs` 엔트리. Ajv 스키마 검증 + i18n diff 재사용. 네트워크 IO(API 배포)는 fetch 기반. |
| ai | `.claude/skills/designer/SKILL.md` + `.claude/commands/design-*.md`. AI 산출물은 `schemas/drafts/*.schema.json`만, 검증은 `designer-cli validate`로 수렴. |
| infra | GitHub Actions + `scripts/ci/*.mjs`. 워터마크·CSS Module·i18n diff·라이선스 4개 게이트 유지. |

### Quality Commands
| name | command |
|------|---------|
| lint | `npm run lint` |
| typecheck | `npm --prefix packages/designer-core run typecheck` |
| coverage | `npm --prefix packages/designer-core run test:coverage` |

### Cleanup Processes
node, vitest, vite, playwright

---

## WP-00: Phase 0 — 모노레포 + WYSIWYG Spike ✅
- schedule: 2026-03-20 ~ 2026-04-10
- description: 초기 monorepo 스켈레톤, Phase 0 WYSIWYG spike, ADR-0001 Accepted 승격. 모두 처리 완료.

### TSK-00-01: 모노레포 스켈레톤 + form-js 기본 연동 ✅
- category: infrastructure
- domain: infra
- model: sonnet
- status: [xx]
- priority: critical
- assignee: -
- schedule: 2026-03-20 ~ 2026-03-27
- tags: setup, monorepo
- depends: -
- note: 커밋 `6875da6` — `init: clean designer monorepo skeleton`. workspaces, form-js 의존성 고정.

### TSK-00-02: Phase 0 WYSIWYG Spike (defineComponent · assertPureRender · OverlayLayer) ✅
- category: development
- domain: library
- model: opus
- status: [xx]
- priority: critical
- assignee: -
- schedule: 2026-03-27 ~ 2026-04-08
- tags: spike, wysiwyg, render-pipeline
- depends: TSK-00-01
- note: 커밋 `2e36d6a` — `feat: Phase 0 spike validates ADR-0001 single render pipeline`. unit 56/56, e2e 5/5, pixel diff 0/786432.

### TSK-00-03: ADR-0001 Accepted 승격 ✅
- category: infrastructure
- domain: docs
- model: sonnet
- status: [xx]
- priority: high
- assignee: -
- schedule: 2026-04-08 ~ 2026-04-10
- tags: adr, decision
- depends: TSK-00-02
- note: 커밋 `c56697d` — `docs(adr): promote ADR-0001 to Accepted after Phase 0 spike`.

---

## WP-01: Phase 1 §1 — 착수 게이트 3 PR ✅
- schedule: 2026-04-11 ~ 2026-04-15
- description: ADR-0001 §3 D3/D4/D6/D7 조항화 + CI 게이트 3종 신설. Phase 1 본체 착수 전 Blocker 해소. 모두 처리 완료.

### TSK-01-01: ADR-0001 조항 강화 (D3/D4/D6/D7) — PR-A ✅
- category: infrastructure
- domain: docs
- model: opus
- status: [xx]
- priority: critical
- assignee: -
- schedule: 2026-04-11 ~ 2026-04-12
- tags: adr, gate, phase1-s1
- depends: TSK-00-03
- note: 커몃 `bbeb9ba`. §6.3 3개 이슈를 D3(OverlayLayer 원점 불변식)·D4(*.module.css 금지)·D6(동등성 vs 정확성 보조 게이트)·D7(isProductionEnv)로 승격.

### TSK-01-02: CI no-css-modules 스캐너 — PR-B ✅
- category: infrastructure
- domain: infra
- model: sonnet
- status: [xx]
- priority: critical
- assignee: -
- schedule: 2026-04-13 ~ 2026-04-14
- tags: ci, lint, phase1-s1
- depends: TSK-01-01
- note: 커밋 `0e98601`. `scripts/ci/no-css-modules.mjs` + `.github/workflows/ci.yml` + `npm run lint:no-css-modules`. 로컬 violation 주입 실측.

### TSK-01-03: browserEnvContract 공용 헬퍼 — PR-C ✅
- category: development
- domain: library
- model: sonnet
- status: [xx]
- priority: critical
- assignee: -
- schedule: 2026-04-14 ~ 2026-04-15
- tags: designer-core, testing, phase1-s1
- depends: TSK-01-01
- note: 커밋 `138f2a8`. `packages/designer-core/src/testing/browserEnvContract.ts` + 14 helper test + test-designer-core CI job + subpath export. 70/70 PASS.

---

## WP-02: Phase 1 §2 — 기술 결정 게이트 (Q1/Q2 spike) 🔄
- schedule: 2026-04-16 ~ 2026-04-20
- description: UI 프리미티브 5후보 + Table 2후보 동일 게이트 spike, ADR-0002/0003 신규, TRD §3/§13 갱신. 9 task 중 8 완료, ADR-0002 진행 중, 결과 노트·일괄 커밋 남음.

### TSK-02-01: Phase 1 §2 재범위 (5후보 + PD1 정책 게이트) ✅
- category: infrastructure
- domain: docs
- model: opus
- status: [xx]
- priority: high
- assignee: -
- schedule: 2026-04-16 ~ 2026-04-16
- tags: plan, phase1-s2
- depends: TSK-01-03
- note: 커밋 `cf77851`. Preact-compat 사전 조사 기반 phase-1-plan §2 전면 재작성.

### TSK-02-02: Q2 Table spike + PD1 자동 확정 ✅
- category: development
- domain: frontend
- model: opus
- status: [xx]
- priority: critical
- assignee: -
- schedule: 2026-04-17 ~ 2026-04-17
- tags: spike, table, q2, phase1-s2
- depends: TSK-02-01
- entry-point: library
- requirements:
  - TanStack Table v8 + TanStack Virtual + preact/compat 10k행 렌더
  - 멀티헤더 3단 + dnd-kit 컬럼이동 동작 확인
- acceptance:
  - FPS ≥ 55 → PD1-A 확정
- tech-spec:
  - TanStack Table v8, TanStack Virtual, dnd-kit, preact/compat alias
- note: task-1 완료. FPS **59.99** → PD1-A 자동 확정. spike `packages/designer-core/spike/phase1-q1q2/q2-tanstack/`.

### TSK-02-03: Q1 UI 프리미티브 5후보 spike (Radix/Headless/Ariakit/Zag/자작) ✅
- category: development
- domain: frontend
- model: opus
- status: [xx]
- priority: critical
- assignee: -
- schedule: 2026-04-17 ~ 2026-04-17
- tags: spike, ui-primitives, q1, phase1-s2
- depends: TSK-02-01
- entry-point: library
- requirements:
  - 5후보(A~E)에 Dialog/Tabs/Popover 3종을 동일 게이트로 측정
  - a11y (axe 0 위반 + 키보드) · 번들 증분 ≤30KB · Preact 동작 · 유지보수성
- acceptance:
  - 합격 후보군 산출 + tie-break으로 1~5순위 결정
- tech-spec:
  - preact/compat + 각 후보 공식 패키지 + axe-core + Playwright
- note: task-2~6 완료. 1위 Radix(조건부), 2위 Zag+자체, 3위 Headless UI, 4위 Ariakit(탈락), 5위 자작. spike 5개 디렉토리 모두 브라우저 실측 완료.

### TSK-02-04: ADR-0003 table-library + TRD §3/§13 갱신 ✅
- category: infrastructure
- domain: docs
- model: opus
- status: [xx]
- priority: high
- assignee: -
- schedule: 2026-04-17 ~ 2026-04-17
- tags: adr, trd, phase1-s2
- depends: TSK-02-02, TSK-02-03
- note: task-7/8 완료. ADR-0003 209줄 신규 Accepted, TRD §3/§13 +35/-9 갱신. D5/D6 규약 spike 발견에서 승격.

### TSK-02-05: ADR-0002 ui-primitives 작성 ✅
- category: infrastructure
- domain: docs
- model: opus
- status: [xx]
- priority: high
- assignee: -
- schedule: 2026-04-17 ~ 2026-04-17
- tags: adr, phase1-s2
- depends: TSK-02-03
- note: task-9 완료. `docs/adr/0002-ui-primitives.md` 303 라인 Accepted. D1 Radix 조건부(1순위)·D2 Zag fallback(2순위)·D3 Headless 제외·D4 Ariakit 탈락·D5 자작 긴급·D6 공유 alias(react-dom/test-utils→preact)·D7 재평가 게이트. 추가로 `docs/idea.md` 에 "JSON 한 방 렌더 스킬" 섹션 append.

### TSK-02-06: §2.4 결과 노트 + spike 일괄 커밋 (gitignore 정리 포함) ✅
- category: infrastructure
- domain: docs
- model: sonnet
- status: [xx]
- priority: high
- assignee: -
- schedule: 2026-04-17 ~ 2026-04-18
- tags: plan, commit, phase1-s2
- depends: TSK-02-04, TSK-02-05
- requirements:
  - phase-1-plan §2.4 "Spike 실행 결과 (2026-04-17)" 서브섹션 추가 ✅ (`8f16100`)
  - `.gitignore` 에 dist-baseline/dist-full/.playwright-mcp 추가 ✅
  - ADR-0002/0003 + TRD 갱신 + WBS 신규 + idea.md 차후계획 + spike 소스 일괄 커밋 ✅ (`04fb477`)
  - 루트 임시 PNG 5개 + `.playwright-mcp/` 삭제 ✅
- acceptance:
  - 모든 요건 충족. WP-03 착수 가능.
- note: §2.4 결과 노트 `8f16100` 커밋으로 추가 완료. DDTR 리팩토링 통과 → [xx].

---

## WP-03: designer-core 확장 ⬜
- schedule: 2026-04-20 ~ 2026-04-27
- description: phase-1-plan §3.1. OverlayLayer 정식 이관 + propsSchemaToPanel + ViewerHost/EditorHost + LocaleProvider 계약. 이후 모든 WP의 기반.

### TSK-03-01: OverlayLayer 정식 모듈 이관 + assertSharedOrigin 계약
- category: development
- domain: library
- model: opus
- status: [xx]
- priority: critical
- assignee: -
- schedule: 2026-04-20 ~ 2026-04-22
- tags: designer-core, overlay, wysiwyg
- depends: TSK-02-06
- prd-ref: PRD §4 AC #4-1
- requirements:
  - spike `spike/wysiwyg/src/overlay/` → `packages/designer-core/src/overlay/OverlayLayer.tsx` 이관
  - ADR-0001 D3 불변식 계약 테스트 (`assertSharedOrigin`)
  - 1024/1440/1920 3개 뷰포트 회귀 케이스
- acceptance:
  - Vitest 계약 테스트 통과
  - parity spec에서 3 뷰포트 diff ≤ 0.1%
- tech-spec:
  - Preact, happy-dom, Playwright 매트릭스
- note: ADR-0001 D3 하드 게이트.

### TSK-03-02: propsSchemaToPanel 변환기 + 위젯 레지스트리 (8종) ✅
- category: development
- domain: library
- model: opus
- status: [xx]
- priority: critical
- assignee: -
- schedule: 2026-04-22 ~ 2026-04-25
- tags: designer-core, panel, ac7
- depends: TSK-03-01
- prd-ref: PRD §4 AC #7
- requirements:
  - 위젯 8종(string/number/boolean/enum/color/spacing/expression/i18n) × {render, edit, validate}
  - `PanelWidgetRegistry` 확장 API
- acceptance:
  - 24 케이스 Vitest 통과, AC #7 충족
- tech-spec:
  - Ajv meta-schema + Preact

### TSK-03-03: ViewerHost/EditorHost + LocaleProvider 계약
- category: development
- domain: library
- model: opus
- status: [xx]
- priority: critical
- assignee: -
- schedule: 2026-04-25 ~ 2026-04-27
- tags: designer-core, host, i18n
- depends: TSK-03-02
- prd-ref: PRD §4 AC #4, #4-1, #5
- requirements:
  - `host/ViewerHost.tsx` + `host/EditorHost.tsx` + `i18n/LocaleProvider.tsx`
  - ADR-0001 D1/D5 단일 파이프라인 유지
- acceptance:
  - ViewerHost/EditorHost 단위 테스트 통과
  - designer-i18n 연동 가능한 t 함수 계약 확정
- tech-spec:
  - Preact Context, ADR-0001 D5 Viewport/Theme/Data parity

---

## WP-04: designer-components 5종 (Card/Stack/Tabs/Modal/Button) ⬜
- schedule: 2026-04-27 ~ 2026-05-11
- description: phase-1-plan §3.2. 각 컴포넌트에 parity·golden·computed-style 3종 E2E 게이트 강제. Radix UI (Tabs/Modal) + preact/compat 기반.

### TSK-04-01: Card · Stack · Button 3종 (기본형)
- category: development
- domain: frontend
- model: sonnet
- status: [xx]
- priority: critical
- assignee: -
- schedule: 2026-04-27 ~ 2026-05-04
- tags: designer-components, card, stack, button
- depends: TSK-03-03
- entry-point: library
- prd-ref: PRD §4 AC #1, #4-1, #7
- requirements:
  - `defineComponent` 기반, 전역 평문 CSS (`@layer components`)
  - propsSchema + spec.json (AI 참조용)
  - i18n 키 `designer.components.{name}.*`
- acceptance:
  - 각 컴포넌트 parity (3 viewport) + golden + computed-style 3 게이트 통과
  - AC #1 드래그·드롭 동작 (editor-host 통합 대기)
- tech-spec:
  - Preact, CVA, tailwind-merge, Vitest + Playwright + pixelmatch

### TSK-04-02: Tabs · Modal 2종 (Radix 래퍼)
- category: development
- domain: frontend
- model: opus
- status: [xx]
- priority: critical
- assignee: -
- schedule: 2026-05-04 ~ 2026-05-11
- tags: designer-components, tabs, modal, radix
- depends: TSK-04-01
- entry-point: library
- prd-ref: PRD §4 AC #1, #4-1, #7
- requirements:
  - Radix UI Tabs/Dialog + preact/compat alias (ADR-0002 1순위)
  - Modal parity는 **열린 상태** 캡처
  - axe 0 위반 + 키보드 경로 전수 통과
- acceptance:
  - 3 게이트 통과, a11y 회귀 0
  - preact/compat 중복 인스턴스 없음 (R3)
- tech-spec:
  - `@radix-ui/react-dialog`, `@radix-ui/react-tabs` + preact/compat
- note: Radix 미합격 시 Zag 2순위 fallback (ADR-0002 kill-switch).

---

## WP-05: designer-table ⬜
- schedule: 2026-05-11 ~ 2026-05-22
- description: phase-1-plan §3.3. TanStack Table v8 + Virtual + dnd-kit. 편집·필터·멀티헤더·컬럼이동·가상화.

### TSK-05-01: Table 골격 + TanStack 연동 + 멀티헤더
- category: development
- domain: frontend
- model: opus
- status: [xx]
- priority: critical
- assignee: -
- schedule: 2026-05-11 ~ 2026-05-15
- tags: designer-table, tanstack, multiheader
- depends: TSK-03-03
- entry-point: library
- prd-ref: PRD §4 AC #1, #8
- requirements:
  - `TableSchema`/`ColumnDef` 타입 (TRD §5.1)
  - `columnDefToTanstack` 트리 → flat group
  - 멀티헤더 3단, colspan/rowspan 자동 계산
- acceptance:
  - parity spec 통과, colspan 단위 테스트 통과
- tech-spec:
  - `@tanstack/react-table` + preact/compat

### TSK-05-02: 편집·필터·컬럼이동·가상화
- category: development
- domain: frontend
- model: opus
- status: [xx]
- priority: critical
- assignee: -
- schedule: 2026-05-15 ~ 2026-05-22
- tags: designer-table, virtualization, dnd
- depends: TSK-05-01
- entry-point: library
- prd-ref: PRD §4 AC #8
- requirements:
  - 셀 편집 5종 (text/number/date/boolean/enum)
  - 필터 3종 (text/select/range)
  - dnd-kit 컬럼 이동
  - TanStack Virtual 1만행 FPS ≥ 55
- acceptance:
  - editing/filter/reorder E2E 통과
  - `table.virtualization.spec.ts` FPS ≥ 55 (TRD §10, Q2 spike 재확인)
- tech-spec:
  - TanStack Virtual, dnd-kit `useSortable`

---

## WP-06: designer-editor-host + Palette/PropsPanel/LivePreview ⬜
- schedule: 2026-05-11 ~ 2026-05-25
- description: phase-1-plan §3.4. form-js-editor 본체 0건 수정. 호스트 앱 모듈 5종.

### TSK-06-01: 호스트 앱 골격 + Palette + Outline 모듈 ✅
- category: development
- domain: frontend
- model: sonnet
- status: [xx]
- priority: critical
- assignee: -
- schedule: 2026-05-11 ~ 2026-05-15
- tags: editor-host, palette, outline
- depends: TSK-03-03, TSK-04-01
- entry-point: `/` (루트 에디터 페이지, 개발용 App.tsx)
- prd-ref: PRD §4 AC #1
- requirements:
  - `packages/designer-editor-host/src/App.tsx` (예시 페이지)
  - PaletteModule — `designer-components` + `designer-table` group 자동 등록
  - OutlineModule — 폼 트리 시각화, 선택 동기화
- acceptance:
  - `editor.dragdrop.spec.ts` E2E 통과 (6 컴포넌트)

### TSK-06-02: PropsPanel + LivePreview + Validate + Export 모듈
- category: development
- domain: frontend
- model: opus
- status: [xx]
- priority: critical
- assignee: -
- schedule: 2026-05-15 ~ 2026-05-22
- tags: editor-host, propspanel, livepreview
- depends: TSK-06-01, TSK-05-01
- entry-point: `/` (에디터 페이지 내 사이드 패널)
- prd-ref: PRD §4 AC #3, #4, #4-1, #7
- requirements:
  - PropsPanelModule — form-js `propertiesProvider` + `propsSchemaToPanel`
  - LivePreviewModule — ViewerHost 임베드, `change` 이벤트 구독, ADR D5 준수
  - Validate(Ajv) · Export(파일 다운로드 + CLI publish 연계)
- acceptance:
  - `editor.propspanel.spec.ts` · `editor.livepreview.spec.ts` 통과
  - AC #4-1 픽셀 파리티 유지

---

## WP-07: designer-i18n (ko 사전 100% + CI 게이트) ⬜
- schedule: 2026-04-27 ~ 2026-05-18
- description: phase-1-plan §3.5. `t()`, LocaleProvider 실구현, 정적 추출기, ko 사전, CI build-time diff 실패 게이트.

### TSK-07-01: t 함수 + LocaleProvider 구현 + ko 골격
- category: development
- domain: library
- model: sonnet
- status: [xx]
- priority: high
- assignee: -
- schedule: 2026-04-27 ~ 2026-05-04
- tags: i18n, runtime
- depends: TSK-03-03
- prd-ref: PRD §4 AC #5
- requirements:
  - `t(key, params?)` — fallback 키 반환 + console.warn
  - `LocaleProvider` (core 계약 구현)
  - `Intl.NumberFormat` / `Intl.DateTimeFormat` ko-KR 어댑터
- acceptance:
  - 단위 테스트 통과, form-js 기본 검증 메시지 ko 번들 동봉

### TSK-07-02: 정적 추출기 + CI diff 게이트 + ko 100% 커버
- category: infrastructure
- domain: infra
- model: opus
- status: [xx]
- priority: critical
- assignee: -
- schedule: 2026-05-11 ~ 2026-05-18
- tags: i18n, ci, extract
- depends: TSK-07-01, TSK-04-02, TSK-05-02, TSK-06-02
- prd-ref: PRD §4 AC #5, #10
- requirements:
  - AST 추출기 — 모든 `packages/designer-*/**/*.{ts,tsx}` `t('...')` 수집
  - fixture 5개(정상/템플릿리터럴/동적키/문자열연결/주석) + 의도적 누락
  - CI `i18n:check` 잡 — 누락 > 0 시 **빌드 실패**
- acceptance:
  - coverage 100% (hard gate)
  - AC #10 충족

---

## WP-08: designer-cli (validate/import/publish) ⬜
- schedule: 2026-05-18 ~ 2026-05-29
- description: phase-1-plan §3.6. Node CLI 3 명령 + round-trip E2E.

### TSK-08-01: validate + import 명령
- category: development
- domain: cli
- model: sonnet
- status: [xx]
- priority: critical
- assignee: -
- schedule: 2026-05-18 ~ 2026-05-22
- tags: cli, validate, import
- depends: TSK-07-02
- prd-ref: PRD §4 AC #3
- requirements:
  - Ajv 검증 (form-js schemaVersion=19 + 신규 컴포넌트 type)
  - i18n 누락 검사 (§3.5 diff 재사용)
  - `import --to <project-path>` (중복 방지, 경로 정규화)
- acceptance:
  - Vitest + tmp fixture 단위 테스트
  - exit 0/1 규약 준수

### TSK-08-02: publish (static + API) + round-trip E2E
- category: development
- domain: cli
- model: opus
- status: [xx]
- priority: critical
- assignee: -
- schedule: 2026-05-22 ~ 2026-05-29
- tags: cli, publish, roundtrip
- depends: TSK-08-01
- prd-ref: PRD §4 AC #3, #9
- requirements:
  - `--target static` — 디렉토리 복사 + 해시 manifest.json
  - `--target api` — PUT /api/schemas/{id} (ETag)
  - `cli.roundtrip.spec.ts` — validate → import → publish(static) → viewer 픽셀 비교
- acceptance:
  - static/api 양쪽 round-trip 성공, AC #3/#9 충족

---

## WP-09: AI Skill + JSON 배포 채널 + 워터마크 4중 가드 ⬜
- schedule: 2026-05-25 ~ 2026-06-01
- description: phase-1-plan §3.7 + §3.8 + §3.9. 라이선스·AI·런타임 배포 전체.

### TSK-09-01: AI Skill (.claude/skills/designer + design-* commands 4종)
- category: development
- domain: ai
- model: sonnet
- status: [xx]
- priority: high
- assignee: -
- schedule: 2026-05-25 ~ 2026-05-27
- tags: ai, skill, slash-command
- depends: TSK-08-01
- prd-ref: PRD §4 AC #2
- requirements:
  - `.claude/skills/designer/SKILL.md` — spec.json 참조
  - `design-page` · `design-add` · `design-modify` · `design-validate` 4개 command
  - 산출물: `schemas/drafts/*.schema.json` 단일 파일
- acceptance:
  - 각 command 호출 → Ajv 통과 (AC #2, D-P1-5)

### TSK-09-02: designer-runtime — JSON 배포 채널 (static + API 어댑터)
- category: development
- domain: library
- model: opus
- status: [im]
- priority: critical
- assignee: -
- schedule: 2026-05-25 ~ 2026-05-29
- tags: runtime, deploy, roundtrip
- depends: TSK-08-02
- prd-ref: PRD §4 AC #3, #4, #9
- requirements:
  - Host 정적 import 예시 + `ApiSchemaLoader` (ETag 캐시, localStorage fallback)
  - 부팅 시 Ajv 검증 + 실패 시 차단 + 알림 이벤트
  - `roundtrip.{static,api}.spec.ts`
- acceptance:
  - 동일 schema 양쪽 채널 픽셀 diff = 0 (AC #4, #4-1)

### TSK-09-03: 워터마크 4중 가드 (해시 + E2E + SCSS lint + MutationObserver)
- category: infrastructure
- domain: infra
- model: opus
- status: [xx]
- priority: critical
- assignee: -
- schedule: 2026-05-29 ~ 2026-06-01
- tags: watermark, ci, license
- depends: TSK-09-02
- prd-ref: PRD §4 AC #6
- requirements:
  - `scripts/ci/watermark-hash.mjs` + `.watermark-hash` 기준값
  - `watermark-visibility.spec.ts` — 3 viewport × viewer/editor = 6 케이스
  - `scripts/ci/watermark-scss-lint.mjs` — `.fjs-powered-by` + `display:none|visibility:hidden|opacity:0` 동시 매칭 차단
  - `WatermarkMonitor.ts` MutationObserver (prod only, R9)
- acceptance:
  - 6 E2E + 3 CI lint 전원 통과 (AC #6)

---

## WP-10: Phase 1 RC 수렴 ⬜
- schedule: 2026-06-01 ~ 2026-06-05
- description: phase-1-plan §5 Week 7. AC 매트릭스 전수 통과, axe/FPS 게이트, 라이선스 보고서, RC1 태깅.

### TSK-10-01: AC 매트릭스 120 케이스 전수 통과 + 퍼포먼스/접근성 게이트
- category: development
- domain: fullstack
- model: opus
- status: [xx]
- priority: critical
- assignee: -
- schedule: 2026-06-01 ~ 2026-06-04
- tags: ac-matrix, rc, a11y, perf
- depends: TSK-07-02, TSK-09-03
- prd-ref: PRD §4 AC #1~#10
- requirements:
  - phase-1-plan §4 AC 매트릭스 ~120 케이스 + 4 CI lint 게이트 전원 통과
  - axe-core critical+serious = 0
  - Table 10000행 FPS ≥ 55
- acceptance:
  - 전 AC 통과 증거 로그, 회귀 티켓 0

### TSK-10-02: RC1 태깅 + THIRD_PARTY_LICENSES + CHANGELOG
- category: infrastructure
- domain: infra
- model: sonnet
- status: [xx]
- priority: high
- assignee: -
- schedule: 2026-06-04 ~ 2026-06-05
- tags: release, license, changelog
- depends: TSK-10-01
- prd-ref: PRD §0
- requirements:
  - `THIRD_PARTY_LICENSES` 생성 + permissive 검증
  - 각 패키지 `CHANGELOG.md` keep-a-changelog 포맷
  - `v1.0.0-rc.1` 태그
- acceptance:
  - 라이선스 gate 통과, 태그 푸시 완료

---

## WP-11: 멀티 선택 확장 ⬜
- schedule: 2026-04-20 ~ 2026-05-05
- description: 캔버스·아웃라인 공통 멀티 선택 UX 강화. baseline(MVP: shift/ctrl/meta 클릭 토글 + Delete 일괄 삭제)은 이미 구현됨(`develop`). 본 WP에서 Undo 배치, OS 표준 Range 선택, Ctrl+A/Escape 단축키, 마퀴(rubber-band) 선택, 일괄 복제/DnD 이동, E2E 회귀 스펙을 추가한다.
- depends: TSK-06-01 (OutlineModule·ShortcutModule), TSK-03-01 (OverlayLayer)

### TSK-11-01: Undo 배치 + Ctrl+A/Escape 단축키 + E2E 회귀 스펙
- category: development
- domain: frontend
- model: sonnet
- status: [dd]
- priority: high
- assignee: -
- schedule: 2026-04-20 ~ 2026-04-23
- tags: multi-select, undo, shortcut, e2e
- depends: -
- entry-point: `/` (designer-editor-host App)
- prd-ref: PRD §4 AC #1 (Outline 선택 동기화)
- requirements:
  - `OutlineModule.deleteSelectedFields()` 를 form-js `commandStack` 의 복합 command 로 감싸 단일 undo/redo 원자화
  - 전역 키보드 `Ctrl/Meta+A` → 현재 루트 children 전체 선택 (input/contenteditable 포커스 시 no-op)
  - `Escape` → 선택 해제 (`_selectedIds=[]`, form-js `selection.clear()`)
  - `editor.multiselect.spec.ts` E2E: shift-click → 일괄 삭제 → undo 1회 복구 / Ctrl+A → Escape 시나리오
- acceptance:
  - vitest 신규 테스트 ≥ 4 통과, 기존 226 테스트 회귀 0
  - Playwright `multiselect.spec.ts` green (visible 1회 포함)
  - 일괄 삭제 후 Undo 한 번으로 모든 필드 복구

### TSK-11-02: Range 선택 (shift-click 연속 범위) + 시각 개선
- category: development
- domain: frontend
- model: sonnet
- status: [dd]
- priority: medium
- assignee: -
- schedule: 2026-04-23 ~ 2026-04-25
- tags: multi-select, range, ux
- depends: TSK-11-01
- entry-point: `/`
- prd-ref: PRD §4 AC #1
- requirements:
  - OutlineModule 에 `_anchorId` 도입(단순 클릭 시 갱신, shift 클릭 시 anchor→target 사이 형제를 선택 집합에 포함)
  - DFS flat order(parent 재귀 순회) 기준 anchor↔target 사이 전 노드를 집합 union
  - secondary 선택 CSS(`data-outline-multi-selected`) dashed → solid 보강, form-js container 레이어 간섭 회피 (z-index/background-clip 조정)
  - 아웃라인 패널 트리에서도 shift-click range 적용
- acceptance:
  - vitest 신규: range add / range within nested container / anchor 갱신 규칙
  - Playwright: A~E 5개 필드에서 A 클릭 → shift+E 클릭 → 5개 모두 선택 확인

### TSK-11-03: 마퀴(rubber-band) 선택
- category: development
- domain: frontend
- model: opus
- status: [  ]
- priority: medium
- assignee: -
- schedule: 2026-04-27 ~ 2026-05-01
- tags: multi-select, marquee, overlay
- depends: TSK-11-02
- entry-point: `/`
- prd-ref: PRD §4 AC #1
- requirements:
  - `OverlayLayer`(또는 신규 `MarqueeLayer`)에 `mousedown` → `mousemove` → `mouseup` 사이 드래그 박스 DOM 렌더
  - 빈 영역 mousedown 시작 / 필드 위 mousedown은 form-js DnD에 양보 (pointer-events 가드)
  - 드래그 종료 시 박스 rect 와 `[data-id]` 요소 bounding rect 교차 판정 → `_selectedIds` 교체 또는 union(shift 누름 여부)
  - tabs inside 같은 특수 컨테이너 제외 규칙은 기존 `DISABLED_INSIDE_TYPES` 와 정합
- acceptance:
  - vitest: rect intersection 순수 함수 테스트 (경계/부분 겹침/완전 포함)
  - Playwright: 빈 영역 드래그로 3개 교차 필드 선택 → 일괄 삭제까지 연결

### TSK-11-04: 일괄 복제 + 멀티 DnD 이동
- category: development
- domain: frontend
- model: opus
- status: [  ]
- priority: medium
- assignee: -
- schedule: 2026-05-01 ~ 2026-05-05
- tags: multi-select, duplicate, dnd
- depends: TSK-11-01
- entry-point: `/`
- prd-ref: PRD §4 AC #1, #7 (Export 라운드트립)
- requirements:
  - `OutlinePanelService.duplicateSelectedFields()` — `_selectedIds` 전부를 원 위치 직후에 deep clone(새 id/key) 삽입. 복제본으로 선택 전환.
  - ShortcutModule `Insert` 키: 멀티 시 `duplicateSelectedFields()`, 단일 시 기존 세로 복제
  - DnD: OutlinePanel `draggable` 노드에서 멀티 선택 중이면 drag payload 를 `id-list` 로 직렬화 → drop 핸들러에서 순회 이동 (commandStack 단일 원자)
  - key 충돌 방지 로직은 기존 `_handlePaste` 의 `collectKeys` 재사용
- acceptance:
  - vitest: `duplicateSelectedFields`(형제 순서 유지) / DnD 멀티 이동 / key rename 누적
  - Playwright: 3 선택 → Insert → 6개 → undo 1회 → 3개 복귀

---

## WP-12: 컴포넌트/행 리사이즈 핸들 ⬜
- schedule: 2026-05-06 ~ 2026-05-15
- description: 캔버스에서 컴포넌트(textarea/html/group/container) 하단·행(row) 하단에 드래그 핸들을 노출, 사용자가 직접 높이를 조절. 스키마에 `layout.height`(컴포넌트) / `layout.rowHeight`(행 첫 컴포넌트)로 저장하고 designer-runtime의 신규 `LayoutHeightModule`을 통해 viewer에서도 동일한 높이로 렌더된다(디자이너=뷰어 동등성). spacer는 form-js viewer가 이미 지원하는 `height` prop을 그대로 사용한다.
- depends: TSK-03-01 (OverlayLayer), WP-04 (custom container 컴포넌트), `panel-resize-toggle`(usePanelResize 패턴 재사용)

### TSK-12-01: useElementResize 훅 + ResizeHandle 공통 컴포넌트
- category: development
- domain: frontend
- model: sonnet
- status: [xx]
- priority: high
- assignee: -
- schedule: 2026-05-06 ~ 2026-05-07
- tags: resize, hook, primitive
- depends: -
- entry-point: `packages/designer-editor-host/src/hooks/`
- prd-ref: PRD §4 AC #4 (WYSIWYG 편집)
- requirements:
  - 기존 `usePanelResize`(packages/designer-editor-host/src/hooks/usePanelResize.ts) 의 pointercapture·body cursor·cleanup 패턴을 일반화한 `useElementResize({ axis: 'y'|'x', initial, min, max, onChange, onCommit })` 훅 신설
  - `ResizeHandle` Preact 컴포넌트(`<div role="separator" aria-orientation="horizontal">`) — 드래그 시작·키보드(Arrow/Home/End)·`aria-valuenow`/`aria-valuemin`/`aria-valuemax`
  - CSS는 designer-editor-host의 전역 `app.css` `@layer components` 평문(ADR-0001 D4 준수)
- acceptance:
  - vitest 신규: pointer drag delta → onChange/onCommit 호출, min/max clamp, keyboard delta(±10), Home/End → min/max
  - 기존 `usePanelResize` 회귀 0 (가능하면 내부에서 useElementResize로 위임)

### TSK-12-02: 컴포넌트 높이 핸들 (`layout.height`) + viewer 적용 모듈
- category: development
- domain: fullstack
- model: opus
- status: [xx]
- priority: critical
- assignee: -
- schedule: 2026-05-08 ~ 2026-05-11
- tags: resize, schema, layout, viewer-parity
- depends: TSK-12-01
- entry-point: `packages/designer-core/src/`, `packages/designer-runtime/src/`
- prd-ref: PRD §4 AC #4, AC #7 (Export 라운드트립)
- requirements:
  - 대상 컴포넌트: `textarea`, `html`, `table`, `group`, custom container(`card`/`stack`/`modal`/`tabs`/`tabPanel`). spacer는 기존 `height` prop 그대로 (TSK-12-02 범위 외)
  - 스키마 키: `field.layout.height: number`(px). form-js의 기존 `layout.{row,columns}` 객체에 추가. unknown key는 form-js viewer가 무시하므로 직접 호환 깨짐 없음
  - 디자이너 측: 선택된 대상 컴포넌트의 OverlayLayer 하단에 `<ResizeHandle>` 렌더, drag 종료 시 form-js `editFieldCommand` 로 `layout.height` 갱신 → undo/redo 자동
  - viewer 동등성: 신규 `packages/designer-runtime/src/modules/LayoutHeightModule.ts` 작성. form-js `additionalModules` 로 designer/viewer 양쪽에 등록. `formFields.changed` / `formField.added` 이벤트 hook + `[data-id]` 직접 조회로 inline `style.height` 주입(textarea는 자식 `<textarea>` 까지 100%)
  - propsPanel: 대상 컴포넌트에 "높이(px)" 숫자 입력 추가 (핸들과 동일 prop 편집)
- acceptance:
  - vitest 신규: `layout.height` 갱신 → editFieldCommand 발행, LayoutHeightModule이 DOM에 inline style 주입(jsdom)
  - Playwright(visible): textarea 핸들 드래그 → 75→200px → 스키마 export 확인 → 동일 스키마를 viewer 페이지(`/preview`)로 import 시 동일 높이 렌더
  - 기존 form-js viewer 회귀 0 (designer-editor-host preview 라우트 시각 회귀 1px 이내)

### TSK-12-03: 행 높이 핸들 (`layout.rowHeight`) + viewer 적용
- category: development
- domain: fullstack
- model: opus
- status: [xx]
- priority: high
- assignee: -
- schedule: 2026-05-11 ~ 2026-05-14
- tags: resize, row, layout, viewer-parity
- depends: TSK-12-02
- entry-point: `packages/designer-core/src/container/ChildrenSlot.tsx`, `packages/designer-runtime/src/modules/LayoutHeightModule.ts`
- prd-ref: PRD §4 AC #4
- requirements:
  - 저장 위치: 해당 row 첫 컴포넌트의 `layout.rowHeight: number`(px). form-js `formLayouter.getRows(parentId)[i].components[0]` 으로 결정. 첫 컴포넌트가 바뀌면(이동/삭제) WBS-12-03 의 행 핸들도 자연스레 새 첫 컴포넌트를 따라감.
  - 디자이너 측: `ChildrenSlot` 의 `<Row>` 자식 끝에 `<ResizeHandle axis="y">` 삽입. drag 종료 시 첫 컴포넌트의 `layout.rowHeight` 갱신.
  - viewer 측: `LayoutHeightModule` 확장 — `[data-row-id]` 행 DOM 에 `min-height` 주입. row 의 첫 컴포넌트의 `layout.rowHeight` 를 lookup.
  - 단일행 single-line 필드만 있는 row 도 핸들 표시(빈 공간 허용). `align-items: start` 유지로 input 은 위쪽 정렬.
- acceptance:
  - vitest 신규: 행 핸들 drag → 첫 컴포넌트 `layout.rowHeight` 갱신, 첫 컴포넌트 삭제 시 새 첫 컴포넌트로 height 이전(또는 reset 정책 — TSK 설계 단계에서 결정)
  - Playwright(visible): 한 행에 textfield + textarea → 행 핸들 드래그로 행 높이 200px → textarea 가 행 전체를 채우고 textfield 는 위쪽 정렬 유지 확인 → viewer 라우트에서 동일 결과
  - 회귀: 기존 row 자동 height(`flex: auto`) 동작 유지 (rowHeight 미설정 시 변화 없음)

### TSK-12-04: E2E 라운드트립 + 시각 회귀 + 문서
- category: testing
- domain: fullstack
- model: sonnet
- status: [  ]
- priority: high
- assignee: -
- schedule: 2026-05-14 ~ 2026-05-15
- tags: e2e, schema, regression, docs
- depends: TSK-12-02, TSK-12-03
- entry-point: `packages/designer-editor-host/test/e2e/`, `packages/designer-cli/test/`
- prd-ref: PRD §4 AC #7 (Export 라운드트립)
- requirements:
  - E2E `editor.resize.spec.ts`: 컴포넌트 핸들 + 행 핸들 + propsPanel 숫자 입력 3 경로 시각 일치
  - 스키마 라운드트립: designer 에서 height 설정 → JSON export → `designer-cli validate` pass → re-import 시 동일 height 복원
  - 시각 회귀: pixel diff 0 또는 <0.1% (panel-resize-toggle 회귀 정책 준수)
  - 문서: `docs/features/component-row-resize/` 신설 (PRD/사용법/스키마 예시/제약)
- acceptance:
  - Playwright `editor.resize.spec.ts` 3 케이스 green
  - `designer-cli validate` 신규 fixture pass
  - 시각 회귀 게이트 통과
  - `docs/features/component-row-resize/README.md` 작성 + WP-12 README 와 상호 링크
