# Phase 1 — 1차 릴리스 본체 구현 계획

> **문서 지위**: 초안 (draft). PRD §4 Acceptance Criteria 10항목 전수 충족을 목표로 한 Phase 1 (TRD §12 기준 4~6주) 구현 계획서.
> **상위 문서**: [`docs/PRD.md`](../PRD.md), [`docs/TRD.md`](../TRD.md), [`docs/adr/0001-single-render-pipeline.md`](../adr/0001-single-render-pipeline.md)
> **선행 커밋**: `2e36d6a` (spike 검증: unit 56/56, e2e 5/5, pixel diff 0/786432), `c56697d` (ADR-0001 Accepted 승격)
> **작성일**: 2026-04-17

---

## 0. 범위 및 성공 조건

Phase 1 성공 조건 = **PRD §4 Acceptance Criteria 10개 항목이 모두 자동 테스트로 통과**. 본 계획의 모든 작업은 아래 매핑에서 최소 1개 AC에 연결되어야 한다 (AC 미연결 작업은 Phase 1 제외).

| AC# | 요건 요약 | 충족 작업 (본 계획 §) |
|---|---|---|
| 1 | 기본+신규 컴포넌트 드래그·드롭 배치 | §3.2 Card/Stack/Tabs/Modal/Button, §3.3 Table, §3.4 Palette 통합 |
| 2 | AI Skill/Slash Command로 화면 의도 → JSON 생성 | §3.7 AI Skill (.claude/skills/designer) |
| 3 | JSON 파일 저장/불러오기 | §3.6 `designer-cli import` + §3.8 정적 파일 어댑터 |
| 4 | 운영 viewer에서 동일 JSON 수정 없이 렌더 (round-trip 무손실) | §3.8 JSON 배포 채널 + Playwright round-trip E2E |
| 4-1 | WYSIWYG 충실도 (디자이너↔viewer 픽셀 일치) | §3.1 defineComponent 계약 + §3.4 Live Preview + §4 픽셀 파리티 게이트 |
| 5 | 한국어 UI/메시지 100% | §3.5 designer-i18n ko 사전 + CI 누락 게이트 |
| 6 | bpmn.io 워터마크 정상 노출 | §3.9 4중 가드 (해시/E2E/SCSS lint/MutationObserver) |
| 7 | 프로퍼티 패널을 JSON으로 커스터마이징 | §3.4 propsSchema 기반 자동 패널 |
| 8 | 테이블 고급 기능 (편집·필터·멀티헤더·컬럼이동) | §3.3 designer-table |
| 9 | JSON 배포 정적·API 양쪽 지원 | §3.6 `designer-cli publish` + §3.8 정적/API 어댑터 |
| 10 | 모든 가시 문자열 `t('key.path')` + ko 사전 100% | §3.5 i18n 정적 추출기 + CI 빌드 실패 게이트 |

Phase 1에서 의도적으로 **제외**되는 항목 (PRD §5 Out of Scope): 모바일 디자이너 UI, VCS-level JSON 관리, 디자이너 내장 데이터소스/AI 패널, 실시간 협업, 테마 빌더, JSX eject.

---

## 1. 선행 게이트 (Phase 1 착수 전)

### 1.1 ADR-0001 보강 PR (Blocker)

ADR-0001 §6.3에서 spike 도중 발견된 3개 이슈를 ADR 본문 결정 조항 및 **실행 게이트**로 정식 편입한다. "가이드 추가" 수준이 아니라, 파일·테스트·CI 단계에서 강제되도록 한다.

