# TSK-07-01: t 함수 + LocaleProvider 구현 + ko 골격 - 설계

## 요구사항 확인
- `t(key, params?)` 함수의 **실 구현**을 `packages/designer-i18n`에 제공한다. `LocaleProvider`를 받아 ko.json 사전을 통해 번역하고, 키 미등록 시 key 그대로 반환하며 dev 빌드에서 `console.warn`을 1회 발생시킨다.
- `LocaleProvider`는 TSK-03-03에서 이미 `designer-core`에 계약(Context + 타입)이 완성되어 있다. 본 Task는 해당 계약에 **실 t 함수를 주입**하는 신규 패키지 `packages/designer-i18n`을 구축한다.
- `Intl.NumberFormat` / `Intl.DateTimeFormat` ko-KR 어댑터 및 form-js 기본 검증 메시지의 ko 번들을 `locales/ko.json`에 포함하고, 단위 테스트로 전 항목을 검증한다.

## 타겟 앱
- **경로**: `packages/designer-i18n` (신규 패키지, 모노레포 `packages/` 하위)
- **근거**: TRD §2 패키지 구조 표에 `designer-i18n`이 명시되어 있고(`t()` 함수 + ko 번들 + `Intl` 어댑터), 기존 `designer-core`의 LocaleProvider 계약 분리 결정(TSK-03-03 설계 §결정 2)에 따라 사전·어댑터 구현을 별도 패키지로 위치시킨다.

## 구현 방향
- `packages/designer-i18n/src/t.ts`에 실 `t(key, params?)` 함수를 구현한다. ko.json에 키가 있으면 번역된 문자열을 반환하고, 없으면 key를 그대로 반환하며 dev 빌드에서 `console.warn`으로 누락 키를 알린다. `{{name}}` 형식의 placeholder는 params로 치환한다.
- `packages/designer-i18n/src/createKoT.ts`에서 ko.json을 정적 import해 `t` 함수를 생성하는 팩토리를 제공한다. 이 팩토리가 반환한 `t`를 `<LocaleProvider lang="ko" t={koT}>` 에 주입하면 전체 subtree가 한국어로 번역된다.
- `packages/designer-i18n/locales/ko.json`에는 ① form-js 기본 검증 메시지 11종 (`formjs.validation.*` 네임스페이스) ② designer 공통 UI 키 골격을 포함한다.
- `Intl.NumberFormat` / `Intl.DateTimeFormat` ko-KR 어댑터는 `packages/designer-i18n/src/intl.ts`에 순수 유틸 함수로 제공한다.
- 단위 테스트는 Vitest + happy-dom으로 구성하며, `packages/designer-core`의 `LocaleProvider`, `useT`를 실제로 통합하는 테스트를 포함한다.

## 파일 계획

