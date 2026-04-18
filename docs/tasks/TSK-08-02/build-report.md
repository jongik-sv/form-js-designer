# TSK-08-02: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-cli/src/io/hash.ts` | `sha256File(path)` — Node crypto 스트림 SHA-256 유틸 | 신규 |
| `packages/designer-cli/src/io/httpClient.ts` | `HttpClient` 인터페이스 + `FetchHttpClient` 기본 구현 | 신규 |
| `packages/designer-cli/src/publish/manifest.ts` | `Manifest` 타입, `buildManifestEntry`, `readManifestSafe`, `writeManifestAtomic` | 신규 |
| `packages/designer-cli/src/publish/staticTarget.ts` | `publishStatic` — atomic 복사 + manifest merge | 신규 |
| `packages/designer-cli/src/publish/apiTarget.ts` | `publishApi` — PUT /api/schemas/{id} + ETag + 오류 매핑 | 신규 |
| `packages/designer-cli/src/commands/publish.ts` | `runPublish` — target 분기 엔트리포인트 | 신규 |
| `packages/designer-cli/src/__tests__/manifest.test.ts` | Manifest 해시 일관성·merge 로직 단위 테스트 (9개) | 신규 |
| `packages/designer-cli/src/__tests__/publish.static.test.ts` | Static target 단위 테스트 (9개) | 신규 |
| `packages/designer-cli/src/__tests__/publish.api.test.ts` | API target Mock HttpClient 단위 테스트 (8개) | 신규 |
| `packages/designer-cli/e2e/cli.roundtrip.spec.ts` | Playwright: validate → import → publish(static) → viewer 렌더 → pixel diff | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-cli/e2e/fixtures/sample.schema.json` | round-trip 기준 폼 스키마 (textfield/checkbox/button 기본 컴포넌트) | 신규 |
| `packages/designer-cli/e2e/helpers/staticServer.ts` | port 0 정적 파일 서버 (publish 산출 디렉토리 서빙) | 신규 |
| `packages/designer-cli/e2e/helpers/viewerPage.html` | form-js viewer 부트스트랩 HTML (ES module + data-status) | 신규 |
| `packages/designer-cli/playwright.config.ts` | Playwright 설정 (testDir: e2e/, chromium) | 신규 |
| `packages/designer-cli/bin/designer-cli.mjs` | `publish` subcommand 등록 (--target/--out/--id/--url/--etag) | 수정 |
| `packages/designer-cli/src/commands/validate.ts` | Ajv named import, `ErrorObject` 타입 수정 (기존 타입 에러 해결) | 수정 |
| `packages/designer-cli/tsconfig.json` | `e2e/**/*`, `playwright.config.ts` include 추가 | 수정 |
| `packages/designer-cli/package.json` | `@playwright/test`, `pixelmatch`, `pngjs` devDependencies 추가, `test:e2e` 스크립트 실제 playwright 실행으로 업데이트 | 수정 |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 48 | 0 | 48 |

세부:
- `manifest.test.ts`: 9/9 통과 (해시 일관성, merge 로직, atomic 쓰기)
- `publish.static.test.ts`: 9/9 통과 (정상·idempotent·자동 mkdir·에러 케이스)
- `publish.api.test.ts`: 8/8 통과 (ETag, If-Match, 412, 네트워크 오류, URL 정규화, weak ETag)
- 기존 4개 파일: 22/22 통과 (regression 없음)

## E2E 테스트 (작성만 — 실행은 dev-test)

| 파일 경로 | 검증 대상 |
|-----------|-----------|
| `packages/designer-cli/e2e/cli.roundtrip.spec.ts` | AC #3 Case 1 save: publish 산출물·manifest·해시 검증 |
| `packages/designer-cli/e2e/cli.roundtrip.spec.ts` | AC #3 Case 2 load: viewer DOM 렌더 + data-status=stable 확인 |
| `packages/designer-cli/e2e/cli.roundtrip.spec.ts` | AC #3 Case 3 round-trip: PNG pixelmatch ≤ 2% (golden 초기 생성 포함) |

## 커버리지 (Dev Config에 coverage 정의 시)

- Dev Config의 `quality_commands.coverage`는 `packages/designer-core`를 대상으로 하며 `designer-cli`를 별도 측정하지 않음 → N/A

## 비고

- `validate.ts`의 Ajv import가 `import Ajv from 'ajv'` (default import)에서 `import { Ajv } from 'ajv'` (named import)로 수정됨. 기존 typecheck에서도 실패하던 에러로, TSK-08-02 범위에서 동시 해결함.
- golden 이미지(`e2e/fixtures/golden/roundtrip.png`)는 E2E 최초 실행 시 자동 생성됨(`--update-snapshots` 없이도 동작).
- design.md 리스크 HIGH 항목 — TSK-08-01 스캐폴드 확인: `packages/designer-cli/bin/designer-cli.mjs` 존재 확인 완료, publish subcommand 등록 완료.
