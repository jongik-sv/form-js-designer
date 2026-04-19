# TSK-03-02: 테스트 결과 (재실행)

## 결과: PASS

## 실행 요약

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 (designer-core) | 196 | 0 | 196 |
| E2E 테스트 | N/A | N/A | N/A (범위 외) |

## 정적 검증

| 구분 | 결과 | 비고 |
|------|------|------|
| typecheck (`tsc --noEmit`) | pass | 에러 없음 |
| lint (`npm run lint`) | pass | `[no-css-modules] OK — 0 violations`, single-preact OK |

## QA 체크리스트 판정

| # | 항목 | 결과 | 사유 |
|---|------|------|------|
| 1 | `widgets.test.tsx` 에서 정확히 **24 케이스** + 케이스 수 assert | **PASS** | 24 matrix + 1 count-sanity assert (`runTestCount === 24`). 엣지 케이스는 `widgets-edge-cases.test.tsx` 로 분리 |
| 2 | `propsSchemaToPanel` 2 PanelEntry 반환 + widgetType 매칭 | PASS | `propsSchemaToPanel.test.tsx` "(정상) 2 properties → 2 PanelEntry items" 통과 |
| 3 | `createDefaultRegistry().list()` 8개 | PASS | `PanelWidgetRegistry.test.ts` 통과 (10/10) |
| 4 | 각 위젯 `render` 결과 JSX element | PASS | 24-케이스 매트릭스 render 경로 통과 |
| 5 | 각 위젯 `edit` onChange 호출 | PASS | 매트릭스 edit 경로 + StringWidget/BooleanWidget 엣지 케이스 |
| 6 | 각 위젯 `validate` 정상/비정상 | PASS | 매트릭스 validate 경로 |
| 7 | `propsSchemaToPanel({})` → `[]` 반환 | PASS | `propsSchemaToPanel.test.tsx` "(정상) empty properties → empty array" 통과 |
| 8 | `EnumWidget` 빈 배열 처리 | PASS | `widgets-edge-cases.test.tsx` |
| 9 | `NumberWidget` min/max 경계 | PASS | `widgets-edge-cases.test.tsx` (min=-1 fail, 10 pass, 5 pass) |
| 10 | `SpacingWidget` 객체 vs 스칼라 | PASS | `widgets-edge-cases.test.tsx` |
| 11 | `I18nWidget` key 패턴 검증 | PASS | `widgets-edge-cases.test.tsx` |
| 12 | `UnknownWidgetError` throw | PASS | `propsSchemaToPanel.test.tsx` "(에러) unknown type → UnknownWidgetError" |
| 13 | `DuplicateWidgetError` throw | PASS | `PanelWidgetRegistry.test.ts` |
| 14 | `validatePropsSchema` Ajv 검증 | PASS | `validatePropsSchema.test.ts` (6/6) |
| 15 | `defineComponent` dev console.warn (invalid propsSchema) | **PASS** | 신규 테스트 `defineComponent.test.tsx` "emits console.warn on invalid propsSchema" — no throw + warn 발생 확인 |
| 16 | 타입 import 통과 | PASS | typecheck 통과 |
| 17 | `./panel` subpath export | **PASS** | 신규 smoke `defineComponent-chain.smoke.test.tsx` (PanelWidget/PanelEntry/PanelWidgetCtx/WidgetMeta 타입 import 확인) + package.json `exports["./panel"]` 지정 |
| 18 | `defineComponent` + `propsSchemaToPanel` 연쇄 smoke | **PASS** | 신규 smoke `defineComponent-chain.smoke.test.tsx` (card-like def → propsSchemaToPanel → 2 PanelEntry 생성 확인) |
| 19 | 회귀: TSK-03-01 테스트 | PASS | OverlayLayer (12/12), assertSharedOrigin (8/8) 통과 |

## 변경 내역 (재시도 시 적용)

### 신규 파일
- `packages/designer-core/src/panel/__tests__/widgets-edge-cases.test.tsx` — 13 엣지 케이스 이관
- `packages/designer-core/src/panel/__tests__/defineComponent-chain.smoke.test.tsx` — QA #17/#18 smoke

### 수정 파일
- `packages/designer-core/src/panel/__tests__/widgets.test.tsx` — 24-매트릭스만 유지 + `runTestCount === 24` 런타임 카운트 assert. 엣지 섹션 제거
- `packages/designer-core/src/__tests__/defineComponent.test.tsx` — QA #15 (invalid propsSchema → warn, no throw) 테스트 1건 추가

### 환경 조치
- `npm install` — `package.json` 의 `ajv@^8` dependency 가 node_modules 에 미설치 상태였음. 설치 후 `validatePropsSchema.test.ts` 및 `defineComponent.test.tsx` 의 Ajv 경로 resolve 정상화.

## 파일별 테스트 수

| 파일 | 케이스 |
|------|--------|
| `src/__tests__/assertPureRender.test.ts` | 10 |
| `src/__tests__/defineComponent.test.tsx` | 10 (+1 신규) |
| `src/host/__tests__/EditorHost.test.tsx` | 12 |
| `src/host/__tests__/ViewerHost.test.tsx` | 14 |
| `src/host/__tests__/useViewportWidth.test.tsx` | 4 |
| `src/overlay/__tests__/OverlayLayer.test.tsx` | 12 |
| `src/panel/__tests__/PanelWidgetRegistry.test.ts` | 10 |
| `src/panel/__tests__/propsSchemaToPanel.test.tsx` | 9 |
| `src/panel/__tests__/validatePropsSchema.test.ts` | 6 |
| `src/panel/__tests__/widgets.test.tsx` | **25** (24 매트릭스 + 1 count-sanity) |
| `src/panel/__tests__/widgets-edge-cases.test.tsx` | **13** (신규 이관) |
| `src/panel/__tests__/defineComponent-chain.smoke.test.tsx` | **2** (신규) |
| `src/testing/__tests__/browserEnvContract.test.ts` | 14 |
| `spike/wysiwyg/src/card/__tests__/Card.test.tsx` | 27 |
| **합계** | **196** |

## 재시도 이력

1. **1차 실행 (2026-04-17 13:19Z)** — FAIL
   - widgets.test.tsx 37 케이스 (AC #7 "정확히 24" 미충족)
   - 케이스 수 assert 부재
   - UNVERIFIED: #15, #17, #18

2. **2차 실행 (2026-04-17 16:03Z, 본 리포트)** — PASS
   - widgets.test.tsx 25 (24 매트릭스 + 1 sanity)
   - 엣지 13 → widgets-edge-cases.test.tsx 로 이관
   - 신규: defineComponent QA #15, smoke QA #17/#18
   - ajv dependency 미설치 이슈 `npm install` 로 해소
