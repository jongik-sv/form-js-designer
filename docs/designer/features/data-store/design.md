# data-store: 외부 옵션용 최상위 dataStores 필드 - 설계

## 요구사항 확인
- form 스키마 최상위에 `dataStores` 엔트리 배열을 도입하여 form-js `select`/`checklist`의 `valuesKey`가 참조할 외부 옵션을 JSON 한 파일에 담는다.
- `bootWithSchema`가 `dataStores`를 `{ [key]: data }` 딕셔너리로 머지하여 `BootResult.storeData`로 노출하고, `ViewerHost`가 이를 런타임 `data` prop과 머지해 `form.importSchema(schema, merged)`에 전달한다.
- Phase 1 스코프는 `source: "static"`만 구현하며, `designer-cli validate`가 구조/유일성/충돌/source 화이트리스트를 검증한다.

## 타겟 앱
- **경로**: N/A (단일 pnpm 모노레포, 범-패키지 변경 — `designer-runtime` / `designer-core` / `designer-cli` / `designer-runtime/examples/static`)
- **근거**: 본 Feature는 UI 라우트가 아닌 런타임 계층(부팅·Viewer·검증) 횡단 계약이므로 여러 패키지가 동시에 수정된다.

## 구현 방향
- `bootWithSchema`는 기존 `validate → lastGood` 흐름을 유지하면서, validate 통과/fallback 두 경로 모두에서 **반환 직전에** `resolveDataStores(schema)`를 호출해 `BootResult.storeData`를 채운다. 스키마 객체 자체는 변형하지 않는다 (round-trip 보존).
- `ViewerHost`는 새 `storeData?: Record<string, unknown>` prop을 받아 `form.importSchema(schema, { ...storeData, ...data })` 형태로 머지한다 (런타임 `data` 우선). `_update({ data })` 경로에도 동일 머지를 적용한다.
- `designer-cli validate`는 기존 Ajv 스키마(`FORM_SCHEMA_DEF`)에 `dataStores` 배열 정의를 추가하고, 구조 검증 이후 별도 `validateDataStores(schema)` 단계에서 key 유일성/컴포넌트 key 충돌/`source` 화이트리스트를 검사한다.
- `examples/static/page.schema.json`에는 기존 `card → textfield(name/email)` 구조를 유지한 채 `select` 하나와 `dataStores` 엔트리 하나를 최소한으로 추가한다.

## 파일 계획

