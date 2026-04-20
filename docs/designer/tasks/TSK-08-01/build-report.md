# TSK-08-01: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-cli/package.json` | `@form-js-designer/designer-cli` 패키지 선언, ESM, bin, scripts, ajv 의존 | 신규 |
| `packages/designer-cli/tsconfig.json` | `module: NodeNext`, `moduleResolution: NodeNext`, `target: ES2022` | 신규 |
| `packages/designer-cli/vitest.config.ts` | `environment: 'node'`, include `src/**/__tests__/**/*.test.ts` | 신규 |
| `packages/designer-cli/bin/designer-cli.mjs` | shebang 엔트리, `parseArgs` 2-step 패턴, validate/import 서브커맨드 분기 | 신규 |
| `packages/designer-cli/src/commands/validate.ts` | `runValidate(filePath, opts)` — JSON 파싱 + Ajv 구조 검증 + 컴포넌트 타입 등록 검사 + i18n stub, exit 0/1 반환 | 신규 |
| `packages/designer-cli/src/commands/import.ts` | `runImport(filePath, opts)` — 경로 정규화 + 디렉토리 자동 생성 + 중복 방지 복사, exit 0/1 반환 | 신규 |
| `packages/designer-cli/src/registry/types.ts` | `CLIRegistry` 인터페이스 (`has(type): boolean`) | 신규 |
| `packages/designer-cli/src/registry/cliRegistry.ts` | form-js 기본 타입 + designer-components + designer-table 정적 맵, `getCLIRegistry()` | 신규 |
| `packages/designer-cli/src/i18n/i18nCheck.ts` | `checkI18n()` — TSK-07-02 완료 전 stub (missing: []) | 신규 |
| `packages/designer-cli/src/utils/fileUtils.ts` | `resolveNonConflicting()` (복합 확장자 지원), `ensureDir()` | 신규 |
| `packages/designer-cli/src/utils/exitWithError.ts` | `exitWithError(message)` — stderr 출력 후 exit 1 | 신규 |
| `packages/designer-cli/src/__tests__/validate.test.ts` | validate 단위 테스트 6케이스 | 신규 |
| `packages/designer-cli/src/__tests__/import.test.ts` | import 단위 테스트 7케이스 | 신규 |
| `packages/designer-cli/src/__tests__/fileUtils.test.ts` | fileUtils 단위 테스트 5케이스 | 신규 |
| `packages/designer-cli/src/__tests__/cliRegistry.test.ts` | cliRegistry 단위 테스트 4케이스 | 신규 |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 22 | 0 | 22 |

## E2E 테스트 (작성만 — 실행은 dev-test)

N/A — cli domain (frontend/fullstack이 아님)

## 커버리지 (Dev Config에 coverage 정의 시)

Dev Config의 `quality_commands.coverage`는 `packages/designer-core`용으로 설정되어 있어 designer-cli에 적용되지 않음. N/A.

## 비고

- **resolveNonConflicting 복합 확장자 처리**: `.schema.json` 같은 복합 확장자에서 `path.extname`은 `.json`만 반환하므로, stem을 첫 번째 `.` 기준으로 분리하는 방식으로 구현. `ai-output.schema.json` → stem=`ai-output`, ext=`.schema.json` → suffix 결과 `ai-output-1.schema.json`.
- **designer-core/validate/validateSchema.ts 미존재**: design.md 리스크 HIGH 완화 방향대로 CLI 내부에 Ajv 인라인 검증을 구현. TSK-06-02 build 완료 후 공용 함수로 교체 예정.
- **i18n 검사 stub**: TSK-07-02 의존으로 `checkI18n`은 stub(missing: []) 상태. 테스트 케이스는 stub 동작을 명시적으로 주석 처리.
- **designer-components `button` 타입**: designer-components/src/index.ts에 `ButtonComponent`가 있으나 cliRegistry에서는 form-js 기본 `button` 타입과 충돌 없이 동일 키로 등록됨.