| 이슈 | 편입할 조항 | 구체 반영 파일/테스트/CI |
|---|---|---|
| **이슈 1**: `process.env.NODE_ENV` ReferenceError | §3 **D7 각주** 추가 | (a) `packages/designer-core/src/defineComponent.ts:43-52` `isProductionEnv()` 패턴을 D7 공식 예시로 교체. (b) `packages/designer-core/src/__tests__/defineComponent.test.tsx:231-243` "vanilla browser simulation" 케이스를 모든 신규 컴포넌트 지원 패키지에 상속 시키는 공유 테스트 헬퍼(`designer-core/testing/browserEnvContract.ts`)로 추출. (c) CI: `npm --prefix packages/designer-core run test:unit` 계속 유지 |
| **이슈 2**: CSS Modules 파일명 함정 + 파리티 blind spot | §3 **D4 표 하단 규칙 추가** + §3 **D6 단서 조항 추가** | (a) D4 신규 규칙: "`*.module.css` 파일명 금지. 전역 평문 `*.css`만 허용. 의도적 사용 시 ADR 예외 필요". (b) Vite 플러그인 또는 빌드 스크립트 `scripts/ci/no-css-modules.mjs`가 `packages/designer-*/**/*.module.css` 존재를 감지하면 exit 1. (c) D6 보조 게이트: **`getComputedStyle` 스냅샷 + 골든 이미지**를 Phase 1 모든 컴포넌트 E2E에 필수. Playwright 테스트 파일 네이밍 컨벤션: `*.parity.spec.ts` (viewer↔editor) + `*.golden.spec.ts` (절대 기준 스크린샷). (d) CI 단계: `test:e2e` 단계에서 두 spec 세트를 모두 실행 |
| **이슈 3**: OverlayLayer 원점 불일치 | §3 **D3 불변식 추가** | (a) D3 신규 불변식: "OverlayLayer의 부모 컨테이너는 `#form-root`와 동일한 bounding-box origin과 width를 공유해야 한다". (b) `packages/designer-core/src/overlay/OverlayLayer.ts`(신규 패키지 추출) 단위 테스트에 `assertSharedOrigin(formRoot, overlayParent)` 계약 테스트 추가. (c) Playwright: **1024 + 1440 + 1920 3개 뷰포트** 에서 모든 파리티 스펙 실행. (d) CI: `test:e2e` 매트릭스 `viewport: [1024, 1440, 1920]` |

**승격 절차**:
1. `docs/adr/0001-single-render-pipeline.md` §3 D3/D4/D6/D7에 위 3개 사항 조항 반영 (PR-A).
2. `scripts/ci/no-css-modules.mjs` 추가 + `.github/workflows/ci.yml`에 `lint:no-css-modules` 잡 추가 (PR-B).
3. `packages/designer-core/testing/browserEnvContract.ts` 공용 헬퍼 추출 (PR-C).
4. 세 PR 머지 완료 = Phase 1 착수 전제 조건.

### 1.2 현재 코드 상태 (ADR 보강 전)

Phase 0 종료 시점 `packages/designer-core/src/` 실재 파일:
- `defineComponent.ts` (이슈 1 해결 완료 — `isProductionEnv()` 구현됨)
- `assertPureRender.ts` (휴리스틱 5개 패턴)
- `types.ts` (`PureRenderProps`, `ComponentDefinition`, `PropsSchema`)
- `index.ts` (public exports)
- `__tests__/defineComponent.test.tsx`, `__tests__/assertPureRender.test.ts`
- `spike/wysiwyg/` (Phase 0 증거 — 폐기 가능, 유지)

**없는 것**: OverlayLayer 정식 모듈, propsSchema→패널 변환기, i18n 추출기, components/table/cli 패키지.

---

## 2. 기술 결정 게이트 (Q1·Q2 spike, 1주)

TRD §3 말미 요구사항: 기본값(Radix + TanStack Table v8)은 idea.md 권장안 기준이며, **Phase 1 시작 시점 1주 spike**로 실측 비교 후 TRD §3 갱신.

### 2.1 Q1 — UI 프리미티브 (Radix UI vs Ark UI)

| 비교 축 | 측정 방법 |
|---|---|
| Preact 호환 | `preact/compat` alias 하에 Dialog/Tabs/Popover 3종 렌더 동작 + React DevTools 의존성 0 |
| 번들 크기 | 3종 컴포넌트만 사용 시 gzip 증분 (`esbuild --analyze`) |
| 접근성 | axe-core 0 위반 |
| API 안정도 | breaking change 이력 (최근 12개월) |

**산출물**: `packages/designer-core/spike/ui-primitives/` (폐기 가능). 결정서는 `docs/adr/0002-ui-primitives.md` (신규) — Radix 유지 또는 Ark 전환 중 택1.

### 2.2 Q2 — 테이블 라이브러리 (TanStack Table v8 vs Glide Data Grid)

| 비교 축 | 측정 방법 |
|---|---|
| 1만 행 가상 스크롤 60fps | TRD §10 NFR 직결 — Playwright + `requestAnimationFrame` 측정 |
| 멀티헤더 colspan | 3단계 그룹 헤더 렌더 가능 여부 |
| 컬럼이동 | dnd-kit 통합 난이도 |
| Preact 호환 | Canvas 렌더(Glide) vs DOM 렌더(TanStack) 파리티 영향 |
| 라이선스 | MIT 유지 필요 |

**산출물**: `packages/designer-core/spike/table/` + `docs/adr/0003-table-library.md`.

### 2.3 결정 갱신

