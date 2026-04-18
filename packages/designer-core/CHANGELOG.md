# Changelog — @form-js-designer/designer-core

All notable changes to this package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [1.0.0-rc.1] - 2026-06-05

### Added

- `OverlayLayer`: 선택된 폼 컴포넌트 위에 WYSIWYG 오버레이를 렌더링하는 Preact 컴포넌트
- `propsSchemaToPanel`: form-js propertiesPanel 스키마를 패널 그룹 구조로 변환하는 유틸리티
- `ViewerHost`: form-js Viewer를 마운트·관리하는 호스트 컴포넌트 (이벤트 콜백 포함)
- `EditorHost`: form-js Editor를 마운트·관리하는 호스트 컴포넌트 (커스텀 그룹·모듈 DI 포함)
- `LocaleProvider`: Preact Context 기반 다국어 로케일 제공자
- `browserEnvContract`: jsdom 환경 계약 검증 (ADR-0001 §3 D7 회귀 방지)
- 단위 테스트 Vitest 기반 (typecheck + test:unit npm 스크립트)
- TypeScript 5.6 strict 모드

[Unreleased]: https://github.com/jongik-sv/form-js-designer/compare/v1.0.0-rc.1...HEAD
[1.0.0-rc.1]: https://github.com/jongik-sv/form-js-designer/releases/tag/v1.0.0-rc.1