**경로 기준:** 모든 파일 경로는 프로젝트 루트 기준.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-runtime/src/boot/bootTypes.ts` | `BootResult.storeData: Record<string, unknown>` 필드 추가. `DataStoreEntry` / `DataStoreSource` 타입 export. | 수정 |
| `packages/designer-runtime/src/boot/resolveDataStores.ts` | 순수 함수 `resolveDataStores(schema) → { storeData, errors }`. Phase 1은 `source:"static"`만 채택, 기타는 silent skip (validator 책임). | 신규 |
| `packages/designer-runtime/src/boot/bootWithSchema.ts` | 성공/fallback 두 반환 지점에서 `resolveDataStores` 호출 결과를 `storeData`로 포함. 이벤트/lastGood 로직은 변경 없음. | 수정 |
| `packages/designer-runtime/src/boot/index.ts` | `resolveDataStores` 및 신규 타입 재-export. | 수정 |
| `packages/designer-core/src/host/hostTypes.ts` | `ViewerHostProps.storeData?: Record<string, unknown>` 추가. `EditorHostProps`는 상속으로 자동 포함. | 수정 |
| `packages/designer-core/src/host/ViewerHost.tsx` | `storeData` prop 수신 → 3개 흐름(mount `importSchema`, schema-effect `importSchema`, data-effect `_update`/fallback)에서 `{ ...storeData, ...(data ?? {}) }` 머지. | 수정 |
| `packages/designer-cli/src/commands/validate.ts` | `FORM_SCHEMA_DEF`에 `dataStores` 배열 스키마 추가, 별도 `validateDataStores` 단계 추가, 새 `ValidateError` code 3종(`DATASTORE_DUPLICATE_KEY` / `DATASTORE_KEY_COLLISION` / `DATASTORE_UNSUPPORTED_SOURCE`) 추가. 순수함수 `validate()`에도 동일 검사 포함. | 수정 |
| `packages/designer-runtime/examples/static/page.schema.json` | `select country` 컴포넌트 1개 + `dataStores[countryOptions]` 엔트리 1개 추가 (기존 card/textfield/button 유지). | 수정 |
| `packages/designer-runtime/src/__tests__/resolveDataStores.test.ts` | `resolveDataStores` 단위 테스트. | 신규 |
| `packages/designer-runtime/src/__tests__/bootWithSchema.test.ts` | `storeData` 머지 케이스 3건 append (success / fallback / 필드 없음). | 수정 |
| `packages/designer-core/src/host/__tests__/ViewerHost.test.tsx` | `storeData` 머지 + 런타임 `data` 우선 케이스 3건 append. | 수정 |
| `packages/designer-cli/src/__tests__/validate.test.ts` | `dataStores` 검증 케이스 5건 append. | 수정 |
| `e2e/tests/data-store.spec.ts` | static 예제에서 select 옵션(`대한민국`/`일본`)이 실제 DOM에 표시되는지 Playwright visible 모드로 검증. | 신규 |

> 비-UI 런타임 Feature이므로 라우터/메뉴/사이드바 배선은 없다. E2E reachability는 기존 static 예제(`packages/designer-runtime/examples/static/index.html`)의 기존 부팅 경로를 재사용한다.

## 진입점 (Entry Points)

N/A — 본 Feature는 런타임 내부 계약 변경(부팅 파이프라인, ViewerHost prop, CLI 검증 룰)이며 사용자 클릭 경로를 새로 만들지 않는다. spec.md `## 진입점` 항목과 일치.

E2E 검증은 기존 static 예제 진입(`pnpm --filter designer-runtime dev` → `http://localhost:<port>/packages/designer-runtime/examples/static/`)으로 대체하고, 페이지 로드 후 `select[name="country"]`를 열어 옵션 텍스트를 단언한다. `page.goto` 직접 입력이 아닌, 동일 dev server 위에서 예제 HTML이 DOM에 마운트되는 실제 부팅 경로를 따른다.

## 주요 구조

- **`resolveDataStores(schema: FormSchema) → { storeData: Record<string, unknown>; errors: DataStoreError[] }`** — 순수 함수. `schema.dataStores`가 배열이 아니면 `{storeData:{}, errors:[]}`. 각 엔트리를 순회하며 `source==="static"`에 한해 `data`를 `storeData[key]`에 복사. 지원하지 않는 source나 중복 key는 errors에 append하되 호출측(boot)은 errors를 **무시**하고 validator가 엄격 검증을 담당 (single-source-of-truth).
- **`bootWithSchema` 반환 타입 확장** — 기존 3개 필드(`schema`/`usedFallback`/`validation`)에 `storeData: Record<string, unknown>` 추가. success/lastGood-fallback 두 반환 지점에서 동일하게 `resolveDataStores` 호출. 완전 실패(throw) 경로는 변화 없음.
- **`ViewerHost` 머지 로직** — 3개 훅 브랜치(mount `useLayoutEffect`, `useEffect([schema])`, `useEffect([data])`)에서 공통 헬퍼 `mergeData(storeData, data)` → `{ ...(storeData ?? {}), ...(data ?? {}) }`를 인라인 또는 ref 안정화 후 사용. `storeData`는 변경이 드물므로 ref 동기화 대상이 아니라 dep array에 포함(`[storeData]` 별도 훅) 또는 `[data]` 훅에 병합 — **결정: `storeData` 전용 `useEffect`는 만들지 않고 `data` 훅 dep를 `[data, storeData]`로 확장**. `storeData`만 바뀌는 경우도 `_update`가 재호출되어 form-js에 최신 merged data가 전달된다.
- **`validateDataStores(schema)`** — AJV 스키마 아래 추가 규칙. 반환 `ValidateError[]`:
  - `DATASTORE_DUPLICATE_KEY` — `dataStores`에 같은 `key`가 2회 이상 등장.
  - `DATASTORE_KEY_COLLISION` — `dataStores[*].key`가 form 컴포넌트의 `key`(walk 수집 결과)와 충돌.
  - `DATASTORE_UNSUPPORTED_SOURCE` — `source`가 `"static"` 외의 값(`"url"`, `"expression"`, 임의 문자열)일 때 즉시 에러 (silent skip 금지).