Q1/Q2 spike 완료 후 **TRD §3 (UI 라이브러리 / 테이블) 표 + §13 (Q1·Q2 처리) 표**를 실제 선택으로 치환하는 PR 머지. 이 PR 머지 = §3 이하 작업 착수 전제 조건.

---

## 3. 작업 분해 구조 (WBS)

### 3.1 designer-core 확장

**현재 (커밋 `2e36d6a`) vs Phase 1 delta**:

| 모듈 | 현재 | Phase 1 목표 |
|---|---|---|
| `defineComponent` | 존재 (spike 검증 완료) | propsSchema 런타임 검증 강화 (Ajv meta-schema) |
| `assertPureRender` | 5개 휴리스틱 | 휴리스틱 확장 (setState w/o props 의존 등) + 정식 위치 이동 |
| `types.ts` | `PureRenderProps`, `PropsSchema` | `OverlayHostContext`, `ViewportBreakpoint`, `PanelWidgetRegistry` 추가 |
| OverlayLayer | spike 전용 (`spike/wysiwyg/src/overlay/`) | `packages/designer-core/src/overlay/OverlayLayer.tsx` 정식 이관, 좌표 계약 테스트 |
| 패널 변환기 | 없음 | `packages/designer-core/src/panel/propsSchemaToPanel.tsx` 신규 |
| Viewer/Editor 합성 유틸 | 없음 | `packages/designer-core/src/host/{ViewerHost,EditorHost}.tsx` |
| i18n 계약 인터페이스 | 없음 | `packages/designer-core/src/i18n/LocaleProvider.tsx` (t 함수 주입 계약만) |

**파일 단위 체크리스트** (모두 TDD: Vitest 먼저):
- [ ] `src/overlay/OverlayLayer.tsx` + `src/overlay/assertSharedOrigin.ts` + `__tests__/OverlayLayer.test.tsx`
- [ ] `src/panel/propsSchemaToPanel.tsx` + `__tests__/propsSchemaToPanel.test.tsx` (위젯 레지스트리 8종 × string/number/boolean/enum/color/spacing/expression/i18n)
- [ ] `src/host/ViewerHost.tsx` (`<Form>` 래퍼 + LocaleProvider + ThemeProvider)
- [ ] `src/host/EditorHost.tsx` (ViewerHost + OverlayLayer + FormRenderContext slots)
- [ ] `src/i18n/LocaleProvider.tsx` + context
- [ ] `src/testing/browserEnvContract.ts` (§1.1 이슈1 헬퍼 공유용)
- [ ] `src/index.ts` 업데이트 + public API 문서 `packages/designer-core/README.md`

### 3.2 designer-components — Card / Stack / Tabs / Modal / Button (5개)

각 컴포넌트는 단일 파일 `defineComponent` + 자체 `*.css` (module 아님) + propsSchema + `spec.json` (AI 참조용, TRD §6.4).

| 컴포넌트 | AC | propsSchema 핵심 | WYSIWYG 파리티 | 골든 이미지 | 공수 (p-d, 1인) |
|---|---|---|---|---|---|
| `card` | #1, #4-1 | `padding: spacing`, `elevation: enum(0..3)`, `header: i18n`, `bordered: boolean` | `*.parity.spec.ts` | `card.golden.png` (4 variant) | 3 |
| `stack` | #1, #4-1 | `direction: enum(row|col)`, `gap: spacing`, `align: enum`, `justify: enum`, `wrap: boolean` | `*.parity.spec.ts` | `stack.golden.png` (row/col × 3 gap) | 3 |
| `tabs` | #1, #4-1, #7 | `tabs: array(label:i18n, value:string)`, `defaultValue: string`, `orientation: enum` | Radix Tabs 래퍼, `*.parity.spec.ts` | `tabs.golden.png` (기본/disabled/vertical) | 4 |
| `modal` | #1, #4-1 | `title: i18n`, `description: i18n`, `triggerLabel: i18n`, `size: enum(sm|md|lg)` | Radix Dialog 래퍼. 파리티는 **열린 상태** 캡처 | `modal.golden.png` (3 size) | 4 |
| `button` | #1, #4-1, #7 | `variant: enum(primary|secondary|ghost)`, `label: i18n`, `action: expression`, `disabled: boolean` | `*.parity.spec.ts` | `button.golden.png` (3 variant × 2 state) | 3 |

