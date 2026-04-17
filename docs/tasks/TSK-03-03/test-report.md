# TSK-03-03: 테스트 결과

## 결과: PASS

## 실행 요약

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 40 | 0 | 40 |
| 정적 검증 | 2 | 0 | 2 |

## 정적 검증 (Dev Config에 정의된 경우만)

| 구분 | 결과 | 비고 |
|------|------|------|
| lint | pass | 0 violations (no-css-modules) |
| typecheck | pass | 0 errors (tsc --noEmit) |

## QA 체크리스트 판정

| # | 항목 | 결과 |
|---|------|------|
| 1 | (정상) `npm --prefix packages/designer-core run test:unit` 실행 → `host/__tests__/` 30 케이스 + `i18n/__tests__/` 10 케이스 + 기존 회귀 = 모두 통과 | pass |
| 2 | (정상) ViewerHost 마운트 시 `new Form({ container })` 1회 호출되고, `form.importSchema(schema, data)` 가 useLayoutEffect 첫 실행에서 호출됨 | pass |
| 3 | (정상) ViewerHost의 `schema` prop이 참조 변경되면 `form.importSchema(newSchema, data)` 가 재호출됨 | pass |
| 4 | (정상) ViewerHost의 `data` prop이 참조 변경되면 `form._update({ data: newData })` 가 호출됨 | pass |
| 5 | (정상) ViewerHost unmount 시 `form.destroy()` 가 정확히 1회 호출됨 | pass |
| 6 | (정상) ViewerHost의 `onChange` 콜백이 form-js `changed` 이벤트 발화 시 호출됨 | pass |
| 7 | (정상) EditorHost 렌더 결과에서 `#fjs-designer-shell > #form-root` 및 `#fjs-designer-shell > #overlay-root` 가 존재 | pass |
| 8 | (정상) EditorHost가 `overlayContainer={shellRef.current}` 를 OverlayLayer에 전달하여 원점 일치 케이스에서 `assertSharedOrigin` 이 throw하지 않음 | pass |
| 9 | (정상) `LocaleProvider` 하위의 `useT()('designer.core.loading')` 가 주입된 t 함수 실행 | pass |
| 10 | (정상) `LocaleProvider` 하위의 `useLocale()` 가 `{ lang: 'ko', t: <주입된 t> }` 를 반환 | pass |
| 11 | (정상) nested `LocaleProvider` 에서 내부 Provider의 t/lang이 외부를 override | pass |
| 12 | (엣지) `schema` 가 `undefined` → ViewerHost는 빈 컨테이너만 렌더 | pass |
| 13 | (엣지) `selectedIds=[]` 일 때 EditorHost는 선택 박스 0개 렌더 | pass |
| 14 | (엣지) `LocaleProvider` 미설치 환경에서 `useT()` 호출 → fallback t 반환, 첫 호출 시 warn 1회 발생 | pass |
| 15 | (엣지) fallback t에 params 전달 → 올바른 치환 수행 | pass |
| 16 | (엣지) `useViewportWidth` 에서 `ref.current === null` 시 observer 생성 없이 cleanup 가능 | pass |
| 17 | (에러) form-js `new Form()` 이 throw 하면 `onError` 콜백이 호출됨 | pass |
| 18 | (에러) EditorHost에서 원점 불일치 → `SharedOriginViolation` throw | pass |
| 19 | (에러) `LocaleProvider` 에 `t`가 function이 아닌 값으로 전달 → dev 경고 + fallback | pass |
| 20 | (통합) `import { ViewerHost, EditorHost, LocaleProvider, ... } from '@form-js-designer/designer-core'` 타입 포함 resolve | pass |
| 21 | (통합) `@form-js-designer/designer-core/host` 서브패스 import 가능 | pass |
| 22 | (통합) `@form-js-designer/designer-core/i18n` 로 LocaleProvider 접근 가능 | pass |
| 23 | (통합) `@form-js-designer/designer-core/host/shellStyles.css` import 시 스타일 적용 | pass |
| 24 | (통합) EditorHost 가 내부 ViewerHost 에 `locale={{ lang, t }}` 전달 → 동일 LocaleProvider 규약 충족 | pass |
| 25 | (통합) TSK-03-02 `propsSchemaToPanel` 결과의 PanelWidget `ctx.t` 슬롯이 `useT()` 반환 타입과 호환 | pass |
| 26 | (회귀) 기존 overlay, panel, defineComponent, assertPureRender, browserEnvContract 테스트 모두 통과 | pass |
| 27 | (회귀) Phase 0 spike 테스트 여전히 통과 | pass |

## 테스트 실행 상세

### 단위 테스트 실행
```
npm --prefix packages/designer-core run test:unit

결과:
 ✓ src/overlay/__tests__/assertSharedOrigin.test.ts (8 tests)
 ✓ src/i18n/__tests__/LocaleProvider.test.tsx (10 tests)
 ✓ src/host/__tests__/EditorHost.test.tsx (12 tests)
 ✓ src/host/__tests__/ViewerHost.test.tsx (14 tests)
 ✓ src/overlay/__tests__/OverlayLayer.test.tsx (12 tests)
 ✓ src/__tests__/defineComponent.test.tsx (9 tests)
 ✓ src/panel/__tests__/widgets.test.tsx (37 tests)
 ✓ spike/wysiwyg/src/card/__tests__/Card.test.tsx (27 tests)
 ✓ src/testing/__tests__/browserEnvContract.test.ts (14 tests)
 ✓ src/host/__tests__/useViewportWidth.test.tsx (4 tests)
 ✓ src/panel/__tests__/PanelWidgetRegistry.test.ts (10 tests)
 ✓ src/panel/__tests__/propsSchemaToPanel.test.tsx (9 tests)
 ✓ src/__tests__/assertPureRender.test.ts (10 tests)
 ✓ src/panel/__tests__/validatePropsSchema.test.ts (6 tests)

Test Files: 15 passed (15)
Tests: 192 passed (192)
```

### 정적 검증

#### lint: `npm run lint`
```
form-js-designer@0.0.0 lint
npm run lint:no-css-modules

form-js-designer@0.0.0 lint:no-css-modules
node scripts/ci/no-css-modules.mjs

[no-css-modules] OK — scanned 1 designer-* package(s), 0 violations.
```
결과: **PASS**

#### typecheck: `npm --prefix packages/designer-core run typecheck`
```
@form-js-designer/designer-core@0.0.0 typecheck
tsc --noEmit
```
결과: **PASS** (0 errors)

## 재시도 이력
첫 실행에 통과

## 비고
- 모든 40개 단위 테스트 통과 (ViewerHost 14, EditorHost 12, LocaleProvider 10, useViewportWidth 4)
- TSK-03-03 구현한 3개 새 모듈의 단위 테스트 모두 QA 체크리스트 항목 검증
- 기존 모듈(overlay, panel, defineComponent 등) 회귀 테스트 확인 — 새 Host/i18n 모듈 추가가 기존 기능을 깨뜨리지 않음
- TypeScript 타입 검증 완료: ViewerHost, EditorHost, LocaleProvider, useT, useLocale, createFallbackT 모두 export되어 있고 타입 포함 resolve 됨
- package.json `exports` 서브패스 검증: `./host` 및 `./i18n` 서브패스 import 지원 확인
- 정적 검증(lint, typecheck) 모두 통과 — 코드 품질 게이트 달성
