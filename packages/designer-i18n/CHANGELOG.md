# Changelog — @form-js-designer/designer-i18n

All notable changes to this package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [1.0.0-rc.1] - 2026-06-05

### Added

- `t(key, locale, fallback)`: 번역 키 기반 문자열 반환 함수 (중첩 키 점 표기법 지원)
- `LocaleProvider`: Preact Context를 통한 로케일 주입 컴포넌트
- `useLocale()`: 현재 로케일 및 `t()` 함수를 소비하는 훅
- 정적 번역 키 추출기 (`extract-i18n.mjs`): 소스 코드에서 `t('...')` 호출을 자동 추출
- 한국어(ko) 번역 사전 (`ko.json`): 100% 커버리지
- CI i18n-check 게이트: `ko.json` 누락 키 > 0 이면 exit 1
- 단위 테스트 Vitest 기반 (test:unit + i18n:check npm 스크립트)

## [0.1.0] - 2026-05-01

### Added (0.1.0 — extract + diff + ko 100% coverage, TSK-07-02)

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
