# TSK-08-02: publish (static + API) + round-trip E2E - 설계

## 요구사항 확인
- **P1**: `designer-cli publish <file> --target static [--out <dir>]` — 스키마 파일과 해시 기반 `manifest.json`을 지정 디렉토리에 복사 (TRD §6.3, PRD AC #3·#9).
- **P2**: `designer-cli publish <file> --target api --url <URL> [--id <schemaId>]` — `PUT /api/schemas/{id}`로 업로드하고 응답 `ETag`를 stdout·manifest 또는 `.etag`에 기록 (TRD §6.2).
- **P3**: `cli.roundtrip.spec.ts` — `validate → import → publish(static) → form-js-viewer 렌더 → 픽셀 비교` 일체 경로가 무손실임을 자동 검증 (PRD AC #3/#4/#9, phase-1-plan §4 AC#3 매트릭스: save+load+validate=3 케이스).

## 타겟 앱
- **경로**: `packages/designer-cli` (신규 패키지, TSK-08-01에서 스캐폴드 예정)
- **근거**: WBS `domain: cli` + TRD §6.3 ("designer-cli")에 정의된 Node CLI. form-js viewer 렌더 픽셀 비교는 `packages/designer-editor-host`(viewer 번들 구동) 또는 `designer-cli` e2e 내 로컬 http-server로 수행.

## 구현 방향
- TSK-08-01이 만든 `packages/designer-cli` 공통 기반(`commands/validate.ts`, `commands/import.ts`, `bin/designer-cli.mjs`, 인자 파서, exit-code 규약)을 재사용하고 **이 Task는 `commands/publish.ts`만 추가**한다. 외부 네트워크 추상화는 `src/io/httpClient.ts`(fetch 래퍼, 단위 테스트 시 주입)로 분리한다.
- Static 타겟: 입력 파일(단일 schema `.json`) → 출력 디렉토리로 복사 + `manifest.json`(해시·파일명·바이트 수·생성 시각)을 생성. 복사는 atomic(`fs.cp` + rename)으로 하고, 기존 manifest는 ID/해시 기준 merge-update.
- API 타겟: `fetch(url + '/api/schemas/' + id, { method: 'PUT', headers: { 'content-type':'application/json', 'If-Match': <기존 ETag 있을 때> }, body: JSON.stringify(schema) })`. 응답 `ETag` 헤더를 stdout(JSON 한 줄)·`--etag-out` 파일에 기록. 4xx/5xx는 exit 1.
- Round-trip E2E: Playwright로 `designer-editor-host`의 **viewer-only** HTML 페이지(또는 e2e 전용 tiny viewer 페이지)를 띄워, publish(static) 산출물 디렉토리를 static server로 서빙 → URL 파라미터로 schema 경로 주입 → 캡처한 PNG와 `e2e/fixtures/golden/` 이미지 pixelmatch(임계 ≤ 2% mismatched, 오버레이 영역은 mask).

## 파일 계획

**경로 기준:** 프로젝트 루트 기준. 타겟 패키지 `packages/designer-cli/` 접두어 필수.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-cli/src/commands/publish.ts` | `publish` 명령 엔트리. target 분기(`static`/`api`), 옵션 파싱, exit-code 관리 | 신규 |
| `packages/designer-cli/src/publish/staticTarget.ts` | 디렉토리 복사 + manifest 생성(`hashFile`, `mergeManifest`) | 신규 |
| `packages/designer-cli/src/publish/apiTarget.ts` | `PUT /api/schemas/{id}` 호출 + ETag 처리 + 오류 매핑 | 신규 |
| `packages/designer-cli/src/publish/manifest.ts` | `Manifest` 타입/스키마(Ajv)·`buildManifestEntry`·`readManifestSafe`·`writeManifestAtomic` | 신규 |
| `packages/designer-cli/src/io/httpClient.ts` | `HttpClient` 인터페이스(`put(url, body, headers)`) + fetch 기본 구현. 테스트에서 Mock 주입 | 신규 |
| `packages/designer-cli/src/io/hash.ts` | `sha256File(path)` — Node `crypto` 스트림 해시 유틸 | 신규 |
| `packages/designer-cli/bin/designer-cli.mjs` | TSK-08-01 엔트리에 `publish` subcommand 등록 | 수정 |
| `packages/designer-cli/src/index.ts` | `publish` export 추가 | 수정 |
| `packages/designer-cli/__tests__/publish.static.test.ts` | Vitest + `tmp` 디렉토리: 복사·manifest·idempotency·잘못된 입력 | 신규 |
| `packages/designer-cli/__tests__/publish.api.test.ts` | Vitest + Mock HttpClient: 성공/ETag/If-Match 충돌/네트워크 오류 | 신규 |
| `packages/designer-cli/__tests__/manifest.test.ts` | manifest 해시 일관성·merge 로직 단위 | 신규 |
| `packages/designer-cli/e2e/cli.roundtrip.spec.ts` | Playwright: `validate → import → publish(static) → viewer 렌더 → pixel diff` | 신규 |
| `packages/designer-cli/e2e/fixtures/sample.schema.json` | round-trip 기준 폼 스키마(form-js schemaVersion=19 + 신규 컴포넌트 ≥1개) | 신규 |
| `packages/designer-cli/e2e/fixtures/golden/roundtrip.png` | 기대 렌더 이미지(초기 1회 생성, `--update-snapshots`) | 신규 |
| `packages/designer-cli/e2e/helpers/staticServer.ts` | Node `http` 서버(publish 산출 디렉토리 서빙)·port 0 할당 | 신규 |
| `packages/designer-cli/e2e/helpers/viewerPage.html` | form-js viewer 부트스트랩(ES module import + `fetch(schemaUrl)`) | 신규 |
| `packages/designer-cli/playwright.config.ts` | `webServer` = 로컬 viewerPage + e2e 스위트 설정 | 신규 |
| `packages/designer-cli/package.json` | `scripts.test:e2e`·`scripts.test:unit`·의존성(`ajv`, `pixelmatch`, `pngjs`, `@playwright/test`, `@bpmn-io/form-js-viewer`) 업데이트 | 수정 |
| `docs/tasks/TSK-08-02/design.md` | 본 설계 문서 | 신규 |

## 진입점 (Entry Points)
- **domain = cli** → UI 진입점 없음. **N/A**.
- CLI 진입점: `npx designer-cli publish <file> --target <static|api> ...` — `packages/designer-cli/bin/designer-cli.mjs`에서 분기. 실제 사용자 호출은 README `usage` 블록에 문서화한다(별도 UI 없음).

## 주요 구조
- `publish.ts` `runPublish(argv): Promise<number>` — 옵션 파싱, `validate` 재사용(사전 검증), target 분기, 실패 시 exit 1.
- `staticTarget.ts` `publishStatic({ file, outDir, id? }): Promise<ManifestEntry>` — 원자적 복사 + manifest merge. **해시 변화 없으면 재기록 스킵**(pure idempotent).
- `apiTarget.ts` `publishApi({ file, url, id, http, prevEtag? }): Promise<{ etag: string; status: number }>` — `If-Match` 헤더로 Optimistic concurrency, 412(Precondition Failed)는 명시적 exit 2(로컬 stale) 예약 대신 stderr 한국어 메시지 + exit 1.
- `manifest.ts` `Manifest = { version: 1, generatedAt: string, entries: Record<id, { file, sha256, bytes, updatedAt }> }` — `version=1` 고정, 향후 migration 여지.
- `httpClient.ts` `interface HttpClient { put(url, body, headers): Promise<{ status, headers, bodyText }> }` — 구현 하나 + 테스트 더블.
- `cli.roundtrip.spec.ts` — Playwright 테스트 3 케이스(PRD AC #3 매트릭스 `save+load+validate`):
  1. **save**: `publish --target static` 산출 디렉토리에 schema 복사본·manifest 존재, 해시 일치.
  2. **load**: viewer가 정적 URL에서 스키마 fetch 후 Ajv 검증 에러 없이 렌더.
  3. **validate (round-trip)**: 렌더 결과 PNG vs golden pixelmatch ≤ 2% (오버레이/워터마크 영역 mask).

## 데이터 흐름
- **Static**: `<file.json>` → `validate` → `copy(file → out/<id>.schema.json)` + `merge(manifest.json)` → exit 0 + stdout JSON `{ id, sha256, out }`.
- **API**: `<file.json>` → `validate` → `fetch PUT <url>/api/schemas/<id>` (If-Match optional) → 응답 `ETag` → stdout JSON `{ id, etag, status }`.
- **Round-trip E2E**: `publish(static)` → `staticServer(outDir)` → `page.goto(viewerPage.html?schema=/out/<id>.schema.json)` → `expect(pngDiff).toBeLessThan(threshold)`.

## 설계 결정 (대안이 있는 경우만)
- **결정(M1)**: `httpClient`를 별도 인터페이스로 추출하고 주입.
  - **대안**: `globalThis.fetch` 직접 호출 + `msw/node` 모킹.
  - **근거**: CLI 단위 테스트는 node 전용이라 msw 부트스트랩 비용이 아까움. 간단 인터페이스가 작동·가독 모두 유리하고 E2E에서는 실 API 대신 `staticServer`로 커버.
- **결정(M2)**: Round-trip viewer는 `designer-cli/e2e/helpers/viewerPage.html`(최소 viewer) 사용.
  - **대안**: `designer-editor-host` 전체를 E2E 타겟으로 사용.
  - **근거**: AC #3는 "뷰어에서 동일 렌더" 증명. 에디터 host는 AC #1·#4-1 담당이고 여기에 얽히면 의존 폭주. 이 테스트는 **뷰어 전용 경로**만 다룬다. AC #4-1 pixel parity는 §3.8 전용 테스트로 위임.
- **결정(M3)**: `manifest.json` schema v1 고정 + Ajv 런타임 검증.
  - **대안**: freeform 오브젝트.
  - **근거**: 하위 호환/CI 게이트용 drift 방지. TRD §9 "운영 부팅 Ajv 검증" 원칙과 일치.
- **결정(M4)**: exit-code 계약: 0 = 성공, 1 = 검증·I/O·네트워크 실패, 2 = 예약(현재 미사용).
  - **대안**: fine-grained 다중 코드.
  - **근거**: TSK-08-01 `validate` 의 exit 0/1 규약과 일치(일관성).

## 선행 조건
- **TSK-08-01 완료**: `packages/designer-cli` 스캐폴드, `validate`/`import` 명령, 인자 파서, i18n diff 모듈이 선행. 본 Task는 그 위에 `publish`만 얹는다.
- **TSK-08-01 미완 시 리스크**: CLI 엔트리/패키지 구조가 없으면 본 Task 시작 불가. dev-build 전에 `git` 또는 WBS 상태로 TSK-08-01 `[done]` 확인(체크포인트).
- 외부 의존: `@bpmn-io/form-js-viewer ^1.21.2`(round-trip 렌더), `ajv ^8.18`(manifest schema), `pixelmatch ^6`/`pngjs ^7`(이미 `designer-core`에서 사용 중), `@playwright/test ^1.47.2`.

## 리스크
- **HIGH**: `packages/designer-cli` 패키지가 TSK-08-01에서 미스캐폴드된 상태로 dev-build 진입 → Task 블로킹. *완화*: dev-build Step 0에서 `packages/designer-cli/bin/designer-cli.mjs` 존재 검사, 없으면 즉시 사용자에게 에스컬레이션(의존 Task 재개 요청).
- **HIGH**: Round-trip 픽셀 비교의 비결정성(폰트 로딩, form-js 렌더 타이밍). *완화*: viewerPage.html에서 `document.fonts.ready` await + `requestAnimationFrame` 2회 대기, `.fjs-powered-by`·디자이너 오버레이 영역은 mask, `threshold: 0.1`(pixelmatch)·`maxDiffPixelRatio ≤ 0.02`.
- **MEDIUM**: ETag 헤더 표준화(서버가 `W/` weak ETag 반환). *완화*: CLI에서 그대로 pass-through, 비교는 서버 위임. 테스트는 strong/weak 두 케이스 fixture.
- **MEDIUM**: Manifest merge race(동일 outDir에 병렬 publish). *완화*: `writeManifestAtomic`은 tmp-file + `rename`. CLI는 단일 프로세스 가정하지만 docs에 "outDir별 단일 process" 명시.
- **MEDIUM**: Viewer가 신규 컴포넌트(table 등) 모듈을 로드하려면 `additionalModules`가 필요 → viewerPage.html이 어디서 import할지. *완화*: fixture schema는 form-js **기본** 컴포넌트(textfield/button/checkbox) 위주로 구성. 신규 컴포넌트 round-trip은 TSK-08-03/09 범위.
- **LOW**: Node20 `fetch`/`Response.headers` 케이스 표기 차이. *완화*: 헤더 키는 소문자로 normalize.
- **LOW**: Windows 경로 구분자. *완화*: `path.posix` / `path.sep` 정상화 유틸.

## QA 체크리스트
dev-test 단계에서 검증할 항목. 각 항목은 pass/fail로 판정 가능.

**Static target (정상/엣지/에러)**
- [ ] 정상: `publish sample.schema.json --target static --out /tmp/out` 실행 후 `/tmp/out/<id>.schema.json`이 원본과 바이트 단위 동일하고, `manifest.json`의 `entries[id].sha256`이 `sha256sum` CLI 결과와 일치.
- [ ] 엣지: 동일 파일 재실행 시 exit 0, manifest 내 `updatedAt`만 갱신되고 sha256 불변(idempotent).
- [ ] 엣지: `--out` 디렉토리가 없으면 자동 생성(`mkdir -p`), 쓰기 권한 없으면 exit 1 + stderr 한국어 메시지.
- [ ] 에러: 입력 파일이 Ajv 검증 실패 → publish 미수행, exit 1, outDir 무변화.
- [ ] 에러: 입력 파일이 없거나 JSON 파싱 실패 → exit 1 + 한국어 에러.

**API target (정상/엣지/에러)**
- [ ] 정상: Mock server가 `200 + ETag: "abc"` 반환 시 stdout JSON에 `"etag":"abc"`, exit 0.
- [ ] 엣지: `--etag <prev>` 주입 시 `If-Match` 헤더 포함됨(HttpClient mock spy로 검증).
- [ ] 에러: `412 Precondition Failed` 응답 → exit 1 + stderr 한국어 "원격 스키마가 변경되었습니다" 유사 메시지.
- [ ] 에러: 네트워크 예외(`fetch` throw) → exit 1, stacktrace 미노출(사용자 친화 메시지).
- [ ] 엣지: `--url` 끝 슬래시 유무 모두 허용(정규화).

**Round-trip E2E (`cli.roundtrip.spec.ts`, AC #3 매트릭스 3케이스)**
- [ ] save: publish(static) 실행 후 outDir에 schema 복사본·manifest 존재, 해시 일치.
- [ ] load: viewer가 publish 산출 URL을 fetch하여 Ajv 검증 pass + DOM에 폼 컨트롤 렌더링.
- [ ] validate(round-trip): 렌더 PNG와 golden PNG의 `maxDiffPixelRatio ≤ 0.02` (오버레이/워터마크 mask 적용).

**공통**
- [ ] `exit 0` = 전체 성공, `exit 1` = 어느 단계든 실패(TSK-08-01 규약과 일치).
- [ ] 모든 사용자 메시지는 한국어(PRD AC #5) — stderr 포함. `t('cli.publish.*')` 키로 분리.
