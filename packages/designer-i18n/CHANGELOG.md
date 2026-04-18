# @form-js-designer/designer-i18n Changelog

## 0.1.0 — extract + diff + ko 100% coverage (TSK-07-02)

### Added
- `src/scripts/extract.ts` — TypeScript Compiler API AST-based key extractor (`extractKeys`, `scanPackages`)
- `src/scripts/extractTypes.ts` — Type definitions (`ExtractResult`, `Warning`, `KeyOccurrence`, etc.)
- `src/scripts/diff.ts` — Pure diff function (`diffKeys`, `flatten`, `runDiff`) + `runDiff` pipeline
- `src/scripts/reporter.ts` — Human-readable and JSON output formatters (`formatHuman`, `formatJson`)
- `src/scripts/index.ts` — Scripts barrel for CLI and test imports
- `bin/i18n-check.mjs` — CLI entry point (`--dump`, `--report-json`, `--help` flags)
- `src/__tests__/extract.test.ts` — 17 unit tests for AST extractor (fixture-based)
- `src/__tests__/diff.test.ts` — 10 unit tests for diff pure function + flatten
- `src/__tests__/coverage.test.ts` — Hard gate test: `missing.length === 0` (PRD §4 AC #5, AC #10)
- `src/__tests__/fixtures/` — 5 fixture files (normal/template/dynamic/concat/comment) + intentional-miss
- `locales/README.md` — Dictionary editing rules and namespace conventions
- `.github/workflows/ci.yml` — `i18n-check` CI job (unit tests + hard gate check)
- `package.json` scripts: `i18n:check`, `i18n:extract`

### Changed
- `src/index.ts` — Added re-exports for extractor/diff/reporter functions and types
