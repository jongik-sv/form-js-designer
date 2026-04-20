# TSK-07-02: 정적 추출기 + CI diff 게이트 + ko 100% 커버 - 설계

## 요구사항 확인
- `packages/designer-i18n` 패키지를 신규 생성하여 ① **AST 기반 정적 추출기**(`t('...')` 리터럴 키 전수 수집, 모든 `packages/designer-*/**/*.{ts,tsx}` 스캔), ② **diff 스크립트**(수집 키 vs `locales/ko.json` 의 ∪ 차집합), ③ **CI `i18n:check` 잡**(누락 키 > 0 시 exit 1 → 빌드 실패) 을 구현하여 PRD §4 AC #5(한국어 UI/메시지 100%) · AC #10(모든 가시 문자열 `t('key.path')` 분리 + ko 사전 100%) 을 **hard gate** 로 강제한다 (phase-1-plan §3.5, TRD §4.4).
- 지원 리터럴 형태를 명확히 정의한다 — 허용: 단일 문자열 리터럴 (`t('designer.table.filter.all')`), 지원 안 함: 템플릿 리터럴(치환 없는 plain template 은 warning+수용)·변수 키·문자열 연결. fixture 5종(정상/템플릿리터럴/동적키/문자열연결/주석)으로 이 경계를 회귀 고정.
- `TSK-07-01` 이 `packages/designer-i18n/src/t.ts` + `LocaleProvider` 실 구현 + `locales/ko.json` 골격을 제공하므로, 본 Task 는 그 사전을 **100% 완성** + **추출/diff/CI** 파이프라인을 얹는다. 의존 Task(`TSK-04-02`·`TSK-05-02`·`TSK-06-02`) 가 사용한 모든 `t('...')` 키는 이 단계에서 **빠짐없이 수집되어야** 하며, 누락 시 CI 가 막는다 (phase-1-plan §4 AC 매트릭스 AC#10).

## 타겟 앱
- **경로**: `packages/designer-i18n` (신규 생성. TSK-07-01 에서 `src/t.ts`·`src/LocaleProvider.tsx`·`src/intl.ts`·`locales/ko.json` 기본 구조가 선행 생성됨을 전제. 본 Task 는 추출기/diff 스크립트/CI 워크플로우/커버리지 단위 테스트를 추가).
- **근거**: phase-1-plan §3.5 체크리스트가 모든 파일을 `packages/designer-i18n/` 하위로 고정. CI 워크플로우는 레포 루트 `.github/workflows/ci.yml`. 단일 패키지 task 이므로 모노레포 내 타깃 앱은 오직 `packages/designer-i18n` 하나.

## 구현 방향
- **AST 추출기 (`src/scripts/extract.ts`)**: TypeScript 컴파일러 API (`typescript` 패키지, `ts.createSourceFile` + `ts.forEachChild` 재귀) 로 `.ts`/`.tsx` 를 파싱하여 `CallExpression` 노드 중 `callee` 가 다음 3 패턴 중 하나이면 첫 인자 키 리터럴을 수집한다:
  - 식별자 `t`(`t('key')` — 로컬 별칭, 기본 패턴)
  - `PropertyAccessExpression` 의 마지막 부분이 `t` (`ctx.t('key')`, `locale.t('key')`)
  - `Identifier` 중 허용 목록 확장 (`tFn`, `translate`) — 설정 파일(`i18n.config.json`) 로 커스터마이징
  - **Regex fallback 금지**: 주석 내 문자열·문자열 연결 등에서 오탐/누락 위험. AST 만 사용.
- **수용 리터럴 형태**: 첫 인자가 `StringLiteral` 일 때만 수집. 그 외(`TemplateExpression`·`BinaryExpression`·`Identifier` 동적 키)는 **warning 목록**에 기록하되 "수집된 키" 에는 포함하지 않음 → fixture 테스트에서 정확히 이 경계를 검증.
- **스캔 경로**: `packages/designer-*/(src|scripts|e2e)/**/*.{ts,tsx}` (glob: `fast-glob` 또는 Node 20 내장 `fs.promises.glob`). **제외**: `**/__tests__/**`·`**/*.test.{ts,tsx}`·`**/*.spec.{ts,tsx}`·`**/node_modules/**`·`**/dist/**`·`**/spike/**` (테스트 픽스처의 `t('hello')` mock 이 사전에 들어가면 안 됨).
- **diff 스크립트 (`src/scripts/diff.ts`)**: `extract()` 로 얻은 `Set<string>` = `used` 와 `flatten(locales/ko.json)` = `defined` 를 비교. **missing = used − defined** (사전에 없는 키가 코드에 있음 = 빌드 실패 주범), **unused = defined − used** (warning, fail 아님 — 디자이너 IDE autocomplete 용 preload 키 보호). `missing.size > 0` ⇒ exit 1, 콘솔에 `[i18n:check] Missing N key(s):` 목록 + 각 키가 발견된 파일:line 출력. `unused.size > 0` ⇒ stderr warning 만.
- **CLI 바이너리 (`bin/i18n-check.mjs`)**: `node bin/i18n-check.mjs [--report-json]` 엔트리. package.json scripts 에 `"i18n:check": "node bin/i18n-check.mjs"`, `"i18n:extract": "node bin/i18n-check.mjs --dump"` 추가. `--report-json` 은 머신 판독 출력(CI artifact 용), 기본은 human-readable.
- **커버리지 100% hard gate (`src/__tests__/coverage.test.ts`)**: `used` 집합이 비어 있지 않고(설치 직후 빈 레포 방어) `missing.size === 0` 을 단언. 같은 로직이 `diff.ts` 에서도 실행되지만, 단위 테스트는 레포 전체를 대상으로 직접 실행하여 "CI 외 로컬 개발 환경" 에서도 누락을 즉시 발견. phase-1-plan §4 AC#5 expected cases `= 1 (hard gate)` 을 이 파일이 충족.
- **Fixture 5종 (`src/__tests__/fixtures/`)**: 추출기의 AST 판정 로직을 격리 테스트. 각 fixture 는 `.ts` 1파일 + 기대 키 목록 `.expected.json`:
  1. **normal.ts** — `import { t } from '...'; t('designer.normal.ok');` → expected: `['designer.normal.ok']`
  2. **template.ts** — `` t(`designer.template.${key}`); `` (치환 있음) + `` t(`designer.template.plain`); `` (plain template, 치환 없음) → expected: `[]` (치환 없는 template 도 warning+제외 — 단순 정책 우선)
  3. **dynamic.ts** — `const key = 'designer.dynamic.x'; t(key);` → expected: `[]` + warning: `dynamic-key at dynamic.ts:2`
  4. **concat.ts** — `t('designer.' + 'concat.ok');` → expected: `[]` + warning
  5. **comment.ts** — `// t('designer.comment.inactive')\n/* t('designer.comment.block') */\nt('designer.comment.active');` → expected: `['designer.comment.active']` (주석은 AST 에서 제외되므로 자동 처리)
  - 별도 **intentional-miss.ts** 가 `t('designer.intentionally.missing')` 를 호출하고 `ko.json` 에는 이 키가 **없는** 상태 → diff 가 exit 1 반환하는지 스냅샷 테스트 (`vitest.expect(() => diffAgainst(fixtureRoot)).toThrow(/Missing 1 key/)`).
- **ko.json 100% 커버**: 본 Task 에서 `TSK-04-02`·`TSK-05-02`·`TSK-06-02` 가 도입한 모든 실제 `t('...')` 키를 수집하여 `locales/ko.json` 에 한국어 번역을 채운다. 네임스페이스 규칙 (TRD §4.4):
  - `designer.core.*` — designer-core 공용 (예: `designer.core.loading`)
  - `designer.components.{card|stack|tabs|modal|button}.*` — designer-components
  - `designer.table.*` (또는 기존 `designer-table.*` — **표기 규칙 통일 결정**: 점(`.`) 으로 통일. 현재 `designer-table.filter.all` 같은 하이픈 네임스페이스는 `designer.table.filter.all` 로 rename. TSK-05-02 커밋의 `applyT` 호출부·ko.json 키 모두 본 Task PR 에서 sweep 수정. I18nWidget 의 `I18N_KEY_PATTERN = /^[a-z][\w.-]*$/` 는 둘 다 허용하므로 rename 가능.)
  - `designer.editor.*` — designer-editor-host
  - `designer.cli.*` — designer-cli (WP-08 예약)
  - `designer.i18n.validation.*` — form-js 기본 검증 메시지 ko 번들 (TSK-07-01 산출)

## 파일 계획

**경로 기준:** 모든 파일 경로는 프로젝트 루트 기준이다. 모노레포 타겟 앱은 `packages/designer-i18n` 단일.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-i18n/package.json` | 신규 패키지 매니페스트. `"name": "@form-js-designer/designer-i18n"`, `"type": "module"`, `"main": "src/index.ts"`, `scripts`: `"i18n:check"`, `"i18n:extract"`, `"test:unit"`. `dependencies`: `typescript@^5.6` (AST), `fast-glob@^3.3` (파일 스캔). `peerDependencies`: `@form-js-designer/designer-core`. TSK-07-01 이 동일 파일을 먼저 생성했으면 **수정**(스크립트·deps 추가). | 신규 또는 수정 |
| `packages/designer-i18n/src/index.ts` | public barrel. TSK-07-01 이 생성한 `t`·`LocaleProvider`·`intl` re-export 에 **본 Task 추가분** `extractKeys`·`diffKeys` 타입/함수 re-export. | 수정(또는 신규) |
| `packages/designer-i18n/src/scripts/extract.ts` | AST 기반 키 수집 함수 `extractKeys(roots: string[], options?: ExtractOptions): ExtractResult`. 반환: `{ keys: Set<string>, warnings: Warning[], filesScanned: number }`. `ts.createSourceFile` + `visit(node)` 재귀. 허용 callee pattern 3종 분기. | 신규 |
| `packages/designer-i18n/src/scripts/extractTypes.ts` | `ExtractOptions`, `ExtractResult`, `Warning`, `KeyOccurrence` 타입 정의. 테스트/CLI 양쪽에서 import. | 신규 |
| `packages/designer-i18n/src/scripts/diff.ts` | `diffKeys({ used, defined }): { missing: string[], unused: string[] }` 순수 함수 + `runDiff(root): { exitCode, report }` 래퍼. `flatten(obj)` 헬퍼로 `ko.json` 중첩을 `'a.b.c'` 배열로 변환. | 신규 |
| `packages/designer-i18n/src/scripts/reporter.ts` | human-readable / JSON 2종 출력 포매터. `formatHuman(result)` = 누락 키 + 파일:line, `formatJson(result)` = CI artifact. | 신규 |
| `packages/designer-i18n/bin/i18n-check.mjs` | CLI 엔트리. `#!/usr/bin/env node`, `process.exit(runDiff(repoRoot).exitCode)`. `--report-json`·`--dump`·`--help` flag. | 신규 |
| `packages/designer-i18n/locales/ko.json` | 한국어 사전 **100% 완성**. TSK-07-01 골격 + TSK-04-02/05-02/06-02 키 총망라. 네임스페이스: `designer.core.*`, `designer.components.{card,stack,tabs,modal,button}.*`, `designer.table.*`, `designer.editor.*`, `designer.i18n.validation.*`. | 수정(또는 신규, 본 Task 에서 100% 채움) |
| `packages/designer-i18n/locales/README.md` | 사전 편집 규칙 — 네임스페이스 · rename 금지 · 삭제 시 사용처 grep 수동 확인. | 신규 |
| `packages/designer-i18n/src/__tests__/extract.test.ts` | `extractKeys` 단위 테스트. fixture 5종 각각에 대한 expected 비교 + warning 배열 검증. 20+ 케이스(각 fixture × {keys, warnings, filesScanned}). | 신규 |
| `packages/designer-i18n/src/__tests__/diff.test.ts` | `diffKeys` 순수 함수 테스트 — missing/unused/both-empty/all-matched 4 경계. `runDiff` 를 mock fs 로 호출해 exitCode 분기 2 경계. | 신규 |
| `packages/designer-i18n/src/__tests__/coverage.test.ts` | **Hard gate 테스트** — 실제 레포 전체에 대해 `runDiff(repoRoot)` 실행 후 `missing.length === 0` 단언. phase-1-plan §4 AC#5 expected cases `=1`. | 신규 |
| `packages/designer-i18n/src/__tests__/fixtures/normal.ts` | `import { t } from '@form-js-designer/designer-i18n'; export const msg = t('designer.fixture.normal.ok');` | 신규 |
| `packages/designer-i18n/src/__tests__/fixtures/normal.expected.json` | `{ "keys": ["designer.fixture.normal.ok"], "warnings": [] }` | 신규 |
| `packages/designer-i18n/src/__tests__/fixtures/template.ts` | `` const name = 'x'; t(`designer.fixture.template.${name}`); t(`designer.fixture.template.plain`); `` | 신규 |
| `packages/designer-i18n/src/__tests__/fixtures/template.expected.json` | `{ "keys": [], "warnings": [{"kind":"template-substitution","line":2},{"kind":"template-plain","line":3}] }` (정책: 치환 없는 template 도 warning+제외) | 신규 |
| `packages/designer-i18n/src/__tests__/fixtures/dynamic.ts` | `const key = 'designer.fixture.dynamic.x'; t(key);` | 신규 |
| `packages/designer-i18n/src/__tests__/fixtures/dynamic.expected.json` | `{ "keys": [], "warnings": [{"kind":"dynamic-identifier","line":2}] }` | 신규 |
| `packages/designer-i18n/src/__tests__/fixtures/concat.ts` | `t('designer.fixture.' + 'concat.ok');` | 신규 |
| `packages/designer-i18n/src/__tests__/fixtures/concat.expected.json` | `{ "keys": [], "warnings": [{"kind":"string-concat","line":1}] }` | 신규 |
| `packages/designer-i18n/src/__tests__/fixtures/comment.ts` | ` // t('designer.fixture.comment.inactive')\n/* t('designer.fixture.comment.block') */\nt('designer.fixture.comment.active');` | 신규 |
| `packages/designer-i18n/src/__tests__/fixtures/comment.expected.json` | `{ "keys": ["designer.fixture.comment.active"], "warnings": [] }` | 신규 |
| `packages/designer-i18n/src/__tests__/fixtures/intentional-miss.ts` | `t('designer.fixture.intentionally.missing');` — diff gate 의 red 시나리오 검증용. | 신규 |
| `packages/designer-i18n/vitest.config.ts` | `test.environment = 'node'` (AST 는 DOM 불필요), `test.include = ['src/__tests__/**/*.test.ts']`. fixture `.ts` 는 테스트 대상이 아니므로 `test.exclude = ['**/fixtures/**']`. | 신규 |
| `packages/designer-i18n/tsconfig.json` | ESM + `moduleResolution: "bundler"`. fixture `.ts` 를 `include` 에 포함시키되 `noEmit: true` 로 컴파일만. | 신규 |
| `.github/workflows/ci.yml` | `i18n-check` 잡 추가. `runs-on: ubuntu-latest`, `steps`: checkout → setup-node 20 → `npm ci` → `npm --prefix packages/designer-i18n run i18n:check`. 병렬 실행 레인(다른 잡과 독립). PR 머지 필수 조건으로 지정(branch protection 외부 설정). | 수정 |
| `packages/designer-table/src/filters/SelectFilter.tsx` | **네임스페이스 통일 sweep**: `designer-table.filter.all` → `designer.table.filter.all` 로 키 rename. 기타 `designer-table.*` 호출부 모두 동일 rename. | 수정 |
| `packages/designer-table/src/Table.tsx` | 동일 sweep — `applyT` 에 주입되는 header key 도 `designer.table.*` 규칙 검증. 이미 스키마 필드 값이므로 직접 수정은 fixture/스키마 측. | 수정(검증만) |
| `packages/designer-table/src/types.ts` | `ColumnDef.header: LocaleKey` 주석 — "네임스페이스는 `designer.table.*`" 문구 추가(개발 가이드). | 수정 |
| `packages/designer-i18n/CHANGELOG.md` | 본 Task 머지 시점 엔트리 — "0.1.0: extract + diff + ko 100% coverage". | 신규 |

## 진입점 (Entry Points)

**N/A** — `domain=infra`, entry-point 는 WBS Task 블록에 미지정. UI 없음. 사용자 진입 경로·URL·라우터·메뉴·네비게이션 모두 해당 없음.

개발자 진입점만 기록(참고):
- `npm --prefix packages/designer-i18n run i18n:check` — 로컬에서 검증
- `npm --prefix packages/designer-i18n run i18n:extract -- --dump` — 누락 키 목록 덤프
- CI: PR 오픈 시 `i18n-check` 잡 자동 실행

## 주요 구조

- **`extractKeys(roots, options): ExtractResult`** — `packages/designer-*/(src|scripts|e2e)/**/*.{ts,tsx}` 를 `fast-glob` 으로 수집 → 각 파일 `ts.createSourceFile(name, code, ScriptTarget.ES2022, /*setParent*/true, ScriptKind.TSX)` → `visit(node)` 재귀: `CallExpression` 중 callee 가 `t`/`*.t`/`tFn`/`translate` 이고 `arguments[0]` 이 `StringLiteral` 이면 `keys.add(text)` + `occurrences.push({key, file, line})`. `TemplateExpression`/`BinaryExpression`/`Identifier` 인자는 `warnings.push({kind, file, line})`. 반환 `{keys, warnings, occurrences, filesScanned}`.
- **`diffKeys({used, defined}): {missing, unused}`** — 순수 Set 차집합. `flatten(obj, prefix='')` 은 `Record<string, unknown>` 의 leaf 경로를 `'a.b.c'` string 으로 평탄화. Array 값은 지원하지 않음(사전은 trie 구조).
- **`runDiff(repoRoot): {exitCode, report}`** — `extractKeys([repoRoot+'/packages'])` + `readKo(repoRoot+'/packages/designer-i18n/locales/ko.json')` → `diffKeys` → `exitCode = missing.length > 0 ? 1 : 0`. report 에는 human/JSON 둘 다 포함.
- **`formatHuman(report)`** — ANSI color 로 `[i18n:check] Missing 3 key(s):\n  ✖ designer.table.foo (packages/designer-table/src/Table.tsx:42)\n...`. CI 로그에 그대로 붙음.
- **`bin/i18n-check.mjs`** — CLI shim. `const {runDiff, formatHuman, formatJson} = await import('../src/scripts/index.ts')`. `--report-json` → `formatJson`, default → `formatHuman`. `process.exit(exitCode)`.
- **커버리지 테스트 `coverage.test.ts`** — `it('ko dictionary covers 100% of t() keys used across designer-*', () => { const {missing} = runDiff(repoRoot); expect(missing).toEqual([]); });` + `it('extractKeys finds non-zero used keys (sanity)', ...)`.

## 데이터 흐름

1. **입력**: `packages/designer-*/**/*.{ts,tsx}` 소스 파일 집합 + `packages/designer-i18n/locales/ko.json`
2. **처리**: AST 스캔 → `used: Set<string>`, `warnings[]` → ko.json flatten → `defined: Set<string>` → `missing = used − defined`, `unused = defined − used`
3. **출력**: exit 0 (성공) 또는 exit 1 (누락, stderr 에 목록) + `--report-json` 시 stdout JSON report (CI artifact)

## 설계 결정 (대안이 있는 경우만)

- **결정**: TypeScript Compiler API 만 사용한 AST 파싱.
- **대안**: ① `@babel/parser` + `@babel/traverse` — JS 생태계 표준이지만 TS 전용 문법(type annotations) 처리를 위해 preset 필요, 의존 무거움. ② regex(`/\bt\(['"]([^'"]+)['"]\)/g`) — 초경량이지만 주석 내 문자열·변수 키 오탐이 불가피, fixture `comment.ts`/`dynamic.ts` 를 통과시킬 수 없음.
- **근거**: `typescript` 는 `designer-core` 가 이미 devDep 으로 사용 → 레포 전체 단일 버전 유지. AST 는 주석·템플릿·concat 을 정확히 구분 가능 → fixture 5종 요구사항(정상/템플릿/동적/연결/주석) 모두 1:1 대응 가능. regex fallback 금지.

- **결정**: 치환 없는 plain template literal (`` t(`key.plain`) ``) 도 warning 후 제외.
- **대안**: 이런 경우도 `StringLiteral` 처럼 수집 (관대한 정책).
- **근거**: 정책 단순성 + 개발자가 의도 없이 backtick 쓴 경우를 강제로 단일 문자열로 정정 → i18n key autocomplete 정책 단일화 (IDE plugin 에서 `t('...')` 패턴만 인덱싱).

- **결정**: 본 Task PR 을 단일 PR 로 머지하되 커밋은 2-단계 분리(ko.json 선행 완성 → ci.yml enable).
- **대안**: 2 PR 분리 — (PR1) extract/diff/ko.json 100%, (PR2) ci.yml.
- **근거**: WBS 에 TSK-07-02 단일 Task 로 지정. 커밋 분리만으로 bisect 가능하며, PR 단위 롤백은 단일 revert 로 족함. 2 PR 은 의존 간극 시 `main` 에서 일시적으로 누락 키가 노출될 위험.

- **결정**: 네임스페이스 표기를 점(`.`) 로 통일 (`designer.table.*`).
- **대안**: 하이픈-점 혼용 유지 (`designer-table.*` + `designer.components.*` — 현재 코드베이스).
- **근거**: TRD §4.4 예시가 `designer.palette.table` 형태. I18nWidget 패턴 `^[a-z][\w.-]*$` 은 둘 다 허용하지만 AST 추출 후 사전 키 비교에서 오탈자 검출을 쉽게 하려면 구분자 단일화. 현재 `designer-table.*` 는 `designer-table/src/` 2~3곳 뿐 → sweep rename 비용 < 1 커밋.

## 선행 조건

- **TSK-07-01 완료 전제**: `packages/designer-i18n/src/t.ts`·`LocaleProvider.tsx`·`intl.ts`·`locales/ko.json` 골격이 이미 존재. 본 Task 는 `scripts/extract.ts`·`scripts/diff.ts`·`bin/i18n-check.mjs`·`__tests__/` + ko.json 100% 완성을 추가한다.
- **TSK-04-02 완료** (designer-components Tabs·Modal) — 이 두 컴포넌트가 도입한 `designer.components.tabs.*`·`designer.components.modal.*` 키 전수가 ko.json 에 포함되어야 함.
- **TSK-05-02 완료** (designer-table 편집/필터/이동/가상화) — `designer.table.cell.edit.placeholder`·`designer.table.filter.all` 등 6+ 키 포함.
- **TSK-06-02 완료** (designer-editor-host PropsPanel·LivePreview) — `designer.editor.toolbar.validate`·`designer.editor.toolbar.export`·`designer.editor.panel.props.title` 등 키 포함.
- 외부 의존성: `typescript@^5.6`(AST), `fast-glob@^3.3`(파일 스캔), `vitest@^2.1`(테스트 러너). 모두 기존 레포에서 사용 중 — 라이선스 MIT (TRD §3 허용).
- 선행 CI 잡(`lint-no-css-modules`, `test-designer-core`) 은 독립적이며 본 잡은 병렬 레인 신규 추가.

## 리스크

- **HIGH** — AST 추출기가 기존 코드의 동적 키 사용(예: `t(`designer.${type}.name`)` 같은 template 치환) 을 잡아내면 사용처가 강제로 static 으로 리팩터링 되어야 한다. 의존 Task 중 특히 `designer-components` 의 `spec.json` / `propsSchema.ts` 는 현재 정적 문자열만 쓰지만 TSK-06-02 의 PropsPanel 어댑터가 라벨 보간을 쓸 수 있음. **완화**: 본 Task 첫 커밋에서 `npm run i18n:extract -- --dump` 로 warnings 목록을 dump → 동적 키 발견 시 해당 Task 리드(04-02/05-02/06-02) 에게 static key 로 리팩터링 PR 선행 요청. 경우에 따라 본 Task 설계를 "동적 키는 `i18n-ignore-next-line` 주석으로 화이트리스트" 로 확장할 수 있게 `visit()` 에 pragma 처리 hook 만 미리 만들어둠.

- **HIGH** — CI 잡 활성화 시점에 이미 ko.json 이 누락 키 > 0 이면 즉시 main 브랜치가 red 가 되어 다른 모든 PR 이 막힌다. **완화**: 위 "2-단계 커밋" 원칙 엄수 + PR 로컬에서 `i18n:check` green 확인 전 `ci.yml` 수정 커밋 금지. 머지 직전 rebase 후 최종 1회 `npm run i18n:check` 로컬 재검증 필수 (phase-1-plan §4 AC#5 hard gate).

- **MEDIUM** — 네임스페이스 sweep rename(`designer-table.*` → `designer.table.*`) 시 `applyT` 의 인자(`ColumnDef.header: LocaleKey`) 값도 모두 교체해야 함. `designer-table/src/` 의 테스트 fixture (`__tests__/Table.test.tsx` 의 `columnDef.header` 예시값) 도 포함. **완화**: 전수 grep `"designer-table\.\|'designer-table\."` 로 목록 확정 → 1 커밋에 일괄 교체. sweep 빠뜨리면 CI 가 잡아주므로 회귀는 안전.

- **MEDIUM** — fast-glob 등 새로운 devDep 추가로 `npm ci` 시간이 늘 수 있음(monorepo 기준 5~10s 증분). **완화**: workspaces 공통 devDep 로 root package.json 에 올리면 추가 설치 0 (이미 `typescript` 는 root 에 존재). `fast-glob` 대신 Node 22.11+ 의 `fs.promises.glob` 으로 교체도 가능하나 현재 Node 20 요구사항(`engines.node >=20`) 이므로 fast-glob 유지.

- **LOW** — TypeScript Compiler API 버전 업그레이드 시 `ts.CallExpression` 노드 스펙이 깨질 가능성. **완화**: `typescript` 를 `peerDependencies` 가 아닌 `dependencies` 로 고정(^5.6), major bump 시 본 추출기 단위 테스트가 먼저 fail 하여 감지.

- **LOW** — `coverage.test.ts` 가 실제 레포 파일을 읽으므로 feat 브랜치에서 대규모 refactor 시 일시적으로 fail 할 수 있음(중간 커밋). **완화**: 단위 테스트 실행 시 `--bail` 대신 warning 로그만 출력하는 환경변수 옵션(`FJSD_I18N_DRY_RUN=1`) 지원. CI 잡은 이 옵션을 쓰지 않음.

## QA 체크리스트

dev-test 단계에서 검증할 항목. 각 항목은 pass/fail 판정 가능.

- [ ] **정상 — fixture normal.ts**: `extractKeys([fixturesDir+'/normal.ts'])` 가 `{keys: new Set(['designer.fixture.normal.ok']), warnings: []}` 반환.
- [ ] **엣지 — fixture template.ts**: template 치환 포함 호출과 plain template 둘 다 `keys` 에 포함 안 됨 + `warnings` 2개 (kind: `template-substitution`, `template-plain`).
- [ ] **엣지 — fixture dynamic.ts**: identifier 변수 키는 `keys` 에 없음 + `warnings` 1개 (kind: `dynamic-identifier`).
- [ ] **엣지 — fixture concat.ts**: 문자열 연결은 `keys` 에 없음 + `warnings` 1개 (kind: `string-concat`).
- [ ] **엣지 — fixture comment.ts**: 주석 내 `t('...')` 는 완전 무시, 실제 코드의 `t('designer.fixture.comment.active')` 만 수집. line/block 주석 모두 대상.
- [ ] **에러 — fixture intentional-miss.ts**: `runDiff` 가 `{exitCode: 1, report.missing: ['designer.fixture.intentionally.missing']}` 반환. `formatHuman` 출력에 파일명:line 포함.
- [ ] **에러 — 빈 ko.json**: `{}` 로 놓고 `runDiff` 실행 시 모든 used key 가 missing 으로 나와야 함. `missing.length > 0` + exit 1.
- [ ] **에러 — 존재하지 않는 ko.json**: 파일 I/O 에러는 exit 2 (diff gate 의 exit 1 과 구분) + stderr 에 `"[i18n:check] ko.json not found"` 메시지.
- [ ] **통합 — coverage.test.ts (hard gate)**: 실제 레포에 대해 `runDiff(repoRoot).missing.length === 0` 단언 통과. `extractKeys` 가 `keys.size > 0` 도 검증(sanity — 빈 레포에서 통과하지 않게).
- [ ] **통합 — diff 순수 함수**: `diffKeys({used: new Set(['a','b','c']), defined: new Set(['b','c','d'])})` 가 `{missing: ['a'], unused: ['d']}` 반환. 순서 무관(정렬된 배열).
- [ ] **통합 — CLI 바이너리**: `node bin/i18n-check.mjs` 정상 실행 시 exit 0, 누락 주입 시 exit 1. `--report-json` 시 stdout 이 valid JSON.
- [ ] **통합 — CI 워크플로우**: `.github/workflows/ci.yml` 에 `i18n-check` 잡 존재 + `npm ci` 후 `npm --prefix packages/designer-i18n run i18n:check` 단계 포함. PR 생성 시 잡이 실제 트리거되는지(green PR fixture).
- [ ] **통합 — 네임스페이스 sweep 후 회귀 없음**: `designer-table.*` → `designer.table.*` rename 후 `packages/designer-table` 단위/E2E 테스트가 여전히 통과 (t() fallback 동작은 key 를 그대로 반환하므로 화면 테스트는 rename 에 민감하지 않지만, ko.json 키 매칭 회귀는 `coverage.test.ts` 가 잡음).
- [ ] **성능 — 추출기 실행 시간**: 레포 전체 (`packages/designer-*/**/*.{ts,tsx}` ≈ 100~300 파일) 스캔이 로컬 기준 <3s, CI 기준 <10s. `console.time('extract')` 로 측정하고 측정 로그를 `--report-json` 에 포함.
- [ ] **hard gate — 누락 시 CI 빨간불**: 고의로 `t('designer.ci.red.probe')` 를 추가(사전에 없음) → PR CI 가 `i18n-check` 잡에서 실패. 해당 키 삭제 또는 ko.json 추가로 green 복구.

> **비-UI Task** (`domain=infra`): "fullstack/frontend 필수 항목" 2개 (클릭 경로 / 화면 렌더링) 는 본 Task 에 해당하지 않으므로 제외(template 주석 규정). E2E reachability gate 는 적용되지 않고, 대신 위 "통합 — CI 워크플로우" 항목이 실효 CI 검증 역할.
