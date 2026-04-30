# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- `vscode/datetime: 빈 dateLabel/timeLabel 상태에서도 라벨 더블클릭이 인라인 편집을 연다`
- `vscode/card: 헤더(제목)를 프로퍼티 패널 단일 텍스트 입력과 .dc-card__header 더블클릭으로 편집할 수 있다 (이전에는 i18n 위젯 미스매치로 [object Object] 렌더 위험)`

### Removed (BREAKING)

- `Stack` 컨테이너 컴포넌트 제거 (`packages/designer-components/src/stack/`).
  - 제거 사유: `display:flex` 선언과 form-js `cds--grid` 렌더 파이프라인이 충돌하여 `direction/gap/align/justify` props가 의도대로 동작하지 않았고, 자식 `layout.columns` 변경 시 Stack 폭이 함께 변하는 레이아웃 버그가 상존했다. Row/Column(form-js 기본 그리드)와 Card로 대체 가능.
  - 마이그레이션: 기존 스키마의 `{ "type": "stack", ... }` 항목은 `{ "type": "card", ... }` 또는 자식을 상위 container의 rows로 평탄화하여 대체한다. `designer-cli validate` 가 unknown type "stack"으로 실패한다.
  - 영향 파일: `designer-components`(export/module/icon/테스트), `designer-core`(DesignerFormLayouter·ContainerHoverGuard 커스텀 컨테이너 목록), `designer-editor-host`(OutlineModule·OutlinePanel·PropsPanelService·dragdrop E2E·LivePreviewService), `designer-runtime`(LayoutHeightApplier 대상 타입 + 예제 registry), `designer-cli`(cliRegistry·design-page fixture), `designer-i18n`(`designer.palette.stack` 키 + 테스트).

## [1.0.0-rc.1] - 2026-06-05

### Added

#### WP-01: 프로젝트 기반 (Infrastructure)
- 모노레포 구조 설정 (npm workspaces)
- TypeScript 5.6 + Preact 10.29 기반 환경 구성
- Vitest 단위 테스트 인프라
- ADR-0001: CSS Modules 금지, 단일 Preact 인스턴스 요구사항

#### WP-02: 디자이너 코어 (designer-core)
- `OverlayLayer`: WYSIWYG 오버레이 렌더링 컴포넌트
- `propsSchemaToPanel`: form-js 스키마 → 프로퍼티 패널 변환기
- `ViewerHost`: form-js 뷰어 호스트 컴포넌트
- `EditorHost`: form-js 에디터 호스트 컴포넌트
- `LocaleProvider`: 다국어 컨텍스트 제공자

#### WP-03: 디자이너 컴포넌트 (designer-components)
- `Card`, `Stack`, `Button`, `Tabs`, `Modal` 5종 UI 컴포넌트
- WCAG 2.1 AA 접근성 준수 (대비비 ≥4.5:1)
- CSS-in-JS 없는 순수 CSS/SCSS 스타일링

#### WP-04: 국제화 (designer-i18n)
- `t()` 함수 기반 다국어 번역 시스템
- `LocaleProvider` Preact 컨텍스트 통합
- 정적 번역 키 추출기 (`extract-i18n.mjs`)
- 한국어(ko) 100% 번역 커버리지 CI 게이트
- 한국어 번역 사전 (`ko.json`) 완성

#### WP-05: 테이블 컴포넌트 (designer-table)
- TanStack Table v8 기반 데이터 그리드
- 가상화(Virtualization)로 대량 데이터 렌더링
- 인라인 셀 편집, 필터링, 컬럼 이동 지원
- form-js PALETTE_GROUPS `presentation` 카테고리 통합

#### WP-09: 워터마크 보호 (CI Infra)
- `watermark-hash.mjs`: 워터마크 해시 게이트 CI 검사
- `watermark-scss-lint.mjs`: `.fjs-powered-by` CSS 숨김 탐지
- WCAG 대비비 준수 (아웃라인/사이드패널/프롭스패널 `#595959`)

#### WP-10: RC1 릴리스 준비 (Infra)
- `license-gate.mjs`: permissive 라이선스 전용 CI 게이트
- `gen-third-party-licenses.mjs`: THIRD_PARTY_LICENSES 자동 생성
- `tag-rc.mjs`: pre-flight 검사 + v1.0.0-rc.1 태깅 자동화
- `THIRD_PARTY_LICENSES`: 전체 의존성 라이선스 목록
- AC 매트릭스 120케이스 전수 통과 (`run-ac-matrix.mjs`)
- Playwright a11y E2E (axe-core critical+serious=0)

#### WP-10: 에디터 호스트 (designer-editor-host)
- `Palette`: 컴포넌트 팔레트 패널
- `Outline`: 폼 구조 아웃라인 패널
- `PropsPanel`: 컴포넌트 프로퍼티 편집 패널
- `LivePreview`: 실시간 WYSIWYG 미리보기
- form-js Editor 완전 통합

[Unreleased]: https://github.com/jongik-sv/form-js-designer/compare/v1.0.0-rc.1...HEAD
[1.0.0-rc.1]: https://github.com/jongik-sv/form-js-designer/releases/tag/v1.0.0-rc.1
