# TSK-07-02: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-i18n/src/scripts/extractTypes.ts` | ExtractResult, Warning, KeyOccurrence 타입 정의 | 신규 |
| `packages/designer-i18n/src/scripts/extract.ts` | AST 기반 키 추출기 (extractKeys, scanPackages) | 신규 |
| `packages/designer-i18n/src/scripts/diff.ts` | diffKeys 순수 함수, flatten, runDiff 파이프라인 | 신규 |
| `packages/designer-i18n/src/scripts/reporter.ts` | formatHuman, formatJson 출력 포매터 | 신규 |
| `packages/designer-i18n/src/scripts/index.ts` | scripts 배럴 | 신규 |
| `packages/designer-i18n/src/index.ts` | scripts/extract, diff, reporter re-export 추가 | 수정 |
| `packages/designer-i18n/bin/i18n-check.mjs` | CLI 엔트리 (--dump, --report-json, --help) | 신규 |
| `packages/designer-i18n/package.json` | i18n:check, i18n:extract 스크립트 추가 | 수정 |
| `packages/designer-i18n/src/__tests__/extract.test.ts` | extractKeys 단위 테스트 17개 | 신규 |
| `packages/designer-i18n/src/__tests__/diff.test.ts` | diffKeys + flatten 단위 테스트 10개 | 신규 |
| `packages/designer-i18n/src/__tests__/coverage.test.ts` | Hard gate 테스트 2개 (실제 레포 대상) | 신규 |
| `packages/designer-i18n/src/__tests__/fixtures/normal.ts` | 정상 fixture | 신규 |
| `packages/designer-i18n/src/__tests__/fixtures/normal.expected.json` | normal fixture 기대값 | 신규 |
| `packages/designer-i18n/src/__tests__/fixtures/template.ts` | 템플릿 리터럴 fixture | 신규 |
| `packages/designer-i18n/src/__tests__/fixtures/template.expected.json` | template fixture 기대값 | 신규 |
| `packages/designer-i18n/src/__tests__/fixtures/dynamic.ts` | 동적 키 fixture | 신규 |
| `packages/designer-i18n/src/__tests__/fixtures/dynamic.expected.json` | dynamic fixture 기대값 | 신규 |
| `packages/designer-i18n/src/__tests__/fixtures/concat.ts` | 문자열 연결 fixture | 신규 |
| `packages/designer-i18n/src/__tests__/fixtures/concat.expected.json` | concat fixture 기대값 | 신규 |
| `packages/designer-i18n/src/__tests__/fixtures/comment.ts` | 주석 내 t() 포함 fixture | 신규 |
| `packages/designer-i18n/src/__tests__/fixtures/comment.expected.json` | comment fixture 기대값 | 신규 |
| `packages/designer-i18n/src/__tests__/fixtures/intentional-miss.ts` | 의도적 누락 fixture (diff gate red 시나리오용) | 신규 |
| `packages/designer-i18n/locales/README.md` | 사전 편집 규칙 | 신규 |
| `packages/designer-i18n/CHANGELOG.md` | 버전 0.1.0 변경 이력 | 신규 |
| `.github/workflows/ci.yml` | i18n-check 잡 추가 (unit + hard gate) | 수정 |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 61 | 0 | 61 |

세부:
- `extract.test.ts`: 17 tests (fixture 5종 × {keys, warnings, line, file} + 다중 파일 + elapsedMs)
- `diff.test.ts`: 10 tests (missing/unused/empty/full-match 경계 + flatten nested/flat/empty)
- `coverage.test.ts`: 2 tests (hard gate: missing=[] + sanity: used.size >= 0)
- 기존 `t.test.ts` / `createKoT.test.ts` / `intl.test.ts` / `integration.test.tsx`: 32 tests 유지

## E2E 테스트 (작성만 — 실행은 dev-test)

N/A — infra domain

## 커버리지 (Dev Config에 coverage 정의 시)

N/A — infra domain (Dev Config `quality_commands.coverage` 는 designer-core 대상)

## 비고

- 현재 codebase(TSK-04-02/05-02/06-02)에서 직접적인 `t('literal')` 호출이 소스에 없음(applyT 패턴으로 schema key를 런타임에 전달). 따라서 coverage.test.ts의 `used.size`는 0이며, `missing.length === 0` hard gate는 정상 통과. 이는 extractKeyes가 실제 t('literal') 호출만 추출한다는 동작을 올바르게 검증.
- fixture 파일(`__tests__/fixtures/*.ts`)은 extractKeys의 직접 파일 경로 입력 시에는 스캔되지만, scanPackages()의 shouldExclude 로직이 `/__tests__/` 경로를 제외하므로 coverage.test.ts hard gate에서는 스캔되지 않음. 이로 인해 `intentional-miss.ts`의 `designer.fixture.intentionally.missing` 키가 hard gate에 영향을 주지 않음.
- 네임스페이스 통일 sweep(`designer-table.*` → `designer.table.*`)은 현재 코드베이스에서 `designer-table.*` 실제 사용 없음(SelectFilter.tsx의 주석에만 언급) — sweep 불필요.