- **예제 스키마 patch** — 기존 `components` 배열에 `{ type: "select", id: "country-field", key: "country", label: "국가", valuesKey: "countryOptions" }` 추가. 최상위에 `dataStores: [{ key: "countryOptions", source: "static", data: [{label:"대한민국",value:"KR"},{label:"일본",value:"JP"}] }]` 추가.

## 데이터 흐름

입력: `FormSchema`(+선택적 `dataStores`) → 처리: `bootWithSchema` → `resolveDataStores` → `BootResult.storeData` → `ViewerHost` props(`schema`, `data`, `storeData`) → `mergeData(storeData, data)` → 출력: `form.importSchema(schema, merged)` → form-js `useOptionsAsync`가 `initialData[valuesKey]`에서 옵션을 읽어 `select` DOM을 렌더.

## 설계 결정 (대안이 있는 경우만)

- **결정 1**: form-js `FormEditor.saveSchema()`의 unknown top-level 필드(`dataStores`) 보존 여부 — **보존된다**. 디자이너의 별도 섀도우 저장은 **불필요**.
  - **근거**: `node_modules/@bpmn-io/form-js-editor/dist/index.es.js:14777-14792` `exportSchema`가 `clone(schema, (name, value) => { if (['_parent','_path'].includes(name)) return undefined; return value; })`로 _parent/_path만 제거하고 나머지 키는 모두 보존한다. 이어서 `{...cleanedSchema, ...exportDetails, schemaVersion}` 스프레드로 반환하므로 unknown top-level key가 손실 없이 직렬화된다. `importSchema`도 전체 스키마를 state에 복제 저장(`_state.schema`)한다.
  - **대안**: `schema.dataStores`를 디자이너 측에서 `sessionStorage` 혹은 `lastGoodSchemaStore`의 동반 객체로 별도 보관한 뒤 save 시 머지. 본 feature에서는 **불필요**하므로 채택하지 않는다. (Phase 2에서 form-js-editor upstream 동작이 바뀔 경우 다시 평가.)
- **결정 2**: `storeData` merge 위치 — **`ViewerHost`에서 머지**. `bootWithSchema`가 미리 머지하여 단일 `data`로 내려보내는 대안은 "런타임 data prop이 항상 승리"라는 spec 계약을 호출자에게 맡기게 되어 취약. ViewerHost가 두 소스를 분리 수신하여 매 importSchema/`_update`에서 `{...storeData, ...data}` 순서로 재머지하는 편이 계약을 코드로 강제한다.
- **결정 3**: unsupported `source` 처리 — **validator에서 hard error**. `resolveDataStores`(런타임 부팅)는 silent skip으로 방어적으로 동작하되, `designer-cli validate`가 출시 전에 반드시 걸러내도록 엄격 검증한다. Phase 1 스코프(`static only`) 유지.
- **결정 4**: `dataStores`를 빈 form 필드 `key`와 의도적으로 분리 — form-js 컴포넌트로 등록하지 않는다(ADR-0001 단일 파이프라인 유지). spec.md 배경과 일치.

## 선행 조건

- 없음. `bootWithSchema`, `ViewerHost`, `designer-cli validate`는 이미 구현되어 있으며 본 Feature는 세 지점의 **확장**만 수행한다.
- form-js 버전 고정 필요 없음 — `exportSchema`의 unknown-field 보존 동작은 `@bpmn-io/form-js-editor` dist에서 확인됨(위 결정 1).

## 리스크

