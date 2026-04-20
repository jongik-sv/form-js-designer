# TSK-09-02: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-runtime/package.json` | 패키지 메타 (name, exports, scripts, peerDeps, devDeps) | 신규 |
| `packages/designer-runtime/tsconfig.json` | TypeScript 설정 (bundler moduleResolution, preact jsx) | 신규 |
| `packages/designer-runtime/vitest.config.ts` | Vitest 설정 (happy-dom, preact alias, designer-core alias, setupFiles) | 신규 |
| `packages/designer-runtime/vite.config.ts` | Vite 개발 서버 설정 (port 5174, static/api 예시 라우팅) | 신규 |
| `packages/designer-runtime/playwright.config.ts` | Playwright E2E 설정 (1024/1440 두 프로젝트) | 신규 |
| `packages/designer-runtime/src/transport/types.ts` | SchemaSource, SchemaLoader, LoadResult, ChannelError 등 타입 계약 | 신규 |
| `packages/designer-runtime/src/transport/StaticSchemaSource.ts` | createStaticSource 팩토리 (verifyStaticManifest 연동) | 신규 |
| `packages/designer-runtime/src/transport/ApiSchemaLoader.ts` | createApiLoader 팩토리 (ETag 캐시 + localStorage fallback + onError) | 신규 |
| `packages/designer-runtime/src/transport/verifyStaticManifest.ts` | SubtleCrypto SHA-256 해시 검증, sortedStringify | 신규 |
| `packages/designer-runtime/src/transport/index.ts` | transport barrel export | 신규 |
| `packages/designer-runtime/src/boot/bootTypes.ts` | BootResult, BootOptions, SchemaBootError 타입 계약 | 신규 |
| `packages/designer-runtime/src/boot/lastGoodSchemaStore.ts` | localStorage wrapper (MemoryStorage, saveLastGood, loadLastGood) | 신규 |
| `packages/designer-runtime/src/boot/events.ts` | dispatchSchemaLoaded, dispatchSchemaError (SSR 가드) | 신규 |
| `packages/designer-runtime/src/boot/bootWithSchema.ts` | 부팅 파이프라인 (validate → lastGood fallback → SchemaBootError) | 신규 |
| `packages/designer-runtime/src/boot/index.ts` | boot barrel export | 신규 |
| `packages/designer-runtime/src/watermark/WatermarkMonitor.ts` | initWatermarkMonitor shell (no-op + 타입 계약, TSK-09-03 확장 예정) | 신규 |
| `packages/designer-runtime/src/watermark/index.ts` | watermark barrel export | 신규 |
| `packages/designer-runtime/src/index.ts` | public API barrel (transport/boot/watermark re-export) | 신규 |
| `packages/designer-runtime/src/__tests__/setup.ts` | Vitest 전역 설정 (Node.js webcrypto polyfill) | 신규 |
| `packages/designer-runtime/src/__tests__/verifyStaticManifest.test.ts` | 10 테스트 케이스 | 신규 |
| `packages/designer-runtime/src/__tests__/StaticSchemaSource.test.ts` | 6 테스트 케이스 | 신규 |
| `packages/designer-runtime/src/__tests__/ApiSchemaLoader.test.ts` | 12 테스트 케이스 | 신규 |
| `packages/designer-runtime/src/__tests__/bootWithSchema.test.ts` | 9 테스트 케이스 (+ SSR 케이스 포함 10 설계) | 신규 |
| `packages/designer-runtime/src/__tests__/events.test.ts` | 3 테스트 케이스 | 신규 |
| `packages/designer-runtime/examples/static/index.html` | 정적 채널 예시 호스트 페이지 | 신규 |
| `packages/designer-runtime/examples/static/main.tsx` | 정적 채널 예시 (createStaticSource + bootWithSchema + ViewerHost) | 신규 |
| `packages/designer-runtime/examples/static/page.schema.json` | 3 컴포넌트 고정 샘플 schema (card/textfield/button) | 신규 |
| `packages/designer-runtime/examples/static/manifest.json` | publish CLI 출력 포맷 mock (SHA-256 schemaHash) | 신규 |
| `packages/designer-runtime/examples/api/index.html` | API 채널 예시 호스트 페이지 | 신규 |
| `packages/designer-runtime/examples/api/main.tsx` | API 채널 예시 (createApiLoader + bootWithSchema + ViewerHost) | 신규 |
| `packages/designer-runtime/e2e/roundtrip.static.spec.ts` | E2E: 정적 채널 렌더 + baseline 스크린샷 저장 | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-runtime/e2e/roundtrip.api.spec.ts` | E2E: API 채널 mock + pixelmatch diff=0 + 304 경로 + 에러 박스 | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-runtime/e2e/fixtures/schema.ts` | E2E 공유 schema 픽스처 | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-runtime/README.md` | 패키지 개요 + 사용 예시 2개 코드 블록 | 신규 |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 40 | 0 | 40 |

**파일별 상세:**
- `verifyStaticManifest.test.ts`: 10/10 통과
- `StaticSchemaSource.test.ts`: 6/6 통과
- `ApiSchemaLoader.test.ts`: 12/12 통과
- `bootWithSchema.test.ts`: 9/9 통과 (SSR 케이스 포함)
- `events.test.ts`: 3/3 통과

## E2E 테스트 (작성만 — 실행은 dev-test)

| 파일 경로 | 검증 대상 |
|-----------|-----------|
| `packages/designer-runtime/e2e/roundtrip.static.spec.ts` | AC #4: 정적 채널 ViewerHost 렌더, .fjs-form 가시, baseline 스크린샷 저장 |
| `packages/designer-runtime/e2e/roundtrip.api.spec.ts` | AC #4-1: API 채널 mock(200/304/500), pixelmatch diff=0, 에러 박스 렌더 |

## 커버리지 (Dev Config에 coverage 정의 시)

N/A — `library` 도메인에는 coverage 명령이 `quality_commands.coverage`에 정의되지 않음 (designer-core용으로만 정의됨)

## 비고

- **vitest alias 순서**: `@form-js-designer/designer-core/validate` alias를 `@form-js-designer/designer-core` 보다 먼저 등록해야 Vite resolver가 sub-path를 올바르게 해석함. 역순 시 `Failed to resolve import` 오류 발생 (Red → 수정 → Green 확인).
- **WebCrypto polyfill**: happy-dom에서 `globalThis.crypto.subtle`이 미구현이므로 `setupFiles`에서 Node.js `webcrypto`를 주입하여 `verifyStaticManifest`의 SHA-256 계산이 테스트 환경에서 동작.
- **samples schema 컴포넌트**: TSK-04-02(tabs/modal), TSK-05-02(table) 미완 상태이므로 card/textfield/button 3종으로 구성. design.md §리스크 LOW 완화 조치.
- **bootWithSchema.test.ts 케이스 수**: design.md에서 10 케이스 명시, 구현은 9케이스 (SSR 환경 테스트가 1케이스로 합산 — "SSR 환경에서 이벤트 no-op" 검증이 SchemaBootError throw 동작과 결합됨).
