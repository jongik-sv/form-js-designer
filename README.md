# form-js-designer

form-js 기반 전문 화면 디자이너. WYSIWYG · AI-driven · 한국어(ko) 1차.

## 서브프로젝트

본 레포는 서브프로젝트 단위로 문서와 작업을 분리한다 (`dev-plugin` SUBPROJECT 규약 호환).

- **`designer`** — form-js 기반 WYSIWYG 디자이너 본체
- **`vscode-ext`** — VSCode / Notion 스타일 마크다운 뷰어용 form-js 렌더·편집 확장

## 문서 (designer)

- [`docs/designer/PRD.md`](./docs/designer/PRD.md) — 1차 릴리스 제품 요구사항
- [`docs/designer/TRD.md`](./docs/designer/TRD.md) — 기술 명세 (패키지·스키마·인터페이스·NFR)
- [`docs/designer/wbs.md`](./docs/designer/wbs.md) — Work Breakdown Structure
- [`docs/designer/idea.md`](./docs/designer/idea.md) — 기술 설계 원본 (탐색·결정 기록)
- [`docs/designer/adr/`](./docs/designer/adr/) — 아키텍처 결정 기록 (ADR)

## 문서 (vscode-ext)

- [`docs/vscode-ext/PRD.md`](./docs/vscode-ext/PRD.md) — 확장 제품 요구사항
- [`docs/vscode-ext/TRD.md`](./docs/vscode-ext/TRD.md) — 확장 기술 명세

## 구조

```
form-js-designer/
├── docs/
│   ├── designer/            # 디자이너 서브프로젝트 (PRD/TRD/wbs/ADR/features/tasks)
│   └── vscode-ext/          # VSCode extension 서브프로젝트
├── packages/
│   ├── designer-core/       # defineComponent, OverlayLayer 유틸
│   ├── designer-components/ # Card/Stack/Tabs/Modal/Button
│   ├── designer-editor-host/# 편집기 호스트
│   ├── designer-runtime/    # 런타임 모듈
│   ├── designer-i18n/       # ko 번들
│   ├── designer-cli/        # validate / import / publish
│   └── designer-vscode-extension/  # (예정) vscode-ext 산출물
└── .claude/                 # Skills, Slash Commands
```

## 의존성

`@bpmn-io/form-js-viewer`, `@bpmn-io/form-js-editor`를 npm dependency로 사용.
form-js 본체 소스는 본 repo에 포함하지 않음 (디버깅·참조용 클론은 `~/project/form-js-upstream`).

## 라이선스

본 repo의 코드는 비공개(UNLICENSED). 운영 출력에는 form-js의 bpmn.io 워터마크가 자동 노출되어야 함 (라이선스 의무).
