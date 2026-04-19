# PRD — vscode-ext (form-js Markdown Extension)

> 상태: **초안 (Draft)**
> 최초 작성: 2026-04-19
> 상위 산출물: `packages/designer-vscode-extension/` (단일 `.vsix` 배포)

## 1. 개요

form-js 스키마를 **마크다운 본문에 임베드**하고, 뷰어에서 **렌더링 + 편집**까지 가능하게 하는 확장 번들을 제공한다.
타깃 호스트는 두 곳이다.

1. **VSCode (및 Cursor / Windsurf / VSCodium 등 클론)** — Markdown 미리보기 + Custom Editor API
2. **사내 Notion-style 마크다운 뷰어** — 플랫폼 식별 후 custom block plugin 형태로 어댑터 공급

## 2. 배경 / 문제

- 디자이너에서 만든 form-js 스키마는 현재 *전용 호스트*(`designer-editor-host`)에서만 시각화 가능
- 스키마를 설계 문서·런북·제안서에 **인라인으로 붙여넣고 즉시 확인**하고 싶은 요구가 발생 (mermaid 경험 유사)
- 단순 이미지 캡처는 업데이트 추적이 어렵고, JSON 링크는 가독성이 떨어짐

## 3. 목표 / 비목표

### Goals
- G1. ` ```form-js ` 펜스 블록 → 뷰어 렌더 (read-only, submit no-op)
- G2. 뷰어 우상단 ✏️ 버튼 → `form-js-editor` 모달/드로어로 편집, 저장 시 원본 JSON 블록 교체
- G3. 단일 `.vsix`로 오프라인·사내 배포 가능 (번들 자체 완결)
- G4. 사내 Notion-style 뷰어에도 동일 렌더/편집 경험 제공 (플랫폼 어댑터)
- G5. 디자이너 본체(`@form-js-designer/*`)의 커스텀 컴포넌트·런타임 모듈을 재사용 (중복 구현 금지)

### Non-Goals
- 팀 협업·실시간 공동편집 (v1 범위 외)
- 폼 제출/백엔드 연동 (뷰어는 항상 no-op)
- Markdown 파일 외 포맷 (MDX·Notion DB) 지원
- VSCode Marketplace 공식 배포 (사내 `.vsix` 직접 설치가 우선)

## 4. 주 대상 사용자 / 시나리오

| 페르소나 | 시나리오 |
|----------|---------|
| 기획/PM | PRD의 "입력 폼 예시" 자리에 실제 form-js 스키마 블록을 넣고 리뷰어가 바로 렌더된 폼을 본다 |
| 엔지니어 | 런북/트러블슈팅 문서에 신고 템플릿 폼을 임베드. 수정이 필요하면 ✏️로 열어 고치고 저장 |
| QA | 테스트 케이스 문서에 입력 폼 상태를 스키마 블록으로 남기고, 업데이트될 때마다 diff로 추적 |

## 5. 사용자 스토리 (핵심 3개)

- **US1**: Markdown 문서 `design.md`에 ` ```form-js ` 블록을 작성 → 미리보기를 열면 실제 폼이 렌더된다.
- **US2**: 렌더된 폼의 ✏️ 버튼을 누르면 사이드 드로어에 디자이너가 열린다. 필드를 추가·편집 후 저장하면 `design.md`의 해당 블록 JSON이 교체된다.
- **US3**: 같은 문서를 사내 Notion-style 뷰어로 열어도 동일하게 폼이 렌더되고, (뷰어 지원 시) 편집도 가능하다.

## 6. 기능 요구사항

### F1. 코드블록 렌더 (VSCode)
- Markdown-it 플러그인으로 `info=form-js` 펜스 블록 감지
- 본문은 JSON으로 파싱, 실패 시 인라인 오류 배너
- 플레이스홀더 `<div>` 출력 → 웹뷰 프리뷰 스크립트가 `form-js-viewer`로 마운트
- 스키마 해시별로 인스턴스 재사용 (동일 스키마 반복 시 렌더 비용 최소화)

### F2. 인라인 편집 (VSCode)
- 뷰어 우상단 ✏️ 오버레이 버튼
- 클릭 → 별도 webview 패널/모달에 `form-js-editor` 로드
- 저장 시 extension host에 postMessage → `WorkspaceEdit.replace(range, newJson)` 로 원본 markdown 파일의 블록 본문만 교체
- 원본 문서가 편집 중 외부에서 바뀌면 버전 불일치 경고 (TextDocument.version 비교)

### F3. 블록 식별
- markdown-it 토큰의 `token.map`(시작·끝 라인)을 `data-md-start` / `data-md-end` 속성으로 전달
- 같은 문서에 여러 블록 공존 가능, 한 번에 하나만 편집 모드 (single-editor lock)

### F4. Notion-style 뷰어 어댑터 (분리 배포)
- 사내 뷰어 플랫폼 식별(BlockNote / Tiptap / Plate / Lexical / Novel / 자체) 후 플러그인 계약 결정
- 동일 viewer/editor 코어(`@form-js-designer/designer-runtime`, `designer-components`) 재사용
- 편집 지원 여부는 호스트 플랫폼 기능에 따름 (v1은 viewer-only도 허용)

### F5. 배포 / 버전
- `vsce package`로 `.vsix` 산출, 사내 공유 저장소 업로드
- 확장 버전은 디자이너 코어 버전과 독립적으로 관리 (peerDependencies 호환 범위만 명시)

## 7. UX 요구

- ✏️ 버튼: 호버 시만 표시, 키보드 접근 `Tab` 가능
- 편집기는 **모달/사이드 드로어** 기본 (인라인 확장 금지 — 디자이너 폭 확보 목적)
- 저장 실패 시 원본 블록은 손상 없이 유지, 에러 토스트 노출
- 다크/라이트 테마 자동 대응 (VSCode `data-vscode-theme-kind` 구독)

## 8. 성공 지표

- 사내 배포 첫 1개월 내 설계 문서 ≥ 10개에 `form-js` 블록 사용
- ✏️ 편집 후 저장 실패율 < 1% (WorkspaceEdit 충돌 포함)
- `.vsix` 번들 크기 ≤ 5 MB
- 초기 렌더 시간(1개 블록) ≤ 500ms (local dev 기준)

## 9. 의존 / 가정

- 엔드 호스트가 form-js와 동일한 Preact 10.x 번들을 자체 내장 가능 (webview sandbox 격리 전제)
- 디자이너 코어 패키지(`designer-core`, `designer-runtime`, `designer-components`)가 브라우저·webview 환경에서 SSR 없이 동작
- 사내 Notion-style 뷰어의 custom block 확장 API가 존재 (미존재 시 어댑터 범위 재정의)

## 10. 리스크

| 리스크 | 완화 |
|--------|------|
| 사내 뷰어 플랫폼 미식별 / 확장 불가 | PRD 확정 전 플랫폼 식별 태스크 선행 |
| webview CSP가 form-js 번들 차단 | 확장 contribution `previewScripts` + 번들 서명 검증 |
| Preact 중복 로드 (form-js + 확장) | `preact` single-instance 가드 (모노레포 overrides로 유지) |
| VSCode ↔ Markdown 파일 동기 충돌 | TextDocument 버전 비교 + 자동 reload 경고 |

## 11. 마일스톤 (개략)

- M1 — VSCode 미리보기 렌더 MVP (read-only, 단일 블록) — ~1주
- M2 — Custom Editor 편집 연결 + WorkspaceEdit 교체 — ~1주
- M3 — 사내 Notion-style 뷰어 식별 + 어댑터 PoC — 식별 후 결정
- M4 — `.vsix` 사내 배포 + 사용 피드백 반영 — 지속

## 12. 열린 질문

- Q1. 사내 Notion-style 마크다운 뷰어는 어떤 플랫폼인가? (BlockNote / Tiptap / 자체?)
- Q2. 저장 시 원본 문서의 JSON 포맷(들여쓰기 2/4, trailing comma 등) 보존 규칙은?
- Q3. 편집 권한 제어(읽기 전용 모드)를 호스트별로 둘 것인가?
- Q4. `form-js-editor`의 전체 기능이 아니라 축소판이 필요한가? (팔레트/속성 패널 범위)
