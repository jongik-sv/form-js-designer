# Changelog — @form-js-designer/designer-editor-host

All notable changes to this package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [1.0.0-rc.1] - 2026-06-05

### Added

- `Palette`: 컴포넌트 팔레트 패널 (form-js PALETTE_GROUPS 기반, 드래그 앤 드롭 지원)
- `Outline`: 폼 구조 트리 뷰 아웃라인 패널 (계층 탐색·선택)
- `PropsPanel`: 선택된 컴포넌트의 프로퍼티 편집 패널 (form-js propertiesPanel 통합)
- `LivePreview`: 실시간 WYSIWYG 미리보기 뷰어 (form-js Viewer 기반)
- form-js Editor 완전 통합 (커스텀 그룹·모듈 DI)
- Playwright E2E 테스트: a11y axe-core critical+serious=0 검증
- WCAG 2.1 AA 준수 (아웃라인/사이드패널/프롭스패널 색상 대비비 `#595959`)
- form-js-base.css 임포트 (드롭 컨테이너 높이 보정)
- 한국어 UI 레이블 지원

[Unreleased]: https://github.com/jongik-sv/form-js-designer/compare/v1.0.0-rc.1...HEAD
[1.0.0-rc.1]: https://github.com/jongik-sv/form-js-designer/releases/tag/v1.0.0-rc.1
