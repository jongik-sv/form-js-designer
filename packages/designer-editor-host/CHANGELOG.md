# Changelog — @form-js-designer/designer-editor-host

All notable changes to this package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [0.1.0] - 2026-04-26

### Added

- `./embedded` 진입점: `mountEmbeddedEditorModal()` API — designer-tiptap v0.2의
  임베디드 디자이너 모달 호스팅에 사용. 풀스크린 modal shell + form-js editor
  마운트 + ESC/[닫기] auto-save + handle.destroy() 강제 종료 라이프사이클.
- `installPropsPanelFocusGuard(scope?: Element | Document)`: 선택적 `scope`
  매개변수 추가 (기본 `document` — 기존 호출자 BC 보존). `scope`에 Element를
  넘기면 그 subtree 안의 `.fjs-editor-selected` 요소에만 prototype.focus
  패치를 적용. 임베디드 모달 인스턴스가 페이지 단위 가드와 충돌하지 않도록.

### Required by

- `@form-js-designer/designer-tiptap` >=0.2.0 (tsup `noExternal`로 빌드 타임 인라인)

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

[Unreleased]: https://github.com/jongik-sv/form-js-designer/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/jongik-sv/form-js-designer/releases/tag/designer-editor-host-v0.1.0
[1.0.0-rc.1]: https://github.com/jongik-sv/form-js-designer/releases/tag/v1.0.0-rc.1