**경로 기준:** 모든 파일 경로는 **프로젝트 루트 기준**으로 작성한다.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-i18n/package.json` | 패키지 메타. name=`@form-js-designer/designer-i18n`, peerDependencies: `preact ^10.29.x`, `@form-js-designer/designer-core *`. dependencies: 없음(순수 JS). devDependencies: vitest, happy-dom, preact, @testing-library/preact, @preact/preset-vite, typescript. | 신규 |
| `packages/designer-i18n/tsconfig.json` | `designer-table`과 동일 패턴. `"moduleResolution": "bundler"`, `"jsx": "react-jsx"`, `"jsxImportSource": "preact"`. | 신규 |
| `packages/designer-i18n/vitest.config.ts` | `designer-table.vitest.config.ts`와 동일 구조. preact/compat alias, `@form-js-designer/designer-core` alias(`../designer-core/src/index.ts`). environment: `happy-dom`. | 신규 |
| `packages/designer-i18n/src/t.ts` | 핵심 t 함수 팩토리. `createT(dict: Record<string, string>): LocaleT`. dict에서 키 조회 → placeholder 치환(`{{name}}` regex) → 없으면 key 반환 + dev warn. `isProductionEnv` 사용. | 신규 |
| `packages/designer-i18n/src/createKoT.ts` | `createKoT(): LocaleT`. `ko.json`을 정적 import 후 `createT(dict)` 호출. 소비자는 이 함수로 ko 사전 기반 t를 얻는다. | 신규 |
| `packages/designer-i18n/src/intl.ts` | `formatNumber(value: number, opts?: Intl.NumberFormatOptions): string` — `new Intl.NumberFormat('ko-KR', opts).format(value)`. `formatDate(value: Date \| string, opts?: Intl.DateTimeFormatOptions): string` — `new Intl.DateTimeFormat('ko-KR', opts).format(new Date(value))`. `formatDateTime(value: Date \| string, opts?): string` — date + time 옵션 기본 포함. | 신규 |
| `packages/designer-i18n/src/index.ts` | public API barrel. `createKoT`, `createT`, `formatNumber`, `formatDate`, `formatDateTime` re-export. 타입: `LocaleT`는 `@form-js-designer/designer-core`에서 re-export. | 신규 |
| `packages/designer-i18n/locales/ko.json` | ko 번역 사전. `formjs.validation.*` 네임스페이스: 11종 검증 메시지. `designer.*` 네임스페이스: 공통 UI 키 골격(20~30 키). 상세 키 목록은 §주요 구조 참조. | 신규 |
| `packages/designer-i18n/src/__tests__/t.test.ts` | `createT` 단위 테스트. 키 존재 시 번역 반환, 키 미존재 시 key 반환 + warn 1회, placeholder 치환, params 없음, dev/prod 환경 분기. | 신규 |
| `packages/designer-i18n/src/__tests__/createKoT.test.ts` | `createKoT()` 통합 테스트. ko.json 키 실제 조회, `LocaleProvider`에 주입 후 `useT()` 반환값 검증. | 신규 |
| `packages/designer-i18n/src/__tests__/intl.test.ts` | `formatNumber`, `formatDate`, `formatDateTime` 단위 테스트. ko-KR 형식 검증(쉼표 천단위, 년월일 순서). | 신규 |
| `packages/designer-i18n/src/__tests__/integration.test.tsx` | `LocaleProvider` + `useT` + ko.json 통합 케이스. Preact 컴포넌트에서 `useT()`로 실 ko 번역 문자열이 render되는지 검증. | 신규 |

## 진입점 (Entry Points)
N/A (domain=library, UI 없음)

## 주요 구조

- **`createT(dict)` (`src/t.ts`)**
  - 시그니처: `(dict: Record<string, string>) => LocaleT`
  - 반환된 `t(key, params?)`:
    1. `dict[key]` 존재 → placeholder 치환 후 반환
    2. 미존재 → dev 빌드(`!isProductionEnv()`)에서 `console.warn('[designer-i18n] missing key: ' + key)` + `key` 반환
  - placeholder 치환: `/\{\{(\w+)\}\}/g` regex, `params[p1] ?? '{{p1}}'`
  - `LocaleT` 타입은 `@form-js-designer/designer-core`의 `localeTypes.ts`에서 import

- **`createKoT()` (`src/createKoT.ts`)**
  - `import koDict from '../locales/ko.json'` (정적 import, Vite/Rollup JSON plugin 활용)
  - `return createT(koDict)`
  - 소비처: 호스트 앱이 `const t = createKoT(); <LocaleProvider lang="ko" t={t}>`로 주입

- **`locales/ko.json` — 번역 사전 키 목록**

  form-js 기본 검증 메시지 (`formjs.validation.*`):
  ```json
  {
    "formjs.validation.required":            "필수 입력 항목입니다.",
    "formjs.validation.minValue":            "최솟값은 {{min}}입니다.",
    "formjs.validation.maxValue":            "최댓값은 {{max}}입니다.",
    "formjs.validation.minLength":           "최소 {{minLength}}자 이상 입력하세요.",
    "formjs.validation.maxLength":           "최대 {{maxLength}}자까지 입력 가능합니다.",
    "formjs.validation.pattern":             "입력값이 패턴 {{pattern}}과(와) 일치하지 않습니다.",
    "formjs.validation.email":               "올바른 이메일 주소를 입력하세요.",
    "formjs.validation.phone":               "올바른 국제 전화번호를 입력하세요. (예: +821012345678)",
    "formjs.validation.notANumber":          "숫자를 입력하세요.",
    "formjs.validation.integerOrDecimal":    "정수 또는 소수점 {{decimalDigits}}자리 이하 숫자를 입력하세요.",
    "formjs.validation.stepValue":           "유효한 값을 선택하세요. 가장 가까운 유효 값은 {{prev}}와(과) {{next}}입니다.",
    "formjs.validation.documentReference":   "문서 참조가 정의되지 않았습니다.",
    "formjs.validation.minInvalidNumber":    "최솟값이 유효한 숫자가 아닙니다.",
    "formjs.validation.maxInvalidNumber":    "최댓값이 유효한 숫자가 아닙니다."
  }
  ```

  designer 공통 UI 키 골격 (`designer.*`):
  ```json
  {
    "designer.palette.table":                "테이블",
    "designer.palette.card":                 "카드",
    "designer.palette.stack":                "스택",
    "designer.palette.tabs":                 "탭",
    "designer.palette.modal":                "모달",
    "designer.palette.button":               "버튼",
    "designer.panel.general":                "일반",
    "designer.panel.appearance":             "외형",
    "designer.panel.validation":             "유효성 검사",
    "designer.panel.binding":                "데이터 바인딩",
    "designer.action.save":                  "저장",
    "designer.action.cancel":                "취소",
    "designer.action.delete":                "삭제",
    "designer.action.add":                   "추가",
    "designer.table.column.add":             "컬럼 추가",
    "designer.table.column.delete":          "컬럼 삭제",
    "designer.table.filter.placeholder":     "필터 입력",
    "designer.table.empty":                  "데이터가 없습니다.",
    "designer.common.loading":               "불러오는 중...",
    "designer.common.error":                 "오류가 발생했습니다."
  }
  ```

- **Intl 어댑터 (`src/intl.ts`)**
  - `formatNumber(value, opts?)` — `new Intl.NumberFormat('ko-KR', opts).format(value)`
  - `formatDate(value, opts?)` — `new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', ...opts }).format(new Date(value))`
  - `formatDateTime(value, opts?)` — `new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'short', ...opts }).format(new Date(value))`
  - 순수 함수. Context/Provider 의존 없음. 컴포넌트에서 직접 import해서 사용.

