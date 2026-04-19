# TSK-08-01: validate + import 명령 - 설계

## 요구사항 확인
- `packages/designer-cli` 신규 패키지(Node ≥20, ESM)에 `validate <file>` 과 `import <file> --to <project-path>` 두 CLI 명령을 구현한다. `validate`는 Ajv로 form-js schemaVersion=19 구조와 신규 컴포넌트 `type` 등록 여부를 검증하고, `designer-i18n`(TSK-07-02) 정적 추출기의 diff 로직을 재사용해 i18n 누락 키도 검사하며 exit 0/1 규약을 준수한다(TRD §6.3, PRD §4 AC #3).
- `import`는 AI가 생성한 `schemas/drafts/*.schema.json`을 지정 프로젝트 경로의 `schemas/drafts/` 디렉토리로 이동·복사하며, 파일명 중복 방지(해시 suffix 또는 순번 suffix)와 경로 정규화(`path.resolve`)를 포함한다.
- 두 명령 모두 Vitest + tmp fixture 단위 테스트로 coverage를 갖춰야 하며, `designer-core/src/validate/validateSchema.ts`(TSK-06-02에서 선 배치된 공용 검증 함수)를 재사용하여 에디터 측 ValidateModule과 동일한 검증 결과를 보장한다.

## 타겟 앱
- **경로**: `packages/designer-cli` (모노레포 신규 패키지 — 현재 미존재)
- **근거**: WBS §WP-08, phase-1-plan §3.6, TRD §6.3이 `packages/designer-cli`를 CLI 패키지 경로로 명시. WBS Dev Config `cli` 도메인의 unit-test 커맨드가 `npm --prefix packages/designer-cli run test:unit`으로 고정.

## 구현 방향
- `packages/designer-cli`를 Node ≥20 ESM 패키지로 신규 스캐폴드한다. 엔트리는 `bin/designer-cli.mjs` (shebang `#!/usr/bin/env node`). 커맨드 파싱은 `node:util.parseArgs`(의존성 제로)를 1순위로 채택한다(의존성 최소화).
- `validate` 명령: `designer-core/validate/validateSchema.ts`의 `validateFormSchema`를 재사용한다. 단, CLI는 브라우저 환경이 아니므로 `formFieldRegistry` 대신 **정적 컴포넌트 매니페스트 맵**을 CLI 전용으로 빌드한다(`packages/designer-cli/src/registry/cliRegistry.ts`). i18n 누락 검사는 TSK-07-02가 구현하는 `scripts/diff.ts`의 함수를 `designer-i18n` 패키지에서 import해서 재사용한다. TSK-07-02가 완료되기 전 단계에서는 i18n 검사 로직은 stub(항상 누락 0 반환)으로 두고 TSK-07-02 완료 후 실 연결한다.
- `import` 명령: `--to <project-path>` 옵션으로 대상 프로젝트 루트를 받아 `<project-path>/schemas/drafts/` 디렉토리에 입력 파일을 복사한다. 대상 경로가 없으면 `fs.mkdirSync({ recursive: true })`로 생성. 동명 파일이 이미 존재하면 `-1`, `-2` 순번 suffix를 붙여 충돌 방지.
- 단위 테스트는 `node:os.tmpdir()` 기반 임시 디렉토리 fixture를 사용하며 각 테스트 후 `fs.rmSync({ recursive: true, force: true })`로 정리한다.

## 파일 계획

**경로 기준:** 모든 파일 경로는 프로젝트 루트 기준이다.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-cli/package.json` | 패키지 선언: `name: @form-js-designer/designer-cli`, `type: module`, `bin: { "designer-cli": "./bin/designer-cli.mjs" }`, scripts, dependencies(`ajv`), devDependencies(`vitest`, `@types/node`) | 신규 |
| `packages/designer-cli/tsconfig.json` | `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`, `"target": "ES2022"`, rootDir/outDir 설정 | 신규 |
| `packages/designer-cli/vitest.config.ts` | Vitest 설정 — `environment: 'node'`, test 패턴 `src/**/__tests__/**/*.test.ts` | 신규 |
| `packages/designer-cli/bin/designer-cli.mjs` | shebang 엔트리 (`#!/usr/bin/env node`). `parseArgs`로 서브커맨드 분기 후 `validate.ts`/`import.ts` 호출. exit 코드 그대로 전파. | 신규 |
| `packages/designer-cli/src/commands/validate.ts` | `runValidate(filePath: string, opts: ValidateOptions): Promise<number>` — JSON 파싱 → `validateFormSchema` → i18n diff → 결과 stdout 출력 → exit 코드(0/1) 반환. | 신규 |
| `packages/designer-cli/src/commands/import.ts` | `runImport(filePath: string, opts: ImportOptions): Promise<number>` — 입력 파일 읽기 → 경로 정규화 → 대상 디렉토리 생성 → 중복 방지 파일명 결정 → `fs.copyFileSync` → stdout에 결과 경로 출력 → exit 코드 반환. | 신규 |
| `packages/designer-cli/src/registry/cliRegistry.ts` | CLI 전용 정적 컴포넌트 타입 맵 — `Map<string, { propsSchema }>`. form-js 기본 타입 + `designer-components`/`designer-table` 타입을 하드코딩으로 등록. `getCLIRegistry(): CLIRegistry` export. | 신규 |
| `packages/designer-cli/src/registry/types.ts` | `CLIRegistry` 인터페이스 — `has(type: string): boolean`, `getPropsSchema(type: string): PropsSchema \| undefined` | 신규 |
| `packages/designer-cli/src/i18n/i18nCheck.ts` | `checkI18n(schema: FormSchema, options: I18nCheckOptions): I18nCheckResult`. TSK-07-02 완료 전: stub 구현(`missing: []`). TSK-07-02 완료 후: `@form-js-designer/designer-i18n/scripts/diff`에서 함수 import 후 실 연결. | 신규 |
| `packages/designer-cli/src/utils/fileUtils.ts` | `resolveNonConflicting(dir: string, basename: string): string` — 중복 파일명 suffix 로직. `ensureDir(dir: string): void` — `mkdirSync({ recursive: true })`. | 신규 |
| `packages/designer-cli/src/utils/exitWithError.ts` | `exitWithError(message: string): never` — stderr 출력 후 `process.exit(1)`. | 신규 |
| `packages/designer-cli/src/__tests__/validate.test.ts` | Vitest 단위 테스트: 정상 스키마 → exit 0, 미등록 type → exit 1 + 오류 메시지, JSON 파싱 실패 → exit 1, i18n 누락 시 exit 1, 빈 components 배열 → exit 0 (정상), 파일 없음 → exit 1. 총 6 케이스. | 신규 |
| `packages/designer-cli/src/__tests__/import.test.ts` | Vitest 단위 테스트: 정상 복사 → 대상 경로 출력 + exit 0, 중복 파일 → suffix 파일 생성, 대상 디렉토리 미존재 → 자동 생성, `--to` 경로 정규화(상대경로 → 절대경로), 읽기 권한 없는 입력 파일 → exit 1, 스키마 파일이 유효 JSON 아님 → exit 1. 총 6 케이스. | 신규 |
| `packages/designer-cli/src/__tests__/fileUtils.test.ts` | `resolveNonConflicting` 단위 테스트: 충돌 없을 때 원본 이름 반환, 1회 충돌 → `-1` suffix, 3회 연속 충돌 → `-3` suffix. 총 3 케이스. | 신규 |
| `packages/designer-cli/src/__tests__/cliRegistry.test.ts` | `getCLIRegistry()` 단위 테스트: 기본 form-js 타입 존재 확인, `designer-table` 타입 존재 확인, 미등록 타입 `has()` false 반환. 총 3 케이스. | 신규 |

## 진입점 (Entry Points)

N/A — 이 Task의 domain은 `cli`로 UI가 없는 Node.js CLI 패키지다. 브라우저 진입점 없음.

## 주요 구조

- **`bin/designer-cli.mjs`** — shebang 엔트리 + `node:util.parseArgs` 서브커맨드 분기. `validate` / `import` 두 경로 분기 후 각 `run*` 함수 호출. 반환된 exit 코드를 `process.exit(code)`로 전달.

- **`runValidate(filePath, opts): Promise<number>`** — (1) `fs.readFileSync` + `JSON.parse`로 스키마 로드(파싱 실패 → exit 1), (2) `validateFormSchema(schema, getCLIRegistry())`로 Ajv 검증(오류 → exit 1), (3) `checkI18n(schema, opts)`로 i18n 누락 검사(누락 > 0 → exit 1), (4) 모두 통과 → exit 0. 각 단계의 오류 상세를 stdout/stderr에 출력.

- **`runImport(filePath, opts): Promise<number>`** — (1) `path.resolve(opts.to)`로 경로 정규화, (2) 입력 파일 존재 확인(없으면 exit 1), (3) `ensureDir(targetDir)`, (4) `resolveNonConflicting(targetDir, basename(filePath))`로 충돌 없는 대상 경로 결정, (5) `fs.copyFileSync(src, dest)`, (6) dest 경로를 stdout에 출력 → exit 0.

- **`validateFormSchema(schema, registry): ValidationResult`** (`designer-core` 공용) — TSK-06-02에서 이미 `packages/designer-core/src/validate/validateSchema.ts`에 배치된 함수. CLI는 이 함수를 `@form-js-designer/designer-core/validate` 서브패스로 import. registry는 `CLIRegistry` 인터페이스를 구현한 `getCLIRegistry()` 결과를 전달.

- **`getCLIRegistry(): CLIRegistry`** — form-js 기본 컴포넌트 타입 (`textfield`, `number`, `datetime`, `checkbox`, `select`, `radio`, `textarea`, `group`, `default`) + `designer-components` 타입(`card`, `stack`, `tabs`, `modal`, `button`) + `designer-table` 타입(`table`)을 정적으로 등록한 레지스트리 객체 반환.

## 데이터 흐름

입력(CLI 호출 + JSON 파일) → 처리(`validate`: Ajv + i18n diff, `import`: 경로 정규화 + 파일 복사) → 출력(stdout 결과 메시지 + exit code 0/1)

## 설계 결정 (대안이 있는 경우만)

- **결정 1**: 커맨드 파서로 `node:util.parseArgs`(zero-dependency)를 사용한다.
  - **대안**: `commander` npm 패키지(MIT) 또는 `yargs`(MIT).
  - **근거**: TSK-08-01 범위(`validate` + `import` 2개 커맨드, 옵션 단순)에서 외부 의존 추가가 불필요하다. TRD §0 "신규 의존성은 permissive만 허용" 기조에서도 0-dependency가 낫다. TSK-08-02(`publish`) 추가 시 복잡도가 오르면 그 때 `commander` 도입을 고려한다.

- **결정 2**: CLI 전용 정적 컴포넌트 레지스트리(`cliRegistry.ts`)를 별도 파일로 분리한다.
  - **대안**: `validateFormSchema`에 컴포넌트 목록을 하드코딩하거나, `designer-components`/`designer-table`을 런타임 dynamic import.
  - **근거**: CLI는 Node 환경이므로 Preact 렌더 의존 없이 `propsSchema`/`type`만 필요하다. 전체 패키지를 import하면 Preact + DOM shim 등 불필요한 의존이 끌려온다. 정적 맵은 테스트에서 mock 교체가 쉽다.

- **결정 3**: i18n 검사 로직을 TSK-07-02 완료 전에는 stub(`checkI18n` → `missing: []`)으로 두고, TSK-07-02 완료 후 실 연결한다.
  - **대안**: TSK-07-02를 기다려 TSK-08-01을 그 이후에 시작.
  - **근거**: WBS depends 관계상 TSK-08-01은 TSK-07-02에 의존하지만, stub을 두면 validate/import의 나머지 기능을 먼저 완성하고 i18n 부분을 후 연결할 수 있다. 테스트에서 i18n stub을 `vi.mock`으로 교체 가능하여 TDD 흐름이 자연스럽다.

## 선행 조건

- **TSK-07-02 의존 (WBS)**: `designer-i18n` 정적 추출기 + diff 함수가 완성되어야 `checkI18n` 실 구현으로 교체 가능. 단, stub 방식으로 해당 함수 없이도 validate/import 핵심 기능은 구현·테스트 가능.
- **`packages/designer-core/src/validate/validateSchema.ts` 존재 필요**: TSK-06-02 설계에서 `designer-core`에 공용 검증 함수를 선 배치하기로 결정됨. 해당 파일과 `./validate` 서브패스 export가 `designer-core/package.json`에 있어야 CLI가 import 가능. 없으면 CLI에서 직접 Ajv 호출을 인라인 구현하는 것으로 fallback.
- **Node ≥ 20**: `node:util.parseArgs`는 Node 18.3+에서 안정화되었으며, 모노레포 루트 `package.json`의 `"engines": { "node": ">=20" }` 조건과 일치.
- **`ajv ^8`**: `designer-core`의 기존 의존. CLI에서 직접 사용할 경우 CLI 자체 `package.json`에도 선언.

## 리스크

- **HIGH — `designer-core/validate/validateSchema.ts`의 존재 여부**: TSK-06-02 설계에서 이 함수를 신규 생성하기로 했으나, TSK-06-02가 `[dd]` (설계 완료) 상태이고 빌드는 아직 미완. CLI가 이 함수를 import하기 위해서는 TSK-06-02 build 완료가 선행 필요. 완화 — CLI `validate.ts`에 Ajv 인라인 검증 폴백(`inlineValidate`)을 준비해두고, `validateFormSchema` import 성공 여부를 dynamic try/catch로 확인 후 분기하거나, 처음부터 CLI 내부에서 `designer-core/validate`가 export될 때까지 직접 Ajv 코드를 작성한다(TSK-08-01 범위 내 독립 구현 후 추후 공용 함수로 교체).

- **MEDIUM — `node:util.parseArgs` 서브커맨드 구분 한계**: `parseArgs`는 `--flag value` 형태에 최적화되어 있고 `git`-style positional subcommand(`cli validate <file>`)는 수동으로 `argv[2]`를 파싱해야 한다. 완화 — 엔트리에서 `process.argv.slice(2)`를 직접 읽어 `argv[0]`을 subcommand로 분리한 뒤 나머지를 `parseArgs`에 넘기는 2-step 파싱 패턴 적용. e2e fixture 테스트(`node bin/designer-cli.mjs validate ...`)로 실제 argv 동작 검증.

- **MEDIUM — `designer-components`/`designer-table` 타입 목록 누락**: `cliRegistry.ts`에 하드코딩한 타입 목록이 실제 패키지 구현과 달라지면 CLI validate가 잘못된 결과를 낸다. 완화 — `cliRegistry.ts`에 `// SYNC with designer-components/src/index.ts` 주석으로 동기화 의무를 명시하고, `cliRegistry.test.ts`에서 각 타입의 존재 여부를 개별 assert로 체크한다.

- **LOW — ESM-only 패키지에서 `require`/CJS 혼입 오류**: Node 20 ESM(`"type": "module"`) 환경에서 `designer-core`가 CJS를 export하면 `require is not defined` 오류 발생 가능. 완화 — `designer-core`는 이미 `"type": "module"` + `.ts` 엔트리 구조이므로 동일 환경. `tsconfig`의 `moduleResolution: NodeNext` + `module: NodeNext`로 일관성 강제.

- **LOW — tmp fixture 정리 실패로 인한 테스트 간 상태 오염**: `fs.rmSync` 실패 시 다음 테스트가 이전 결과 파일을 읽을 수 있다. 완화 — `vitest`의 `afterEach`에서 `fs.rmSync(tmpDir, { recursive: true, force: true })` 사용.

## QA 체크리스트

- [ ] (정상) `designer-cli validate valid-schema.json`이 등록된 컴포넌트 type만 포함하고 i18n 누락이 없는 스키마에 대해 exit 0을 반환하고 stdout에 "Validation passed" 메시지를 출력한다.
- [ ] (정상) `designer-cli import ai-output.schema.json --to /tmp/test-project`가 `/tmp/test-project/schemas/drafts/ai-output.schema.json`을 생성하고 exit 0을 반환하며 대상 경로를 stdout에 출력한다.
- [ ] (엣지) `designer-cli import`에서 `--to` 대상 디렉토리가 없으면 `schemas/drafts/` 포함 전체 경로를 자동 생성(`mkdirSync recursive`)한다.
- [ ] (엣지) `designer-cli import`에서 동명 파일이 이미 존재하면 `<name>-1.schema.json` 형태로 suffix를 붙여 충돌 없이 복사하고 exit 0을 반환한다.
- [ ] (엣지) 동명 파일이 2개 이상 연속 충돌할 경우 `-1`, `-2`, `-3` 순으로 증가하며 항상 새 파일을 생성한다.
- [ ] (에러) 입력 파일이 유효하지 않은 JSON인 경우 `validate`와 `import` 모두 stderr에 "Invalid JSON" 오류를 출력하고 exit 1을 반환한다.
- [ ] (에러) `designer-cli validate`에서 미등록 컴포넌트 `type`(예: `type: "unknown-widget"`)을 포함한 스키마가 exit 1을 반환하고 오류 메시지에 해당 type과 필드 경로가 포함된다.
- [ ] (에러) `designer-cli validate`에서 i18n 누락 키가 있으면 exit 1을 반환하고 누락 키 목록을 stdout에 출력한다. (stub 상태에서는 해당 케이스가 항상 pass로 건너뜀)
- [ ] (에러) 입력 파일 경로가 존재하지 않는 경우 exit 1을 반환하고 "File not found" 메시지를 출력한다.
- [ ] (에러) `--to` 옵션이 없을 때 `import` 명령은 exit 1과 usage 안내를 출력한다.
- [ ] (통합) `getCLIRegistry()`가 form-js 기본 타입(`textfield`, `select`, `checkbox` 등)과 `designer-table`, `designer-components`의 모든 신규 타입에 대해 `has(type)` → `true`를 반환한다.
- [ ] (통합) `resolveNonConflicting`이 동일 디렉토리에서 3회 연속 호출 시 각각 원본명, `-1`, `-2` suffix 파일명을 반환한다.
