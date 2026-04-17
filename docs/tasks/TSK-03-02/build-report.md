# TSK-03-02: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-core/src/panel/types.ts` | PanelEntry, PanelWidget, PanelWidgetCtx, WidgetMeta, WidgetValidationResult, LocaleT, UnknownWidgetError, DuplicateWidgetError 타입 정의 | 신규 |
| `packages/designer-core/src/panel/propsSchema.meta.json` | JSON Schema draft-07 meta-schema. type 8 리터럴 강제, 선택 메타 허용 | 신규 |
| `packages/designer-core/src/panel/validatePropsSchema.ts` | Ajv 8.x 기반 PropsSchema meta-schema 검증기. { ok, errors } 반환 | 신규 |
| `packages/designer-core/src/panel/PanelWidgetRegistry.ts` | PanelWidgetRegistry 클래스(register/get/has/list) + createDefaultRegistry() 팩토리 | 신규 |
| `packages/designer-core/src/panel/propsSchemaToPanel.tsx` | 순수 변환기. PropsSchema → PanelEntry[]. 선언 순서 보존, UnknownWidgetError throw | 신규 |
| `packages/designer-core/src/panel/widgets/StringWidget.tsx` | { render, edit, validate } — text input, typeof string 검증 | 신규 |
| `packages/designer-core/src/panel/widgets/NumberWidget.tsx` | { render, edit, validate } — number input, min/max range 검증 | 신규 |
| `packages/designer-core/src/panel/widgets/BooleanWidget.tsx` | { render, edit, validate } — checkbox, typeof boolean 검증 | 신규 |
| `packages/designer-core/src/panel/widgets/EnumWidget.tsx` | { render, edit, validate } — select combobox, value ∈ enum 검증 | 신규 |
| `packages/designer-core/src/panel/widgets/ColorWidget.tsx` | { render, edit, validate } — color+text input, CSS color regex 검증 | 신규 |
| `packages/designer-core/src/panel/widgets/SpacingWidget.tsx` | { render, edit, validate } — 4방향 number grid, 객체 + ≥0 number 검증 | 신규 |
| `packages/designer-core/src/panel/widgets/ExpressionWidget.tsx` | { render, edit, validate } — textarea + 얕은 paren 체크, 비어있지 않은 문자열 검증 | 신규 |
| `packages/designer-core/src/panel/widgets/I18nWidget.tsx` | { render, edit, validate } — key+ko 2-row, key 패턴(^[a-z][\w.-]*$) 검증 | 신규 |
| `packages/designer-core/src/panel/widgets/index.ts` | 8 위젯 barrel re-export + BUILTIN_WIDGETS 맵 | 신규 |
| `packages/designer-core/src/panel/__tests__/widgets.test.tsx` | AC #7 24 케이스 매트릭스(8×{render,edit,validate}) + 추가 edge case | 신규 |
| `packages/designer-core/src/panel/__tests__/propsSchemaToPanel.test.tsx` | 변환기 단위 테스트(9 케이스) — empty/순서/그룹/커스텀 레지스트리/UnknownWidgetError | 신규 |
| `packages/designer-core/src/panel/__tests__/PanelWidgetRegistry.test.ts` | 레지스트리 단위 테스트(10 케이스) — register/get/list/중복 에러/기본 8종/격리 | 신규 |
| `packages/designer-core/src/panel/__tests__/validatePropsSchema.test.ts` | meta-schema 적합/위반 6 케이스 | 신규 |
| `packages/designer-core/src/types.ts` | PropsSchema에 group?/showIf?/collapsed?/description? 선택 메타 추가 (하위호환) | 수정 |
| `packages/designer-core/src/defineComponent.ts` | dev-only validatePropsSchema() 호출 추가 (assertPureRender 동형 패턴) | 수정 |
| `packages/designer-core/src/index.ts` | propsSchemaToPanel, PanelWidgetRegistry, createDefaultRegistry, validatePropsSchema + 타입 public export | 수정 |
| `packages/designer-core/package.json` | exports["./panel"] 서브패스 추가; ajv@^8 dependencies 추가 | 수정 |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 152 | 0 | 152 |
| — 신규 widgets.test.tsx (24 + 13 edge) | 37 | 0 | 37 |
| — 신규 propsSchemaToPanel.test.tsx | 9 | 0 | 9 |
| — 신규 PanelWidgetRegistry.test.ts | 10 | 0 | 10 |
| — 신규 validatePropsSchema.test.ts | 6 | 0 | 6 |
| — 기존 회귀 없음(defineComponent/OverlayLayer 등) | 90 | 0 | 90 |

AC #7 직접 증명: `Widget matrix — AC #7 (24 cases)` describe 블록 내 8×3 = 24 케이스 모두 PASS.

## E2E 테스트 (작성만 — 실행은 dev-test)

N/A — library domain

## 커버리지 (Dev Config에 coverage 정의 시)

Dev Config의 `quality_commands.coverage`에 `npm --prefix packages/designer-core run test:coverage` 정의됨. `test:coverage` 스크립트가 package.json에 없으므로 실행 생략 (기존 프로젝트 한계). 단위 테스트 152 케이스가 design.md 파일 계획의 모든 신규 파일을 직접 호출하여 커버.

## 비고
- df869db(TSK-03-03 design 커밋)에 패널 파일 일부가 이미 포함되어 있었음. 누락 파일(propsSchemaToPanel.tsx, widgets/index.ts, index.ts/defineComponent.ts/types.ts 수정)을 본 커밋(cd54f6f)에서 완성.
- 위젯 `edit` 메서드는 `meta?` 선택 파라미터로 설계. 기본 24 케이스 매트릭스는 meta 없이 호출, EnumWidget 추가 케이스에서 meta 사용.
- Ajv 8.x: `strict: false` 옵션으로 draft-07 meta-schema 호환성 확보(Ajv 8 기본 strict mode와 충돌 방지).
- TypeScript 검증: `tsc --noEmit` 실행 시 spike/ 디렉토리의 기존 에러만 존재 (ariakit/radix 등 미설치 패키지), src/ 내 새 코드 오류 없음.