- **`src/index.ts` (public API)**
  - `export { createKoT, createT } from './createKoT'` (및 `./t`)
  - `export { formatNumber, formatDate, formatDateTime } from './intl'`
  - `export type { LocaleT, LocaleKey } from '@form-js-designer/designer-core'` — 타입 re-export로 소비처가 두 패키지를 각각 import하지 않아도 됨

## 데이터 흐름

입력: 호스트 앱이 `createKoT()`를 호출 → `createT(koDict)` 팩토리가 ko.json dict를 클로저로 캡처한 `t` 함수를 생성 → 호스트 앱이 `<LocaleProvider lang="ko" t={t}>` 로 주입 → 처리: subtree의 모든 컴포넌트가 `useT()` 훅으로 동일 `t` 참조를 가져와 `t('designer.palette.table')` 형태로 번역 문자열 조회 → 출력: 한국어 번역 문자열 또는 키(미등록 시) + dev warn.

## 설계 결정 (대안이 있는 경우만)

- **결정 1**: `designer-i18n` 패키지는 `designer-core`의 `LocaleProvider`를 **직접 수정하지 않고** `t` 함수만 주입한다.
  - **대안**: `designer-core`에 ko.json을 번들하여 기본 LocaleProvider 구현에 포함.
  - **근거**: TSK-03-03 설계 §결정 2에서 명시적으로 분리 결정. `designer-core`는 계약(Context + 타입 + fallback)만 갖고, 실 사전은 별도 패키지로 관리해야 다국어(en 추가 등) 확장 시 코어를 수정하지 않아도 된다.

- **결정 2**: ko.json의 키 네임스페이스를 `formjs.validation.*`과 `designer.*`로 분리한다.
  - **대안**: 단일 플랫 네임스페이스(`required`, `minValue` 등) 또는 파일 분리.
  - **근거**: TRD §4.4 "패키지별 네임스페이스(`designer-table.column.add` 등)로 분리"를 명시. 충돌 방지 및 패키지별 키 추적이 용이하다. 단일 파일은 첫 버전에서 충분하며, 추후 네임스페이스별 파일 분리는 `createT(mergeDict([koBase, koTable]))` 패턴으로 확장 가능.

