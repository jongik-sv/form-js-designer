# TSK-04-02: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-components/src/tabs/Tabs.tsx` | Radix Tabs 래퍼 (defineComponent 계약, orientation, validate/fallback) | 신규 |
| `packages/designer-components/src/tabs/Tabs.css` | `@layer components` Tabs 전역 CSS (ADR-0001 D4) | 신규 |
| `packages/designer-components/src/tabs/propsSchema.ts` | tabs/defaultValue/orientation propsSchema + TabsSchema 인터페이스 | 신규 |
| `packages/designer-components/src/tabs/spec.json` | AI Read용 컴포넌트 요약 | 신규 |
| `packages/designer-components/src/modal/Modal.tsx` | Radix Dialog 래퍼 (defineComponent, portalContainerRef, title 필수 검증, aria-modal) | 신규 |
| `packages/designer-components/src/modal/Modal.css` | `@layer components` Modal 전역 CSS (overlay/content/trigger, 3 size 변형) | 신규 |
| `packages/designer-components/src/modal/propsSchema.ts` | title(i18n)/description/triggerLabel/size/portalContainerRef propsSchema | 신규 |
| `packages/designer-components/src/modal/spec.json` | AI Read용 컴포넌트 요약 | 신규 |
| `packages/designer-components/src/__tests__/Tabs.test.tsx` | Tabs 단위 테스트 27개 (defineComponent 계약, 렌더, 엣지 케이스, propsSchema, spec.json) | 신규 |
| `packages/designer-components/src/__tests__/Modal.test.tsx` | Modal 단위 테스트 31개 (defineComponent 계약, open 상태, 에러 케이스, propsSchema) | 신규 |
| `packages/designer-components/src/__tests__/tabs.computed-style.test.tsx` | Tabs orientation computed-style 단위 테스트 4개 | 신규 |
| `packages/designer-components/src/__tests__/modal.computed-style.test.tsx` | Modal size computed-style 단위 테스트 5개 | 신규 |
| `packages/designer-components/src/index.ts` | TabsComponent/ModalComponent + 타입/propsSchema export 추가 | 수정 |
| `packages/designer-components/src/module.ts` | COMPONENTS 배열에 TabsComponent/ModalComponent 추가 (5종) | 수정 |
| `packages/designer-components/vitest.config.ts` | server.deps.inline Radix 패키지 목록 + preact/compat 경로 alias 강화 | 수정 |
| `packages/designer-components/package.json` | `@radix-ui/react-dialog@^1.1.0`, `@radix-ui/react-tabs@^1.1.0`, `@axe-core/playwright@^4.11.0` 추가 | 수정 |
| `packages/designer-components/playwright.config.ts` | testMatch에 `*.a11y.spec.ts` 추가 | 수정 |
| `packages/designer-components/test/module.unit.spec.ts` | 3종→5종 등록 검증, Tabs/Modal 등록 import+테스트 추가 | 수정 |
| `packages/designer-components/test/fixtures/tabs.html` | Tabs fixture HTML (viewer/editor 2 루트) | 신규 |
| `packages/designer-components/test/fixtures/tabs-entry.tsx` | Tabs fixture entry point | 신규 |
| `packages/designer-components/test/fixtures/modal.html` | Modal fixture HTML (`<main id="portal-anchor">` 포함, axe region 해소) | 신규 |
| `packages/designer-components/test/fixtures/modal-entry.tsx` | Modal fixture entry point (portalContainerRef: '#portal-anchor') | 신규 |
| `packages/designer-components/test/tabs.parity.spec.ts` | Tabs parity E2E 스펙 | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-components/test/tabs.golden.spec.ts` | Tabs golden E2E 스펙 (기본/disabled/vertical 3컷) | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-components/test/tabs.a11y.spec.ts` | Tabs a11y E2E 스펙 (axe 0 위반 + 키보드 5종) | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-components/test/modal.parity.spec.ts` | Modal 열린 상태 parity E2E 스펙 | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-components/test/modal.golden.spec.ts` | Modal golden E2E 스펙 (sm/md/lg 3컷) | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-components/test/modal.a11y.spec.ts` | Modal a11y E2E 스펙 (axe, Esc/Overlay close, focus trap, focus return) | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-core/src/types.ts` | PropsSchema.type에 `'array'` 추가 (tabs[] 지원) | 수정 |
| `packages/designer-core/src/panel/propsSchema.meta.json` | allowed type enum에 `"array"` 추가 | 수정 |
| `scripts/ci/assert-single-preact.mjs` | R3 CI 게이트: preact 단일 인스턴스 확인 (exit 1 if multiple) | 신규 |
| `package.json` (monorepo root) | `overrides.preact: "10.29.x"` 고정, `lint:single-preact` 스크립트 추가 | 수정 |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 (designer-components) | 99 | 0 | 99 |
| 단위 테스트 (designer-core, 회귀 확인) | 192 | 0 | 192 |

## E2E 테스트 (작성만 — 실행은 dev-test)

| 파일 경로 | 검증 대상 |
|-----------|-----------|
| `test/tabs.parity.spec.ts` | Tabs viewer↔editor 픽셀 diff ≤ 0.1% at 1024/1440/1920 |
| `test/tabs.golden.spec.ts` | Tabs 기본/disabled/vertical 3컷 절대 기준 |
| `test/tabs.a11y.spec.ts` | axe-core 0 위반 + ArrowLeft/Right/Home/End/Tab 키보드 매트릭스 |
| `test/modal.parity.spec.ts` | Modal 열린 상태 viewer↔editor 픽셀 diff ≤ 0.1% at 3 viewport |
| `test/modal.golden.spec.ts` | Modal sm/md/lg 3 size 절대 기준 |
| `test/modal.a11y.spec.ts` | axe-core 0 위반 + Esc close + Overlay click + focus trap + focus return |

## 커버리지 (Dev Config에 coverage 정의 시)
- N/A — library domain (designer-components 패키지 별도 coverage 명령 미정의)

## 비고
- **preact/compat CJS 해소**: Radix UI는 CJS `require('react')`를 사용하여 Vitest 환경에서 `hooks null` 오류가 발생했다. `vitest.config.ts`의 `server.deps.inline` 에 Radix 모든 sub-packages를 추가하여 Vite ESM 변환 후 alias 적용으로 해소.
- **PropsSchema 'array' 타입 추가**: `tabs` 필드가 배열이므로 `types.ts` + `propsSchema.meta.json`에 `'array'` 타입 추가. designer-core 기존 192개 테스트 회귀 없음.
- **aria-modal 명시적 설정**: Radix Dialog Content가 `aria-modal="true"` 속성을 자동 추가하지 않아 QA 체크리스트 요구 충족을 위해 명시적으로 설정.
- **vitest.config.ts react alias 경로 변경**: 문자열 alias `react: 'preact/compat'`가 CJS 컨텍스트에서 실제 파일 경로로 resolve되지 않는 케이스가 있어 절대 경로 `.module.js`로 변경.
- **tabs.golden/modal-sm/modal-lg fixture**: `tabs-disabled.html`, `tabs-vertical.html`, `modal-sm.html`, `modal-lg.html` fixture는 dev-test 단계 실행 전 생성이 필요하다 (현재 `modal.html`/`tabs.html` 기본 fixture만 존재). 추가 fixture 파일 목록을 dev-test 노트에 포함.
