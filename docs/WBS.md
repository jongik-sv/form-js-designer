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
| fullstack | Full stack | - | - | - | - |

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

### TSK-03-02: propsSchemaToPanel 변환기 + 위젯 레지스트리 (8종)
- category: development
- domain: library
- model: opus
- status: [im]
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
- status: [ ]
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
- status: [ ]
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

### TSK-06-01: 호스트 앱 골격 + Palette + Outline 모듈
- category: development
- domain: frontend
- model: sonnet
- status: [ ]
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
- status: [ ]
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
- status: [ ]
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
- status: [ ]
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
- status: [ ]
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
- status: [ ]
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
- status: [ ]
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
- status: [ ]
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
- status: [ ]
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
- status: [ ]
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
- status: [ ]
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