- **결정 3**: form-js 검증 메시지를 **직접 패칭하지 않고** ko.json 사전에만 번역을 제공한다.
  - **대안**: form-js-viewer 내부 validator를 monkey-patch해서 에러 메시지를 직접 한국어로 교체.
  - **근거**: "form-js 본체 수정 0건" 원칙(TRD §0). form-js가 영문 에러 메시지를 생성하면, 렌더 레이어(ErrorList 컴포넌트 등)가 `t('formjs.validation.required')` 형태로 재매핑하는 구조를 별도 Tasks(WP-04/05 컴포넌트 통합 단계)에서 구현한다. 본 Task는 **번역 사전만** 제공하고, 그 사전을 소비하는 렌더 통합은 후속 Task 범위다.

- **결정 4**: `createT`에서 warn을 **호출마다** 발생시킨다 (fallbackT와 달리 1회성이 아님).
  - **대안**: 누락 키당 1회만 warn (Set으로 누락 키 추적).
  - **근거**: 번역 사전 누락은 런타임에 반복적으로 노출되어야 개발자가 인지하기 쉽다. 단, prod에서는 warn 미발생(`isProductionEnv()` 체크). 성능 영향은 dev 빌드에만 국한되므로 허용. 향후 누락 키 수집 Set 도입이 필요하면 `createT` 내부에서 캡슐화하여 소비처 변경 없이 전환 가능.

## 선행 조건
- **TSK-03-03 완료** (depends 필드) — `@form-js-designer/designer-core`의 `LocaleProvider`, `useT`, `LocaleT` 타입이 이미 `packages/designer-core/src/i18n/`에 구현 완료(확인됨). 본 Task의 `createT`가 반환하는 함수는 `LocaleT = (key: string, params?: Record<string, string | number>) => string` 타입과 정확히 일치해야 한다.
- `packages/designer-core`가 workspace에 등록되어 있어 `@form-js-designer/designer-core *` peerDependency 해석 가능.
- 모노레포 root의 `"overrides": { "preact": "10.29.x" }` — 단일 Preact 인스턴스 고정 (package.json L20~22 확인).
- `isProductionEnv()` 헬퍼가 `packages/designer-core/src/envUtils.ts`에 존재 — import해서 재사용.
- Vitest workspace(`vitest.workspace.ts`)가 `packages/*` glob으로 모든 신규 패키지를 자동 포함.

## 리스크

- **HIGH**: form-js 검증 에러 메시지가 컴포넌트 레벨에서 직접 영문 문자열로 렌더된다. `designer-i18n`의 `formjs.validation.*` 키는 사전에 존재하지만, form-js 렌더 레이어가 이 사전을 참조하기 전까지는 한국어 메시지가 실제로 노출되지 않는다. 완화 — 본 Task 범위(AC: "form-js 기본 검증 메시지 ko 번들 동봉")를 충족시키기 위해 검증 메시지 키를 ko.json에 정의하는 것으로 충분하다. 실제 렌더 통합은 후속 WP(컴포넌트 통합) Task에서 수행하며, 해당 Task에 이 리스크를 명시한다.

- **MEDIUM**: `ko.json` 정적 import를 Vite/Rollup의 JSON 플러그인에 의존한다. Vitest 환경(happy-dom)에서는 Vite 플러그인이 활성화되므로 문제없지만, 향후 Jest/Karma 환경에서 소비할 경우 `@vitejs/plugin-json` 없이 JSON import가 실패할 수 있다. 완화 — `vitest.config.ts`에서 `@preact/preset-vite` 플러그인 사용(Vite 기반이므로 JSON 지원 내장). 타 번들러 지원이 필요해지면 `import(...).then(m => m.default)` 동적 로딩으로 교체.

- **MEDIUM**: `LocaleT` 타입은 `designer-core`의 `localeTypes.ts`에서 가져오되, `panel/types.ts`에도 호환 복사본이 존재한다(`Record<string, string | number | unknown>` vs `Record<string, string | number>`). params 타입 불일치가 TypeScript 컴파일 에러로 나타날 수 있다. 완화 — `panel/types.ts`의 `LocaleT` alias를 WP-07 머지 시 `designer-core/localeTypes.ts` 직접 import로 교체(TRD §4.4 계획 사항). 본 Task 설계 문서에 이 통합 작업을 후속 리팩토링으로 명시한다.