**공통 체크리스트** (컴포넌트별 반복):
- [ ] `packages/designer-components/src/<name>/<Name>.tsx` (`defineComponent` 기반, 분기 0건)
- [ ] `packages/designer-components/src/<name>/<Name>.css` (module 아님, `@layer components` 사용)
- [ ] `packages/designer-components/src/<name>/propsSchema.ts`
- [ ] `packages/designer-components/src/<name>/spec.json` (AI Read용)
- [ ] `__tests__/<Name>.test.tsx` (Vitest + happy-dom, 순수 렌더 + propsSchema 검증)
- [ ] `e2e/<name>.parity.spec.ts` (ADR D6 픽셀 diff ≤ 0.1% at 1024/1440/1920)
- [ ] `e2e/<name>.golden.spec.ts` (§1.1 이슈2 대응 — 절대 기준)
- [ ] `__tests__/<name>.computed-style.test.tsx` (background/padding/border-width 스냅샷)
- [ ] `packages/designer-components/src/index.ts`에서 `DesignerComponentsModule` export (form-js `additionalModules` 규약)
- [ ] i18n 키 전수: `designer.components.<name>.*` 네임스페이스

**Acceptance Gate**: 컴포넌트 5개 모두에서 파리티·골든·computed-style 3종 테스트가 PR 머지 게이트로 강제됨.

### 3.3 designer-table (AC #8, #9)

TRD §5.1 `TableSchema` / `ColumnDef`를 1차 구현 대상으로 확정. Q2 spike 결과 TanStack Table v8 확정 가정.

