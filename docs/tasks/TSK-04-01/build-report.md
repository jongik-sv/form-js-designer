# TSK-04-01: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-components/package.json` | 패키지 선언 (deps: CVA, tailwind-merge, Preact 등) | 신규 |
| `packages/designer-components/tsconfig.json` | TypeScript 설정 (Preact JSX transform) | 신규 |
| `packages/designer-components/vite.config.ts` | Vite 빌드 + ADR-0002 D6 preact/compat alias + dev 서버 port 5174 | 신규 |
| `packages/designer-components/vitest.config.ts` | Vitest 단위 테스트 설정 | 신규 |
| `packages/designer-components/playwright.config.ts` | E2E 설정 (3 viewport, fixture HTML 서버) | 신규 |
| `packages/designer-components/tailwind.config.ts` | Tailwind CSS 로컬 설정 | 신규 |
| `packages/designer-components/src/index.ts` | public export — DesignerComponentsModule + 3 컴포넌트 re-export | 신규 |
| `packages/designer-components/src/module.ts` | DesignerComponentsModule — form-js additionalModules 규약 등록 객체 | 신규 |
| `packages/designer-components/src/card/index.tsx` | Card defineComponent 선언 (CVA + twMerge) | 신규 |
| `packages/designer-components/src/card/Card.css` | Card 전역 평문 CSS @layer components | 신규 |
| `packages/designer-components/src/card/propsSchema.ts` | Card PropsSchema + CardSchema | 신규 |
| `packages/designer-components/src/card/spec.json` | Card AI 참조용 spec | 신규 |
| `packages/designer-components/src/stack/index.tsx` | Stack defineComponent 선언 | 신규 |
| `packages/designer-components/src/stack/Stack.css` | Stack 전역 평문 CSS @layer components | 신규 |
| `packages/designer-components/src/stack/propsSchema.ts` | Stack PropsSchema + StackSchema | 신규 |
| `packages/designer-components/src/stack/spec.json` | Stack AI 참조용 spec | 신규 |
| `packages/designer-components/src/button/index.tsx` | Button defineComponent 선언 | 신규 |
| `packages/designer-components/src/button/Button.css` | Button 전역 평문 CSS @layer components | 신규 |
| `packages/designer-components/src/button/propsSchema.ts` | Button PropsSchema + ButtonSchema | 신규 |
| `packages/designer-components/src/button/spec.json` | Button AI 참조용 spec | 신규 |
| `packages/designer-components/test/fixtures/card.html` | Card E2E 독립 fixture HTML | 신규 |
| `packages/designer-components/test/fixtures/stack.html` | Stack E2E 독립 fixture HTML | 신규 |
| `packages/designer-components/test/fixtures/button.html` | Button E2E 독립 fixture HTML | 신규 |
| `packages/designer-components/test/fixtures/card-entry.tsx` | Card fixture 진입점 tsx (viewer/editor 두 루트 렌더) | 신규 |
| `packages/designer-components/test/fixtures/stack-entry.tsx` | Stack fixture 진입점 tsx | 신규 |
| `packages/designer-components/test/fixtures/button-entry.tsx` | Button fixture 진입점 tsx | 신규 |
| `packages/designer-components/test/card.parity.spec.ts` | Card parity 3 viewport E2E | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-components/test/card.golden.spec.ts` | Card 골든 스크린샷 E2E | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-components/test/card.computed-style.spec.ts` | Card computed-style 게이트 E2E | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-components/test/stack.parity.spec.ts` | Stack parity 3 viewport E2E | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-components/test/stack.golden.spec.ts` | Stack 골든 스크린샷 E2E | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-components/test/stack.computed-style.spec.ts` | Stack computed-style 게이트 E2E | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-components/test/button.parity.spec.ts` | Button parity 3 viewport E2E | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-components/test/button.golden.spec.ts` | Button 골든 스크린샷 E2E | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-components/test/button.computed-style.spec.ts` | Button computed-style 게이트 E2E | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-components/test/module.unit.spec.ts` | DesignerComponentsModule 단위 테스트 (30개) | 신규 |
| `package.json` | root overrides.preact 단일 인스턴스 고정 (ADR-0002 D1) 추가 | 수정 |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 30 | 0 | 30 |

## E2E 테스트 (작성만 — 실행은 dev-test)

| 파일 경로 | 검증 대상 |
|-----------|-----------|
| `test/card.parity.spec.ts` | Card viewer↔editor 픽셀 diff ≤ 0.1%, 3 viewport |
| `test/card.golden.spec.ts` | Card 골든 스크린샷 baseline 비교 |
| `test/card.computed-style.spec.ts` | Card padding/elevation/display computed style |
| `test/stack.parity.spec.ts` | Stack viewer↔editor 픽셀 diff ≤ 0.1%, 3 viewport |
| `test/stack.golden.spec.ts` | Stack 골든 스크린샷 baseline 비교 |
| `test/stack.computed-style.spec.ts` | Stack flexDirection/gap/alignItems computed style |
| `test/button.parity.spec.ts` | Button viewer↔editor 픽셀 diff ≤ 0.1%, 3 viewport |
| `test/button.golden.spec.ts` | Button 골든 스크린샷 baseline 비교 |
| `test/button.computed-style.spec.ts` | Button backgroundColor/display/data-variant |

## 커버리지

N/A — dev config의 `coverage` 명령이 `packages/designer-core`를 가리키며 `designer-components`는 커버리지 명령 미정의 상태.

## 비고

- `DesignerComponentsModule`의 didi `['type', Fn]` 튜플 패턴을 단위 테스트에서 직접 추출·호출하여 registration 검증. 실제 form-js 컨테이너 통합은 TSK-06-01(editor-host)에서 검증 예정.
- `ButtonComponent`의 `group`은 design.md의 "group: action"과 일치 (`container` 아닌 `action`).
- 기존 `designer-core` 테스트 70개 전체 회귀 없음 확인.
- CSS `.module.css` 금지 lint(`npm run lint:no-css-modules`) 통과 — 2 패키지 0 위반.
