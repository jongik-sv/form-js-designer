# Changelog — @form-js-designer/designer-table

All notable changes to this package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [1.0.0-rc.1] - 2026-06-05

### Added

- TanStack Table v8 기반 데이터 그리드 컴포넌트 (`DesignerTable`)
- 행 가상화(Virtualization): 대량 데이터(10,000+행) 렌더링 최적화
- 인라인 셀 편집: 클릭·포커스로 편집 모드 전환, Escape 취소
- 컬럼 필터링: 헤더 입력 필드로 실시간 필터 적용
- 컬럼 이동(Drag & Drop): 드래그로 컬럼 순서 변경
- form-js Palette 통합: `presentation` 카테고리 컴포넌트 그룹 등록
- `DesignerComponentsModule` / `TableModule`: form-js DI 모듈 패턴 구현
- `formFields` 주입 방식으로 form-js PALETTE_GROUPS 호환

[Unreleased]: https://github.com/jongik-sv/form-js-designer/compare/v1.0.0-rc.1...HEAD
[1.0.0-rc.1]: https://github.com/jongik-sv/form-js-designer/releases/tag/v1.0.0-rc.1
