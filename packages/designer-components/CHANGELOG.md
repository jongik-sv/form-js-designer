# Changelog — @form-js-designer/designer-components

All notable changes to this package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Removed (BREAKING)

- `Stack` 컴포넌트(`src/stack/`) 제거. `display:flex`와 form-js Carbon 그리드 렌더 파이프라인 충돌로 `direction/gap/align/justify`가 무효화되고 자식 `layout.columns` 변경 시 폭이 함께 변동하는 버그 상존. Row/Column grid + Card 조합으로 대체한다.
- `StackComponent`, `StackSchema`, `stackPropsSchema` export 삭제.
- `StackIcon` 팔레트 아이콘 삭제.

## [1.0.0-rc.1] - 2026-06-05

### Added

- `Card`: 콘텐츠 카드 컴포넌트 (헤더·바디·푸터 슬롯, 그림자·테두리 변형)
- `Stack`: 수직/수평 레이아웃 스택 컴포넌트 (gap·align·justify props)
- `Button`: 버튼 컴포넌트 (primary·secondary·ghost 변형, 로딩 상태, 아이콘 슬롯)
- `Tabs`: 탭 패널 컴포넌트 (키보드 탐색, ARIA 탭패널 접근성)
- `Modal`: 모달 다이얼로그 컴포넌트 (포커스 트랩, ESC 닫기, 오버레이 클릭 닫기)
- WCAG 2.1 AA 대비비 준수 (텍스트 ≥4.5:1, 대형 텍스트 ≥3:1)
- CSS Modules 미사용 (ADR-0001 준수)
- Preact 10.29 기반 (단일 인스턴스 요구사항 준수)

[Unreleased]: https://github.com/jongik-sv/form-js-designer/compare/v1.0.0-rc.1...HEAD
[1.0.0-rc.1]: https://github.com/jongik-sv/form-js-designer/releases/tag/v1.0.0-rc.1