- **MEDIUM**: `ViewerHost`의 `[data, storeData]` dep 확장으로 기존 14개 단위 테스트 중 `data prop 변경 시 _update 호출` 계열이 참조 동일성에 민감해질 수 있다. 테스트 helper가 `storeData={}` 기본값을 공유하도록 맞추고, 초기 마운트 스킵 ref(`dataInitialRef`)를 그대로 재사용해 회귀를 방지한다.
- **MEDIUM**: `designer-cli validate`의 `FORM_SCHEMA_DEF`에 `dataStores`를 `additionalProperties:true` 유지한 채 정의할 때 Ajv의 타입 에러 메시지가 중첩될 수 있다. `validateDataStores`를 **구조검증 이후 단독 스텝**으로 분리하여 에러 출력 가독성을 보장한다.
- **LOW**: 예제 `page.schema.json`에 추가하는 `select` 컴포넌트가 기존 round-trip E2E의 스냅샷을 흔들 수 있다. 기존 테스트의 스키마 fixture는 그대로 두고, 새 E2E만 `dataStores` 포함 스키마를 사용한다.
- **LOW**: `source: "static"` 이외의 값을 사용자가 실수로 넣으면 validator가 막지만, 런타임만 단독 실행되는 경로(dev example)에서는 silent skip이므로 warning 레벨의 console.warn을 `resolveDataStores`에 남긴다.

## QA 체크리스트

dev-test 단계에서 검증할 항목. 각 항목은 pass/fail로 판정 가능해야 한다.

### 정상 케이스
- [ ] `bootWithSchema`: `schema.dataStores=[{key:"countryOptions",source:"static",data:[{label:"KR",value:"KR"}]}]` 입력 시 `BootResult.storeData`가 `{ countryOptions: [{label:"KR",value:"KR"}] }`로 반환된다.
- [ ] `bootWithSchema`: `schema.dataStores` 필드가 없으면 `BootResult.storeData`가 `{}`로 반환되고 기존 BootResult 필드 3개는 이전과 동일하다 (회귀 없음).
- [ ] `ViewerHost` 머지: `data={country:"KR"}` + `storeData={countryOptions:[...]}` 입력 시 `importSchema(schema, { countryOptions:[...], country:"KR" })`로 호출된다.
- [ ] `validate` CLI: `static` source만 있는 유효한 `dataStores`가 포함된 파일에 대해 exit 0 반환.

### 엣지 케이스
- [ ] `ViewerHost` 우선순위: `data={countryOptions:"runtime-wins"}` + `storeData={countryOptions:[...]}` 일 때 merged 객체의 `countryOptions`는 `"runtime-wins"`다 (런타임 data 승리, spec 계약 §3).
- [ ] `bootWithSchema` fallback 경로: invalid schema + lastGood 존재 시 `BootResult.schema`는 lastGood이고 `storeData`는 lastGood의 `dataStores`로부터 계산된다.
- [ ] `resolveDataStores`: `dataStores`가 빈 배열(`[]`)이면 `storeData`가 `{}`.

### 에러 케이스 (validate CLI)
- [ ] `DATASTORE_DUPLICATE_KEY`: 같은 `key="countryOptions"`가 2회 등장 시 exit 1 + 에러 메시지에 중복 key 명시.
- [ ] `DATASTORE_KEY_COLLISION`: form 컴포넌트의 `key="country"`와 `dataStores[0].key="country"`가 같을 때 exit 1 + 충돌 key 명시.
- [ ] `DATASTORE_UNSUPPORTED_SOURCE`: `source:"url"` 엔트리가 있으면 exit 1 + 지원 source 목록(`["static"]`) 안내.
- [ ] AJV 구조 에러: `dataStores[0]`에 `key`가 누락되면 exit 1 + AJV 에러 메시지 출력.

### 통합 케이스
- [ ] E2E(Playwright visible): static 예제 페이지 로드 → `#country-field` select 클릭 → 드롭다운에 `"대한민국"`, `"일본"` 두 옵션이 실제 DOM에 표시된다. URL 직접 입력(`page.goto` 이외의 내비게이션)을 사용하지 않고 예제 HTML 부팅 결과를 그대로 검증한다.
- [ ] Round-trip: `FormEditor.saveSchema()` 결과가 원본 스키마의 `dataStores` 필드를 key 순서·값 동등성 기준으로 보존한다 (추가 단위 테스트로 form-js editor의 unknown-field 보존 계약을 고정).
