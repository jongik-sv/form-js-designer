# TSK-09-02: designer-runtime — JSON 배포 채널 (static + API 어댑터) - 설계

## 요구사항 확인
- PRD §4 AC #3/#4/#9 및 TRD §6.2 구현: 운영 환경에서 동일 JSON 스키마를 **정적 번들(import)** 과 **API endpoint (ETag 캐시 + localStorage fallback)** 두 채널로 수신하여 `ViewerHost`(TSK-03-03)로 무손실 렌더링하고, 부팅 시 `validateFormSchema`(TSK-06-02) 기반 Ajv 검증 실패 시 렌더 차단 + `designer:schema-error` 알림 이벤트를 발화하는 신규 패키지 `packages/designer-runtime`을 구축한다.
- Host 정적 import 예시 페이지(`examples/static/`) + API 어댑터 `ApiSchemaLoader` (If-None-Match / ETag 304 재사용, localStorage 캐시 fallback, 네트워크 실패 시 마지막 정상 스키마 fallback, `onError` 콜백) + 부팅 검증 유틸 `bootWithSchema(schema)` + `WatermarkMonitor`(TSK-09-03이 import할 shell만 선배치).
- 수용 기준: `roundtrip.static.spec.ts` + `roundtrip.api.spec.ts` 동일 schema 양쪽 채널 픽셀 diff = 0 (AC #4, #4-1). designer-cli `publish --target static|api`(TSK-08-02)가 산출한 manifest/엔드포인트를 그대로 소비한다.

## 타겟 앱
- **경로**: `packages/designer-runtime` (모노레포 신규 패키지, TRD §2 표의 "designer-runtime" 자리 — 현재는 phase-1-plan §3.8/§3.9에서만 언급되고 TRD §2는 생략된 상태이나 본 Task에서 정식 추가)
- **근거**: phase-1-plan §3.8 "레퍼런스 어댑터: `packages/designer-runtime/src/transport/ApiSchemaLoader.ts`" + AC 매트릭스(§4)가 `packages/designer-runtime/e2e/roundtrip.{static,api}.spec.ts`를 명시. 배포 채널 어댑터는 에디터 호스트와 독립적으로 viewer 측 운영 환경에서 쓰이므로 `designer-editor-host`가 아닌 별도 라이브러리 패키지가 필요하다.

## 구현 방향
- **두 채널 단일 계약**: `SchemaSource`(type) + `SchemaLoader`(interface) 단일 계약으로 추상화하여 static/api 구현이 서로 교체 가능하도록 한다. `StaticSchemaSource`는 이미 import된 JSON을 그대로 반환, `ApiSchemaLoader`는 fetch + ETag 캐시 + localStorage fallback.
- **부팅 검증 파이프라인**: `bootWithSchema({ schema, registry })` 함수가 ① `validateFormSchema`(`designer-core/validate`)로 Ajv 검증 → ② `ok=false`면 마지막 정상 스키마(localStorage)로 fallback → ③ 둘 다 실패 시 `SchemaBootError` throw + `window.dispatchEvent('designer:schema-error', detail)` + `onError` 콜백 호출하여 호스트 앱이 차단 UI(에러 박스)를 렌더할 수 있게 한다. 성공 시 `ViewerHost` 렌더 가능한 검증된 schema를 반환.
- **ApiSchemaLoader 상세**: `GET /api/schemas/{id}?env=...` + `If-None-Match: <etag>` 헤더를 보내고 `200 OK`일 때만 schema + ETag를 localStorage에 저장, `304 Not Modified`일 때는 캐시 schema 반환. 네트워크 실패(timeout/5xx) 시 localStorage에 있는 마지막 정상 스키마로 fallback + `onError` 발화. 재시도 정책은 1차 릴리스에서 미구현(후속), 본 Task는 fallback까지만.
- **정적 채널**: `publish --target static`이 생성한 `manifest.json`(schema 파일 해시 목록)을 옵션으로 import해 무결성 검증(sha256 비교)을 수행하는 `verifyStaticManifest(schema, manifest)` 유틸을 함께 제공한다. Host는 `import schema from './page.schema.json'` + `import manifest from './manifest.json'`만 하면 된다.
- **E2E pixel diff 0**: Playwright `roundtrip.static.spec.ts` + `roundtrip.api.spec.ts` 두 스펙이 **동일한 샘플 schema**를 각 채널로 로드해 `ViewerHost`로 렌더한 결과를 pixelmatch로 비교. API 채널은 `page.route('/api/schemas/*')`로 Mock 응답 주입(ETag 포함). D-P1-2: API 서버 구현 없음, Mock만.
- **워터마크 런타임 가드 shell**: `packages/designer-runtime/src/watermark/WatermarkMonitor.ts`는 본 Task에서 **빈 구현 + 타입 계약**만 선배치(`initWatermarkMonitor(opts)` API 계약). 실제 MutationObserver 로직은 TSK-09-03에서 채운다. 이는 TSK-09-02와 TSK-09-03이 병행 개발 가능하게 하는 인터페이스 분리.

## 파일 계획

**경로 기준:** 모든 파일 경로는 **프로젝트 루트 기준**으로 작성한다. 타겟 패키지가 `packages/designer-runtime`이므로 모든 신규 경로에 해당 접두어가 포함된다.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-runtime/package.json` | 패키지 메타. name=`@form-js-designer/designer-runtime`, type=module, exports: `"."`, `"./transport"`, `"./boot"`, `"./watermark"`. peerDependencies: `@form-js-designer/designer-core *`, `@bpmn-io/form-js-viewer ^1.21.2`, `preact ^10.19.3`. dependencies: 없음. devDependencies: `@playwright/test`, `@preact/preset-vite`, `@testing-library/preact`, `happy-dom`, `pixelmatch`, `pngjs`, `vite`, `vitest`. | 신규 |
| `packages/designer-runtime/tsconfig.json` | `designer-i18n/tsconfig.json`과 동일 패턴. `moduleResolution: bundler`, `jsx: react-jsx`, `jsxImportSource: preact`. | 신규 |
| `packages/designer-runtime/vite.config.ts` | 개발 서버 `examples/static`/`examples/api` 라우팅 + preact preset + preact/compat alias. e2e 대상 호스트. port 5174 (editor-host 5173과 충돌 회피). | 신규 |
| `packages/designer-runtime/vitest.config.ts` | happy-dom + preact alias + designer-core alias(`../designer-core/src/index.ts`). | 신규 |
| `packages/designer-runtime/playwright.config.ts` | `webServer: { command: 'npm run dev', port: 5174 }`. 1024/1440 2 projects. | 신규 |
| `packages/designer-runtime/src/transport/types.ts` | `SchemaSource`, `SchemaLoader`, `LoadResult`, `LoaderOptions`, `ChannelError` 타입 계약. | 신규 |
| `packages/designer-runtime/src/transport/StaticSchemaSource.ts` | `createStaticSource(schema, manifest?): SchemaSource` 팩토리. `load()` 호출 시 검증된 schema 동기 반환. manifest가 있으면 `verifyStaticManifest()` 호출. | 신규 |
| `packages/designer-runtime/src/transport/ApiSchemaLoader.ts` | **핵심**. `createApiLoader({ baseUrl, schemaId, env, fetchImpl?, storage? }): SchemaLoader`. ETag 캐시 + localStorage fallback + `onError` 콜백. 상세는 §주요 구조. | 신규 |
| `packages/designer-runtime/src/transport/verifyStaticManifest.ts` | `verifyStaticManifest(schema, manifest): { ok, reason? }`. SubtleCrypto `sha256(JSON.stringify(schema))` 계산 후 manifest.hash와 비교. 실패 시 `BootError` 전달. | 신규 |
| `packages/designer-runtime/src/transport/index.ts` | barrel export: `createStaticSource`, `createApiLoader`, `verifyStaticManifest`, 타입. | 신규 |
| `packages/designer-runtime/src/boot/bootWithSchema.ts` | **부팅 파이프라인**. `bootWithSchema({ schema, registry, onError?, storage? }): Promise<BootResult>`. validateFormSchema 호출 + 실패 시 lastGoodSchema fallback + ok면 schema 반환, 둘 다 실패면 `SchemaBootError` throw + `designer:schema-error` 이벤트 발화. | 신규 |
| `packages/designer-runtime/src/boot/bootTypes.ts` | `BootResult`, `BootOptions`, `SchemaBootError` 정의. | 신규 |
| `packages/designer-runtime/src/boot/lastGoodSchemaStore.ts` | localStorage wrapper. `saveLastGood(key, schema, etag?)`, `loadLastGood(key): { schema, etag } \| null`. storage 주입 가능(테스트용 MemoryStorage). | 신규 |
| `packages/designer-runtime/src/boot/events.ts` | `dispatchSchemaError(detail): void` — `window.dispatchEvent(new CustomEvent('designer:schema-error', { detail }))`. SSR/Node 가드(`typeof window !== 'undefined'`). `designer:schema-loaded` 성공 이벤트도 추가. | 신규 |
| `packages/designer-runtime/src/boot/index.ts` | barrel export. | 신규 |
| `packages/designer-runtime/src/watermark/WatermarkMonitor.ts` | **shell 구현**. `initWatermarkMonitor(opts): () => void` API 계약만 정의 + no-op 본체(opts 검증 + `isProductionEnv()` 가드 skeleton). 실 MutationObserver 로직은 TSK-09-03에서 교체. | 신규 |
| `packages/designer-runtime/src/watermark/index.ts` | barrel export. | 신규 |
| `packages/designer-runtime/src/index.ts` | public API barrel. transport/boot/watermark에서 주요 심볼 re-export. | 신규 |
| `packages/designer-runtime/src/__tests__/StaticSchemaSource.test.ts` | 5 케이스: 정상 load, manifest 불일치, manifest 누락, null schema, 반복 호출 동일 참조. | 신규 |
| `packages/designer-runtime/src/__tests__/ApiSchemaLoader.test.ts` | 12 케이스: 200 OK schema+etag 저장, 304 캐시 재사용, 5xx 실패 → lastGoodSchema fallback, 네트워크 timeout → fallback, onError 호출, If-None-Match 헤더 송신, env 파라미터 포함 URL, storage 주입 격리, 잘못된 JSON 응답, etag 없는 응답, 처음 호출 시 캐시 미존재, 2회 호출 등가성. fetchImpl · storage mock 기반. | 신규 |
| `packages/designer-runtime/src/__tests__/bootWithSchema.test.ts` | 10 케이스: 정상 validate 통과, validate 실패 + lastGood 존재 → fallback, validate 실패 + lastGood 없음 → SchemaBootError + 이벤트 발화, onError 콜백 호출 1회, dispatchEvent detail 포맷, registry 누락, 빈 schema, storage 주입. | 신규 |
| `packages/designer-runtime/src/__tests__/verifyStaticManifest.test.ts` | 5 케이스: 해시 일치 ok, 해시 불일치 ok=false, manifest 누락, SubtleCrypto 미지원 환경, 중첩 객체 직렬화 안정성. | 신규 |
| `packages/designer-runtime/src/__tests__/events.test.ts` | 3 케이스: dispatchSchemaError 이벤트 검증, SSR(window undefined) no-op, detail 스키마 구조. | 신규 |
| `packages/designer-runtime/examples/static/index.html` | 정적 채널 예시. `<div id="app">` + `main.tsx` 로드. | 신규 |
| `packages/designer-runtime/examples/static/main.tsx` | `import schema from './page.schema.json'` + `bootWithSchema` + `ViewerHost`에 schema 주입. 테스트 고정 데이터. | 신규 |
| `packages/designer-runtime/examples/static/page.schema.json` | 6 컴포넌트(card/stack/tabs/modal/button/table) 포함 고정 샘플 schema. AC 매트릭스 §4 "6 컴포넌트 × 2 채널" 커버. | 신규 |
| `packages/designer-runtime/examples/static/manifest.json` | `{ schemaHash: "<sha256>", version: 1 }` — publish CLI 출력 포맷 mock. | 신규 |
| `packages/designer-runtime/examples/api/index.html` | API 채널 예시. Playwright가 fetch를 mock route로 가로챈다. | 신규 |
| `packages/designer-runtime/examples/api/main.tsx` | `createApiLoader({ baseUrl: '/api', schemaId: 'demo', env: 'dev' })` + `loader.load()` + `bootWithSchema` + `ViewerHost`. | 신규 |
| `packages/designer-runtime/e2e/roundtrip.static.spec.ts` | **E2E**. `/examples/static/`에서 ViewerHost 렌더 → 스크린샷 캡처(1024×768). 이후 `roundtrip.api.spec.ts`와 동일 baseline과 pixel diff = 0 검증. | 신규 |
| `packages/designer-runtime/e2e/roundtrip.api.spec.ts` | **E2E**. `/examples/api/`에서 `page.route('/api/schemas/demo*')` mock(ETag 'v1' + schema body) → ViewerHost 렌더 → 스크린샷 캡처 → `roundtrip.static.spec.ts` baseline과 pixelmatch diff = 0. 2차 방문에서 `If-None-Match: v1` 헤더 + 304 응답 경로도 검증. | 신규 |
| `packages/designer-runtime/e2e/fixtures/baseline.png` | `playwright test --update-snapshots`로 초기 1회 생성. 이후 두 spec 공유 baseline. | 신규(생성물) |
| `packages/designer-runtime/e2e/fixtures/schema.ts` | E2E에서 공유할 schema 픽스처(examples/static/page.schema.json과 동일 객체 export). | 신규 |
| `packages/designer-runtime/README.md` | 패키지 개요. static/api 사용 예시 2개 코드 블록. | 신규 |

> 본 Task는 `domain=library`로 전역 UI/메뉴 확장이 없다. `designer-editor-host`의 라우터/사이드바 수정은 없으며, `examples/` 내부의 host 페이지는 E2E 대상 fixture 성격이므로 "라우터/메뉴 파일" 필수 요구에서 제외된다(아래 "진입점" 섹션 N/A 근거 참조).

## 진입점 (Entry Points)
N/A (`domain=library`). 본 Task는 운영 환경에서 `designer-runtime` 모듈을 **프로그램적으로 import**하여 쓰는 라이브러리 계약 + 레퍼런스 예시 페이지를 제공한다. 디자이너 에디터 UI에 새로운 메뉴/사이드바/라우트를 추가하지 않는다. `examples/static/` · `examples/api/`는 E2E 전용 호스트 페이지이며, Playwright가 `page.goto('/examples/static/')` / `page.goto('/examples/api/')` 형태로 직접 이동한다(reachability gate 면제 — 비-페이지 라이브러리 패키지이므로 URL 직접 진입 허용).

## 주요 구조

- **`createApiLoader(opts): SchemaLoader`** (`src/transport/ApiSchemaLoader.ts`)
  - 시그니처:
    ```ts
    interface LoaderOptions {
      baseUrl: string;                // e.g. '/api' or 'https://example.com/api'
      schemaId: string;
      env?: 'dev' | 'staging' | 'prod';
      fetchImpl?: typeof fetch;       // 테스트 mock 주입
      storage?: StorageLike;          // 테스트 MemoryStorage 주입
      timeoutMs?: number;             // 기본 5000
      onError?: (err: ChannelError) => void;
    }
    interface SchemaLoader {
      load(): Promise<LoadResult>;    // { schema, etag, source: 'network' | 'cache' | 'fallback' }
    }
    ```
  - `load()` 로직 (순서):
    1. storage에서 `(etag, lastGoodSchema)` 읽기 → 있으면 `If-None-Match: etag` 헤더 준비
    2. `fetchImpl(url, { headers })` 호출 (timeout은 AbortController)
    3. `304 Not Modified` → storage에서 schema 반환 (`source: 'cache'`)
    4. `200 OK` → body json parse + 새 ETag 읽기(`response.headers.get('ETag')`) → storage save → schema 반환 (`source: 'network'`)
    5. `4xx/5xx` or network error or timeout → `onError` 호출 + storage의 lastGood 반환 (`source: 'fallback'`). lastGood 없으면 `ChannelError('no_fallback')` throw

- **`createStaticSource(schema, manifest?): SchemaSource`** (`src/transport/StaticSchemaSource.ts`)
  - 단순 동기 소스. `load()`는 `Promise.resolve({ schema, etag: manifest?.schemaHash, source: 'static' })`.
  - manifest가 있으면 `verifyStaticManifest(schema, manifest)` 호출 → 해시 불일치 시 `ChannelError('manifest_mismatch')` throw.

- **`bootWithSchema(opts): Promise<BootResult>`** (`src/boot/bootWithSchema.ts`)
  - 시그니처:
    ```ts
    interface BootOptions {
      schema: FormSchema;
      registry: ComponentRegistry;    // formFieldRegistry duck-type (validateSchema 계약과 동일)
      storage?: StorageLike;
      onError?: (err: SchemaBootError) => void;
      lastGoodKey?: string;           // default 'designer.lastGood'
    }
    interface BootResult {
      schema: FormSchema;
      usedFallback: boolean;
      validation: ValidationResult;
    }
    ```
  - 단계:
    1. `result = validateFormSchema(schema, registry)` (designer-core)
    2. `result.ok === true` → `saveLastGood(key, schema)` + `dispatchSchemaLoaded({ source })` → return `{ schema, usedFallback: false, validation: result }`
    3. `result.ok === false` → `lastGood = loadLastGood(key)`
       - `lastGood` 존재 → `onError?.(err)` + `dispatchSchemaError({ stage: 'validate', errors: result.errors, usedFallback: true })` → return `{ schema: lastGood.schema, usedFallback: true, validation: result }`
       - `lastGood` 없음 → `err = new SchemaBootError(result.errors)` + `onError?.(err)` + `dispatchSchemaError({ stage: 'validate', errors: result.errors, usedFallback: false })` + throw err

- **`verifyStaticManifest(schema, manifest): VerifyResult`** (`src/transport/verifyStaticManifest.ts`)
  - `SubtleCrypto.digest('SHA-256', JSON.stringify(schema))` 후 hex 변환.
  - `manifest.schemaHash`와 비교. 직렬화 안정성을 위해 key sort(`JSON.stringify(obj, Object.keys(obj).sort())` 재귀) 적용.

- **`WatermarkMonitor` (shell)** (`src/watermark/WatermarkMonitor.ts`)
  - `export function initWatermarkMonitor(opts?: MonitorOptions): Dispose` — 본 Task에서는 `if (!isProductionEnv()) return () => {};` no-op 본체 + JSDoc에 "TSK-09-03에서 MutationObserver 로직 추가" 명시.
  - 이 계약으로 TSK-09-03과 병행 개발 가능.

- **이벤트 계약** (`src/boot/events.ts`)
  - `designer:schema-loaded` — detail: `{ source: 'static' | 'network' | 'cache' | 'fallback', etag?: string, schemaId?: string }`
  - `designer:schema-error` — detail: `{ stage: 'validate' | 'network' | 'manifest', errors: ValidationError[] | Error[], usedFallback: boolean }`
  - 호스트 앱이 구독 가능하며 디버깅/모니터링/사용자 알림 UI에 연결.

## 데이터 흐름

**정적 채널**: 빌드 타임에 `page.schema.json` + `manifest.json`이 번들에 포함 → 런타임 `createStaticSource(schema, manifest)` → `source.load()` → `bootWithSchema({ schema, registry })` → Ajv 검증 통과 시 검증된 schema → `<ViewerHost schema={schema} />` 렌더.

**API 채널**: 런타임 `createApiLoader({ baseUrl, schemaId, env })` → `loader.load()` → fetch(with If-None-Match) → 200 시 storage 저장 + schema 반환 / 304 시 캐시 반환 / 실패 시 lastGood fallback + `onError` → `bootWithSchema` → 검증 → ViewerHost 렌더. 검증 실패 시 `designer:schema-error` 이벤트 발화 + 호스트 앱의 에러 박스 렌더(차단).

**양쪽 공통 출력**: 동일 schema 객체가 ViewerHost에 전달되어 form-js-viewer가 렌더 → AC #4-1 픽셀 파리티 자동 성립(같은 입력/같은 렌더 파이프라인).

## 설계 결정 (대안이 있는 경우만)

- **결정 1**: `SchemaSource`/`SchemaLoader` 계약을 두 채널 공통으로 두고, `ViewerHost`는 **항상 이미 검증된 schema 객체**를 입력으로 받는다(Loader가 ViewerHost 내부에서 동작하지 않음).
  - **대안**: `<ViewerHost source={apiLoader} />` 처럼 ViewerHost가 loader를 직접 받아 내부에서 fetch/검증 수행.
  - **근거**: ViewerHost(TSK-03-03)의 인터페이스는 이미 확정되어 있으며(`schema: FormSchema`), 로드 로직을 주입하면 하위 호환이 깨진다. 또한 부팅 검증·fallback·에러 이벤트는 viewer 인스턴스보다 상위 layer의 책임이다(Host 앱이 에러 박스를 렌더하거나 다른 페이지로 라우팅). 현재 설계는 layer 경계가 명확하고 단위 테스트가 쉽다.

- **결정 2**: `ApiSchemaLoader`를 **클래스가 아닌 팩토리 함수**로 노출한다 (`createApiLoader(opts): SchemaLoader`).
  - **대안**: `class ApiSchemaLoader { constructor(opts); load(); }`.
  - **근거**: (a) 내부 상태(etag, lastGoodSchema)가 단일 schemaId 단위이므로 클로저 캡슐화가 자연스럽고, (b) 테스트에서 의존성(fetchImpl, storage)을 인자로 주입하는 패턴이 생성자 주입보다 간결, (c) 이 프로젝트(designer-core `defineComponent`, designer-i18n `createT`)의 팩토리 컨벤션과 일치.

- **결정 3**: 부팅 검증 실패 시 **lastGoodSchema fallback을 설정 가능한 기본값으로** 제공한다(`storage` 옵션 주입 없으면 `localStorage` 사용, 브라우저 외 환경에서는 in-memory fallback).
  - **대안**: lastGood fallback 없이 무조건 차단.
  - **근거**: TRD §6.2 "실패 시 캐시된 마지막 정상 스키마로 fallback + 알림". 운영 환경에서 schema deploy 중 순간적 불일치로 전체 페이지가 죽는 시나리오를 피해야 한다. 단, `usedFallback: true`를 `BootResult`와 `designer:schema-error` detail에 명시하여 호스트 앱이 "stale schema 사용 중" 배너를 띄울 수 있게 한다.

- **결정 4**: API 채널 Mock은 **Playwright `page.route`로만** 처리하고 Express/Node 레퍼런스 서버를 만들지 않는다.
  - **대안**: `examples/api-server/` 폴더에 작은 Express 서버 추가.
  - **근거**: phase-1-plan §8 D-P1-2 "API 채널은 클라이언트 어댑터만 Phase 1 포함. 레퍼런스 서버는 Playwright mock으로 대체". 운영 서버 구현은 호스트 조직마다 상이하므로 라이브러리 범위 밖. `page.route` mock으로 ETag/304/timeout/5xx 시나리오 전부 커버 가능.

- **결정 5**: `verifyStaticManifest`는 **SubtleCrypto**(WebCrypto)로 SHA-256을 계산한다.
  - **대안**: npm `hash-wasm` 또는 `crypto-js` 추가.
  - **근거**: 브라우저 내장 API로 번들 증분 0, 지원 범위 충분(`Edge/Chrome/FF/Safari 최신`). Node.js happy-dom 테스트 환경은 `crypto.webcrypto.subtle`로 fallback 가능. 라이선스 의존성 추가도 불필요.

- **결정 6**: `WatermarkMonitor` shell을 designer-runtime에 **선배치**하여 TSK-09-03과 인터페이스 경계를 고정한다.
  - **대안**: TSK-09-03에서 파일을 신규 생성.
  - **근거**: TSK-09-03(워터마크 4중 가드)는 TSK-09-02와 병행 WP 내 실행(WBS §WP-09). 인터페이스를 미리 고정해두면 경합 없이 두 Task가 각자 내부 구현만 채우면 된다. 본 Task 범위에는 실제 로직을 넣지 않고 계약과 no-op 본체만 둔다.

## 선행 조건
- **TSK-08-02 완료** (depends 필드): designer-cli `publish --target static`이 생성하는 `manifest.json` 포맷(해시 필드명 `schemaHash`)과 `publish --target api`의 `PUT /api/schemas/{id}` 응답 헤더(ETag) 계약이 확정되어야 `StaticSchemaSource.verifyStaticManifest` 및 `ApiSchemaLoader.load()`가 동일 계약을 소비할 수 있다. 계약 불일치 시 본 Task의 `verifyStaticManifest`와 mock이 미래 TSK-08-02의 실 포맷과 어긋날 위험 — **완화**: 본 Task 착수 시 TSK-08-02 design.md(미작성 상태이면 합의된 계약 인터페이스를 **본 Task에서 먼저 확정**하여 TSK-08-02가 그대로 구현)를 공유 `docs/contracts/deploy-contract.md`(선택) 또는 본 파일 §주요 구조의 ApiSchemaLoader 시그니처를 단일 진실 원천으로 삼는다.
- **TSK-06-02 완료 (있음, dev 가능)**: `validateFormSchema`, `ValidationResult`가 `@form-js-designer/designer-core/validate`에서 export됨. 본 Task의 `bootWithSchema`가 이를 직접 import.
- **TSK-03-03 완료 (있음)**: `ViewerHost`, `LocaleProvider`가 export됨. examples/*에서 import하여 렌더.
- **TSK-04-02 / TSK-05-02 완료 권장**: `DesignerComponentsModule`, `DesignerTableModule`이 존재해야 6 컴포넌트 샘플 schema가 실제 렌더된다. 미완 시 샘플 schema를 card/stack/button 3종으로 축소(본 Task의 파리티 증명은 그대로 성립).
- **모노레포 root overrides**: `"preact": "10.29.x"` (package.json:23) — 단일 Preact 인스턴스 고정 (R3 방어).
- **form-js-viewer ^1.21.2**: 루트 dependencies(package.json:17)에 이미 포함.
- **Ajv ^8.18.0**: `designer-core` dependencies에 있음(재사용, 본 패키지에는 ajv 의존 추가 없음).

## 리스크
- **HIGH — TSK-08-02 계약 불확정 (pre-work)**: designer-cli publish가 생성할 `manifest.json` 필드명·ETag 포맷을 TSK-08-02가 확정하기 전에 본 Task가 먼저 진행되면 계약 어긋남 가능. 완화 — 본 Task의 `verifyStaticManifest` 및 `ApiSchemaLoader` 헤더 계약을 **본 설계 §주요 구조에 단일 진실 원천으로 고정**하고 TSK-08-02가 이를 구현하도록 의존 방향을 뒤집는다(사실상 runtime 계약이 cli 계약을 리드). 커밋 시 TSK-08-02 design.md에서 `docs/tasks/TSK-09-02/design.md` 참조를 명시.
- **HIGH — AC #4 "픽셀 diff = 0" 엄격성**: 두 채널이 **동일한 schema 객체**를 ViewerHost에 주입해도 로딩 타이밍(network vs sync)으로 초기 프레임 렌더가 미세하게 다를 수 있다(폰트 로딩, 애니메이션). 완화 — (a) 두 spec 모두 `page.waitForLoadState('networkidle')` + `await page.locator('.fjs-powered-by').waitFor()` + 고정 delay(200ms) 후 캡처, (b) baseline은 **한 spec에서만 생성**하고 다른 spec은 재사용(spec 간 비교) 패턴으로 `diff = 0` 달성. diff 허용치는 phase-1-plan §4 AC 매트릭스가 "픽셀 diff = 0"을 명시하므로 pixelmatch `threshold: 0` + `includeAA: false`로 설정.
- **HIGH — localStorage 가드 (SSR/비브라우저)**: `ApiSchemaLoader` 기본 storage가 `localStorage`이나 SSR/Web Worker에서는 undefined. 완화 — 내부 storage adapter가 `typeof localStorage !== 'undefined'`를 런타임 체크하고 없으면 `MemoryStorage` fallback. 단위 테스트에서 SSR 시뮬레이션(delete global.localStorage) 케이스 포함.
- **MEDIUM — 304 Not Modified 캐시 일관성**: fetch가 304를 반환하면 body가 비어있으므로 localStorage의 lastGood를 신뢰해야 한다. 그런데 lastGood가 tampering되면(사용자 도구로 임의 수정) 잘못된 schema를 렌더할 수 있다. 완화 — lastGood 저장 시 `schemaHash` 도 함께 저장하고, 반환 직전에 재검증(`verifyStaticManifest`). 해시 불일치 시 캐시 무효화 + 재요청(`If-None-Match` 제거 후 재시도).
- **MEDIUM — ETag 헤더 누락 서버**: 실제 API가 ETag를 반환하지 않는 경우 fallback 루프가 정상 동작해야 한다. 완화 — `response.headers.get('ETag')`가 null이면 etag 저장 스킵하고 schema만 캐시. 다음 요청에는 `If-None-Match` 헤더 미송신.
- **MEDIUM — SubtleCrypto 비동기**: `crypto.subtle.digest`는 Promise를 반환하므로 `verifyStaticManifest`가 async 함수가 된다. StaticSchemaSource.load()도 async 되고, 다운스트림 API 전부 async 일관 유지. 완화 — 모든 loader API를 처음부터 async로 설계(이미 그렇게 잡힘). happy-dom에서 `crypto.subtle`이 미구현이면 테스트 환경에서 Node `crypto.webcrypto.subtle`을 polyfill. `vitest.config.ts`의 `setupFiles`에서 `globalThis.crypto = require('node:crypto').webcrypto` 주입.
- **MEDIUM — Playwright `page.route` mock의 ETag 헤더 주입**: Playwright가 `route.fulfill({ headers: { ETag: 'v1' } })`로 헤더 추가 가능. 2차 요청의 `If-None-Match: v1` 확인은 `route.handle` 안에서 request headers를 검사. 완화 — E2E 테스트에서 route handler를 카운터로 만들고 2회차 호출에서 `request.headers()['if-none-match']`를 assert.
- **LOW — examples/ 개발 서버 포트 충돌**: editor-host가 5173, 본 패키지가 5174. 다른 WP 개발 중 포트 예약 충돌 가능. 완화 — `vite.config.ts`에서 `server.port = 5174, server.strictPort = true` 로 명시, 충돌 시 즉시 실패.
- **LOW — 6 컴포넌트 샘플 schema 의존성**: TSK-04-02(tabs/modal) 또는 TSK-05-02(table) 미완 상태에서 E2E 실행 시 해당 컴포넌트 렌더 실패로 테스트 flaky 가능. 완화 — 샘플 schema에 포함되는 컴포넌트 타입 목록을 `examples/*/page.schema.json` 최상단 주석에 명시하고, 미완 타입은 주석 처리(card/stack/button 최소 3종이면 AC #4-1은 달성).

## QA 체크리스트

dev-test 단계에서 검증할 항목. 각 항목은 pass/fail로 판정 가능해야 한다.

**StaticSchemaSource (정상/엣지/에러)**
- [ ] (정상) `createStaticSource(schema).load()`가 `{ schema, etag: undefined, source: 'static' }`를 반환한다.
- [ ] (정상) manifest의 schemaHash가 schema의 SHA-256과 일치할 때 `load()`가 성공한다.
- [ ] (에러) manifest 해시 불일치 시 `load()`가 `ChannelError('manifest_mismatch')`로 reject된다.
- [ ] (엣지) schema의 key 순서가 달라도 정규화(sort)를 통해 동일 해시가 계산된다.
- [ ] (엣지) manifest 인자 미전달 시 해시 검증 스킵하고 성공 반환.

**ApiSchemaLoader (정상/캐시/fallback/에러)**
- [ ] (정상) 200 OK 응답 시 schema가 반환되고 localStorage에 etag + schema + schemaHash가 저장된다.
- [ ] (캐시) 2회차 호출이 저장된 ETag를 `If-None-Match` 헤더로 송신하고, 304 응답 시 캐시된 schema가 `source: 'cache'`로 반환된다.
- [ ] (fallback) 네트워크 에러(fetch throw) 시 저장된 lastGood schema가 `source: 'fallback'`로 반환되고 `onError`가 1회 호출된다.
- [ ] (fallback) 5xx 응답 시 lastGood fallback + `onError('http_5xx')` 호출.
- [ ] (에러) lastGood 없음 상태에서 네트워크 실패 → `ChannelError('no_fallback')`로 reject.
- [ ] (엣지) ETag 헤더 없는 200 응답 시 schema만 저장, etag는 `null`로 기록, 다음 요청에서 `If-None-Match` 헤더 미송신.
- [ ] (엣지) `env` 파라미터가 URL query로 올바르게 인코딩된다 (`?env=prod`).
- [ ] (엣지) timeout 초과 시 AbortError → fallback 경로로 처리.
- [ ] (통합) `storage` 주입을 MemoryStorage로 교체하면 localStorage 전혀 접근하지 않는다(spy로 검증).

**bootWithSchema (정상/엣지/에러/통합)**
- [ ] (정상) 유효한 schema + 등록된 registry → `{ ok: true, usedFallback: false, validation.ok: true }` 반환 및 `designer:schema-loaded` 이벤트 발화.
- [ ] (fallback) validate 실패 + lastGood 존재 → lastGood schema 반환 + `usedFallback: true` + `designer:schema-error` 이벤트 발화 + `onError` 호출 1회.
- [ ] (에러) validate 실패 + lastGood 없음 → `SchemaBootError` throw + `designer:schema-error` 이벤트 발화(usedFallback: false).
- [ ] (이벤트) `designer:schema-error` detail 구조가 `{ stage, errors, usedFallback }` 형태를 만족한다.
- [ ] (엣지) SSR 환경(`window` undefined) 에서 이벤트 발화가 no-op으로 처리되어 throw 없음.

**E2E (roundtrip, AC #4, #4-1)**
- [ ] (통합, E2E — static) `/examples/static/`로 이동 → ViewerHost가 schema를 렌더하고 `.fjs-form` 요소가 가시 상태가 된다.
- [ ] (통합, E2E — api) `/examples/api/`로 이동 → `page.route` mock이 `/api/schemas/demo` 요청에 200 + schema 응답 → ViewerHost 렌더 성공.
- [ ] (통합, E2E — api) 동일 페이지 reload 시 2차 요청이 `If-None-Match: v1` 헤더를 포함하고, mock이 304로 응답해도 schema가 정상 렌더된다(캐시 경로).
- [ ] (통합, E2E — 픽셀 파리티) static 스크린샷과 api 스크린샷이 pixelmatch `threshold: 0, includeAA: false`로 **diff = 0 픽셀** (AC #4, #4-1 직접 증명).
- [ ] (통합, E2E — 실패 알림) api mock이 500 응답 + lastGood 미존재 시 `designer:schema-error` 이벤트가 발화되고 Host의 에러 박스(`[data-testid="schema-error-box"]`)가 렌더된다.

**통합 / 회귀**
- [ ] (회귀) `packages/designer-core` 전체 Vitest 케이스가 본 Task로 인해 깨지지 않는다(validate 모듈 계약은 그대로 import).
- [ ] (회귀) `packages/designer-editor-host`의 LivePreview 관련 E2E가 영향받지 않는다(designer-runtime은 editor-host와 분리).
- [ ] (계약) `createApiLoader`/`createStaticSource`의 public 타입 시그니처가 TypeScript에서 `tsc --noEmit` 통과하며, 외부 import 시 타입이 정확히 resolve된다.
- [ ] (라이선스) `packages/designer-runtime/package.json`에 dependencies 신규 추가 없음(SubtleCrypto 내장 사용). devDependencies만 추가.
- [ ] (성능) `ApiSchemaLoader.load()`의 캐시 hit 경로(304)가 100ms 미만에 완료된다(Vitest timer 측정).