- **LOW**: `Intl.NumberFormat` / `Intl.DateTimeFormat`은 Node.js full-icu 빌드가 없으면 ko-KR 포매팅이 en-US fallback으로 동작한다. happy-dom 테스트 환경(CI)에서 ko-KR 포맷 기대값이 실패할 수 있다. 완화 — 테스트에서 `Intl.NumberFormat` 지원 여부를 `try/catch`로 확인하거나, 포맷 결과 대신 `typeof result === 'string'` 수준의 assertion을 사용. 실 브라우저에서는 ko-KR 지원이 보장된다.

- **LOW**: ko.json의 `formjs.validation.*` 키는 form-js 1.x 검증 메시지를 직접 추출하여 작성한다. form-js 버전 업그레이드 시 메시지 변경 또는 신규 메시지가 추가될 수 있다. 완화 — `packages/designer-i18n/locales/ko.json` 과 form-js-viewer 버전을 package.json에 함께 명시적으로 연결하고, CI에서 form-js-viewer dist 파일의 메시지 목록을 추출해 ko.json 키와 diff하는 lint 스크립트를 향후 Phase 1 CI 강화 시 추가한다.

## QA 체크리스트

dev-test 단계에서 검증할 항목.

- [ ] (정상) `createKoT()`가 반환하는 t에 `t('formjs.validation.required')`를 호출하면 `"필수 입력 항목입니다."` 반환
- [ ] (정상) `t('formjs.validation.minValue', { min: 5 })`가 `"최솟값은 5입니다."` 반환
- [ ] (정상) `t('formjs.validation.integerOrDecimal', { decimalDigits: 2 })`가 `"정수 또는 소수점 2자리 이하 숫자를 입력하세요."` 반환
- [ ] (정상) `t('designer.palette.table')`가 `"테이블"` 반환
- [ ] (정상) `t('designer.common.loading')`가 `"불러오는 중..."` 반환
- [ ] (정상) `formatNumber(1234567.89)`가 ko-KR 형식(`1,234,567.89` 또는 `1,234,567.89` — 환경별 구분자 허용)의 문자열 반환
- [ ] (정상) `formatDate(new Date('2024-01-15'))`가 `"2024. 1. 15."` 형식의 문자열 반환
- [ ] (정상) `formatDateTime(new Date('2024-01-15T09:30:00'))`가 날짜와 시간이 모두 포함된 ko-KR 형식 문자열 반환
- [ ] (정상) `<LocaleProvider lang="ko" t={createKoT()}>` 하위의 Preact 컴포넌트에서 `useT()('designer.common.loading')`가 `"불러오는 중..."` 렌더
- [ ] (엣지) 등록되지 않은 키 `t('unknown.key')` 호출 시 `"unknown.key"` 반환
- [ ] (엣지) 등록되지 않은 키 호출 시 dev 빌드에서 `console.warn`에 `"[designer-i18n] missing key: unknown.key"` 포함 메시지 발생
- [ ] (엣지) prod 빌드(`isProductionEnv()=true` mock) 시 누락 키 호출에서 `console.warn` 미발생
- [ ] (엣지) `t('formjs.validation.required', undefined)` — params 없이 호출해도 정상 번역 문자열 반환
- [ ] (엣지) `t('formjs.validation.minValue', { min: 0 })` — 0 값도 올바르게 치환 (`"최솟값은 0입니다."`)
- [ ] (엣지) `formatNumber(0)` — `"0"` 또는 `"0"` ko-KR 형식 반환
- [ ] (에러) `formatDate('invalid-date')` — `Invalid Date` 시 빈 문자열 또는 원본 값 반환하며 throw 없음
- [ ] (에러) `createT({})` — 빈 dict로 생성된 t에서 모든 키가 key 그대로 반환
- [ ] (통합) `import { createKoT, formatNumber, formatDate, type LocaleT } from '@form-js-designer/designer-i18n'` — TypeScript에서 타입 포함하여 resolve (`tsc --noEmit` 통과)
- [ ] (통합) `createKoT()` 반환값이 `designer-core`의 `LocaleT` 타입과 assignability 호환 (`const t: LocaleT = createKoT()` 컴파일 통과)
- [ ] (통합) `packages/designer-i18n`에서 `npm run test:unit` 실행 시 전체 단위 테스트 통과
- [ ] (회귀) `packages/designer-core/src/i18n/__tests__/LocaleProvider.test.tsx` 10 케이스 변경 없이 통과 (designer-core 수정 없음 확인)