**기능 체크리스트**:
- [ ] 편집 (AC #8): 셀 click → inline editor (text/number/date/boolean/enum 5종 `ColumnDef.type`별). 편집은 컴포넌트 내부 상태 토글 — ADR §4.2 "셀 편집은 디자이너 분기와 무관" 규약 준수.
- [ ] 필터 (AC #8): `ColumnDef.filter: 'text'|'select'|'range'` 3종. 헤더에 필터 아이콘.
- [ ] 멀티헤더 (AC #8): `ColumnDef.columns?` 트리 → 자동 colspan/rowspan 계산. TanStack Table `columns` 필드 직접 활용.
- [ ] 컬럼 이동 (AC #8): dnd-kit `useSortable` 기반 헤더 드래그. 이동 결과는 `onColumnOrderChange` prop.
- [ ] 가상 스크롤 (TRD §10 NFR): TanStack Virtual, 1만 행 60fps.
- [ ] propsSchema: columns 배열 편집을 propsSchema `array` 위젯으로. (이 항목이 §3.1 패널 변환기에 `array` 위젯 타입 추가를 요구 — 의존)

**파일 체크리스트**:
- [ ] `packages/designer-table/src/types.ts` (TRD §5.1 그대로 이관)
- [ ] `packages/designer-table/src/Table.tsx` (`defineComponent`)
- [ ] `packages/designer-table/src/columnDefToTanstack.ts` (트리 → flat group 변환)
- [ ] `packages/designer-table/src/cells/{TextCell,NumberCell,DateCell,BooleanCell,EnumCell}.tsx`
- [ ] `packages/designer-table/src/filters/{TextFilter,SelectFilter,RangeFilter}.tsx`
- [ ] `packages/designer-table/src/dnd/ColumnDragHandle.tsx`
- [ ] 단위 테스트: colspan 계산, editable 토글, 필터 pred 정확성
- [ ] E2E: `table.parity.spec.ts` (5000 행 샘플), `table.editing.spec.ts`, `table.filter.spec.ts`, `table.reorder.spec.ts`
- [ ] Perf E2E: `table.virtualization.spec.ts` (FPS ≥ 55 at 10000 rows, TRD §10)

### 3.4 designer-editor 확장 (AC #1, #4, #4-1, #7)

TRD §7.3 호스트 앱 합성 패턴 그대로. form-js-editor **본체 수정 0건**, 확장은 호스트 앱에서만.

| 확장 포인트 | AC | 파일 | 구체 작업 |
|---|---|---|---|
| propsSchema → 자동 패널 | #7 | `packages/designer-editor-host/src/modules/PropsPanelModule.ts` | form-js의 `propertiesProvider` 확장 포인트에 §3.1 `propsSchemaToPanel` 결합. 위젯 8종 레지스트리 주입. |
| Live Preview | #4, #4-1 | `packages/designer-editor-host/src/modules/LivePreviewModule.ts` | §3.1 `ViewerHost` 인스턴스를 에디터 `change` 이벤트에 구독. ADR D5 (Viewport/Theme/Data parity) 준수. |
| Palette 신규 컴포넌트 등록 | #1 | `packages/designer-editor-host/src/modules/PaletteModule.ts` | §3.2 + §3.3 컴포넌트 `group` 기반 자동 등록. 드래그·드롭 → form-js `dragAndDrop` 서비스 활용. |
| Outline | #1, #7 | `packages/designer-editor-host/src/modules/OutlineModule.ts` | 폼 트리 시각화, 선택 동기화. |
| Validate | #10 | form-js viewer의 Ajv 통합 + designer-cli validate 공유 로직 |
| Export | #3 | 파일 다운로드 / `designer-cli publish` 호출 |

**파일 체크리스트**:
- [ ] `packages/designer-editor-host/src/index.ts` + 5개 모듈
- [ ] `packages/designer-editor-host/src/App.tsx` (예시 호스트 앱, 개발용)
- [ ] E2E: `editor.dragdrop.spec.ts`, `editor.livepreview.spec.ts`, `editor.propspanel.spec.ts`

### 3.5 designer-i18n (AC #5, #10)

TRD §4.4 그대로.

- [ ] `packages/designer-i18n/src/t.ts` — `t(key, params?)` 구현. fallback은 key 문자열 반환 + `console.warn`.
- [ ] `packages/designer-i18n/src/LocaleProvider.tsx` — §3.1 계약 구현.
- [ ] `packages/designer-i18n/src/intl.ts` — `Intl.NumberFormat` / `Intl.DateTimeFormat` 어댑터 (ko-KR 기본).
- [ ] `packages/designer-i18n/locales/ko.json` — 네임스페이스: `designer.core.*`, `designer.components.card.*`, ..., `designer.table.*`, `designer.editor.*`, `designer.cli.*`.
- [ ] `packages/designer-i18n/src/scripts/extract.ts` — AST 기반 정적 추출기. 모든 `packages/designer-*/**/*.{ts,tsx}`에서 `t('...')` 호출을 수집.
- [ ] `packages/designer-i18n/src/scripts/diff.ts` — 추출된 키 집합 vs `ko.json` 차집합. 누락 > 0 시 exit 1.
- [ ] CI: `.github/workflows/ci.yml`의 `build` 잡 이전 단계에 `i18n:check` 잡 추가 → 누락 시 **빌드 실패** (TRD §10 NFR, AC #10).
- [ ] form-js 기본 검증 메시지의 ko 번들 동봉 (TRD §4.4).

### 3.6 designer-cli (AC #3, #9)

TRD §6.3 그대로.

- [ ] `packages/designer-cli/src/commands/validate.ts`
  - Ajv 스키마 검증 (form-js schemaVersion=19 + 신규 컴포넌트 type 등록 체크)
  - 누락 i18n 키 검사 (§3.5 diff 로직 재사용)
  - 반환: exit 0/1
- [ ] `packages/designer-cli/src/commands/import.ts`
  - AI 산출 JSON → `schemas/drafts/`로 이동 (경로 정규화, 중복 방지)
  - 옵션: `--to <project-path>`
- [ ] `packages/designer-cli/src/commands/publish.ts`
  - `--target static`: 지정 디렉토리에 복사, 해시 산출 → `manifest.json`
  - `--target api --url URL`: `PUT /api/schemas/{id}` (ETag 헤더 포함, TRD §6.2)
- [ ] `packages/designer-cli/bin/designer-cli.mjs` (shebang 엔트리)
- [ ] 단위 테스트: Vitest + tmp fixture (`vitest`/`node:fs`)
- [ ] E2E: `cli.roundtrip.spec.ts` — `validate → import → publish(static)` → viewer render → 픽셀 비교

### 3.7 AI Skill (AC #2)

TRD §6.4 그대로.

- [ ] `.claude/skills/designer/SKILL.md`
  - 입력: 자연어 화면 의도
  - 출력: `schemas/drafts/*.schema.json` 단일 파일
  - 컴포넌트 스펙 참조 경로: `packages/designer-*/src/*/spec.json` (Read 도구 사용)
- [ ] `.claude/commands/design-page.md` — 새 페이지 생성
- [ ] `.claude/commands/design-add.md` — 기존 스키마에 컴포넌트 추가
- [ ] `.claude/commands/design-modify.md` — 부분 수정
- [ ] `.claude/commands/design-validate.md` — `designer-cli validate` 호출
- [ ] `schemas/drafts/.gitkeep` + README (컨벤션 명시)
- [ ] 수락 테스트: 각 command를 `claude-code --skill designer` 형태로 호출해 결정적 JSON 산출 → Ajv 검증 통과 (AC #2)

### 3.8 JSON 배포 채널 (AC #3, #4, #9)

TRD §6.2. 정적·API **양쪽 모두** Phase 1 필수 (PRD Q5 확정).

- [ ] **정적 채널**
  - Host 앱 예시: `import schema from './page.schema.json'` 직접 import
  - `designer-cli publish --target static`이 해시 기반 manifest 생성
- [ ] **API 채널**
  - 레퍼런스 어댑터: `packages/designer-runtime/src/transport/ApiSchemaLoader.ts`
    - `GET /api/schemas/{id}?env=...` (ETag 클라이언트 캐시)
    - 실패 시 `localStorage` 마지막 정상 스키마로 fallback + `onError` 콜백
  - 운영 부팅 시 Ajv 검증 (TRD §9)
- [ ] E2E: `roundtrip.static.spec.ts`, `roundtrip.api.spec.ts` — 동일 schema → 양쪽 채널 → viewer 렌더 결과 픽셀 diff = 0
- [ ] 보안 가드 (TRD §9): 부팅 검증 실패 → 차단 + fallback + 알림 이벤트

### 3.9 워터마크 4중 가드 (AC #6)

TRD §8의 4가드를 구체 파일/테스트/CI 단계로 고정.

| 가드 | 파일 | CI 단계 |
|---|---|---|
| **파일 무결성** | `scripts/ci/watermark-hash.mjs`가 `packages/form-js-viewer/src/render/components/PoweredBy.js` sha256을 `.watermark-hash` 기준값과 비교 | `lint:watermark-hash` (build 이전) |
| **DOM 가시성 E2E** | `packages/designer-core/e2e/watermark-visibility.spec.ts` (spike Test 5 계승). `.fjs-powered-by` visible + opacity>0.1 + 크기>0 + 오버레이에 완전 가려지지 않음 | `test:e2e` (모든 PR) |
| **CSS 룰 검사** | `scripts/ci/watermark-scss-lint.mjs` — 모든 `packages/**/*.scss`에서 `.fjs-powered-by`와 `display:none|visibility:hidden|opacity:0` 동시 매칭 금지 | `lint:watermark-scss` |
| **런타임 가드** | `packages/designer-runtime/src/watermark/WatermarkMonitor.ts` — MutationObserver로 PoweredBy 제거/숨김 감지 시 `console.warn` + `window.dispatchEvent('designer:watermark-violation')` | 앱 부트스트랩에서 자동 기동 |

E2E 회귀 매트릭스: 1024/1440/1920 뷰포트 × viewer/editor 2개 호스트 = 6 케이스 모두 통과 의무.

---

## 4. Acceptance Criteria 자동 테스트 매트릭스

| AC# | 테스트 유형 | 테스트 파일 | 예상 케이스 수 |
|---|---|---|---|
| 1 | E2E (Playwright) | `packages/designer-editor-host/e2e/editor.dragdrop.spec.ts` | 6 컴포넌트 × dragdrop = 6 |
| 2 | Integration (CLI + Ajv) | `packages/designer-cli/e2e/ai-skill.spec.ts` | 4 commands × 2 시나리오 = 8 |
| 3 | E2E | `packages/designer-cli/e2e/cli.roundtrip.spec.ts` | save + load + validate = 3 |
| 4 | E2E (round-trip) | `packages/designer-runtime/e2e/roundtrip.{static,api}.spec.ts` | 6 컴포넌트 × 2 채널 = 12 |
| 4-1 | E2E (픽셀 파리티) | `packages/designer-*/e2e/*.parity.spec.ts` + `*.golden.spec.ts` | 6 컴포넌트 × 3 뷰포트 × 2 gate = 36 |
| 5 | Unit + CI gate | `packages/designer-i18n/__tests__/coverage.test.ts` | ko 사전 coverage 100% = 1 (hard gate) |
| 6 | E2E + 4종 CI lint | §3.9 4가드 | 6 (6 viewport/host combo) + 3 CI 단계 = 9 |
| 7 | Integration (Vitest + happy-dom) | `packages/designer-core/__tests__/propsSchemaToPanel.test.tsx` | 위젯 8종 × {render, edit, validate} = 24 |
| 8 | E2E | `packages/designer-table/e2e/table.*.spec.ts` | editing(5) + filter(3) + multiheader(3) + reorder(2) = 13 |
| 9 | E2E | `packages/designer-runtime/e2e/deploy.static.spec.ts` + `deploy.api.spec.ts` | static(3) + api(4, ETag/fallback 포함) = 7 |
| 10 | Build-time CI gate | `packages/designer-i18n/src/scripts/diff.ts` | 1 (exit code 0 요구) |

**총계**: ~120 자동 케이스 + 4 CI lint 게이트. 모두 PR 머지 게이트.

---

## 5. 타임라인

TRD §12는 Phase 1을 **4~6주**로 명시. 현실적 판단: Q1/Q2 spike 1주 + 보강 PR 1주 + 실제 구현 5주 = **총 7주 권고**. 6주는 공격적, 8주는 보수적.

### 7주 타임라인 (권고)

```
Week 1  [게이트]  ├─ ADR 보강 PR (§1.1)  ─┐
                  └─ Q1/Q2 spike 병렬 (§2) ┘
Week 2  [게이트 완]├─ TRD §3 갱신 PR
                  └─ designer-core 확장 (§3.1) OverlayLayer/Panel 이관
Week 3  [병렬 A]  ├─ designer-components Card/Stack/Button 3개 (§3.2)
        [병렬 B]  ├─ designer-i18n 골격 + 추출기 (§3.5)
        [병렬 C]  └─ designer-editor-host 골격 (§3.4)
Week 4  [병렬 A]  ├─ designer-components Tabs/Modal 2개 (§3.2)
        [병렬 B]  ├─ designer-table 편집+필터 (§3.3 1/2)
        [병렬 C]  └─ PropsPanel + LivePreview (§3.4)
Week 5  [병렬 A]  ├─ designer-table 멀티헤더+컬럼이동+가상화 (§3.3 2/2)
        [병렬 B]  ├─ designer-cli 3 commands (§3.6)
        [병렬 C]  └─ JSON 배포 채널 (§3.8)
Week 6  [병렬 A]  ├─ AI Skill + Slash Commands (§3.7)
        [병렬 B]  ├─ 워터마크 4중 가드 (§3.9)
        [병렬 C]  └─ i18n ko 사전 100% + 검증 메시지
Week 7  [수렴]    ├─ AC 매트릭스 자동 테스트 전수 통과
                  ├─ 퍼포먼스·접근성 게이트 (axe, FPS)
                  └─ RC1 태깅 + THIRD_PARTY_LICENSES 생성
```

**병렬 스트림**: A(Components/Table) / B(Platform: i18n/CLI/Watermark) / C(Editor/Runtime). 각 스트림 1명 구현자 + architect/reviewer 1명.

### 6주 공격 시나리오

Week 1의 ADR 보강을 Phase 0 직후 즉시(1~2일) 처리하고 Q1/Q2 spike와 병렬화. Week 7 수렴을 제거. **리스크**: 이슈 1/2/3 중 하나가 구현 중 재발하면 즉시 임계경로.

### 8주 보수 시나리오

Week 8을 버퍼로 확보. Table 퍼포먼스 튜닝 + AI Skill 품질 향상에 사용. 외부 종속성 지연 흡수.

---

## 6. 리스크와 완화

| # | 리스크 | 완화 |
|---|---|---|
| R1 | WYSIWYG 파리티 blind spot (이슈 2 재발 — 양쪽이 똑같이 깨져도 diff=0) | §1.1 이슈 2 반영: 골든 이미지 + computed-style 보조 게이트 병행 필수 |
| R2 | OverlayLayer 원점 불일치 재발 (이슈 3) | §1.1 이슈 3 반영: 1024/1440/1920 뷰포트 매트릭스 + D3 불변식 계약 테스트 |
| R3 | Preact/React 버전 공존 — `preact/compat` alias 충돌 (Radix UI는 React 기반) | 모노레포 root에 `resolutions`/`overrides` 고정 + `pnpm why preact` 내지 `npm ls preact` CI 체크로 duplicate 탐지. Vitest/Playwright 둘 다 단일 Preact 인스턴스 사용 확인. |
| R4 | form-js 본체 수정 유혹 (Properties Provider 확장 포인트 한계) | 본체 수정 PR 불가 정책 강제. 확장 포인트 부족 시 호스트 앱 레벨에서 wrap, 그래도 불가능하면 **§7 Out of Scope**로 반영 후 재평가. |
| R5 | ko 사전 누락 키를 로컬에서만 추가해 PR 게이트를 우회 (추출기 false negative) | 추출기 정확도 테스트: fixture 5개 (정상/템플릿 리터럴/동적 키/문자열 연결/주석 내 키) + 의도적 누락 fixture로 diff 스크립트 회귀 테스트 |
| R6 | Ajv 스키마 버전 drift (form-js schemaVersion=19와 신규 컴포넌트 스키마 불일치) | `form-json-schema` 패키지를 통해 단일 스키마 소스 유지. CI에서 `validate` 명령으로 examples 전수 검증 |
| R7 | AI Skill이 비결정적 JSON 산출 → AC #2 자동 테스트 flaky | 프롬프트 템플릿에 "structural" 출력 강제 + `designer-cli validate` 통과만 수락. "의미적 동치" 검증은 Phase 1 외로 미룸 |
| R8 | Table 10000행 60fps 달성 실패 (Q2 선택 라이브러리에 따라) | Q2 spike에서 실측 확정. 불충족 시 즉시 Glide Data Grid(Canvas)로 전환 ADR-0003에 명시 |
| R9 | 워터마크 MutationObserver가 E2E에서 false positive (테스트 환경 DOM 변형) | MutationObserver는 `NODE_ENV=production` 전용. dev/test에서는 비활성화 |

---

## 7. 팀 운영 방식

프로젝트 convention에 따라:

### 7.1 Agent 기반 병렬화

- **architect**: 각 Week 시작 시 해당 스트림의 파일 단위 체크리스트를 리뷰, 인터페이스 확정
- **implementer A/B/C**: §5 타임라인의 3개 병렬 스트림 담당 (subagent 병렬 호출)
- **e2e-runner**: 주간 RC에서 AC 매트릭스 전수 실행, 실패 시 구현자에 회귀 티켓
- **reviewer**: PR 리뷰 전담. ADR 위반·i18n 누락·라이선스 위반을 1차 차단

### 7.2 TDD 강제

- Vitest 테스트 파일을 **먼저 작성**하고 실패 확인 → 구현 → 통과 순서 엄수
- 모든 신규 컴포넌트는 `defineComponent` 단위 테스트가 최초 커밋에 포함돼야 함 (PR 템플릿 checklist)

### 7.3 브랜치 전략

- `main`: 릴리스 기준선. 직접 푸시 금지
- `develop`: 통합 브랜치 (현재 HEAD)
- `feature/<scope>/<ticket>`: 스트림별 (`feature/components/card`, `feature/table/editing` 등)
- 각 PR은 **한 AC 이하**를 다룬다 (리뷰 가능 크기)

### 7.4 불변 제약 (PRD §0 / TRD §0)

- form-js 본체 수정 **0건**
- Preact 단일 스택 (React 라이브러리는 `preact/compat` alias)
- 모든 신규 의존성: MIT/Apache-2.0/ISC/BSD/MPL-2.0/0BSD (CI license-gate로 강제)
- 한국어 1차 (ko.json 100% 커버)
- 모든 가시 문자열 `t('key.path')`
- AI 진입점은 Claude Code CLI only (디자이너 내장 AI 패널 없음)

### 7.5 문서화

- 모든 컴포넌트: `spec.json` (AI용) + `README.md` (사람용)
- 각 패키지: `CHANGELOG.md` (keep-a-changelog 포맷)
- ADR 신규 추가 시 `docs/adr/000N-*.md` + TRD 본문에서 참조

---

## 8. 결정 사항 (2026-04-17 확정, 추후 변경 시 본 섹션 및 관련 문서 동시 갱신)

초안 작성 시 미결이었던 7개 질문은 planner 디폴트를 그대로 수용한다. 변경 필요 시 ADR 또는 본 계획의 revision PR로 갱신한다.

| # | 결정 | 근거 |
|---|---|---|
| D-P1-1 | **`designer-editor-host`를 신규 패키지**로 추가 (기존 `form-js-playground` 재사용 X) | TRD §7.3 "호스트 앱에서 합성" 원칙 + form-js 본체 수정 0건 제약 |
| D-P1-2 | API 채널은 **클라이언트 어댑터만** Phase 1에 포함. 레퍼런스 서버는 Playwright mock으로 대체 | 운영 서버 구현은 도메인마다 상이 — 라이브러리 범위 밖 |
| D-P1-3 | **7주 타임라인** 수용 (Week 1=게이트, Week 2~6=구현, Week 7=수렴) | Q1·Q2 spike 1주 + 구현 5주 + 수렴 1주의 현실적 분배 |
| D-P1-4 | Q1/Q2 spike 완료 전 §3.2 (컴포넌트 구현) **착수 금지**. Week 1 마지막 날 결정 확정 후 Week 2부터 §3.1/§3.2 병렬 | Radix 기각 시 재작성 비용이 큼 |
| D-P1-5 | AI Skill 산출 JSON의 수락 기준은 **`designer-cli validate` 통과만**. 의미적 동치는 Phase 1 밖 | R7 완화 + AC #2 테스트 flaky 방지 |
| D-P1-6 | 워터마크 해시 업데이트는 **수동 + ADR 기록** (자동 갱신 금지) | 라이선스 의무이므로 모든 변경은 의도적 결정으로 추적 |
| D-P1-7 | axe-core CI 게이트는 **critical + serious 모두 실패 처리** | WCAG 2.2 AA 준수 — TRD §10 NFR |
